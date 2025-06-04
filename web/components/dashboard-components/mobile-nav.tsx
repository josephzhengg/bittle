import { Home, Inbox, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/router';
import { useIsMobile } from '@/hooks/use-mobile';

const navigationItems = [
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

export function MobileNav() {
  const router = useRouter();
  const isMobile = useIsMobile();

  if (!isMobile) return null;
  const handleNavigation = (url: string) => {
    router.push(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open navigation menu">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {navigationItems.map((item) => {
          const isActive = router.pathname.startsWith(item.url);
          return (
            <DropdownMenuItem
              key={item.title}
              onClick={() => handleNavigation(item.url)}
              className={isActive ? 'bg-muted font-semibold' : ''}>
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.title}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
