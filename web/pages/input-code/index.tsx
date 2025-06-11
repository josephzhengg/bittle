import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="bg-login-gradient min-h-screen text-white flex items-center justify-center flex-col px-4">
      <Card className="w-full max-w-2xl">
        <div className="p-6 space-y-4 text-black">
          <CardHeader className="space-y-3">
            <CardTitle className="text-5xl md:text-7xl">Hello!</CardTitle>
            <Label className="text-xl md:text-4xl p-1 leading-relaxed">
              This is just the beginning of a lively family.
              <br />
              <br /> Please enter your organization code below to get started!
            </Label>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full">
              <Input
                type="code"
                placeholder="Your organization code here ..."
                className="px-6 py-6 w-full sm:flex-1"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              />
              <Button
                onClick={handleFetchForm}
                disabled={inputCode.length < 1}
                className="w-full sm:w-auto sm:flex-none px-8 py-6 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 border-0 rounded-2xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed min-w-[60px]">
                <MoveRight />
              </Button>
            </div>
            <Label className="block text-center m-4 text-secondary">
              Fun awaits in your family!
            </Label>
          </CardContent>
        </div>
      </Card>
      <div className="fixed bottom-0 font-bold p-6 text-center z-10">
        <p className="text-lg backdrop-blur-sm bg-black/20 px-6 py-3 rounded-full">
          Want to make your own form?{' '}
          <Link
            href="/login"
            className="hover:underline text-yellow-300 hover:text-yellow-200 transition-colors duration-200 font-semibold">
            Do so here.
          </Link>
        </p>
      </div>
    </div>
  );
}
