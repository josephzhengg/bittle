import Head from 'next/head';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import type { GetServerSidePropsContext } from 'next';

type HomeProps = {
  isLoggedIn: boolean;
};

export default function Home({ isLoggedIn }: HomeProps) {
  return (
    <>
      <Head>
        <title>Bittle</title>
        <meta
          name="description"
          content="Welcome to Bittle, your companion for creating families in your organization."
        />
      </Head>
      <main style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Welcome to Bittle</h1>
        <p>Your best companion in creating families in your organization.</p>
        {!isLoggedIn && (
          <p>
            <Link href="/login">Log in</Link> or{' '}
            <Link href="/signup">Sign up</Link> to get started.
          </p>
        )}
      </main>
    </>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const supabase = createSupabaseServerClient(context);
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session?.user) {
    return {
      redirect: {
        destination: '/dashboard/current',
        permanent: false
      }
    };
  }

  return {
    props: {
      isLoggedIn: false
    }
  };
}
