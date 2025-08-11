import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useSupabase } from '@/lib/supabase';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { Toaster } from 'sonner';
import Head from 'next/head';

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const excludedRoutes = [
    '/login',
    '/signup',
    '/input-code',
    '/reset-password',
    '/forgot-password'
  ];
  const [user, setUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const supabase = useSupabase();

  const isExcludedRoute =
    excludedRoutes.includes(router.pathname) ||
    router.pathname.startsWith('/input-code/');

  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      setAuthInitialized(true);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  if (!authInitialized) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Head>
        <title>Bittle</title>
        <meta
          name="description"
          content="Your best companion in creating families in your organization"
        />
        <meta property="og:title" content="Bittle" />
        <meta
          property="og:description"
          content="Your best companion in creating families in your organization"
        />
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="public/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="public/favicon-16x16.png"
        />
      </Head>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        themes={['light', 'dark']}>
        <Toaster />
        {!isExcludedRoute && !user ? null : <Component {...pageProps} />}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
