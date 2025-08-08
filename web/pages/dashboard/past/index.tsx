import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { User } from '@supabase/supabase-js';
import { GetServerSidePropsContext } from 'next';
import { getForms } from '@/utils/supabase/queries/form';

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

type Form = Awaited<ReturnType<typeof getForms>>[0];

export type PastFormsPageProps = {
  user: User;
  formsData: Form[];
};

export default function PastFormsPage({ user, formsData }: PastFormsPageProps) {
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
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Your Past Forms
          </h1>
          <p className="text-slate-600">
            Review and manage all your expired forms
          </p>
        </div>

        {/* Forms Grid */}
        {pastFormsData && pastFormsData.length > 0 ? (
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

        {/* Statistics Section */}
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
  const { createSupabaseServerClient } = await import(
    '@/utils/supabase/clients/server-props'
  );
  const supabase = createSupabaseServerClient(context);
  const { data: userData, error } = await supabase.auth.getUser();

  if (error || !userData?.user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  let formsData: Form[] = [];
  try {
    formsData = await getForms(supabase, userData.user.id);
  } catch {
    formsData = [];
  }

  return {
    props: {
      user: userData.user,
      formsData: formsData || []
    }
  };
}