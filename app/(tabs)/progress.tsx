import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function ProgressScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <ScrollView className="flex-1 px-4">
        {/* Header */}
        <View className="py-6">
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">
            Progress
          </Text>
        </View>

        {/* Stats Overview */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-primary-500 rounded-xl p-4">
            <Ionicons name="trophy" size={24} color="white" />
            <Text className="text-white text-2xl font-bold mt-2">0</Text>
            <Text className="text-primary-100">Personal Records</Text>
          </View>
          <View className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-4">
            <Ionicons name="barbell" size={24} color="#10b981" />
            <Text className="text-slate-900 dark:text-white text-2xl font-bold mt-2">
              0
            </Text>
            <Text className="text-slate-500 dark:text-slate-400">
              Total Workouts
            </Text>
          </View>
        </View>

        {/* Time Range Selector */}
        <View className="flex-row bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-6">
          <Pressable className="flex-1 bg-white dark:bg-slate-700 rounded-lg py-2">
            <Text className="text-center font-semibold text-slate-900 dark:text-white">
              1M
            </Text>
          </Pressable>
          <Pressable className="flex-1 py-2">
            <Text className="text-center text-slate-500 dark:text-slate-400">
              3M
            </Text>
          </Pressable>
          <Pressable className="flex-1 py-2">
            <Text className="text-center text-slate-500 dark:text-slate-400">
              6M
            </Text>
          </Pressable>
          <Pressable className="flex-1 py-2">
            <Text className="text-center text-slate-500 dark:text-slate-400">
              1Y
            </Text>
          </Pressable>
          <Pressable className="flex-1 py-2">
            <Text className="text-center text-slate-500 dark:text-slate-400">
              All
            </Text>
          </Pressable>
        </View>

        {/* Chart Placeholder */}
        <View className="bg-slate-100 dark:bg-slate-800 rounded-xl p-6 mb-6 h-48 items-center justify-center">
          <Ionicons name="analytics-outline" size={48} color="#9ca3af" />
          <Text className="text-slate-500 dark:text-slate-400 mt-2">
            Progress charts will appear here
          </Text>
        </View>

        {/* Recent PRs */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
            Recent PRs
          </Text>
          <View className="bg-slate-100 dark:bg-slate-800 rounded-xl p-6 items-center">
            <Ionicons name="trophy-outline" size={48} color="#9ca3af" />
            <Text className="text-slate-500 dark:text-slate-400 mt-2 text-center">
              No personal records yet.{"\n"}Keep training!
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
