import { useEffect } from 'react';
import { createSupabaseComponentClient } from '@/utils/supabase/clients/component';
import { useRouter } from 'next/router';
import LoginCard from '@/components/login-signup/login-card';
import LoginLayout from '@/components/layouts/login-card-layout';
import Head from 'next/head';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createSupabaseComponentClient();

  // Redirects to home page if user is already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard/current');
      }
    });
  }, [router, supabase]);

  return (
    <>
      <Head>
        <title>Login – Bittle</title>
        <meta
          name="description"
          content="Log in to Bittle to manage families in your organization."
        />
        <meta property="og:title" content="Login – Bittle" />
        <meta
          property="og:description"
          content="Log in to Bittle to manage families in your organization."
        />
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
      </Head>
      <LoginLayout>
        <LoginCard supabase={supabase} router={router} />
      </LoginLayout>
    </>
  );
}
