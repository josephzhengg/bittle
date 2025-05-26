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
    <Card className="w-full max-w-full sm:max-w-2xl lg:max-w-3xl">
      <CardHeader>
        <CardTitle className="text-6xl">Welcome to Bittle!</CardTitle>
        <CardDescription className="text-3xl mt-2">
          Enter in your information to sign up!
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8 mt-6">
        <div className="space-y-2">
          <Label className="text-2xl">Email</Label>
          <Input
            type="email"
            placeholder="johndoe@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-8 text-xl placeholder:text-xl"
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
              className="p-8 pr-28 text-xl placeholder:text-xl"
            />
            <Button
              type="button"
              variant="ghost"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-lg px-6 py-3 hover:bg-gray-300 focus:ring-0"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "Hide" : "Show"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-2xl">Confirm Password</Label>
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Retype your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="p-8 text-xl placeholder:text-xl"
          />
          {passwordMismatch && (
            <p className="text-red-500 text-lg mt-1">Passwords do not match.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-2xl">Organization Name</Label>
          <Input
            type="text"
            placeholder="Your organization's name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="p-8 text-xl placeholder:text-xl"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-2xl">University or College (Optional)</Label>
          <Input
            type="text"
            placeholder="University or College"
            value={affiliation}
            onChange={(e) => setAffiliation(e.target.value)}
            className="p-8 text-xl placeholder:text-xl"
          />
        </div>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center justify-between mt-12">
          <p className="text-xl">
            Already have an account?{" "}
            <Link
              href="/login"
              className="hover:underline font-bold text-primary"
            >
              Log In
            </Link>
          </p>
          <Button className="px-24 py-8 text-2xl" onClick={signUp}>
            Sign Up
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
