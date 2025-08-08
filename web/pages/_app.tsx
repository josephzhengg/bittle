import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useSupabase } from '@/lib/supabase';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { Toaster } from 'sonner';

export default function App({ Component, pageProps }: AppProps) {
  const [user, setUser] = useState<User | null>(null);
  const supabase = useSupabase();
  const queryClient = new QueryClient();

  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Toaster />
        <Component {...pageProps} user={user} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
