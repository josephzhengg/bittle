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
  getFormDeadline
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

export type PastFormsPageProps = {
  user: User;
  formTitle: string;
  formCode: string;
  formId: string;
  deadline?: string | null; // Added deadline field
  questions: Question[];
  allOptions: Record<string, QuestionOption[]>;
  initialSubmissions: ProcessedSubmission[];
};

export default function FormPage({
  user,
  formTitle,
  formCode,
  deadline,
  questions,
  initialSubmissions
}: PastFormsPageProps) {
  const router = useRouter();

  // State for client-side filtering and interactions
  const [searchTerm, setSearchTerm] = useState('');
  const [submissions] = useState<ProcessedSubmission[]>(initialSubmissions);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sort questions by index for consistent column ordering
  const sortedQuestions = useMemo(() => {
    return [...questions].sort((a, b) => a.index - b.index);
  }, [questions]);

  // Client-side filtering
  const filteredSubmissions = useMemo(() => {
    let filtered = [...submissions].sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    // Apply search filter
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

  // Statistics
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

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  // Refresh data
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Trigger a page refresh to get fresh server-side data
      router.replace(router.asPath);
    } catch {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  }, [router]);

  // Export functionality
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
                  className="text-xs w-fit bg-gray-100 text-gray-600 border-gray-300">
                  {formCode}
                </Badge>
                {deadline && <FormStatusBadge deadline={deadline} />}
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              View and manage form responses
            </p>
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
              disabled
              className="w-full sm:w-auto sm:min-w-[120px] bg-gray-300 text-gray-500 cursor-not-allowed">
              <Edit className="w-4 h-4 mr-2" />
              Edit Form (Disabled)
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <FormNavigationTabs
          formCode={typeof formCode === 'string' ? formCode : ''}
          currentTab="applicants"
          basePath="past"
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
                        disabled
                        className="bg-gray-300 text-gray-500 cursor-not-allowed">
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
    // Fetch all data on the server
    const [formTitle, formId, deadline] = await Promise.all([
      getFormTitle(supabase, formCode),
      getFormIdByCode(supabase, formCode),
      getFormDeadline(supabase, formCode) // Added to fetch deadline
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

    // Fetch all question options for MCQ and SELECT_ALL questions
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

    // Process all submissions with their responses
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

      // Process each question response
      for (const response of questionResponses) {
        const question = questions.find((q) => q.id === response.question_id);
        if (!question) continue;

        if (question.type === 'FREE_RESPONSE') {
          responses[question.id] = response.free_text || '';
        } else if (
          question.type === 'MULTIPLE_CHOICE' ||
          question.type === 'SELECT_ALL'
        ) {
          // Find selected options for this response
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
        deadline: processedDeadline // Use the processed deadline
      }
    };
  } catch {
    return {
      notFound: true
    };
  }
}
