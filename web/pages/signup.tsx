import { useRouter } from "next/router";
import { createSupabaseComponentClient } from "@/utils/supabase/clients/component";
import SignupCard from "@/components/login-signup/signup-card";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createSupabaseComponentClient();

  return (
    <div className="min-h-screen flex items-center justify-end bg-login-gradient bg-cover bg-no-repeat bg-center px-4">
      <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl transition-all duration-300">
        <SignupCard supabase={supabase} router={router} />
      </div>
    </div>
  );
}
