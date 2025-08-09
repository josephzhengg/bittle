import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { GetServerSidePropsContext } from 'next';
import { getForms } from '@/utils/supabase/queries/form';
import FormCardSkeleton from '@/components/dashboard-components/form-card-skeleton';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';

const DashBoardLayout = dynamic(
  () => import('@/components/layouts/dashboard-layout'),
  { ssr: true }
);
const FormCard = dynamic(
  () => import('@/components/dashboard-components/form-card'),
  { ssr: true }
);
const FileText = dynamic(
  () => import('lucide-react').then((mod) => mod.FileText),
  { ssr: false }
);

export type PastFormsPageProps = {
  user: User;
};

export default function PastFormsPage({ user }: PastFormsPageProps) {
  const supabase = useSupabase();
  const { data: formsData, isLoading } = useQuery({
    queryKey: ['form', user.id],
    queryFn: () => getForms(supabase, user.id),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  const pastFormsData = useMemo(() => {
    return formsData
      ?.filter((form) => form.deadline && new Date(form.deadline) < new Date())
      .sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB.getTime() - dateA.getTime();
      });
  }, [formsData]);

  const totalForms = formsData?.length || 0;
  const pastFormsCount = pastFormsData?.length || 0;
  const activeFormsCount = totalForms - pastFormsCount;

  return (
    <DashBoardLayout user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Your Past Forms
          </h1>
          <p className="text-slate-600">
            Review and manage all your expired forms
          </p>
        </div>
        {isLoading || !formsData ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <FormCardSkeleton key={i} />
            ))}
          </div>
        ) : pastFormsData && pastFormsData.length > 0 ? (
          <div className="space-y-4">
            {pastFormsData.map((form) => (
              <FormCard key={form.id} form={form} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              No past forms
            </h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              You don&#39;t have any expired forms at the moment.
            </p>
          </div>
        )}
        {formsData && formsData.length > 0 && (
          <div className="mt-8 p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Quick Stats
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white/50 rounded-lg border border-slate-100">
                <div className="text-2xl font-bold text-purple-600">
                  {totalForms}
                </div>
                <div className="text-sm text-slate-600">Total Forms</div>
              </div>
              <div className="text-center p-4 bg-white/50 rounded-lg border border-slate-100">
                <div className="text-2xl font-bold text-green-600">
                  {activeFormsCount}
                </div>
                <div className="text-sm text-slate-600">Active Forms</div>
              </div>
              <div className="text-center p-4 bg-white/50 rounded-lg border border-slate-100">
                <div className="text-2xl font-bold text-red-600">
                  {pastFormsCount}
                </div>
                <div className="text-sm text-slate-600">Expired Forms</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashBoardLayout>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const supabase = createSupabaseServerClient(context);
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  return {
    props: {
      user
    }
  };
}
