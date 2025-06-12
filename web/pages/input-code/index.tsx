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
    <div className="animated-bg-container min-h-screen text-white flex items-center justify-center flex-col">
      <Card className="w-5/6 max-w-xl mx-4 shadow-2xl rounded-3xl border border-gray-200">
        <div className="h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500"></div>
        <CardHeader>
          <CardTitle className="text-3xl lg:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Welcome to Bittle!
          </CardTitle>
          <CardDescription className="text-xl sm:text-lg">
            This is just the beginning of a lively family.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Input
              type="code"
              placeholder="Your organization code here ..."
              className="px-4 py-3 sm:px-6 sm:py-6 flex-1"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            />
            <Button
              onClick={handleFetchForm}
              disabled={inputCode.length < 1}
              className="w-full sm:w-auto sm:flex-none px-8 py-6 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 border-0 rounded-2xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed min-w-[60px]">
              <MoveRight />
            </Button>
          </div>
          <Label className="justify-center m-4">
            Fun awaits in your family!
          </Label>
        </CardContent>
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
