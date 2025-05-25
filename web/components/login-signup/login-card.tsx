import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { NextRouter } from "next/router";

type LoginCardProps = {
  supabase: SupabaseClient;
  router: NextRouter;
};

export default function LoginCard({ supabase, router }: LoginCardProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-5xl">Welcome to Bittle!</CardTitle>
        <CardDescription className="text-2xl">
          Enter in your information to log in below.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
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

        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-6 pr-24"
          />
          <Button
            type="button"
            variant="ghost"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-sm px-4 py-2 bg-white hover:bg-gray-300 active:bg-accent focus:bg-white focus:ring-0"
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? "Hide" : "Show"}
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center justify-between p-4">
          <p className="text-sm">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="hover:underline font-bold text-primary"
            >
              Sign Up
            </Link>
          </p>
          <Button className="px-20 py-6 text-lg" onClick={logIn}>
            Log In
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
