import { ReactNode } from "react";
import Image from "next/image";
import { Label } from "@/components/ui/label";

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-cover bg-no-repeat bg-center px-4 w-screen bg-login-gradient">
      {/* Desktop */}
      <div className="hidden lg:flex items-center justify-end min-h-screen">
        <div className="absolute top-[clamp(1rem,2vh,2rem)] left-[clamp(1rem,2vw,2rem)] flex flex-col items-start max-w-[clamp(300px,35vw,450px)]">
          <Image
            src="/bittle_logo.png"
            alt="Bittle Logo"
            width={350}
            height={100}
            priority
            className="block -mb-2 w-[clamp(200px,25vw,350px)] h-auto"
          />
          <Label className="text-[clamp(1.5rem,4vw,3.5rem)] leading-[clamp(1.2,1.3,1.4)] pl-[clamp(0.5rem,1.5vw,1.25rem)] py-[clamp(2rem,8vh,5rem)] text-background break-words">
            Your best companion in building families
            <br />
            in your organization
          </Label>
        </div>
        <div className="w-full max-w-[clamp(400px,45vw,700px)] transition-all duration-300 mr-0 lg:mr-20">
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
