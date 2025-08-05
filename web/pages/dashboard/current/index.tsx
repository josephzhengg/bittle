import DashBoardLayout from '@/components/layouts/dashboard-layout';
import { useSupabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { GetServerSidePropsContext } from 'next';
import { getForms } from '@/utils/supabase/queries/form';
import { useQuery } from '@tanstack/react-query';
import FormCard from '@/components/dashboard-components/form-card';
import { FileText } from 'lucide-react';

type Form = Awaited<ReturnType<typeof getForms>>[0];

export type CurrentFormsPageProps = {
  user: User;
  initialFormsData: Form[];
};

export default function CurrentFormsPage({
  user,
  initialFormsData
}: CurrentFormsPageProps) {
  const supabase = useSupabase();

  // Use server data as initial data, but enable real-time updates
  const { data: formsData = initialFormsData } = useQuery({
    queryKey: ['form'],
    queryFn: async () => getForms(supabase, user.id),
    initialData: initialFormsData, // Start with server data
    staleTime: 30 * 1000, // Consider fresh for 30 seconds
    refetchOnWindowFocus: true // Refetch when user returns to tab
  });

  // Filter and sort logic
  const activeFormsData = formsData
    ?.filter((form) => !form.deadline || new Date(form.deadline) > new Date())
    .sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB.getTime() - dateA.getTime();
    });

  return (
    <DashBoardLayout user={user}>
      <div className="space-y-6">
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Your Current Forms
          </h1>
          <p className="text-slate-600">
            Manage and view all your active forms in one place
          </p>
        </div>

        {/* Forms Grid - Renders instantly with server data */}
        {activeFormsData && activeFormsData.length > 0 ? (
          <div className="space-y-4">
            {activeFormsData.map((form) => (
              <FormCard key={form.id} form={form} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              No active forms
            </h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              You don&#39;t have any active forms at the moment.
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
                  {formsData.length}
                </div>
                <div className="text-sm text-slate-600">Total Forms</div>
              </div>
              <div className="text-center p-4 bg-white/50 rounded-lg border border-slate-100">
                <div className="text-2xl font-bold text-green-600">
                  {
                    formsData.filter(
                      (form) =>
                        !form.deadline || new Date(form.deadline) > new Date()
                    ).length
                  }
                </div>
                <div className="text-sm text-slate-600">Active Forms</div>
              </div>
              <div className="text-center p-4 bg-white/50 rounded-lg border border-slate-100">
                <div className="text-2xl font-bold text-red-600">
                  {
                    formsData.filter(
                      (form) =>
                        form.deadline && new Date(form.deadline) < new Date()
                    ).length
                  }
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

  const { data: userData, error } = await supabase.auth.getUser();

  if (!userData || error) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  let initialFormsData: Form[] = [];
  try {
    initialFormsData = await getForms(supabase, userData.user.id);
  } catch {
    initialFormsData = [];
  }

  return {
    props: {
      user: userData.user,
      initialFormsData: initialFormsData || []
    }
  };
}
