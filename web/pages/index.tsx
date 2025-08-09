import Head from 'next/head';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import type { GetServerSidePropsContext } from 'next';

export default function Home() {
  return (
    <>
      <Head>
        <title>Bittle</title>
        <meta
          name="description"
          content="Welcome to Bittle, your companion for creating families in your organization."
        />
      </Head>
      {null}
    </>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const accessToken = context.req.cookies['sb-access-token'];
  if (!accessToken) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  const supabase = createSupabaseServerClient(context);
  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  return {
    redirect: {
      destination: '/dashboard/current',
      permanent: false
    }
  };
}
