import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator
} from '@/components/ui/input-otp';
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
import { ArrowRight, Eye, EyeOff, Lock, CheckCircle, Mail } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

type ResetPasswordCardProps = {
  supabase: SupabaseClient;
  router: NextRouter;
};

export default function ResetPasswordCard({
  supabase,
  router
}: ResetPasswordCardProps) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (router.isReady) {
      const emailParam = router.query.email as string;
      const tokenHash = router.query.token_hash as string;

      if (emailParam) {
        setEmail(decodeURIComponent(emailParam));
      }

      if (tokenHash) {
        const verifyToken = async () => {
          setIsLoading(true);
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'email'
          });
          setIsLoading(false);

          if (error || !data.session) {
            toast.error(
              error?.message ||
                'Email link is invalid or has expired. Please use the OTP or request a new one.'
            );
          } else {
            setIsOtpVerified(true);
            toast.success('Link verified! Please set your new password.');
          }
        };
        verifyToken();
      } else if (!emailParam) {
        toast.error('No email provided. Please start the reset process again.');
        router.replace('/forgot-password');
      }
    }
  }, [router, router.isReady, supabase]);

  const handleVerifyOtp = async () => {
    if (!email || !otp) {
      toast.error('Please enter your email and OTP.');
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: email,
      token: otp,
      type: 'email'
    });
    setIsLoading(false);

    if (error || !data.session) {
      console.error('OTP verification error:', {
        message: error?.message,
        code: error?.code,
        status: error?.status
      });
      toast.error(
        error?.message || 'Invalid OTP. Please try again or request a new one.'
      );
      return;
    }

    setIsOtpVerified(true);
    toast.success('OTP verified! Please set your new password.');
  };

  const handlePasswordReset = async () => {
    if (!password || !confirmPassword) {
      toast.error('Please fill in all password fields.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      console.error('Password update error:', {
        message: error?.message,
        code: error?.code,
        status: error?.status
      });
      toast.error(
        error.message || 'Error updating password. Please try again.'
      );
    } else {
      setIsSuccess(true);
      toast.success('Password updated successfully!');
      await supabase.auth.signOut();
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      toast.error('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/reset-password`
      }
    });
    setIsLoading(false);
    if (error) {
      console.error('OTP resend error:', error);
      toast.error(error.message || 'Error resending OTP. Please try again.');
    } else {
      toast.success(
        'New OTP sent! Check your email. If you do not see, please check your spam.'
      );
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      if (!isOtpVerified && email && otp) {
        handleVerifyOtp();
      } else if (isOtpVerified && password && confirmPassword) {
        handlePasswordReset();
      }
    }
  };

  if (isSuccess) {
    return (
      <div className="flex-1 w-full max-w-md">
        <Card className="bg-white shadow-2xl rounded-3xl border border-gray-200 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500"></div>
          <CardHeader className="pb-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-green-600">
              Password Reset Successful!
            </CardTitle>
            <CardDescription className="text-lg text-gray-600 mt-2">
              Your password has been updated successfully. Redirecting you to
              login...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-md">
      <Card className="bg-white shadow-2xl rounded-3xl border border-gray-200 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500"></div>
        <CardHeader className="pb-6">
          <CardTitle className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {isOtpVerified ? 'Set New Password' : 'Verify OTP'}
          </CardTitle>
          <CardDescription className="text-xl lg:text-2xl text-gray-600 mt-2">
            {isOtpVerified
              ? 'Enter your new password below.'
              : 'Enter the OTP sent to your email.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pb-6">
          {!isOtpVerified && (
            <>
              <div className="space-y-2">
                <Label className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Email Address
                </Label>
                <Input
                  type="email"
                  placeholder="johndoe@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="h-14 text-lg bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white transition-all duration-200 px-4"
                  disabled={isLoading || !!router.query.email}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-lg font-semibold text-gray-800">
                  One-Time Password (OTP)
                </Label>
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => setOtp(value)}
                  disabled={isLoading}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold h-14 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 mt-6"
                onClick={handleVerifyOtp}
                disabled={isLoading || !email || !otp}>
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Verifying OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Verify OTP</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  onClick={handleResendOtp}
                  disabled={isLoading || !email}
                  className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 p-0 h-auto font-medium text-sm">
                  Resend OTP
                </Button>
              </div>
            </>
          )}
          {isOtpVerified && (
            <>
              <div className="space-y-2">
                <Label className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your new password"
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
              <div className="space-y-2">
                <Label className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="h-14 pr-14 text-lg bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white transition-all duration-200 px-4"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 hover:bg-gray-200 rounded-lg"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    disabled={isLoading}>
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  Password Requirements:
                </p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        password.length >= 6 ? 'bg-green-500' : 'bg-gray-300'
                      }`}></div>
                    At least 6 characters long
                  </li>
                  <li className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        password === confirmPassword && password.length > 0
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                      }`}></div>
                    Passwords match
                  </li>
                </ul>
              </div>
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold h-14 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 mt-6"
                onClick={handlePasswordReset}
                disabled={isLoading || !password || !confirmPassword}
                name="reset-password-button">
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Update Password</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </>
          )}
          <div className="text-center pt-6 border-t border-gray-100">
            <Link
              href="/login"
              className="text-lg font-semibold text-purple-600 hover:text-purple-800 hover:underline transition-colors duration-200">
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
