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

export default function InputCodePage() {
  return (
    <div className="bg-login-gradient min-h-screen text-white flex items-center justify-center flex-col">
      <Card className="w-5/6 max-w-xl mx-4">
        <CardHeader>
          <CardTitle className="text-3xl sm:text-2xl">
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
            />
            <Button className="px-4 py-3 sm:px-6 sm:py-6 w-full sm:w-auto">
              <MoveRight className="mr-2 sm:mr-0" />
              <span className="sm:hidden">Continue</span>
            </Button>
          </div>
          <Label className="justify-center m-4">
            Fun awaits in your family!
          </Label>
        </CardContent>
      </Card>
      <div className="fixed bottom-0 font-bold">
        <p>
          Want to make your own form?{' '}
          <Link href="/login" className="hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
