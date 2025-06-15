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
import { Skeleton } from '@/components/ui/skeleton';
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
import { useSupabase } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { getFormTitle, getFormIdByCode } from '@/utils/supabase/queries/form';
import { getQuestions, getOptions } from '@/utils/supabase/queries/question';
import {
  getFormSubmissions,
  getQuestionResponse,
  getResponseOptionSelection
} from '@/utils/supabase/queries/response';
import type { User } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { useMemo, useState, useCallback } from 'react';
import z from 'zod';
import { format } from 'date-fns';
import { QuestionOption } from '@/utils/supabase/models/question-option';

export type CurrentFormsPageProps = {
  user: User;
};

interface ProcessedSubmission {
  id: string;
  submittedAt: Date;
  responses: Record<string, string>;
}

export default function FormPage({ user }: CurrentFormsPageProps) {
  const router = useRouter();
  const supabase = useSupabase();
  const { 'form-code': formCode } = router.query;

  // Simplified state - only search
  const [searchTerm, setSearchTerm] = useState('');

  // Get form title
  const { data: formTitle } = useQuery({
    queryKey: ['form-title', formCode],
    queryFn: async () => {
      const code = z.string().parse(formCode);
      return getFormTitle(supabase, code);
    },
    enabled: !!formCode
  });

  // Get form ID
  const { data: formId } = useQuery({
    queryKey: ['form-id', formCode],
    queryFn: async () => {
      const code = z.string().parse(formCode);
      return getFormIdByCode(supabase, code);
    },
    enabled: !!formCode
  });

  // Get questions for the form
  const { data: questions } = useQuery({
    queryKey: ['questions', formId],
    queryFn: () => getQuestions(supabase, formId!),
    enabled: !!formId
  });

  // Get all question options for MCQ and SELECT_ALL questions
  const { data: allOptions } = useQuery({
    queryKey: ['all-options', questions],
    queryFn: async () => {
      if (!questions) return {};

      const optionsMap: Record<string, QuestionOption[]> = {};

      for (const question of questions) {
        if (
          question.type === 'MULTIPLE_CHOICE' ||
          question.type === 'SELECT_ALL'
        ) {
          const options = await getOptions(supabase, question.id);
          optionsMap[question.id] = options;
        }
      }

      return optionsMap;
    },
    enabled: !!questions
  });

  // Get form submissions
  const { data: submissions, refetch: refetchSubmissions } = useQuery({
    queryKey: ['submissions', formId],
    queryFn: () => getFormSubmissions(supabase, formId!),
    enabled: !!formId
  });

  // Get all responses for all submissions
  const { data: processedSubmissions, isLoading: isLoadingResponses } =
    useQuery({
      queryKey: ['processed-submissions', submissions, questions, allOptions],
      queryFn: async () => {
        if (!submissions || !questions || !allOptions) return [];

        const processed: ProcessedSubmission[] = [];

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
            const question = questions.find(
              (q) => q.id === response.question_id
            );
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

          processed.push({
            id: submission.id,
            submittedAt: new Date(submission.created_at),
            responses
          });
        }

        return processed;
      },
      enabled: !!submissions && !!questions && !!allOptions
    });

  // Sort questions by index for consistent column ordering
  const sortedQuestions = useMemo(() => {
    return questions ? [...questions].sort((a, b) => a.index - b.index) : [];
  }, [questions]);

  // Simple filtering - only search
  const filteredSubmissions = useMemo(() => {
    if (!processedSubmissions) return [];

    let filtered = [...processedSubmissions].sort(
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
  }, [processedSubmissions, searchTerm]);

  // Basic statistics
  const stats = useMemo(() => {
    if (!processedSubmissions || !sortedQuestions) return null;

    const total = processedSubmissions.length;
    const latest =
      processedSubmissions.length > 0
        ? new Date(
            Math.max(
              ...processedSubmissions.map((s) =>
                new Date(s.submittedAt).getTime()
              )
            )
          )
        : null;

    return { total, latest };
  }, [processedSubmissions, sortedQuestions]);

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  // Simple export functionality
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

  const isLoading =
    !formTitle || !submissions || !questions || isLoadingResponses;

  // Helper function to format question type for display
  const formatQuestionType = (type: string) => {
    const typeMap: Record<string, string> = {
      FREE_RESPONSE: 'Free Response',
      MULTIPLE_CHOICE: 'Multiple Choice',
      SELECT_ALL: 'Select All'
    };
    return typeMap[type] || type;
  };

  return (
    <DashBoardLayout user={user}>
      <div className="flex flex-col w-full max-w-full mx-auto p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">
                {formTitle || <Skeleton className="h-8 w-64" />}
              </h1>
              <Badge variant="outline" className="text-xs">
                {formCode}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              View and manage form responses
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchSubmissions()}
              disabled={isLoading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={isLoading || !filteredSubmissions?.length}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={() =>
                router.push(`/dashboard/current/form/${formCode}/edit`)
              }>
              <Edit className="w-4 h-4 mr-2" />
              Edit Form
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs className="w-full" defaultValue="applicants">
          <TabsList className="h-12 p-1 bg-muted/50 rounded-lg w-full justify-start">
            <TabsTrigger
              value="forms"
              onClick={() => router.push(`/dashboard/current/form/${formCode}`)}
              className="flex items-center gap-2 h-10 px-6 rounded-md font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground">
              <FileText className="w-4 h-4" />
              Forms
            </TabsTrigger>
            <TabsTrigger
              value="applicants"
              onClick={() =>
                router.push(`/dashboard/current/applicants/${formCode}`)
              }
              className="flex items-center gap-2 h-10 px-6 rounded-md font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground">
              <Users className="w-4 h-4" />
              Applicants
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Simple Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Responses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  stats?.total || 0
                )}
              </div>
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
              <div className="text-2xl font-bold">
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  sortedQuestions.length
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Latest Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {isLoading ? (
                  <Skeleton className="h-4 w-24" />
                ) : stats?.latest ? (
                  format(stats.latest, 'MMM d, yyyy')
                ) : (
                  'No responses'
                )}
              </div>
              {!isLoading && stats?.latest && (
                <div className="text-xs text-muted-foreground mt-1">
                  {format(stats.latest, 'h:mm a')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Simple Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search responses..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {filteredSubmissions.length} response
                {filteredSubmissions.length !== 1 ? 's' : ''}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Responses Table */}
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
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredSubmissions && filteredSubmissions.length > 0 ? (
              <div className="w-full overflow-hidden rounded-lg border">
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

  return {
    props: {
      user: userData.user
    }
  };
}
