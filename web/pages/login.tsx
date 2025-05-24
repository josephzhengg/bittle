import React from "react";
import { createSupabaseComponentClient } from "@/utils/supabase/clients/component";
import { useRouter } from "next/router";
import LoginCard from "@/components/login-signup/login-card";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createSupabaseComponentClient();

  return (
    <div className="min-h-screen flex items-center justify-end bg-login-gradient bg-cover bg-no-repeat bg-center px-4 md:px-12 lg:px-24">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl">
        <LoginCard supabase={supabase} router={router} />
      </div>
    </div>
  );
}
