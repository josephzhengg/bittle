import { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { GetServerSidePropsContext } from 'next';
import DashBoardLayout from '@/components/layouts/dashboard-layout';

export type EditPageProps = {
  user: User;
};

export default function EditPage({ user }: EditPageProps) {
  return (
    <DashBoardLayout user={user}>
      <p>Hi</p>
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
