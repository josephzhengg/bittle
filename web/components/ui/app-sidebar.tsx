import { Home, Inbox } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar';
import { useRouter } from 'next/router';

// Menu items.
const items = [
  {
    title: 'Current',
    url: '/dashboard/current',
    icon: Home
  },
  {
    title: 'Past',
    url: '/dashboard/past',
    icon: Inbox
  }
];

export function AppSidebar() {
  const router = useRouter();
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-semibold text-foreground">
            {' Bittle '}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = router.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem
                    key={item.title}
                    className={
                      isActive ? 'bg-muted text-foreground font-semibold' : ''
                    }>
                    <SidebarMenuButton asChild size="lg">
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
