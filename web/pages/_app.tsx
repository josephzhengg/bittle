import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { useSupabase } from "@/lib/supabase";
import { ThemeProvider } from "@/components/theme/theme-provider";

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const excludedRoutes = ["/login", "/signup"];
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useSupabase();

  useEffect(() => {
    // Fetches the user currently logged in
    async function fetchUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchUser();
  }, [supabase, router]);

  if (isLoading && !excludedRoutes.includes(router.pathname)) {
    // Handles loading state
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        themes={["light", "dark"]}
      >
        <div className="flex h-screen items-center justify-center">
          <div className="text-foreground">Loading application…</div>
        </div>
      </ThemeProvider>
    );
  }

  if (excludedRoutes.includes(router.pathname)) {
    // Handles routes that don't require authentication
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          themes={["light", "dark"]}
        >
          <Component {...pageProps} />
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  if (!user) {
    // Protects routes that require authentication
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        themes={["light", "dark"]}
      >
        <div className="flex h-screen items-center justify-center">
          <div className="text-foreground">Please log in to continue</div>
        </div>
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
        themes={["light", "dark"]}
      >
        <Component {...pageProps} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
