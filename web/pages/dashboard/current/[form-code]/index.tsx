import { useRouter } from 'next/router';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { GetServerSidePropsContext } from 'next';
import { useEffect } from 'react';

export default function FormPage() {
  const router = useRouter();
  const formCode = router.query['form-code'] as string | undefined;

  useEffect(() => {
    if (formCode === undefined) return;
    if (!formCode) {
      router.push('/dashboard/current');
    } else {
      router.push(`/dashboard/current/${formCode.toUpperCase()}/form`);
    }
  }, [formCode, router]);

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
    props: {}
  };
}
