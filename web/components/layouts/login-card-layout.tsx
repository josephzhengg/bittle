import { ReactNode } from 'react';
import { useRouter } from 'next/router';

export default function LoginLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/input-code');
  };

  return (
    <div className="animated-bg-container">
      <div className="animated-bg-elements">
        <div className="bg-blob-1"></div>
        <div className="bg-blob-2"></div>
        <div className="bg-blob-3"></div>
      </div>
      <div className="relative z-10 w-full max-w-6xl flex flex-col lg:flex-row items-center gap-12">
        {/* Left Panel - Hero Content */}
        <div className="flex-1 text-center lg:text-left">
          <div className="mb-8">
            <h1 className="text-7xl lg:text-8xl font-black text-white mb-4 tracking-tight">
              BtL
            </h1>
            <div className="h-2 w-32 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full mx-auto lg:mx-0 mb-8"></div>
          </div>
          {/* Option 1: More consistent sizing and alignment */}
          <div className="max-w-2xl mx-auto lg:mx-0">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight">
              Your best companion in{' '}
              <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                building families
              </span>{' '}
              in your organization
            </h2>
            <p className="text-xl text-blue-100 leading-relaxed mb-8">
              Connect, engage, and grow together with tools designed to
              strengthen bonds and create lasting relationships.
            </p>

            {/* Get Started Button */}
            <button
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold py-4 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg">
              Have a code? Click on me!
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
