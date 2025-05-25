import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SupabaseClient } from "@supabase/supabase-js";
// import Image from "next/image";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NextRouter } from "next/router";

type LoginCardProps = {
  supabase: SupabaseClient;
  router: NextRouter;
};

export default function LoginCard({ supabase, router }: LoginCardProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const logIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      window.alert(error.message);
    } else {
      router.push("/");
    }
  };

  //   const google_icon =
  //     "https://hfgwvyysughxuvomsxmq.supabase.co/storage/v1/object/public/public-images//google_logo.png";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-5xl">Welcome to Bittle!</CardTitle>
        <CardDescription className="text-2xl">
          Enter in your information to log in below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* <div className="flex justify-center">
          <Button className="w-full flex items-center justify-center gap-2 px-6 py-6 text-lg">
            <Image src={google_icon} alt="Google Icon" width={24} height={24} />
            Continue with Google
          </Button>
        </div> */}

        <div className="space-y-1">
          <Label className="text-xl">Email</Label>
          <Input
            type="email"
            placeholder="johndoe@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-6"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xl">Password</Label>
          <Input
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-6"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center justify-between p-4">
          <p className="text-sm">
            Don&apos;t have an account?{" "}
            <a
              href="/signup"
              className="hover:underline font-bold text-primary"
            >
              Sign up
            </a>
          </p>
          <Button className="px-20 py-6 text-lg" onClick={logIn}>
            Login
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
