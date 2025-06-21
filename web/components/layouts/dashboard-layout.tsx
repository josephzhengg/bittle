import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/ui/app-sidebar';
import DashboardHeader from '@/components/dashboard-components/dashboard-header';
import { User } from '@supabase/supabase-js';

export type DashBoardLayoutProps = {
  user: User;
  children: React.ReactNode;
};

export default function DashBoardLayout({
  user,
  children
}: DashBoardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-purple-50/30 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-200/15 rounded-full blur-3xl animate-pulse delay-500"></div>

        {/* Subtle decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
          {/* Subtle dot pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.15)_1px,transparent_0)] bg-[length:20px_20px]"></div>
        </div>

        <div className="relative z-10 flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1 min-h-screen min-w-0 overflow-hidden">
            <DashboardHeader user={user} />

            {/* Content background with light glassmorphism - now properly constrained */}
            <div className="flex-1 backdrop-blur-sm bg-white/80 rounded-xl border border-slate-200/50 m-4 mb-0 md:m-6 md:mb-0 overflow-hidden">
              <div className="h-full w-full overflow-auto p-6">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
