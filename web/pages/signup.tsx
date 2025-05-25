import { useRouter } from "next/router";
import { createSupabaseComponentClient } from "@/utils/supabase/clients/component";
import SignupCard from "@/components/login-signup/signup-card";
import Image from "next/image";
import { Label } from "@/components/ui/label";
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
    <div className="relative min-h-screen bg-login-gradient bg-cover bg-no-repeat bg-center">
      {/* Desktop Layout */}
      <div className="hidden lg:flex items-center justify-end min-h-screen px-4">
        <div className="absolute top-4 left-4 flex flex-col items-start">
          <Image
            src="/bittle_logo.png"
            alt="Bittle Logo"
            width={350}
            height={100}
            priority
            className="block -mb-2"
          />
          <Label className="text-5xl leading-tight pl-5 py-20 text-background">
            Your best companion in building families
            <br />
            in your organization
          </Label>
        </div>
        <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl transition-all duration-300 mr-0 lg:mr-20">
          <SignupCard supabase={supabase} router={router} />
        </div>
      </div>

      {/* Mobile Layout - Scrollable */}
      <div className="lg:hidden min-h-screen py-8">
        <div className="flex flex-col items-center">
          <div className="flex justify-center pb-8">
            <Image
              src="/bittle_logo.png"
              alt="Bittle Logo"
              width={250}
              height={75}
              priority
              className="block"
            />
          </div>
          <SignupCard supabase={supabase} router={router} />
        </div>
      </div>
    </div>
  );
}
