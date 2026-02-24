import { View, Text, Pressable, ScrollView, Linking, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useAIStore, FREE_MONTHLY_LIMIT } from "@/stores/ai-store";
import { getDeviceId } from "@/lib/ai/device";
import { supabase } from "@/lib/supabase";

// TODO: Replace with your Stripe Payment Link URLs
// Create payment links at https://dashboard.stripe.com/payment-links
// The link should collect metadata { device_id } and trigger a webhook
// that updates the subscriptions table in Supabase.
const STRIPE_PRO_MONTHLY_URL = "https://buy.stripe.com/YOUR_PAYMENT_LINK";

const PRO_FEATURES = [
  "Unlimited AI workout suggestions",
  "Unlimited AI split programs",
  "Personalised to your history",
  "Priority response time",
];

const FREE_FEATURES = [
  `${FREE_MONTHLY_LIMIT} AI suggestions per month`,
  "AI workout generation",
  "AI split programs",
];

export default function PaywallScreen() {
  const router = useRouter();
  const { plan, usageThisMonth, monthlyLimit, updateQuota } = useAIStore();
  const [restoring, setRestoring] = useState(false);

  const isPro = plan === "pro";
  const usagePercent = Math.min(100, (usageThisMonth / monthlyLimit) * 100);

  const handleUpgrade = async () => {
    try {
      const deviceId = await getDeviceId();
      // Append device_id as query param so the payment link / webhook can link
      // the purchase back to this device.
      const url = `${STRIPE_PRO_MONTHLY_URL}?client_reference_id=${deviceId}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          "Cannot Open Link",
          "Please visit muscleminded.app/upgrade to subscribe."
        );
      }
    } catch {
      Alert.alert("Error", "Could not open upgrade page. Please try again.");
    }
  };

  const handleRestorePurchase = async () => {
    setRestoring(true);
    try {
      const deviceId = await getDeviceId();

      // Check subscription status in Supabase
      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan, status, expires_at")
        .eq("device_id", deviceId)
        .maybeSingle();

      if (error) throw error;

      const now = new Date();
      const isPro =
        data?.plan === "pro" &&
        data?.status === "active" &&
        (!data.expires_at || new Date(data.expires_at) > now);

      if (isPro) {
        updateQuota({ used: usageThisMonth, limit: 999999, plan: "pro" });
        Alert.alert("Restored!", "Your Pro subscription has been restored.");
      } else {
        Alert.alert(
          "No Active Subscription",
          "No active Pro subscription was found for this device."
        );
      }
    } catch {
      Alert.alert(
        "Restore Failed",
        "Could not verify your subscription. Please check your internet connection and try again."
      );
    } finally {
      setRestoring(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <ScrollView className="flex-1" contentContainerClassName="pb-12">
        {/* Header */}
        <View className="flex-row items-center px-4 pt-4 pb-2">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2">
            <Ionicons name="chevron-back" size={24} color="#10b981" />
          </Pressable>
          <Text className="text-xl font-bold text-slate-900 dark:text-white ml-2">
            AI Features
          </Text>
        </View>

        {/* Hero */}
        <View className="items-center px-6 pt-4 pb-6">
          <View className="w-20 h-20 bg-emerald-500 rounded-2xl items-center justify-center mb-4">
            <Ionicons name="sparkles" size={40} color="white" />
          </View>
          <Text className="text-2xl font-bold text-slate-900 dark:text-white text-center">
            AI-Powered Workouts
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-center mt-2">
            Let AI build personalised workouts and training splits based on your
            history, goals and equipment.
          </Text>
        </View>

        {/* Current usage (only shown on free plan) */}
        {!isPro && (
          <View className="mx-4 bg-slate-100 dark:bg-slate-800 rounded-xl p-4 mb-6">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">
                This month's usage
              </Text>
              <Text className="text-sm font-semibold text-slate-900 dark:text-white">
                {usageThisMonth} / {monthlyLimit}
              </Text>
            </View>
            <View className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <View
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${usagePercent}%` }}
              />
            </View>
            {usageThisMonth >= monthlyLimit && (
              <Text className="text-xs text-red-500 mt-2">
                You've used all your free suggestions this month. Upgrade for unlimited access.
              </Text>
            )}
          </View>
        )}

        {/* Pro badge if subscribed */}
        {isPro && (
          <View className="mx-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4 mb-6 flex-row items-center">
            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            <View className="ml-3">
              <Text className="font-semibold text-emerald-700 dark:text-emerald-300">
                Pro Active
              </Text>
              <Text className="text-sm text-emerald-600 dark:text-emerald-400">
                Unlimited AI suggestions
              </Text>
            </View>
          </View>
        )}

        {/* Pricing Cards */}
        <View className="px-4 gap-4">
          {/* Free plan */}
          <View className={`rounded-xl border-2 p-5 ${!isPro ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"}`}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-bold text-slate-900 dark:text-white">Free</Text>
              {!isPro && (
                <View className="bg-emerald-500 rounded-full px-3 py-0.5">
                  <Text className="text-xs font-semibold text-white">Current plan</Text>
                </View>
              )}
            </View>
            <Text className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              $0
              <Text className="text-base font-normal text-slate-500 dark:text-slate-400">
                /month
              </Text>
            </Text>
            <View className="gap-2">
              {FREE_FEATURES.map((feature) => (
                <View key={feature} className="flex-row items-center">
                  <Ionicons name="checkmark" size={16} color="#10b981" />
                  <Text className="ml-2 text-sm text-slate-700 dark:text-slate-300">{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Pro plan */}
          <View className={`rounded-xl border-2 p-5 ${isPro ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"}`}>
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <Text className="text-lg font-bold text-slate-900 dark:text-white">Pro</Text>
                <View className="bg-emerald-500 rounded-full px-2 py-0.5">
                  <Text className="text-xs font-semibold text-white">Best value</Text>
                </View>
              </View>
              {isPro && (
                <View className="bg-emerald-500 rounded-full px-3 py-0.5">
                  <Text className="text-xs font-semibold text-white">Active</Text>
                </View>
              )}
            </View>
            <Text className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              $4.99
              <Text className="text-base font-normal text-slate-500 dark:text-slate-400">
                /month
              </Text>
            </Text>
            <View className="gap-2">
              {PRO_FEATURES.map((feature) => (
                <View key={feature} className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text className="ml-2 text-sm text-slate-700 dark:text-slate-300">{feature}</Text>
                </View>
              ))}
            </View>

            {!isPro && (
              <Pressable
                onPress={handleUpgrade}
                className="mt-5 bg-emerald-500 rounded-xl py-4 items-center active:bg-emerald-600"
              >
                <Text className="text-white font-bold text-base">Upgrade to Pro</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Restore purchase */}
        {!isPro && (
          <View className="items-center mt-6 px-4">
            <Pressable
              onPress={handleRestorePurchase}
              disabled={restoring}
              className="py-2"
            >
              {restoring ? (
                <ActivityIndicator size="small" color="#10b981" />
              ) : (
                <Text className="text-sm text-slate-500 dark:text-slate-400 underline">
                  Restore purchase
                </Text>
              )}
            </Pressable>
            <Text className="text-xs text-slate-400 dark:text-slate-500 text-center mt-3 leading-5">
              Subscriptions renew monthly. Cancel any time.{"\n"}
              Payment processed securely via Stripe.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
