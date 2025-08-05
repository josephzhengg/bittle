import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useSupabase } from '@/lib/supabase';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { Toaster } from 'sonner';

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

  if (!isExcludedRoute && !user) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        themes={['light', 'dark']}>
        <Toaster />
      </ThemeProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        themes={['light', 'dark']}>
        <Toaster />
        <Component {...pageProps} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
