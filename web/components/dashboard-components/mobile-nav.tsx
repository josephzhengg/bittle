import { ClipboardList, Menu, LibraryBig } from 'lucide-react';
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
    icon: LibraryBig
  },
  {
    title: 'Past',
    url: '/dashboard/past',
    icon: ClipboardList
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
          className="md:hidden relative overflow-hidden bg-slate-800/30 backdrop-blur-lg border border-slate-700/30 hover:bg-slate-700/50 hover:border-slate-600/40 transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl hover:shadow-blue-500/10"
          aria-label="Open navigation menu">
          {/* Animated background blob */}
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-purple-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>

          <Menu className="h-5 w-5 text-blue-200 hover:text-white transition-colors duration-300 relative z-10" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-700/40 shadow-xl rounded-2xl overflow-hidden mt-2">
        {/* Subtle animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-8 right-4 w-8 h-8 bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-full blur-lg animate-pulse"></div>
          <div
            className="absolute bottom-4 left-4 w-6 h-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full blur-md animate-pulse"
            style={{ animationDelay: '1s' }}></div>
        </div>

        {/* Navigation items */}
        <div className="relative z-10 p-3 space-y-1">
          {navigationItems.map((item) => {
            const isActive = router.pathname.startsWith(item.url);
            return (
              <DropdownMenuItem
                key={item.title}
                onClick={() => handleNavigation(item.url)}
                className={`
                  group relative overflow-hidden rounded-lg transition-all duration-200 cursor-pointer border p-0 focus:bg-transparent hover:bg-transparent
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-400/30 shadow-lg'
                      : 'bg-slate-800/40 border-slate-600/20 hover:bg-slate-700/50 hover:border-slate-500/30'
                  }
                `}>
                {/* Content */}
                <div className="relative z-10 px-4 py-3 w-full">
                  <div className="flex items-center gap-3">
                    {/* Icon container */}
                    <div
                      className={`
                      p-2 rounded-lg transition-all duration-200 flex-shrink-0
                      ${
                        isActive
                          ? 'bg-gradient-to-br from-pink-500/30 to-purple-500/30'
                          : 'bg-slate-700/40 group-hover:bg-slate-600/50'
                      }
                    `}>
                      <item.icon
                        className={`
                        h-4 w-4 transition-all duration-200
                        ${
                          isActive
                            ? 'text-pink-200'
                            : 'text-blue-200 group-hover:text-white'
                        }
                      `}
                      />
                    </div>

                    {/* Text content */}
                    <div className="flex-1">
                      <span
                        className={`
                        block text-sm font-semibold transition-all duration-200
                        ${
                          isActive
                            ? 'text-white'
                            : 'text-blue-100 group-hover:text-white'
                        }
                      `}>
                        {item.title}
                      </span>
                    </div>

                    {/* Active indicator */}
                    {isActive && (
                      <div className="w-1.5 h-4 bg-gradient-to-b from-pink-500 to-purple-500 rounded-full flex-shrink-0"></div>
                    )}
                  </div>
                </div>

                {/* Subtle hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"></div>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
