import DashBoardLayout from '@/components/layouts/dashboard-layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Edit,
  Search,
  Download,
  Calendar,
  Users,
  FileText,
  RefreshCw
} from 'lucide-react';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import {
  getFormTitle,
  getFormIdByCode,
  getFormDeadline,
  getFormByCode
} from '@/utils/supabase/queries/form';
import { getQuestions, getOptions } from '@/utils/supabase/queries/question';
import {
  getFormSubmissions,
  getQuestionResponse,
  getResponseOptionSelection
} from '@/utils/supabase/queries/response';
import type { User } from '@supabase/supabase-js';
import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { useMemo, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { QuestionOption } from '@/utils/supabase/models/question-option';
import { toast } from 'sonner';
import { Question } from '@/utils/supabase/models/question';
import ApplicantResponseDisplay from '@/components/dashboard-components/applicant-response-display';
import FormNavigationTabs from '@/components/dashboard-components/form-navigation-tabs';
import FormStatusBadge from '@/components/dashboard-components/form-status-badge';
import { ProcessedSubmission } from '@/utils/types';
import { useSupabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { QrCode } from 'lucide-react';

export type CurrentFormsPageProps = {
  user: User;
  formTitle: string;
  formCode: string;
  formId: string;
  questions: Question[];
  allOptions: Record<string, QuestionOption[]>;
  initialSubmissions: ProcessedSubmission[];
  deadline?: string | null;
};

export default function FormPage({
  user,
  formTitle,
  formCode,
  questions,
  allOptions,
  initialSubmissions,
  deadline
}: CurrentFormsPageProps) {
  const router = useRouter();
  const supabase = useSupabase();
  const [searchTerm, setSearchTerm] = useState('');
  const [submissions, setSubmissions] =
    useState<ProcessedSubmission[]>(initialSubmissions);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sortedQuestions = useMemo(() => {
    return [...questions].sort((a, b) => a.index - b.index);
  }, [questions]);

  const filteredSubmissions = useMemo(() => {
    let filtered = [...submissions].sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    if (searchTerm) {
      filtered = filtered.filter((submission) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          Object.values(submission.responses).some((response) =>
            response.toLowerCase().includes(searchLower)
          ) ||
          format(new Date(submission.submittedAt), 'MMM d, yyyy')
            .toLowerCase()
            .includes(searchLower)
        );
      });
    }
    return filtered;
  }, [submissions, searchTerm]);

  const formData = useQuery({
    queryKey: ['formData', formCode],
    queryFn: async () => {
      return await getFormByCode(supabase, formCode);
    }
  });

  const handleDownloadQR = async () => {
    if (!formCode || typeof formCode !== 'string') return;
    try {
      const targetUrl = `bittle.me/input-code/${formCode}`;
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
        targetUrl
      )}&size=200x200&format=png`;
      const response = await fetch(qrApiUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch QR code');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-code-${formCode}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download QR code');
    }
  };

  const formatDateTime = (dateInput: string | Date) => {
    const date =
      typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const stats = useMemo(() => {
    const total = submissions.length;
    const latest =
      submissions.length > 0
        ? new Date(
            Math.max(
              ...submissions.map((s) => new Date(s.submittedAt).getTime())
            )
          )
        : null;
    return { total, latest };
  }, [submissions]);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const formId = await getFormIdByCode(supabase, formCode);
      if (!formId) throw new Error('Form not found');
      const newSubmissions = await getFormSubmissions(supabase, formId);
      const processedSubmissions: ProcessedSubmission[] = [];
      for (const submission of newSubmissions) {
        const questionResponses = await getQuestionResponse(
          supabase,
          submission.id
        );
        const optionSelections = await getResponseOptionSelection(
          supabase,
          submission.id
        );
        const responses: Record<string, string> = {};
        for (const response of questionResponses) {
          const question = questions.find((q) => q.id === response.question_id);
          if (!question) continue;
          if (question.type === 'FREE_RESPONSE') {
            responses[question.id] = response.free_text || '';
          } else if (
            question.type === 'MULTIPLE_CHOICE' ||
            question.type === 'SELECT_ALL'
          ) {
            const selectedOptions = optionSelections
              .filter((selection) => selection.response_id === response.id)
              .map((selection) => {
                const option = allOptions[response.question_id]?.find(
                  (opt) => opt.id === selection.option_id
                );
                return option?.label || 'Unknown option';
              });
            responses[question.id] =
              selectedOptions.length > 0 ? selectedOptions.join(', ') : '';
          }
        }
        processedSubmissions.push({
          id: submission.id,
          submittedAt:
            typeof submission.created_at === 'string'
              ? submission.created_at
              : submission.created_at.toISOString(),
          responses
        });
      }
      setSubmissions(processedSubmissions);
      toast.success('Data refreshed successfully');
    } catch {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  }, [supabase, formCode, questions, allOptions]);

  const handleExport = useCallback(() => {
    if (!filteredSubmissions || !sortedQuestions) return;
    const headers = [
      'Submission Date',
      ...sortedQuestions.map((q) => q.prompt)
    ];
    const csvContent = [
      headers.join(','),
      ...filteredSubmissions.map((submission) =>
        [
          format(new Date(submission.submittedAt), 'yyyy-MM-dd HH:mm:ss'),
          ...sortedQuestions.map((q) => {
            const response = submission.responses[q.id] || '';
            return `"${response.replace(/"/g, '""')}"`;
          })
        ].join(',')
      )
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formTitle || 'form'}-responses-${format(
      new Date(),
      'yyyy-MM-dd'
    )}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [filteredSubmissions, sortedQuestions, formTitle]);

  return (
    <DashBoardLayout user={user}>
      <div className="flex flex-col w-full max-w-full mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header Section */}
        <div className="flex flex-col space-y-4">
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words min-w-0 flex-1">
                {formTitle}
              </h1>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-xs w-fit bg-purple-50 text-purple-700 border-purple-200">
                  {formCode}
                </Badge>
                <FormStatusBadge deadline={deadline} />
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              Form preview and structure
            </p>
            {formData.data?.description && (
              <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-100">
                <p className="text-sm text-slate-700 leading-relaxed">
                  {formData.data.description}
                </p>
              </div>
            )}

            {deadline && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
                <div className="flex items-center gap-2 text-sm">
                  <Clock
                    className={`w-4 h-4 ${
                      deadline ? 'text-green-600' : 'text-muted-foreground'
                    }`}
                  />
                  <span className="text-slate-600 font-medium">Deadline:</span>
                  <span className="font-semibold text-green-600">
                    {formatDateTime(deadline)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full sm:w-auto sm:min-w-[120px]">
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={!filteredSubmissions?.length}
              className="w-full sm:w-auto sm:min-w-[120px]">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadQR}
              disabled={!formCode}
              className="w-full sm:w-auto sm:min-w-[160px]">
              <QrCode className="w-4 h-4 mr-2" />
              Download Form QR Code
            </Button>
            <Button
              onClick={() =>
                router.push(
                  `/dashboard/current/${formCode.toUpperCase()}/form/edit`
                )
              }
              className="w-full sm:w-auto sm:min-w-[120px]">
              <Edit className="w-4 h-4 mr-2" />
              Edit Questions
            </Button>
          </div>
        </div>
        {/* Navigation Tabs */}
        <FormNavigationTabs
          formCode={typeof formCode === 'string' ? formCode : ''}
          currentTab="applicants"
          basePath="current"
        />
        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Total Responses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sortedQuestions.length}</div>
            </CardContent>
          </Card>
          <Card className="sm:col-span-1 col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-5 h-5 text-pink-600" />
                Latest Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {stats?.latest
                  ? format(stats.latest, 'MMM d, yyyy')
                  : 'No responses'}
              </div>
              {stats?.latest && (
                <div className="text-xs text-muted-foreground mt-1">
                  {format(stats.latest, 'h:mm a')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="relative w-full sm:flex-1 sm:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search responses..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="text-sm text-muted-foreground w-full sm:w-auto text-left sm:text-right">
                {filteredSubmissions.length} response
                {filteredSubmissions.length !== 1 ? 's' : ''}
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Responses Table/Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Responses
            </CardTitle>
            <CardDescription>
              All form responses in chronological order
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredSubmissions && filteredSubmissions.length > 0 ? (
              <ApplicantResponseDisplay
                submissions={filteredSubmissions}
                questions={sortedQuestions}
                onSubmissionDeleted={(submissionId) => {
                  setSubmissions((prev) =>
                    prev.filter((sub) => sub.id !== submissionId)
                  );
                }}
              />
            ) : (
              <div className="text-center py-16">
                <div className="mx-auto max-w-md">
                  {searchTerm ? (
                    <>
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <Search className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        No matching responses found
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        Try different search terms to find responses.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setSearchTerm('')}>
                        Clear search
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        No responses yet
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        Form responses will appear here once submitted.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/input-code/${formCode}`
                          );
                          toast('Copied link!');
                        }}>
                        Copy form link
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashBoardLayout>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const supabase = createSupabaseServerClient(context);
  const { data: userData, error } = await supabase.auth.getUser();
  if (!userData || error) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }
  const { 'form-code': formCode } = context.query;
  if (!formCode || typeof formCode !== 'string') {
    return {
      notFound: true
    };
  }
  try {
    const [formTitle, formId, deadline] = await Promise.all([
      getFormTitle(supabase, formCode),
      getFormIdByCode(supabase, formCode),
      getFormDeadline(supabase, formCode)
    ]);
    const processedDeadline =
      deadline instanceof Date ? deadline.toISOString() : deadline;
    if (!formId) {
      return {
        notFound: true
      };
    }
    const [questions, submissions] = await Promise.all([
      getQuestions(supabase, formId),
      getFormSubmissions(supabase, formId)
    ]);
    const allOptions: Record<string, QuestionOption[]> = {};
    for (const question of questions) {
      if (
        question.type === 'MULTIPLE_CHOICE' ||
        question.type === 'SELECT_ALL'
      ) {
        const options = await getOptions(supabase, question.id);
        allOptions[question.id] = options;
      }
    }
    const processedSubmissions: ProcessedSubmission[] = [];
    for (const submission of submissions) {
      const questionResponses = await getQuestionResponse(
        supabase,
        submission.id
      );
      const optionSelections = await getResponseOptionSelection(
        supabase,
        submission.id
      );
      const responses: Record<string, string> = {};
      for (const response of questionResponses) {
        const question = questions.find((q) => q.id === response.question_id);
        if (!question) continue;
        if (question.type === 'FREE_RESPONSE') {
          responses[question.id] = response.free_text || '';
        } else if (
          question.type === 'MULTIPLE_CHOICE' ||
          question.type === 'SELECT_ALL'
        ) {
          const selectedOptions = optionSelections
            .filter((selection) => selection.response_id === response.id)
            .map((selection) => {
              const option = allOptions[question.id]?.find(
                (opt) => opt.id === selection.option_id
              );
              return option?.label || 'Unknown option';
            });
          responses[question.id] =
            selectedOptions.length > 0 ? selectedOptions.join(', ') : '';
        }
      }
      processedSubmissions.push({
        id: submission.id,
        submittedAt:
          typeof submission.created_at === 'string'
            ? submission.created_at
            : submission.created_at.toISOString(),
        responses
      });
    }
    return {
      props: {
        user: userData.user,
        formTitle,
        formCode,
        formId,
        questions,
        allOptions,
        initialSubmissions: processedSubmissions,
        deadline: processedDeadline
      }
    };
  } catch {
    return {
      notFound: true
    };
  }
}
