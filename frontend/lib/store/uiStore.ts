import { create } from "zustand";

interface UiState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
  
  // Notification UI state
  notificationsOpen: boolean;
  setNotificationsOpen: (open: boolean) => void;
  
  // Active route highlighting
  activeRoute: string;
  setActiveRoute: (route: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarExpanded: (expanded: boolean) => set({ sidebarOpen: expanded }),
  
  notificationsOpen: false,
  setNotificationsOpen: (open: boolean) => set({ notificationsOpen: open }),
  
  activeRoute: "/",
  setActiveRoute: (route: string) => set({ activeRoute: route }),
}));
