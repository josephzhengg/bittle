import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SupabaseClient } from '@supabase/supabase-js';
import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';

import { NextRouter } from 'next/router';
import { ArrowRight, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

type LoginCardProps = {
  supabase: SupabaseClient;
  router: NextRouter;
};

export default function LoginCard({ supabase, router }: LoginCardProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const logIn = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    setIsLoading(false);
    if (error) {
      toast(error.message);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="flex-1 w-full max-w-md">
      <Card className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 transform transition-all duration-300 overflow-hidden">
        {/* Decorative top border */}
        <div className="h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500"></div>

        <CardHeader>
          <CardTitle className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Welcome to Bittle!
          </CardTitle>
          <CardDescription className="text-xl lg:text-2xl text-gray-600 mt-2">
            Enter your information to log in below.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Email Field */}
          <div className="space-y-3">
            <Label className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email
            </Label>
            <div className="relative group">
              <Input
                type="email"
                placeholder="johndoe@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="p-6 text-lg placeholder:text-lg bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-purple-500 focus:bg-white transition-all duration-200 outline-none"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 opacity-0 group-focus-within:opacity-100 transition-opacity">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-3">
            <Label className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Password
            </Label>
            <div className="relative group">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="p-6 pr-16 text-lg placeholder:text-lg bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-purple-500 focus:bg-white transition-all duration-200 outline-none"
              />
              <Button
                type="button"
                variant="ghost"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 rounded-xl transition-colors"
                onClick={() => setShowPassword((prev) => !prev)}>
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Login Button */}
          <Button
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-6 px-8 rounded-2xl text-xl shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-3 mt-8 relative overflow-hidden"
            onClick={logIn}
            disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Logging in...</span>
              </>
            ) : (
              <>
                <span>Log In</span>
                <ArrowRight className="w-6 h-6 transition-transform duration-300 group-hover:translate-x-1" />
              </>
            )}
          </Button>

          {/* Sign Up Link */}
          <div className="text-center pt-4 border-t border-gray-100">
            <p className="text-lg text-gray-600">Don&apos;t have an account?</p>
            <button className="text-xl font-bold text-purple-600 hover:text-purple-800 hover:underline transition-all duration-200 mt-1">
              <Link href="/signup" className="ml-1">
                Sign Up
              </Link>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
