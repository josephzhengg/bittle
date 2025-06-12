import { SupabaseClient } from '@supabase/supabase-js';
import { NextRouter } from 'next/router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { toast } from 'sonner';
import { Building, GraduationCap, Mail, Lock, EyeOff, Eye } from 'lucide-react';
import Link from 'next/link';

type SignupCardProps = {
  supabase: SupabaseClient;
  router: NextRouter;
};

export default function SignupCard({ supabase, router }: SignupCardProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [affiliation, setAffiliation] = useState('');
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
      options: { data: { name: name, affiliation: affiliation } }
    });

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

        <CardHeader className="pb-6">
          <CardTitle className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Welcome to Bittle!
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 mt-1">
            Enter your information to sign up!
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Email Field */}
          <div className="space-y-2">
            <Label className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </Label>
            <Input
              type="email"
              placeholder="johndoe@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="p-4 text-base placeholder:text-base bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white transition-all duration-200 outline-none"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Password
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="p-4 pr-12 text-base placeholder:text-base bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white transition-all duration-200 outline-none"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 rounded-lg transition-colors"
                onClick={() => setShowPassword((prev) => !prev)}>
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Confirm Password
            </Label>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Retype your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="p-4 text-base placeholder:text-base bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white transition-all duration-200 outline-none"
            />
            {passwordMismatch && (
              <p className="text-red-500 text-sm">Passwords do not match.</p>
            )}
          </div>

          {/* Organization Name Field */}
          <div className="space-y-2">
            <Label className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Building className="w-4 h-4" />
              Organization Name
            </Label>
            <Input
              type="text"
              placeholder="Your organization's name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="p-4 text-base placeholder:text-base bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white transition-all duration-200 outline-none"
            />
          </div>

          {/* University Field */}
          <div className="space-y-2">
            <Label className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              University or College{' '}
              <span className="text-sm text-gray-500">(Optional)</span>
            </Label>
            <Input
              type="text"
              placeholder="University or College"
              value={affiliation}
              onChange={(e) => setAffiliation(e.target.value)}
              className="p-4 text-base placeholder:text-base bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white transition-all duration-200 outline-none"
            />
          </div>

          {/* Sign Up Button */}
          <Button
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-8 rounded-xl text-lg shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-[1.02] mt-6"
            onClick={signUp}>
            Sign Up
          </Button>

          {/* Already have account link */}
          <div className="text-center pt-4 border-t border-gray-100">
            <p className="text-base text-gray-600">
              Already have an account?{' '}
              <button className="text-lg font-bold text-purple-600 hover:text-purple-800 hover:underline transition-all duration-200">
                <Link href="/login" className="ml-1">
                  Login
                </Link>
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
