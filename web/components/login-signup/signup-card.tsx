import { SupabaseClient } from "@supabase/supabase-js";
import { NextRouter } from "next/router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SignupCardProps = {
  supabase: SupabaseClient;
  router: NextRouter;
};

export default function SignupCard({ supabase, router }: SignupCardProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  const signUp = async () => {
    if (password !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }

    setPasswordMismatch(false);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name, affiliation: affiliation } },
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
          Enter in your information to sign up!
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

        <div className="space-y-1">
          <Label className="text-xl">Password</Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="p-6 pr-20"
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
        </div>

        <div className="space-y-1">
          <Label className="text-xl">Confirm Password</Label>
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Retype your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="p-6"
          />
          {passwordMismatch && (
            <p className="text-red-500 text-sm mt-1">Passwords do not match.</p>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xl">Organization Name</Label>
          <Input
            type="text"
            placeholder="Your organization's name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="p-6"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xl">University or College (Optional)</Label>
          <Input
            type="text"
            placeholder="University or College"
            value={affiliation}
            onChange={(e) => setAffiliation(e.target.value)}
            className="p-6"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center justify-between p-4">
          <p className="text-sm">
            Already have an account?{" "}
            <Link
              href="/login"
              className="hover:underline font-bold text-primary"
            >
              Log In
            </Link>
          </p>
          <Button className="px-20 py-6 text-lg" onClick={signUp}>
            Sign Up
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
