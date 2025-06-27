import DashBoardLayout from '@/components/layouts/dashboard-layout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
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
  RefreshCw,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { getFormTitle, getFormIdByCode } from '@/utils/supabase/queries/form';
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

export type CurrentFormsPageProps = {
  user: User;
  formTitle: string;
  formCode: string;
  formId: string;
  questions: Question[];
  allOptions: Record<string, QuestionOption[]>;
  initialSubmissions: ProcessedSubmission[];
};

interface ProcessedSubmission {
  id: string;
  submittedAt: string; // Changed from Date to string for serialization
  responses: Record<string, string>;
}

export default function FormPage({
  user,
  formTitle,
  formCode,
  questions,
  initialSubmissions
}: CurrentFormsPageProps) {
  const router = useRouter();

  // State for client-side filtering and interactions
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<string>>(
    new Set()
  );
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

  // Toggle expanded submission
  const toggleSubmission = useCallback((submissionId: string) => {
    setExpandedSubmissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(submissionId)) {
        newSet.delete(submissionId);
      } else {
        newSet.add(submissionId);
      }
      return newSet;
    });
  }, []);

  // Refresh data
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Trigger a page refresh to get fresh server-side data
      router.replace(router.asPath);
    } catch (error) {
      console.error('Error refreshing data:', error);
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

  // Helper function to format question type for display
  const formatQuestionType = (type: string) => {
    const typeMap: Record<string, string> = {
      FREE_RESPONSE: 'Free Response',
      MULTIPLE_CHOICE: 'Multiple Choice',
      SELECT_ALL: 'Select All'
    };
    return typeMap[type] || type;
  };

  // Mobile card component for responses
  const MobileResponseCard = ({
    submission,
    index
  }: {
    submission: ProcessedSubmission;
    index: number;
  }) => {
    const isExpanded = expandedSubmissions.has(submission.id);

    return (
      <Card className="w-full">
        <CardHeader
          className="pb-2 cursor-pointer"
          onClick={() => toggleSubmission(submission.id)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                {index + 1}
              </div>
              <div>
                <div className="font-medium text-sm">
                  {format(new Date(submission.submittedAt), 'MMM d, yyyy')}
                </div>
                <div className="text-muted-foreground text-xs">
                  {format(new Date(submission.submittedAt), 'h:mm a')}
                </div>
              </div>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0">
            <div className="space-y-4">
              {sortedQuestions.map((question) => (
                <div key={question.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground leading-tight">
                        {question.prompt}
                      </div>
                      <Badge
                        className={`text-xs mt-1 ${
                          question.type === 'MULTIPLE_CHOICE'
                            ? 'bg-blue-100 text-blue-800'
                            : question.type === 'SELECT_ALL'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                        {formatQuestionType(question.type)}
                      </Badge>
                    </div>
                  </div>

                  <div className="ml-0">
                    {submission.responses[question.id] ? (
                      question.type === 'FREE_RESPONSE' ? (
                        <div className="text-sm p-3 bg-muted/30 rounded-md break-words whitespace-pre-wrap">
                          {submission.responses[question.id]}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {submission.responses[question.id]
                            .split(', ')
                            .filter((option) => option.trim())
                            .map((option, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="text-xs">
                                {option.trim()}
                              </Badge>
                            ))}
                        </div>
                      )
                    ) : (
                      <div className="text-muted-foreground text-xs italic p-2 bg-muted/20 rounded-md text-center">
                        No response
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <DashBoardLayout user={user}>
      <div className="flex flex-col w-full max-w-full mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header Section */}
        <div className="flex flex-col space-y-4">
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words">
                {formTitle}
              </h1>
              <Badge variant="outline" className="text-xs w-fit">
                {formCode}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              View and manage form responses
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full sm:w-auto">
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={!filteredSubmissions?.length}
              className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={() =>
                router.push(`/dashboard/past/form/${formCode}/edit`)
              }
              className="w-full sm:w-auto">
              <Edit className="w-4 h-4 mr-2" />
              Edit Form
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs className="w-full" defaultValue="applicants">
          <TabsList className="h-12 p-1 bg-muted/50 rounded-lg w-full">
            <TabsTrigger
              value="forms"
              onClick={() => router.push(`/dashboard/past/form/${formCode}`)}
              className="flex items-center gap-2 h-10 px-3 sm:px-6 rounded-md font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground flex-1">
              <FileText className="w-4 h-4" />
              <span className="hidden xs:inline">Forms</span>
            </TabsTrigger>
            <TabsTrigger
              value="applicants"
              onClick={() =>
                router.push(`/dashboard/past/applicants/${formCode}`)
              }
              className="flex items-center gap-2 h-10 px-3 sm:px-6 rounded-md font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground flex-1">
              <Users className="w-4 h-4" />
              <span className="hidden xs:inline">Applicants</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
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
                <FileText className="w-4 h-4" />
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
                <Calendar className="w-4 h-4" />
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
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block w-full overflow-hidden rounded-lg border">
                  <div className="overflow-x-auto">
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow className="bg-muted/80 border-b-2">
                          <TableHead className="w-16 text-center font-semibold py-4">
                            #
                          </TableHead>
                          <TableHead className="w-40 font-semibold py-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Date
                            </div>
                          </TableHead>
                          {sortedQuestions.map((question) => (
                            <TableHead
                              key={question.id}
                              className="min-w-[200px] font-semibold py-4">
                              <div className="space-y-2">
                                <div className="font-medium text-sm leading-tight break-words">
                                  {question.prompt}
                                </div>
                                <Badge
                                  className={`text-xs px-2 py-1 rounded font-medium ${
                                    question.type === 'MULTIPLE_CHOICE'
                                      ? 'bg-blue-100 text-blue-800'
                                      : question.type === 'SELECT_ALL'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-purple-100 text-purple-800'
                                  }`}>
                                  {formatQuestionType(question.type)}
                                </Badge>
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSubmissions.map((submission, index) => (
                          <TableRow
                            key={submission.id}
                            className="hover:bg-muted/20 transition-colors border-b border-border/50 last:border-b-0">
                            <TableCell className="text-center font-medium text-muted-foreground py-6">
                              {index + 1}
                            </TableCell>
                            <TableCell className="p-6">
                              <div className="space-y-1">
                                <div className="font-medium text-sm">
                                  {format(
                                    new Date(submission.submittedAt),
                                    'MMM d, yyyy'
                                  )}
                                </div>
                                <div className="text-muted-foreground text-xs">
                                  {format(
                                    new Date(submission.submittedAt),
                                    'h:mm a'
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            {sortedQuestions.map((question) => (
                              <TableCell
                                key={question.id}
                                className="p-6 align-top">
                                <div className="min-h-[50px] flex items-start">
                                  {submission.responses[question.id] ? (
                                    <div className="w-full">
                                      {question.type === 'FREE_RESPONSE' ? (
                                        <div className="text-sm leading-relaxed break-words whitespace-pre-wrap max-h-32 overflow-y-auto p-3 bg-muted/30 rounded-md">
                                          {submission.responses[question.id]}
                                        </div>
                                      ) : (
                                        <div className="flex flex-wrap gap-1">
                                          {submission.responses[question.id]
                                            .split(', ')
                                            .filter((option) => option.trim())
                                            .map((option, idx) => (
                                              <Badge
                                                key={idx}
                                                variant="secondary"
                                                className="text-xs">
                                                {option.trim()}
                                              </Badge>
                                            ))}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="w-full flex items-center justify-center text-muted-foreground text-xs italic py-4 bg-muted/20 rounded-md">
                                      No response
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4">
                  {filteredSubmissions.map((submission, index) => (
                    <MobileResponseCard
                      key={submission.id}
                      submission={submission}
                      index={index}
                    />
                  ))}
                </div>
              </>
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
                            `${window.location.origin}/form/${formCode}`
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
    // Fetch all data on the server
    const [formTitle, formId] = await Promise.all([
      getFormTitle(supabase, formCode),
      getFormIdByCode(supabase, formCode)
    ]);

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
        initialSubmissions: processedSubmissions
      }
    };
  } catch (error) {
    console.error('Error fetching server-side data:', error);
    return {
      notFound: true
    };
  }
}
