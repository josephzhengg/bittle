import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { createSupabaseComponentClient } from '@/utils/supabase/clients/component';
import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createSupabaseComponentClient();
  const router = useRouter();

  const handleSendOtp = async () => {
    if (!email) {
      toast.error('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/reset-password`,
        shouldCreateUser: false
      }
    });
    setIsLoading(false);

    if (error) {
      console.error('OTP send error:', error);
      toast.error(error.message || 'Error sending OTP. Please try again.');
    } else {
      toast.success('OTP sent! Check your email to reset your password.');
      setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(email)}`);
      }, 2000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSendOtp();
    }
  };

  return (
    <div className="flex-1 w-full max-w-md">
      <Card className="bg-white shadow-2xl rounded-3xl border border-gray-200 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500"></div>
        <CardHeader className="pb-6">
          <CardTitle className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Forgot Password
          </CardTitle>
          <CardDescription className="text-xl lg:text-2xl text-gray-600 mt-2">
            Enter your email to receive a one-time password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pb-6">
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
              disabled={isLoading}
            />
          </div>
          <Button
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold h-14 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
            onClick={handleSendOtp}
            disabled={isLoading || !email}>
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Sending OTP...</span>
              </>
            ) : (
              <span>Send OTP</span>
            )}
          </Button>
          <div className="text-center pt-6 border-t border-gray-100">
            <Link
              href="/login"
              className="text-lg font-semibold text-purple-600 hover:text-purple-800 hover:underline transition-colors duration-200 flex items-center justify-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
