import { create } from 'zustand';

interface useActiveSiteInterface {
  id?: string;
  set: (id: string) => void;
  reset: () => void;
}

export const useActiveSite = create<useActiveSiteInterface>((set) => ({
  id: undefined,
  set: (id: string) => set({ id }),
  reset: () => set({ id: undefined }),
}));