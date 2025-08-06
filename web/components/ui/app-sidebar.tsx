import { Smile, Baby, Trees } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar';
import { useRouter } from 'next/router';

// Menu items.
const items = [
  { title: 'Current', url: '/dashboard/current', icon: Smile },
  { title: 'Past', url: '/dashboard/past', icon: Baby },
  { title: 'Family Tree', url: '/dashboard/family-tree', icon: Trees }
];

export function AppSidebar() {
  const router = useRouter();

  return (
    <Sidebar className="border-none bg-transparent h-full">
      {/* Full background with animated elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
        {/* Animated mesh background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-pink-500/10 via-transparent to-purple-500/10"></div>
          <div className="absolute top-1/4 right-0 w-64 h-64 bg-gradient-radial from-pink-400/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
          <div
            className="absolute bottom-1/4 left-0 w-48 h-48 bg-gradient-radial from-purple-400/20 to-transparent rounded-full blur-2xl animate-pulse"
            style={{ animationDelay: '1.5s' }}></div>
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-radial from-blue-400/15 to-transparent rounded-full blur-xl animate-pulse"
            style={{ animationDelay: '3s' }}></div>
        </div>

        {/* Flowing lines */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-10 left-4 w-1 h-20 bg-gradient-to-b from-transparent via-pink-500/40 to-transparent transform rotate-12 animate-pulse"></div>
          <div
            className="absolute top-32 right-6 w-1 h-16 bg-gradient-to-b from-transparent via-purple-500/40 to-transparent transform -rotate-12 animate-pulse"
            style={{ animationDelay: '2s' }}></div>
          <div
            className="absolute bottom-20 left-8 w-1 h-24 bg-gradient-to-b from-transparent via-blue-500/40 to-transparent transform rotate-45 animate-pulse"
            style={{ animationDelay: '1s' }}></div>
        </div>
      </div>

      <SidebarContent className="relative z-10 flex flex-col h-full">
        {/* Header Section */}
        <div className="px-6 py-6 flex-shrink-0">
          {/* Logo with floating effect */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-3xl blur-xl"></div>
            <div className="relative bg-slate-900/60 backdrop-blur-xl rounded-3xl px-6 py-4 border border-slate-700/30 shadow-2xl">
              <div className="text-center">
                <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
                  BtL
                </h1>
                <div className="h-2 w-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full mx-auto shadow-lg"></div>
              </div>
            </div>
          </div>

          {/* Welcome message */}
          <div className="bg-slate-800/40 backdrop-blur-lg rounded-2xl px-4 py-3 border border-slate-600/20">
            <p className="text-sm text-blue-200/80 text-center font-medium">
              Building families in your organization
            </p>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 px-4 overflow-y-auto">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-4">
                {items.map((item) => {
                  const isActive = router.pathname.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className="group relative p-0 h-auto bg-transparent hover:bg-transparent w-full focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 border-none">
                        <a
                          href={item.url}
                          className="block w-full outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 border-none">
                          {/* Floating card design */}
                          <div
                            className={`w-full relative overflow-visible rounded-2xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-1 hover:z-50 border shadow-lg hover:shadow-xl outline-none focus:outline-none
                            ${
                              isActive
                                ? 'bg-gradient-to-r from-pink-500/30 via-purple-500/30 to-blue-500/30 shadow-2xl shadow-pink-500/25 border-pink-400/50'
                                : 'bg-slate-800/30 hover:bg-slate-700/50 border-slate-600/20 hover:border-slate-500/40 hover:shadow-blue-500/10'
                            }`}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.zIndex = '1000')
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.zIndex = 'auto')
                            }>
                            {/* Content */}
                            <div className="relative z-10 px-4 py-5">
                              <div className="flex items-center gap-3">
                                {/* Icon container */}
                                <div
                                  className={`
                                  p-3 rounded-xl transition-all duration-300 flex-shrink-0
                                  ${
                                    isActive
                                      ? 'bg-gradient-to-br from-pink-500/40 to-purple-500/40 shadow-lg'
                                      : 'bg-slate-700/50 group-hover:bg-slate-600/60'
                                  }
                                `}>
                                  <item.icon
                                    className={`
                                    h-6 w-6 transition-all duration-300
                                    ${
                                      isActive
                                        ? 'text-white drop-shadow-lg'
                                        : 'text-blue-200 group-hover:text-white'
                                    }
                                  `}
                                  />
                                </div>

                                {/* Text content */}
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <span
                                    className={`
                                    block text-base font-bold transition-all duration-300 text-center break-words
                                    ${
                                      isActive
                                        ? 'bg-gradient-to-r from-white to-pink-100 bg-clip-text text-transparent'
                                        : 'text-blue-100 group-hover:text-white'
                                    }
                                  `}>
                                    {item.title}
                                  </span>
                                  <div
                                    className={`
                                    h-0.5 w-full rounded-full transition-all duration-300 mt-1
                                    ${
                                      isActive
                                        ? 'bg-gradient-to-r from-pink-400 to-purple-400'
                                        : 'bg-slate-600 group-hover:bg-slate-500'
                                    }
                                  `}></div>
                                </div>

                                {/* Arrow indicator */}
                                <div
                                  className={`
                                  transition-all duration-300 transform flex-shrink-0
                                  ${
                                    isActive
                                      ? 'opacity-100 translate-x-0'
                                      : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'
                                  }
                                `}>
                                  <div className="w-2 h-8 bg-gradient-to-b from-pink-500 to-purple-500 rounded-full shadow-lg"></div>
                                </div>
                              </div>
                            </div>

                            {/* Animated background overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>

                            {/* Glow effect for active state */}
                            {isActive && (
                              <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-2xl animate-pulse"></div>
                            )}
                          </div>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        {/* Footer Section */}
        <div className="px-6 py-4 flex-shrink-0">
          {/* Decorative separator */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-500/50 to-transparent mb-4"></div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
