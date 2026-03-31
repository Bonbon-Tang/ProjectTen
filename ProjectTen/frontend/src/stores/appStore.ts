import { create } from 'zustand';

interface AppState {
  collapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (collapsed: boolean) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  breadcrumbs: { title: string; path?: string }[];
  setBreadcrumbs: (breadcrumbs: { title: string; path?: string }[]) => void;
}

const useAppStore = create<AppState>((set) => ({
  collapsed: false,
  toggleCollapsed: () => set((state) => ({ collapsed: !state.collapsed })),
  setCollapsed: (collapsed: boolean) => set({ collapsed }),

  loading: false,
  setLoading: (loading: boolean) => set({ loading }),

  breadcrumbs: [],
  setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),
}));

export default useAppStore;
