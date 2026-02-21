import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ActiveSplit } from "@/types";

interface SplitState {
  activeSplit: ActiveSplit | null;
  setActiveSplit: (s: ActiveSplit) => void;
  advanceDay: () => void;
  clearActiveSplit: () => void;
}

export const useSplitStore = create<SplitState>()(
  persist(
    (set, get) => ({
      activeSplit: null,
      setActiveSplit: (s) => set({ activeSplit: s }),
      advanceDay: () => {
        const { activeSplit } = get();
        if (!activeSplit) return;
        set({
          activeSplit: {
            ...activeSplit,
            currentDayIndex:
              (activeSplit.currentDayIndex + 1) % activeSplit.days.length,
          },
        });
      },
      clearActiveSplit: () => set({ activeSplit: null }),
    }),
    {
      name: "gym-track-active-split",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
