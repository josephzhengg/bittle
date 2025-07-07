import { useRouter } from 'next/router';
import { useSupabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import {
  getFamilyTreeByCode,
  getFamilyTreeMembers
} from '@/utils/supabase/queries/family-tree';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { GetServerSidePropsContext } from 'next';
import type { User } from '@supabase/supabase-js';
import DashboardLayout from '@/components/layouts/dashboard-layout';
import FamilyTreeFlowWrapper from '@/components/family-tree-components/family-tree-graph';

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

  const membersQuery = useQuery({
    queryKey: ['family-members', familyTreeQuery.data?.id],
    queryFn: async () => {
      if (familyTreeQuery.data?.id) {
        return await getFamilyTreeMembers(supabase, familyTreeQuery.data.id);
      }
      return null;
    },
    enabled: !!familyTreeQuery.data?.id
  });

  // Handle loading and error states
  if (familyTreeQuery.isLoading) {
    return (
      <DashboardLayout user={user}>
        <div>Loading family tree...</div>
      </DashboardLayout>
    );
  }

  if (familyTreeQuery.error) {
    return (
      <DashboardLayout user={user}>
        <div>Error loading family tree: {familyTreeQuery.error.message}</div>
      </DashboardLayout>
    );
  }

  if (!familyTreeQuery.data) {
    return (
      <DashboardLayout user={user}>
        <div>Family tree not found</div>
      </DashboardLayout>
    );
  }

  if (membersQuery.isLoading) {
    return (
      <DashboardLayout user={user}>
        <div>Loading family tree members...</div>
      </DashboardLayout>
    );
  }

  if (membersQuery.error) {
    return (
      <DashboardLayout user={user}>
        <div>
          Error loading family tree members: {membersQuery.error.message}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div>
        {membersQuery.data ? (
          <FamilyTreeFlowWrapper familyTreeId={familyTreeQuery.data.id} />
        ) : (
          <div>No family tree data available</div>
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
