import DashBoardLayout from '@/components/layouts/dashboard-layout';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { User } from '@supabase/supabase-js';
import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TreeDeciduous, User2 } from 'lucide-react';

type ManageFamilyTreePageProps = {
  user: User;
};

export default function ManageFamilyTreePage({
  user
}: ManageFamilyTreePageProps) {
  const router = useRouter();
  const { 'form-code': formCode } = router.query;

  return (
    <DashBoardLayout user={user}>
      <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200 p-1 mb-4">
        <Tabs className="w-full" defaultValue="forms">
          <TabsList className="h-12 p-1 bg-transparent rounded-lg w-full grid grid-cols-2">
            <TabsTrigger
              value="family-tree"
              onClick={() =>
                router.push(`/dashboard/family-tree/${formCode}/graph`)
              }
              className="flex items-center gap-2 h-10 px-3 sm:px-6 rounded-md font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-slate-800 text-slate-600 hover:text-slate-800">
              <TreeDeciduous className="w-4 h-4" />
              <span className="hidden xs:inline">Family Tree</span>
            </TabsTrigger>
            <TabsTrigger
              value="forms"
              className="flex items-center gap-2 h-10 px-3 sm:px-6 rounded-md font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-slate-800 text-slate-600 hover:text-slate-800">
              <User2 className="w-4 h-4" />
              <span className="hidden xs:inline">Manage Tree</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </DashBoardLayout>
  );
}

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
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
};
