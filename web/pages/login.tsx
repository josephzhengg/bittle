import React from "react";
import { createSupabaseComponentClient } from "@/utils/supabase/clients/component";
import { useRouter } from "next/router";
import LoginCard from "@/components/login-signup/login-card";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createSupabaseComponentClient();

  // Redirects to home page if user is already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/");
      }
    });
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-end bg-login-gradient bg-cover bg-no-repeat bg-center px-4">
      <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl transition-all duration-300">
        <LoginCard supabase={supabase} router={router} />
      </div>
    </div>
  );
}
