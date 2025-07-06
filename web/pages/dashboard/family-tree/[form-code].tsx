import { useRouter } from 'next/router';
import { useSupabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { getFamilyTreeByCode } from '@/utils/supabase/queries/family-tree';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { GetServerSidePropsContext } from 'next';
import type { User } from '@supabase/supabase-js';
import DashboardLayout from '@/components/layouts/dashboard-layout';

export type FamilyTreePageProps = {
  user: User;
};

export default function FamilyTreePage({ user }: FamilyTreePageProps) {
  const router = useRouter();
  const supabase = useSupabase();
  const { 'form-code': formCode } = router.query;

  const familyTreeQuery = useQuery({
    queryKey: ['family-tree', formCode],
    queryFn: async () => {
      if (typeof formCode === 'string') {
        return await getFamilyTreeByCode(supabase, formCode);
      }
      return null;
    },
    enabled: !!formCode
  });

  return (
    <DashboardLayout user={user}>
      <div>
        {familyTreeQuery.isLoading && <div>Loading...</div>}
        {familyTreeQuery.error && <div>Error loading family tree.</div>}
        {familyTreeQuery.data && (
          <pre>{JSON.stringify(familyTreeQuery.data, null, 2)}</pre>
        )}
      </div>
    </DashboardLayout>
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
