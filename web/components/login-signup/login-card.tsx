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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>Login to your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button className="w-full" onClick={logIn}>
          Login
        </Button>
      </CardContent>
    </Card>
  );
}
