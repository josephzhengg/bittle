<<<<<<< HEAD
export default function Login() {
  return (
    <div className="bg-login-gradient min-h-screen text-white flex items-center justify-center flex-col">
      <h1>Login</h1>
      <p>Login page</p>
    </div>
=======
import { useEffect } from "react";
import { createSupabaseComponentClient } from "@/utils/supabase/clients/component";
import { useRouter } from "next/router";
import LoginCard from "@/components/login-signup/login-card";
import LoginLayout from "@/components/layouts/login-card-layout";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createSupabaseComponentClient();

  // Redirects to home page if user is already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/dashboard/current");
      }
    });
  }, [router, supabase]);

  return (
    <LoginLayout>
      <LoginCard supabase={supabase} router={router} />
    </LoginLayout>
>>>>>>> origin
  );
}
