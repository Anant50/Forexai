"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUiStore } from "@/lib/store/uiStore";
import { useEffect } from "react";
import { 
  LayoutDashboard, 
  TrendingUp, 
  BrainCircuit, 
  BookOpen, 
  Activity, 
  MessageSquareCode, 
  Newspaper, 
  Settings, 
  ShieldAlert, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  TrendingDown
} from "lucide-react";

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  adminOnly?: boolean;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, toggleSidebar, setActiveRoute } = useUiStore();

  const items: SidebarItem[] = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Live Charts", href: "/charts/EUR_USD", icon: TrendingUp },
    { name: "AI Analysis", href: "/analysis", icon: BrainCircuit },
    { name: "Trading Journal", href: "/journal", icon: BookOpen },
    { name: "Performance", href: "/performance", icon: Activity },
    { name: "Knowledge AI", href: "/knowledge", icon: MessageSquareCode },
    { name: "News & Calendar", href: "/news", icon: Newspaper, badge: "NFP" },
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Admin Panel", href: "/admin", icon: ShieldAlert, adminOnly: true },
  ];

  // Keep path state synchronized with components
  useEffect(() => {
    setActiveRoute(pathname);
  }, [pathname, setActiveRoute]);

  const handleLogout = () => {
    // Clear session details (TBD in Authentication phase)
    router.push("/login");
  };

  return (
    <aside 
      className={`fixed top-0 left-0 h-screen bg-bg-surface border-r border-border-subtle flex flex-col justify-between transition-all duration-300 z-50
        ${sidebarOpen ? "w-[260px]" : "w-[76px]"}`}
    >
      <div>
        {/* Header Branding Panel */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border-subtle overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-600 to-accent-cyan flex items-center justify-center font-bold text-white shadow-xl glow-blue">
              F
            </div>
            {sidebarOpen && (
              <span className="font-sans font-bold text-lg bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent truncate tracking-tight">
                ForexAI Pro
              </span>
            )}
          </div>
          {sidebarOpen && (
            <button 
              onClick={toggleSidebar}
              className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-card transition duration-150"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Navigation Core List */}
        <nav className="mt-4 px-2 space-y-1.5 flex-1 select-none">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center group relative gap-3 p-3 rounded-lg text-sm font-medium transition duration-200 cursor-pointer
                  ${isActive 
                    ? "bg-bg-elevated text-primary-400 border-l-3 border-primary-500 shadow-md" 
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-card"
                  }`}
              >
                <span className={`${isActive ? "text-primary-400" : "text-text-secondary group-hover:text-primary-400"} transition`}>
                  <Icon className="w-5 h-5" />
                </span>

                {sidebarOpen && (
                  <span className="truncate flex-1 tracking-wide">{item.name}</span>
                )}

                {item.badge && sidebarOpen && (
                  <span className="bg-bearish/15 text-bearish text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full border border-bearish/25">
                    {item.badge}
                  </span>
                )}

                {/* Micro tooltip details when sidebar collapsed */}
                {!sidebarOpen && (
                  <div className="absolute left-[78px] scale-0 group-hover:scale-100 bg-bg-elevated border border-border-default text-text-primary text-xs tracking-medium font-medium px-3 py-1.5 rounded-md shadow-2xl z-50 pointer-events-none transition duration-150 origin-left">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer System / User Panel */}
      <div className="p-3 border-t border-border-subtle">
        {sidebarOpen ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-1">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center font-bold text-white text-sm shadow-md">
                JD
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text-primary truncate">John Doe</p>
                <p className="text-[10px] text-text-muted truncate">john.doe@forexai.pro</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-sm font-medium text-bearish hover:bg-bearish/10 transition duration-150"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <button 
              onClick={toggleSidebar}
              className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-card transition duration-150"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={handleLogout}
              className="p-3 rounded-lg text-bearish hover:bg-bearish/10 transition duration-150 group relative"
            >
              <LogOut size={18} />
              <div className="absolute left-[78px] scale-0 group-hover:scale-100 bg-bg-elevated border border-border-default text-bearish text-xs tracking-medium font-medium px-3 py-1.5 rounded-md shadow-2xl z-50 pointer-events-none transition duration-150 origin-left">
                Logout
              </div>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
