"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUiStore } from "@/lib/store/uiStore";
import { 
  Bell, 
  Search, 
  Menu, 
  User, 
  Settings as SettingsIcon, 
  LogOut,
  ChevronRight,
  Globe2
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function TopNavbar() {
  const pathname = usePathname();
  const { toggleSidebar, notificationsOpen, setNotificationsOpen } = useUiStore();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Parse path schema to map Breadcrumbs
  const pathParts = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathParts.length > 0 
    ? pathParts.map((part) => part.charAt(0).toUpperCase() + part.slice(1).replace("_", "/"))
    : ["Dashboard"];

  // Click outside listener helper
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setNotificationsOpen]);

  // Fake active notifications list
  const activeNotifications = [
    { id: 1, title: "EUR/USD Bulls Alert", type: "signal", time: "2m ago", text: "AI generated a new BULLISH prediction (73% confidence)." },
    { id: 2, title: "System Health Alert", type: "system", time: "1h ago", text: "Daily drawdown threshold is at 2.4%." }
  ];

  return (
    <header className="h-16 border-b border-border-subtle bg-bg-surface flex items-center justify-between px-6 sticky top-0 z-40 select-none">
      
      {/* Left side actions (Menu Toggle + Breadcrumbs) */}
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card transition lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Globe2 className="w-4 h-4 text-primary-400" />
          <span className="text-text-muted hover:text-text-secondary cursor-pointer transition">ForexAI</span>
          {breadcrumbs.map((crumb, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-text-muted">
              <ChevronRight className="w-3.5 h-3.5" />
              <span className={idx === breadcrumbs.length - 1 ? "text-text-primary font-semibold" : "hover:text-text-secondary cursor-pointer transition"}>
                {crumb}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right side search + profile details */}
      <div className="flex items-center gap-4">
        
        {/* Search trigger prompt (Design aesthetic) */}
        <div className="relative hidden md:block w-64">
          <span className="absolute inset-y-0 left-3 flex items-center text-text-muted">
            <Search className="w-4 h-4" />
          </span>
          <input 
            type="text"
            placeholder="Search metrics, pairs..." 
            className="w-full bg-bg-card border border-border-default rounded-lg pl-9 pr-10 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary-500 focus:outline-none transition-all duration-200"
            onClick={() => alert("Search / Command Palette (CMD+K) details placeholder.")}
          />
          <kbd className="absolute right-2.5 top-1.5 bg-bg-elevated border border-border-strong text-[9px] font-bold text-text-muted px-1.5 py-0.5 rounded leading-none">
            Ctrl K
          </kbd>
        </div>

        {/* Notifications Panel */}
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card transition relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-bearish border-2 border-bg-surface rounded-full animate-pulse" />
          </button>

          {/* Notifications Dropdown (Glassmorphism overlay) */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-3 w-80 rounded-xl border border-border-subtle bg-bg-elevated shadow-2xl p-2 z-50 glass-panel">
              <div className="px-3 py-2 border-b border-border-subtle flex justify-between items-center">
                <span className="text-xs font-semibold text-text-primary">Notifications</span>
                <span className="text-[10px] text-primary-400 hover:underline cursor-pointer">Mark all read</span>
              </div>
              <div className="py-1.5 divide-y divide-border-subtle">
                {activeNotifications.map((noti) => (
                  <div key={noti.id} className="p-3 hover:bg-bg-card/50 transition cursor-pointer select-none rounded-lg mt-0.5">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold text-text-primary">{noti.title}</span>
                      <span className="text-[9px] text-text-muted">{noti.time}</span>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-1">{noti.text}</p>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-border-subtle text-center">
                <span className="text-[11px] text-text-secondary hover:text-text-primary transition font-medium cursor-pointer block">
                  View all logs
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown Action */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-bg-card transition"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center font-bold text-white text-xs shadow-md">
              JD
            </div>
            <span className="text-xs font-medium text-text-primary hidden sm:block">John Doe</span>
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-3 w-48 rounded-xl border border-border-subtle bg-bg-elevated shadow-2xl p-1.5 z-50">
              <div className="px-3 py-2 border-b border-border-subtle">
                <span className="text-xs text-text-primary font-semibold block">John Doe</span>
                <span className="text-[10px] text-text-muted">trader</span>
              </div>
              <div className="py-1">
                <Link href="/settings" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-bg-card transition">
                  <User className="w-3.5 h-3.5" />
                  <span>My Profile</span>
                </Link>
                <Link href="/settings" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-bg-card transition">
                  <SettingsIcon className="w-3.5 h-3.5" />
                  <span>Account Settings</span>
                </Link>
              </div>
              <div className="border-t border-border-subtle pt-1 mt-1">
                <Link href="/login" onClick={(e) => {
                   if (typeof window !== 'undefined') {
                       localStorage.removeItem('access_token');
                       localStorage.removeItem('refresh_token');
                   }
                }} className="w-full flex items-center justify-start gap-2 px-3 py-2 rounded-lg text-xs text-bearish hover:bg-bearish/10 transition">
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </Link>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
