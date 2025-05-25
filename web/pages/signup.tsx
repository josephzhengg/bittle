import { useRouter } from "next/router";
import { createSupabaseComponentClient } from "@/utils/supabase/clients/component";
import SignupCard from "@/components/login-signup/signup-card";
import SignupLayout from "@/components/layouts/signup-card-layout";
// import { useEffect } from "react";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createSupabaseComponentClient();

  // Redirects to home page if user is already logged in
  // useEffect(() => {
  //   supabase.auth.getSession().then(({ data: { session } }) => {
  //     if (session) {
  //       router.replace("/");
  //     }
  //   });
  // }, [router, supabase]);

  return (
    <SignupLayout>
      <SignupCard supabase={supabase} router={router} />
    </SignupLayout>
  );
}
