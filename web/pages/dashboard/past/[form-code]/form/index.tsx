import DashBoardLayout from '@/components/layouts/dashboard-layout';
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
import { Edit, FileText, Eye, RefreshCw, Clock, Settings } from 'lucide-react';
import ReadOnlyQuestionCard from '@/components/question-components/read-only-question-card';
import { FormEditDialog } from '@/components/dashboard-components/form-edit-dialog';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import {
  getFormIdByCode,
  getFormDeadline,
  getFormData
} from '@/utils/supabase/queries/form';
import { getQuestions } from '@/utils/supabase/queries/question';
import type { User } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { z } from 'zod';
import { useMemo, useState } from 'react';
import { Question } from '@/utils/supabase/models/question';
import { FormStatsCards } from '@/components/dashboard-components/form-stats-card';
import FormNavigationTabs from '@/components/dashboard-components/form-navigation-tabs';
import FormStatusBadge from '@/components/dashboard-components/form-status-badge';
import { QrCode } from 'lucide-react';
import { toast } from 'sonner';

export type PastFormsPageProps = {
  user: User;
  initialFormData: {
    id: string;
    title: string;
    description?: string;
    deadline?: string;
    formId: string;
    questions: Question[];
    formCode: string;
  } | null;
  error?: string;
};

export default function FormPage({
  user,
  initialFormData,
  error
}: PastFormsPageProps) {
  const router = useRouter();
  const supabase = useSupabase();
  const { 'form-code': formCode } = router.query;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: formData, refetch: refetchForm } = useQuery({
    queryKey: ['formData', formCode],
    queryFn: async () => {
      const code = z.string().parse(formCode);
      return getFormData(supabase, code);
    },
    enabled: !!formCode,
    initialData: initialFormData
      ? {
          id: initialFormData.id,
          title: initialFormData.title,
          description: initialFormData.description,
          deadline: initialFormData.deadline
        }
      : undefined,
    staleTime: 5 * 60 * 1000
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

  const sortedQuestions = useMemo(() => {
    return questions ? [...questions].sort((a, b) => a.index - b.index) : [];
  }, [questions]);

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

  const stats = useMemo(() => {
    if (!sortedQuestions) return null;

    const total = sortedQuestions.length;
    const typeBreakdown = sortedQuestions.reduce((acc, question) => {
      acc[question.type] = (acc[question.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, typeBreakdown };
  }, [sortedQuestions]);

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchForm(), refetchQuestions()]);
    } finally {
      setIsRefreshing(false);
    }
  };

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
                {formData?.title || <Skeleton className="h-8 w-64" />}
              </h1>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-xs w-fit bg-purple-50 text-purple-700 border-purple-200">
                  {formCode}
                </Badge>
                {formData?.deadline && (
                  <FormStatusBadge deadline={formData.deadline} />
                )}
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              Form preview and structure
            </p>
          </div>

          {/* Description Section */}
          {formData?.description && (
            <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-100">
              <p className="text-sm text-slate-700 leading-relaxed">
                {formData.description}
              </p>
            </div>
          )}

          {/* Deadline Section */}
          {formData?.deadline && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
              <div className="flex items-center gap-2 text-sm">
                <Clock
                  className={`w-4 h-4 ${
                    formData.deadline
                      ? 'text-green-600'
                      : 'text-muted-foreground'
                  }`}
                />
                <span className="text-slate-600 font-medium">Deadline:</span>
                <span className="font-semibold text-green-600">
                  {formatDateTime(formData.deadline)}
                </span>
              </div>
            </div>
          )}

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

            {formData && (
              <FormEditDialog
                form={{
                  id: formData.id,
                  title: formData.title,
                  description: formData.description,
                  deadline: formData.deadline
                }}
                onSuccess={handleRefresh}
                trigger={
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto sm:min-w-[140px]">
                    <Settings className="w-4 h-4 mr-2" />
                    Edit Form Info
                  </Button>
                }
              />
            )}

            <Button
              variant="outline"
              onClick={handleDownloadQR}
              disabled={!formCode}
              className="w-full sm:w-auto sm:min-w-[160px]">
              <QrCode className="w-4 h-4 mr-2" />
              Download QR Code
            </Button>

            <Button
              onClick={() => {
                router.push(
                  `/dashboard/past/${
                    typeof formCode === 'string' ? formCode.toUpperCase() : ''
                  }/form/edit`
                );
              }}
              className="w-full sm:w-auto sm:min-w-[120px]">
              <Edit className="w-4 h-4 mr-2" />
              Edit Questions
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <FormNavigationTabs
          formCode={typeof formCode === 'string' ? formCode : ''}
          currentTab="forms"
          basePath="past"
        />

        {/* Statistics Cards */}
        <FormStatsCards
          formCode={typeof formCode === 'string' ? formCode : 'N/A'}
          formData={{ deadline: formData?.deadline }}
          stats={stats}
          isPageLoading={isPageLoading}
        />

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
            <div className="space-y-6">
              {(() => {
                let questionCounter = 0;
                return sortedQuestions.map((question) => {
                  if (question.type !== 'SECTION_HEADER') {
                    questionCounter++;
                    return (
                      <div key={question.id} className="relative">
                        <div className="absolute -left-4 top-0 text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded">
                          #{questionCounter}
                        </div>
                        <ReadOnlyQuestionCard
                          question={question}
                          displayNumber={questionCounter}
                        />
                      </div>
                    );
                  } else {
                    return (
                      <div key={question.id} className="relative">
                        <ReadOnlyQuestionCard
                          question={question}
                          displayNumber={questionCounter}
                        />
                      </div>
                    );
                  }
                });
              })()}
            </div>
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

  if (!formCode || typeof formCode !== 'string') {
    return {
      props: {
        user: userData.user,
        initialFormData: null,
        error: 'Invalid form code'
      }
    };
  }

  try {
    const deadline = await getFormDeadline(supabase, formCode);
    const now = new Date();
    const isDeadlinePassed = deadline ? new Date(deadline) < now : false;

    if (currentPath.includes('/dashboard/past/form/') && !isDeadlinePassed) {
      return {
        redirect: {
          destination: `/dashboard/current/form/${formCode}`,
          permanent: false
        }
      };
    }

    if (currentPath.includes('/dashboard/current/form/') && isDeadlinePassed) {
      return {
        redirect: {
          destination: `/dashboard/past/form/${formCode}`,
          permanent: false
        }
      };
    }

    const [formData, formId] = await Promise.all([
      getFormData(supabase, formCode),
      getFormIdByCode(supabase, formCode)
    ]);

    if (!formData || !formId) {
      return {
        props: {
          user: userData.user,
          initialFormData: null,
          error: 'Form not found'
        }
      };
    }

    const questions = await getQuestions(supabase, formId);

    return {
      props: {
        user: userData.user,
        initialFormData: {
          id: formData.id,
          title: formData.title,
          description: formData.description,
          deadline: formData.deadline || null,
          formId,
          questions: questions || [],
          formCode
        }
      }
    };
  } catch {
    try {
      const [formData, formId] = await Promise.all([
        getFormData(supabase, formCode),
        getFormIdByCode(supabase, formCode)
      ]);

      if (!formData || !formId) {
        return {
          props: {
            user: userData.user,
            initialFormData: null,
            error: 'Form not found'
          }
        };
      }

      const questions = await getQuestions(supabase, formId);

      return {
        props: {
          user: userData.user,
          initialFormData: {
            id: formData.id,
            title: formData.title,
            description: formData.description,
            deadline: formData.deadline || null,
            formId,
            questions: questions || [],
            formCode
          }
        }
      };
    } catch {
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
