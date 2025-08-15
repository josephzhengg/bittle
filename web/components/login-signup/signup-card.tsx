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
import {
  Building,
  GraduationCap,
  Mail,
  Lock,
  EyeOff,
  Eye,
  ArrowRight
} from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    name?: string;
  }>({});

  const validateFields = () => {
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!name.trim()) {
      newErrors.name = 'Organization name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const signUp = async () => {
    if (!validateFields()) return;

    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name, affiliation: affiliation } }
    });

    setIsLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.user) {
      if (data.user.identities && data.user.identities.length === 0) {
        toast.success(
          'An account with this email already exists. A new verification link has been sent to your email address. Please check your inbox and click the link to access your account.'
        );
      } else {
        router.push('/dashboard/current');
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      signUp();
    }
  };

  return (
    <div className="flex-1 w-full max-w-md">
      <Card className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 transform transition-all duration-300 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500"></div>
        <CardHeader className="pb-6">
          <CardTitle className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
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
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              type="email"
              placeholder="johndoe@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              onKeyPress={handleKeyPress}
              className={`p-4 text-base placeholder:text-base bg-gray-50 border-2 rounded-xl focus:bg-white transition-all duration-200 outline-none ${
                errors.email
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-200 focus:border-purple-500'
              }`}
            />
            {errors.email && (
              <p className="text-red-500 text-sm">{errors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) {
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                onKeyPress={handleKeyPress}
                className={`p-4 pr-12 text-base placeholder:text-base bg-gray-50 border-2 rounded-xl focus:bg-white transition-all duration-200 outline-none ${
                  errors.password
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-200 focus:border-purple-500'
                }`}
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
            {errors.password && (
              <p className="text-red-500 text-sm">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Confirm Password <span className="text-red-500">*</span>
            </Label>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Retype your password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) {
                  setErrors((prev) => ({
                    ...prev,
                    confirmPassword: undefined
                  }));
                }
              }}
              onKeyPress={handleKeyPress}
              className={`p-4 text-base placeholder:text-base bg-gray-50 border-2 rounded-xl focus:bg-white transition-all duration-200 outline-none ${
                errors.confirmPassword
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-200 focus:border-purple-500'
              }`}
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Organization Name Field */}
          <div className="space-y-2">
            <Label className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Building className="w-4 h-4" />
              Organization Name <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              placeholder="Your organization's name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) {
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
              onKeyPress={handleKeyPress}
              className={`p-4 text-base placeholder:text-base bg-gray-50 border-2 rounded-xl focus:bg-white transition-all duration-200 outline-none ${
                errors.name
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-200 focus:border-purple-500'
              }`}
            />
            {errors.name && (
              <p className="text-red-500 text-sm">{errors.name}</p>
            )}
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
              onKeyPress={handleKeyPress}
              className="p-4 text-base placeholder:text-base bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white transition-all duration-200 outline-none"
            />
          </div>

          <Button
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold h-14 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 mt-6"
            onClick={signUp}
            disabled={
              isLoading || !email || !password || !confirmPassword || !name
            }
            name="signup-button">
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Signing up...</span>
              </>
            ) : (
              <>
                <span>Sign Up</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>

          {/* Already have account link */}
          <div className="text-center pt-6 border-t border-gray-200">
            <p className="text-gray-600 mb-2">Already have an account?</p>
            <Link
              href="/login"
              className="text-lg font-semibold text-purple-600 hover:text-purple-800 hover:underline transition-colors duration-200">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
