import DashBoardLayout from '@/components/layouts/dashboard-layout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useSupabase } from '@/lib/supabase';
import { Edit } from 'lucide-react';
import { Label } from '@/components/ui/label';
import ReadOnlyQuestionCard from '@/components/question-components/read-only-question-card';

import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { getFormTitle, getFormIdByCode } from '@/utils/supabase/queries/form';
import { getQuestions } from '@/utils/supabase/queries/question';

import type { User } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';

import { GetServerSidePropsContext } from 'next';

import { useRouter } from 'next/router';
import { z } from 'zod';

export type CurrentFormsPageProps = {
  user: User;
};

export default function FormPage({ user }: CurrentFormsPageProps) {
  const router = useRouter();
  const supabase = useSupabase();
  const { 'form-code': formCode } = router.query;

  const { data: formData } = useQuery({
    queryKey: ['title'],
    queryFn: async () => {
      const code = z.string().parse(formCode);
      return getFormTitle(supabase, code);
    },
    enabled: !!formCode
  });

  const { data: formId } = useQuery({
    queryKey: ['formID', formCode],
    queryFn: () => {
      const code = z.string().parse(formCode);
      return getFormIdByCode(supabase, code);
    },
    enabled: !!formCode
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ['questions', formId],
    queryFn: () => {
      return formId ? getQuestions(supabase, formId) : Promise.resolve([]);
    },
    enabled: !!formId
  });

  return (
    <DashBoardLayout user={user}>
      <div className="flex flex-col w-full max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <Label className="text-2xl font-bold text-foreground">
            {formData || 'Loading...'}
          </Label>
          <Button
            onClick={() => {
              router.push(`/dashboard/current/form/${formCode}/edit`);
            }}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Form
          </Button>
        </div>
        <Tabs className="w-full" defaultValue="forms">
          <TabsList>
            <TabsTrigger
              value="forms"
              onClick={() =>
                router.push(`/dashboard/current/form/${formCode}`)
              }>
              Forms
            </TabsTrigger>
            <TabsTrigger
              value="applicants"
              onClick={() =>
                router.push(`/dashboard/current/applicants/${formCode}`)
              }>
              Applicants
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading questions...</p>
              </div>
            </div>
          ) : questions && questions.length > 0 ? (
            <>
              <div className="border-b pt-4 pb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Form Preview
                </h2>
                <p className="text-gray-600 mt-1">
                  This is how your form will appear to respondents
                </p>
              </div>
              {questions
                .sort((a, b) => a.index - b.index)
                .map((question) => (
                  <ReadOnlyQuestionCard key={question.id} question={question} />
                ))}
            </>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="max-w-sm mx-auto">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No questions yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Get started by adding questions to your form.
                </p>
                <Button
                  onClick={() => {
                    router.push(`/dashboard/current/form/${formCode}/edit`);
                  }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Add Questions
                </Button>
              </div>
            </div>
          )}
        </div>
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
