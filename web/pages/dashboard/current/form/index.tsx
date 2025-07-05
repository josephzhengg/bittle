import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { getForms } from '@/utils/supabase/queries/form';
import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { GetServerSidePropsContext } from 'next';
import { useSupabase } from '@/lib/supabase';
import { useEffect } from 'react';

type FormPageProps = {
  user: User;
};

export default function FormPage({ user }: FormPageProps) {
  const supabase = useSupabase();
  const router = useRouter();

  const { data: formData } = useQuery({
    queryKey: ['form'],
    queryFn: () => getForms(supabase, user.id)
  });

  useEffect(() => {
    if (formData && formData[0]) {
      router.push(`/dashboard/current`);
    }
  }, [router, formData, supabase]);

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
