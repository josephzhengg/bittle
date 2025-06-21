import DashBoardLayout from '@/components/layouts/dashboard-layout';
import { useSupabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { GetServerSidePropsContext } from 'next';
import { getForms } from '@/utils/supabase/queries/form';
import { useQuery } from '@tanstack/react-query';
import FormCard from '@/components/dashboard-components/form-card';
import { FileText } from 'lucide-react';

export type CurrentFormsPageProps = {
  user: User;
};

export default function CurrentFormsPage({ user }: CurrentFormsPageProps) {
  const supabase = useSupabase();

  const { data: formData, isLoading } = useQuery({
    queryKey: ['form'],
    queryFn: async () => getForms(supabase, user.id)
  });

  // Filter out expired forms and sort by newest first
  const activeFormsData = formData
    ?.filter((form) => !form.deadline || new Date(form.deadline) > new Date())
    .sort((a, b) => {
      // Sort by created_at in descending order (newest first)
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

        {/* Forms Grid */}
        {isLoading ? (
          <div className="space-y-4">
            {/* Loading skeleton */}
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-white/60 rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center gap-6">
                    <div className="flex-1">
                      <div className="w-16 h-1 bg-slate-300 rounded-full mb-3"></div>
                      <div className="h-6 bg-slate-300 rounded mb-2 w-2/3"></div>
                      <div className="h-4 bg-slate-200 rounded mb-4 w-full"></div>
                      <div className="flex gap-4">
                        <div className="h-3 bg-slate-200 rounded w-32"></div>
                        <div className="h-3 bg-slate-200 rounded w-28"></div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
                      <div className="w-24 h-9 bg-slate-200 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activeFormsData && activeFormsData.length > 0 ? (
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
        {formData && formData.length > 0 && (
          <div className="mt-8 p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Quick Stats
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white/50 rounded-lg border border-slate-100">
                <div className="text-2xl font-bold text-purple-600">
                  {formData.length}
                </div>
                <div className="text-sm text-slate-600">Total Forms</div>
              </div>
              <div className="text-center p-4 bg-white/50 rounded-lg border border-slate-100">
                <div className="text-2xl font-bold text-green-600">
                  {
                    formData.filter(
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
                    formData.filter(
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

  return {
    props: {
      user: userData.user
    }
  };
}
