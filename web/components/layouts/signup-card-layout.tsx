import { ReactNode } from "react";
import Image from "next/image";
import { Label } from "@/components/ui/label";

export default function SignupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-cover bg-no-repeat bg-center px-4 w-screen bg-login-gradient">
      {/* Desktop */}
      <div className="hidden lg:flex items-center justify-end min-h-screen">
        <div className="absolute top-4 left-4 flex flex-col items-start">
          <Image
            src="/bittle_logo.png"
            alt="Bittle Logo"
            width={350}
            height={100}
            priority
            className="block -mb-2"
          />
          <Label className="text-5xl leading-tight pl-5 py-20 text-background">
            Your best companion in building families
            <br />
            in your organization
          </Label>
        </div>
        <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl transition-all duration-300 mr-0 lg:mr-20">
          {children}
        </div>
      </div>

      {/* Mobile */}
      <div className="lg:hidden min-h-screen py-8">
        <div className="flex flex-col items-center">
          <div className="flex justify-center pb-8">
            <Image
              src="/bittle_logo.png"
              alt="Bittle Logo"
              width={250}
              height={75}
              priority
              className="block"
            />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
