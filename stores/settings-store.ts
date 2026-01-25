import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WeightUnit, ThemePreference, UserSettings } from "@/types";

interface SettingsState extends UserSettings {
  setUnitPreference: (unit: WeightUnit) => void;
  setThemePreference: (theme: ThemePreference) => void;
  setRestTimerDefault: (seconds: number) => void;
  reset: () => void;
}

const defaultSettings: UserSettings = {
  unitPreference: "kg",
  themePreference: "system",
  restTimerDefault: 90,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      setUnitPreference: (unit) => set({ unitPreference: unit }),
      setThemePreference: (theme) => set({ themePreference: theme }),
      setRestTimerDefault: (seconds) => set({ restTimerDefault: seconds }),
      reset: () => set(defaultSettings),
    }),
    {
      name: "gym-track-settings",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
