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
    <Card className="w-full max-w-full sm:max-w-2xl lg:max-w-3xl">
      <CardHeader>
        <CardTitle className="text-6xl">Welcome to Bittle!</CardTitle>
        <CardDescription className="text-3xl">
          Enter in your information to log in below.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-2xl">Email</Label>
          <Input
            type="email"
            placeholder="johndoe@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-8 text-xl"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-2xl">Password</Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="p-8 pr-28 text-xl"
            />
            <Button
              type="button"
              variant="ghost"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-lg px-6 py-3 bg-white hover:bg-gray-300 focus:ring-0"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "Hide" : "Show"}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between p-4">
          <p className="text-xl">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="hover:underline font-bold text-primary"
            >
              Sign Up
            </Link>
          </p>
          <Button className="px-24 py-8 text-2xl" onClick={logIn}>
            Log In
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
