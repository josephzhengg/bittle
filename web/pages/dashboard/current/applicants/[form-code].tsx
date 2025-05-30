import DashBoardLayout from '@/components/layouts/dashboard-layout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import type { User } from '@supabase/supabase-js';
import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';

export type CurrentFormsPageProps = {
  user: User;
};
export default function FormPage({ user }: CurrentFormsPageProps) {
  const router = useRouter();
  const { 'form-code': formCode } = router.query;
  return (
    <DashBoardLayout user={user}>
      <Tabs defaultValue="applicants">
        <TabsList>
          <TabsTrigger
            value="forms"
            onClick={() => router.push(`/dashboard/current/form/${formCode}`)}>
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
      <p>something</p>
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
