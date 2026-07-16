"use client";

import Sidebar from "@/components/layout/Sidebar";
import TopNavbar from "@/components/layout/TopNavbar";
import { useUiStore } from "@/lib/store/uiStore";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarOpen } = useUiStore();

  return (
    <div className="flex h-screen w-screen bg-bg-base overflow-hidden font-sans">
      
      {/* Fixed Left Navigation Sidebars */}
      <Sidebar />

      {/* Main Dynamic View Panels */}
      <div 
        className={`flex-1 flex flex-col h-full min-w-0 transition-all duration-300
          ${sidebarOpen ? "lg:pl-[260px]" : "lg:pl-[76px]"}`}
      >
        {/* Sticky Utility Actions Navbar */}
        <TopNavbar />

        {/* Dynamic Inner Page Slots */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-bg-base">
          {children}
        </main>
      </div>

    </div>
  );
}
