import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { GetServerSidePropsContext } from 'next';
import { User } from '@supabase/supabase-js';
import DashBoardLayout from '@/components/layouts/dashboard-layout';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Question } from '@/utils/supabase/models/question';
import { QuestionOption } from '@/utils/supabase/models/question-option';
import { QuestionResponse } from '@/utils/supabase/models/question-response';

export type CreatePageProps = {
  user: User;
};

const questions: Question[] = {};

export default function CreatePage({ user }: CreatePageProps) {
  return (
    <DashBoardLayout user={user}>
      <Card></Card>
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
