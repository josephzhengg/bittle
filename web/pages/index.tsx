import Head from 'next/head';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import type { GetServerSidePropsContext } from 'next';

export default function Home() {
  return (
    <>
      <Head>
        <title>Home - My App</title>
        <meta
          name="description"
          content="Welcome to My App, your starting point for managing forms and data."
        />
      </Head>
      {null}
    </>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const supabase = createSupabaseServerClient(context);
  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error) {
    console.error('Error fetching session:', error);
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  return {
    redirect: {
      destination: session?.user ? '/dashboard/current' : '/login',
      permanent: false
    }
  };
}
