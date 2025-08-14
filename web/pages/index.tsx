import Head from 'next/head';
import { useEffect } from 'react';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import type { GetServerSidePropsContext } from 'next';

type HomeProps = {
  isLoggedIn: boolean;
};

export default function Home({ isLoggedIn = false }: HomeProps) {
  useEffect(() => {
    console.log('Home props:', { isLoggedIn });
  }, [isLoggedIn]);

  return (
    <>
      <Head>
        <title>Bittle</title>
        <meta
          name="description"
          content="Welcome to Bittle, your companion for creating families in your organization."
        />
        <meta name="robots" content="noindex, follow" />{' '}
        <link rel="canonical" href="https://bittle.me/" />
      </Head>
      <main style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Welcome to Bittle</h1>
        <p>Your best companion in creating families in your organization.</p>
        <p>Redirecting to login...</p>{' '}
        {/* Optional: Show a message during redirect */}
      </main>
    </>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  try {
    const supabase = createSupabaseServerClient(context);
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error) {
      return {
        redirect: {
          destination: '/login',
          permanent: false
        }
      };
    }

    if (session?.user) {
      return {
        redirect: {
          destination: '/dashboard/current',
          permanent: false
        }
      };
    }

    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  } catch {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }
}
