import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SupabaseClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
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

  useEffect(() => {
    router.prefetch('/dashboard/current');
  }, [router]);

  const logIn = async () => {
    if (!email || !password) {
      toast.error('Please fill in all fields.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast.error(
          error.message || 'Invalid email or password. Please try again.'
        );
        setIsLoading(false);
      } else {
        toast.success('Logged in successfully!');
        router.push('/dashboard/current');
      }
    } catch (err) {
      console.error('Login error:', err);
      toast.error('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      logIn();
    }
  };

  return (
    <div className="flex-1 w-full max-w-md">
      <Card className="bg-white shadow-2xl rounded-3xl border border-gray-200 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500"></div>
        <CardHeader className="pb-6">
          <CardTitle className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Welcome to Bittle!
          </CardTitle>
          <CardDescription className="text-xl lg:text-2xl text-gray-600 mt-2">
            Enter your information to log in below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pb-6">
          <div className="space-y-2">
            <Label className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email
            </Label>
            <div className="relative">
              <Input
                type="email"
                placeholder="johndoe@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                className="h-14 text-lg bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white transition-all duration-200 px-4"
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Password
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="h-14 pr-14 text-lg bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white transition-all duration-200 px-4"
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 hover:bg-gray-200 rounded-lg"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={isLoading}>
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
          <Button
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold h-14 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 mt-6"
            onClick={logIn}
            disabled={isLoading || !email || !password}
            name="login-button">
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Logging in...</span>
              </>
            ) : (
              <>
                <span>Log In</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>
          <div className="flex justify-center">
            <Link
              href="/forgot-password"
              className="text-lg font-semibold text-purple-600 hover:text-purple-800 hover:underline transition-colors duration-200">
              Forgot password?
            </Link>
          </div>
          <div className="text-center pt-6 border-t border-gray-100">
            <p className="text-gray-600 mb-2">Don&apos;t have an account?</p>
            <Link
              href="/signup"
              className="text-lg font-semibold text-purple-600 hover:text-purple-800 hover:underline transition-colors duration-200">
              Sign Up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
