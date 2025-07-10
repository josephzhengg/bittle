import DashBoardLayout from '@/components/layouts/dashboard-layout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { useSupabase } from '@/lib/supabase';
import { Edit, Users, FileText, Eye, RefreshCw, Calendar } from 'lucide-react';
import ReadOnlyQuestionCard from '@/components/question-components/read-only-question-card';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import {
  getFormTitle,
  getFormIdByCode,
  getFormDeadline
} from '@/utils/supabase/queries/form';
import { getQuestions } from '@/utils/supabase/queries/question';
import type { User } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { z } from 'zod';
import { useMemo, useState } from 'react';
import { Question } from '@/utils/supabase/models/question';
import { format } from 'date-fns';

export type CurrentFormsPageProps = {
  user: User;
  initialFormData: {
    title: string;
    formId: string;
    questions: Question[];
    formCode: string;
    deadline?: string;
  } | null;
  error?: string;
};

export default function FormPage({
  user,
  initialFormData,
  error
}: CurrentFormsPageProps) {
  const router = useRouter();
  const supabase = useSupabase();
  const { 'form-code': formCode } = router.query;
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use server-side data as initial data, but allow client-side refetching
  const { data: formData, refetch: refetchForm } = useQuery({
    queryKey: ['title', formCode],
    queryFn: async () => {
      const code = z.string().parse(formCode);
      return getFormTitle(supabase, code);
    },
    enabled: !!formCode,
    initialData: initialFormData?.title,
    staleTime: 5 * 60 * 1000 // Consider data fresh for 5 minutes
  });

  const { data: formId } = useQuery({
    queryKey: ['formID', formCode],
    queryFn: () => {
      const code = z.string().parse(formCode);
      return getFormIdByCode(supabase, code);
    },
    enabled: !!formCode,
    initialData: initialFormData?.formId,
    staleTime: 5 * 60 * 1000
  });

  const {
    data: questions,
    isLoading: isQuestionsLoading,
    refetch: refetchQuestions
  } = useQuery({
    queryKey: ['questions', formId],
    queryFn: () => {
      return formId ? getQuestions(supabase, formId) : Promise.resolve([]);
    },
    enabled: !!formId,
    initialData: initialFormData?.questions || [],
    staleTime: 5 * 60 * 1000
  });

  // Sort questions by index for consistent display
  const sortedQuestions = useMemo(() => {
    return questions ? [...questions].sort((a, b) => a.index - b.index) : [];
  }, [questions]);

  // Basic statistics
  const stats = useMemo(() => {
    if (!sortedQuestions) return null;

    const total = sortedQuestions.length;
    const typeBreakdown = sortedQuestions.reduce((acc, question) => {
      acc[question.type] = (acc[question.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, typeBreakdown };
  }, [sortedQuestions]);

  // Helper function to format question type for display
  const formatQuestionType = (type: string) => {
    const typeMap: Record<string, string> = {
      FREE_RESPONSE: 'Free Response',
      MULTIPLE_CHOICE: 'Multiple Choice',
      SELECT_ALL: 'Select All'
    };
    return typeMap[type] || type;
  };

  // Handle refresh with loading state
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchForm(), refetchQuestions()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Show error state if there was a server-side error
  if (error) {
    return (
      <DashBoardLayout user={user}>
        <div className="flex flex-col w-full max-w-full mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-red-100 to-pink-100 rounded-full flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              Error Loading Form
            </h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">{error}</p>
            <Button
              onClick={() => router.reload()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </DashBoardLayout>
    );
  }

  const isPageLoading = !formData || isQuestionsLoading;

  return (
    <DashBoardLayout user={user}>
      <div className="flex flex-col w-full max-w-full mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header Section */}
        <div className="flex flex-col space-y-4">
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words min-w-0 flex-1">
                {formData || <Skeleton className="h-8 w-64" />}
              </h1>
              <Badge
                variant="outline"
                className="text-xs w-fit bg-purple-50 text-purple-700 border-purple-200">
                {formCode}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              Form preview and structure
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isPageLoading || isRefreshing}
              className="w-full sm:w-auto sm:min-w-[120px]">
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              onClick={() => {
                router.push(`/dashboard/current/form/${formCode}/edit`);
              }}
              className="w-full sm:w-auto sm:min-w-[120px]">
              <Edit className="w-4 h-4 mr-2" />
              Edit Questions
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200 p-1">
          <Tabs className="w-full" defaultValue="forms">
            <TabsList className="h-12 p-1 bg-transparent rounded-lg w-full grid grid-cols-2">
              <TabsTrigger
                value="forms"
                onClick={() => router.push(`/dashboard/past/form/${formCode}`)}
                className="flex items-center gap-2 h-10 px-3 sm:px-6 rounded-md font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-slate-800 text-slate-600 hover:text-slate-800">
                <FileText className="w-4 h-4" />
                <span className="hidden xs:inline">Forms</span>
              </TabsTrigger>
              <TabsTrigger
                value="applicants"
                onClick={() =>
                  router.push(`/dashboard/past/applicants/${formCode}`)
                }
                className="flex items-center gap-2 h-10 px-3 sm:px-6 rounded-md font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-slate-800 text-slate-600 hover:text-slate-800">
                <Users className="w-4 h-4" />
                <span className="hidden xs:inline">Applicants</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Statistics Cards - Updated to match applicants tab */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Total Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isPageLoading ? (
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
                <Eye className="w-5 h-5 text-blue-600" />
                Form Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-mono">
                {isPageLoading ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  formCode || 'N/A'
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-5 h-5 text-pink-600" />
                Deadline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {isPageLoading ? (
                  <Skeleton className="h-5 w-24" />
                ) : initialFormData?.deadline ? (
                  format(new Date(initialFormData.deadline), 'MMM d, yyyy')
                ) : (
                  'No deadline'
                )}
              </div>
              {initialFormData?.deadline && (
                <div className="text-xs text-muted-foreground mt-1">
                  {format(new Date(initialFormData.deadline), 'h:mm a')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Question Types Breakdown Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-5 h-5 text-pink-600" />
              Question Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {isPageLoading ? (
                <Skeleton className="h-4 w-32" />
              ) : stats?.typeBreakdown ? (
                Object.entries(stats.typeBreakdown).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {formatQuestionType(type)}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {count}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">
                  No questions
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Form Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Form Preview
            </CardTitle>
            <CardDescription>
              This is how your form will appear to respondents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isQuestionsLoading ? (
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            ) : sortedQuestions && sortedQuestions.length > 0 ? (
              <div className="space-y-6">
                {sortedQuestions.map((question, index) => (
                  <div key={question.id} className="relative">
                    <div className="absolute -left-4 top-0 text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded">
                      #{index + 1}
                    </div>
                    <ReadOnlyQuestionCard question={question} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-6">
                  <FileText className="w-10 h-10 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">
                  No questions yet
                </h3>
                <p className="text-slate-600 mb-6 max-w-md mx-auto">
                  Get started by adding questions to your form.
                </p>
                <Button
                  onClick={() => {
                    router.push(`/dashboard/current/form/${formCode}/edit`);
                  }}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                  <Edit className="w-4 h-4 mr-2" />
                  Add Questions
                </Button>
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
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (!userData || authError) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  const { 'form-code': formCode } = context.query;
  const currentPath = context.resolvedUrl;

  // Validate form code first
  if (!formCode || typeof formCode !== 'string') {
    return {
      props: {
        user: userData.user,
        initialFormData: null,
        error: 'Invalid form code'
      }
    };
  }

  // Check deadline to determine if we should redirect between past/current routes
  try {
    const deadline = await getFormDeadline(supabase, formCode);
    const now = new Date();
    const isDeadlinePassed = deadline ? new Date(deadline) < now : false;

    // If accessing past route but deadline hasn't passed, redirect to current
    if (currentPath.includes('/dashboard/past/form/') && !isDeadlinePassed) {
      return {
        redirect: {
          destination: `/dashboard/current/form/${formCode}`,
          permanent: false
        }
      };
    }

    // If accessing current route but deadline has passed, redirect to past
    if (currentPath.includes('/dashboard/current/form/') && isDeadlinePassed) {
      return {
        redirect: {
          destination: `/dashboard/past/form/${formCode}`,
          permanent: false
        }
      };
    }

    try {
      // Fetch all required data server-side
      const [formTitle, formId] = await Promise.all([
        getFormTitle(supabase, formCode),
        getFormIdByCode(supabase, formCode)
      ]);

      if (!formTitle || !formId) {
        return {
          props: {
            user: userData.user,
            initialFormData: null,
            error: 'Form not found'
          }
        };
      }

      // Fetch questions
      const questions = await getQuestions(supabase, formId);

      return {
        props: {
          user: userData.user,
          initialFormData: {
            title: formTitle,
            formId,
            questions: questions || [],
            formCode,
            deadline: null
          }
        }
      };
    } catch (error) {
      console.error('Error fetching form data:', error);
      return {
        props: {
          user: userData.user,
          initialFormData: null,
          error: 'Failed to load form data'
        }
      };
    }
  } catch (error) {
    console.error('Error checking form deadline:', error);
    // Continue without redirect if deadline check fails

    try {
      // Fetch all required data server-side
      const [formTitle, formId] = await Promise.all([
        getFormTitle(supabase, formCode),
        getFormIdByCode(supabase, formCode)
      ]);

      if (!formTitle || !formId) {
        return {
          props: {
            user: userData.user,
            initialFormData: null,
            error: 'Form not found'
          }
        };
      }

      // Fetch questions
      const questions = await getQuestions(supabase, formId);

      return {
        props: {
          user: userData.user,
          initialFormData: {
            title: formTitle,
            formId,
            questions: questions || [],
            formCode,
            deadline: null
          }
        }
      };
    } catch (error) {
      console.error('Error fetching form data:', error);
      return {
        props: {
          user: userData.user,
          initialFormData: null,
          error: 'Failed to load form data'
        }
      };
    }
  }
}
