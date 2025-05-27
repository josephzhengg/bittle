import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/ui/app-sidebar';

export type DashBoardLayoutProps = {
  children: React.ReactNode;
};

export default function DashBoardLayout({ children }: DashBoardLayoutProps) {
  return (
    <div>
      <SidebarProvider>
        <AppSidebar />
        <main>
          <SidebarTrigger />
          {children}
        </main>
      </SidebarProvider>
    </div>
  );
}
