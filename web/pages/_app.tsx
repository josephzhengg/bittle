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

// Loading spinner component
const LoadingSpinner = () => (
  <div className="relative">
    <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-400 rounded-full animate-spin"></div>
    <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-purple-400 rounded-full animate-spin animation-delay-150"></div>
  </div>
);

// Glassmorphic container component
const GlassmorphicContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl max-w-md w-full text-center">
      {children}
    </div>
  </div>
);

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const excludedRoutes = ['/login', '/signup', '/input-code'];
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useSupabase();

  // Check if current route is excluded (including dynamic input-code routes)
  const isExcludedRoute =
    excludedRoutes.includes(router.pathname) ||
    router.pathname.startsWith('/input-code/');

  useEffect(() => {
    // Fetches the user currently logged in
    async function fetchUser() {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUser();
  }, [supabase, router]);

  if (isLoading && !isExcludedRoute) {
    // Handles loading state with glassmorphic design
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        themes={['light', 'dark']}>
        <Toaster />
        <GlassmorphicContainer>
          <div className="space-y-6">
            <div className="flex justify-center">
              <LoadingSpinner />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                Loading Application
              </h2>
              <p className="text-blue-200/80">
                Please wait while we prepare your experience...
              </p>
            </div>
          </div>
        </GlassmorphicContainer>
      </ThemeProvider>
    );
  }

  if (isExcludedRoute) {
    // Handles routes that don't require authentication
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

  if (!user) {
    // Protects routes that require authentication with glassmorphic design
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        themes={['light', 'dark']}>
        <Toaster />
        <GlassmorphicContainer>
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-full flex items-center justify-center border border-blue-400/40">
                <svg
                  className="w-8 h-8 text-blue-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                Authentication Required
              </h2>
              <p className="text-blue-200/80 mb-6">
                Please log in to access your account and continue
              </p>
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-gradient-to-r from-blue-500/80 to-purple-500/80 hover:from-blue-500/90 hover:to-purple-500/90 text-white font-semibold py-3 px-6 rounded-xl border border-blue-400/60 shadow-lg transition-all duration-200 hover:shadow-xl">
                Go to Login
              </button>
            </div>
          </div>
        </GlassmorphicContainer>
      </ThemeProvider>
    );
  }

  return (
    // Renders the application with authentication
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
