import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const FREE_MONTHLY_LIMIT = 10;

export interface QuotaInfo {
  used: number;
  limit: number;
  plan: "free" | "pro";
}

interface AIState {
  plan: "free" | "pro";
  usageThisMonth: number;
  monthlyLimit: number;
  lastRefreshedMonth: string | null; // 'YYYY-MM'

  // Called after a successful AI suggestion with the quota returned by the edge function
  updateQuota: (quota: QuotaInfo) => void;
  // Called on app start to reset local usage if month has rolled over
  maybeResetMonthlyUsage: () => void;
  canUseAI: () => boolean;
  remainingThisMonth: () => number;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      plan: "free",
      usageThisMonth: 0,
      monthlyLimit: FREE_MONTHLY_LIMIT,
      lastRefreshedMonth: null,

      updateQuota: (quota) => {
        set({
          plan: quota.plan,
          usageThisMonth: quota.used,
          monthlyLimit: quota.limit === 999999 ? FREE_MONTHLY_LIMIT : quota.limit,
          lastRefreshedMonth: currentMonth(),
        });
      },

      maybeResetMonthlyUsage: () => {
        const month = currentMonth();
        const { lastRefreshedMonth } = get();
        if (lastRefreshedMonth && lastRefreshedMonth !== month) {
          // New month — reset local usage count (will be confirmed by server on next call)
          set({ usageThisMonth: 0, lastRefreshedMonth: month });
        }
      },

      canUseAI: () => {
        const { usageThisMonth, monthlyLimit, plan } = get();
        if (plan === "pro") return true;
        return usageThisMonth < monthlyLimit;
      },

      remainingThisMonth: () => {
        const { usageThisMonth, monthlyLimit, plan } = get();
        if (plan === "pro") return 999;
        return Math.max(0, monthlyLimit - usageThisMonth);
      },
    }),
    {
      name: "gymtrack-ai",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
