import { create } from 'zustand';

interface useSiteModalStore {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const useSiteModal = create<useSiteModalStore>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));