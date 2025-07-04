import { GetServerSidePropsContext } from 'next';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { User } from '@supabase/supabase-js';
import DashBoardLayout from '@/components/layouts/dashboard-layout';

export type FamilyTreePageProps = {
  user: User;
};

export default function FamilyTreePage({ user }: FamilyTreePageProps) {
  return (
    <DashBoardLayout user={user}>
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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
