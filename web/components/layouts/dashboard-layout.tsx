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
    <div className="flex h-screen">
      <SidebarProvider>
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <DashboardHeader user={user} />
          <main className="flex-1 overflow-auto p-4">{children}</main>
        </div>
      </SidebarProvider>
    </div>
  );
}
