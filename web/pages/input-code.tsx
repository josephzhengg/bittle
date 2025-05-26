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
                        <svg
                        className="text-themeColor-500 w-10 h-10"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                        />
                        </svg>
                    </Button>
                </div>
                <Label className="justify-center m-4">Fun awaits in your family!</Label>     
            </CardContent>
        </Card>
    </div>
    )
}