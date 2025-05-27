import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { MoveRight } from "lucide-react";


export default function InputCodePage(){
    return(
    <div className="bg-login-gradient min-h-screen text-white flex items-center justify-center flex-col">

        <Card className="w-xl">
            <CardHeader>
                <CardTitle className="text-3xl">Welcome to Bittle!</CardTitle>
                <CardDescription className="text-xl">
                    This is just the beginning of a lively family.
                </CardDescription>
                <CardDescription className="text-xl">
                    Please enter your organization code below to get started!
                </CardDescription>                
            </CardHeader>

            <CardContent>
                <div className="flex items-center space-x-4 w-full">
                    <Input
                        type="code"
                        placeholder="Your organization code here ..."
                        className="px-6 py-6 flex-1"
                    />
                    <Button className="flex-none px-6 py-6 text-lg">
                        <MoveRight></MoveRight>
                    </Button>
                </div>
                <Label className="justify-center m-4">Fun awaits in your family!</Label>     
            </CardContent>
        </Card>
        <div className="fixed bottom-0 font-bold">
          <p>
            Want to make your own form?{" "}
            <Link
              href="/login"
              className="hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
    </div>
    )
}