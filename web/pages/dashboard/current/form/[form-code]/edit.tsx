import { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { GetServerSidePropsContext } from 'next';
import DashBoardLayout from '@/components/layouts/dashboard-layout';
import { useQuery } from '@tanstack/react-query';
import { getQuestions } from '@/utils/supabase/queries/question';
import { useSupabase } from '@/lib/supabase';
import { useRouter } from 'next/router';
import { z } from 'zod';
import QuestionCard from '@/components/question-components/question-card';
import { getFormIdByCode } from '@/utils/supabase/queries/form';
import { Button } from '@/components/ui/button';

export type EditPageProps = {
  user: User;
};

export default function EditPage({ user }: EditPageProps) {
  const router = useRouter();
  const { 'form-code': formCode } = router.query;
  const supabase = useSupabase();

  const { data: formId } = useQuery({
    queryKey: ['formId'],
    queryFn: () => getFormIdByCode(supabase, z.string().parse(formCode))
  });

  const { data: questionData } = useQuery({
    queryKey: ['question'],
    queryFn: () =>
      formId ? getQuestions(supabase, formId) : Promise.resolve([]),
    enabled: !!formId
  });

  return (
    <DashBoardLayout user={user}>
      <Button
        onClick={() => {
          router.push(`/dashboard/current/form/${formCode}`);
        }}>
        Stop Editing
      </Button>
      {questionData?.map((question) => (
        <QuestionCard key={question.id} question={question} />
      ))}
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
