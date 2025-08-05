import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { getForms } from '@/utils/supabase/queries/form';
import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { GetServerSidePropsContext } from 'next';
import { useSupabase } from '@/lib/supabase';
import { useEffect } from 'react';

type DashboardProps = {
  user: User;
};

export default function Dashboard({ user }: DashboardProps) {
  const supabase = useSupabase();
  const router = useRouter();

  const {
    data: formData,
    error,
    isLoading
  } = useQuery({
    queryKey: ['form', user.id], // Include user.id in queryKey for cache uniqueness
    queryFn: () => getForms(supabase, user.id)
  });

  useEffect(() => {
    if (!router.isReady) return;

    if (error) {
      console.error('Error fetching forms:', error);
      router.replace('/error'); // Redirect to an error page or fallback
      return;
    }

    if (!isLoading && formData) {
      if (formData[0]) {
        router.replace(`/dashboard/form/${formData[0].id}`); // Redirect to first form
      } else {
        router.replace('/dashboard/empty'); // Redirect if no forms exist
      }
    }
  }, [router, formData, isLoading, error, router.isReady]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const supabase = createSupabaseServerClient(context);
  const { data: userData, error } = await supabase.auth.getUser();

  if (error || !userData.user) {
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
