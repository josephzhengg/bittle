import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useSupabase } from '@/lib/supabase';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { Toaster } from 'sonner';
import 'reactflow/dist/style.css';

const queryClient = new QueryClient();

// const AuthRequired = () => {
//   const router = useRouter();

//   return (
//     <div className="min-h-screen flex items-center justify-center p-4">
//       <div className="text-center space-y-4">
//         <h2 className="text-2xl font-semibold">Authentication Required</h2>
//         <p className="text-muted-foreground">Please log in to continue</p>
//         <button
//           onClick={() => router.push('/login')}
//           className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
//           Go to Login
//         </button>
//       </div>
//     </div>
//   );
// };

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

  // Check if current route is excluded
  const isExcludedRoute =
    excludedRoutes.includes(router.pathname) ||
    router.pathname.startsWith('/input-code/');

  useEffect(() => {
    async function initializeAuth() {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setAuthInitialized(true);
      }
    }

    // Only initialize auth once
    if (!authInitialized) {
      initializeAuth();
    }
  }, [supabase, authInitialized]);

  // Handle excluded routes immediately
  if (isExcludedRoute) {
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

  // For protected routes, show auth required if no user (after auth is initialized)
  if (authInitialized && !user) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        themes={['light', 'dark']}>
        <Toaster />
        {/* <AuthRequired /> */}
      </ThemeProvider>
    );
  }

  // If auth hasn't been initialized yet, render nothing (prevents flash)
  if (!authInitialized) {
    return null;
  }

  // Normal app rendering
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
