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
import Link from 'next/link';
import { MoveRight } from 'lucide-react';
import { useState } from 'react';
import { getFormIdByCode } from '@/utils/supabase/queries/form';
import { useSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useRouter } from 'next/router';

export default function InputCodePage() {
  const [inputCode, setInputCode] = useState('');
  const supabase = useSupabase();
  const router = useRouter();

  const handleFetchForm = async () => {
    try {
      await getFormIdByCode(supabase, inputCode);
      router.push(`/input-code/${inputCode}`);
    } catch {
      toast('Invalid code, please try again.');
    }
  };

  return (
    <div className="animated-bg-container">
      <div className="animated-bg-elements">
        <div className="bg-blob-1"></div>
        <div className="bg-blob-2"></div>
        <div className="bg-blob-3"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Main Header */}
          <div className="text-center mb-8 animate-fade-in-up">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 tracking-tight">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                Bittle
              </span>
            </h1>
            <div className="h-1.5 w-24 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full mx-auto mb-6"></div>
            <p className="text-lg sm:text-xl text-blue-100 leading-relaxed px-4">
              This is just the beginning of a lively family.
            </p>
          </div>

          {/* Input Card */}
          <Card className="bg-white/15 backdrop-blur-lg border-white/30 shadow-2xl animate-fade-in-up mb-8 rounded-3xl">
            <CardHeader className="text-center pb-4 px-6">
              <CardTitle className="text-xl sm:text-2xl font-bold text-white mb-2">
                Enter Your Code
              </CardTitle>
              <CardDescription className="text-blue-100 text-base sm:text-lg">
                Enter your organization code to get started
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 px-6">
              <div className="flex flex-col gap-4">
                <div className="w-full">
                  <Input
                    type="text"
                    placeholder="Organization code here..."
                    className="w-full px-4 sm:px-6 py-4 text-lg bg-white/90 border-2 border-white/40 text-gray-900 placeholder:text-gray-500 rounded-xl backdrop-blur-lg focus:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-400/20 transition-all duration-300 font-medium"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && inputCode.length > 0) {
                        handleFetchForm();
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={handleFetchForm}
                  disabled={inputCode.length < 1}
                  className="w-full sm:w-auto px-8 py-4 text-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:from-gray-500 disabled:to-gray-600 border-0 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50 font-semibold">
                  <MoveRight className="w-5 h-5 mr-2" />
                  Continue
                </Button>
              </div>

              <div className="text-center">
                <Label className="text-blue-100 font-medium text-base">
                  Fun awaits in your family! 🎉
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Bottom CTA */}
          <div className="text-center animate-fade-in-up px-4">
            <div className="bg-white/15 backdrop-blur-lg rounded-2xl px-6 sm:px-8 py-4 border border-white/30 inline-block">
              <p className="text-base sm:text-lg text-blue-100">
                Want to make your own form?{' '}
                <Link
                  href="/login"
                  className="text-white font-semibold hover:text-pink-300 transition-colors duration-300 underline decoration-pink-400 hover:decoration-pink-300 underline-offset-4">
                  Do so here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
