import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <ScrollView className="flex-1 px-4">
        {/* Header */}
        <View className="py-6">
          <Text className="text-3xl font-bold text-slate-900 dark:text-white">
            Welcome back!
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 mt-1">
            Ready to crush your workout?
          </Text>
        </View>

        {/* Quick Stats */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-4">
            <Text className="text-slate-500 dark:text-slate-400 text-sm">
              This Week
            </Text>
            <Text className="text-2xl font-bold text-slate-900 dark:text-white">
              0
            </Text>
            <Text className="text-slate-500 dark:text-slate-400 text-sm">
              workouts
            </Text>
          </View>
          <View className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-4">
            <Text className="text-slate-500 dark:text-slate-400 text-sm">
              Total Volume
            </Text>
            <Text className="text-2xl font-bold text-slate-900 dark:text-white">
              0 kg
            </Text>
            <Text className="text-slate-500 dark:text-slate-400 text-sm">
              this week
            </Text>
          </View>
        </View>

        {/* Start Workout Button */}
        <Pressable
          onPress={() => router.push("/(tabs)/workout")}
          className="bg-primary-500 rounded-xl p-4 mb-6 active:bg-primary-600"
        >
          <View className="flex-row items-center justify-center gap-2">
            <Ionicons name="play-circle" size={24} color="white" />
            <Text className="text-white font-semibold text-lg">
              Start Workout
            </Text>
          </View>
        </Pressable>

        {/* Recent Workouts */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
            Recent Workouts
          </Text>
          <View className="bg-slate-100 dark:bg-slate-800 rounded-xl p-6 items-center">
            <Ionicons
              name="barbell-outline"
              size={48}
              color="#9ca3af"
            />
            <Text className="text-slate-500 dark:text-slate-400 mt-2 text-center">
              No workouts yet.{"\n"}Start your first workout!
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
            Quick Actions
          </Text>
          <View className="flex-row gap-3">
            <Pressable className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-4 items-center active:bg-slate-200 dark:active:bg-slate-700">
              <Ionicons name="list" size={24} color="#10b981" />
              <Text className="text-slate-700 dark:text-slate-300 mt-2 text-sm">
                Routines
              </Text>
            </Pressable>
            <Pressable className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-4 items-center active:bg-slate-200 dark:active:bg-slate-700">
              <Ionicons name="fitness" size={24} color="#10b981" />
              <Text className="text-slate-700 dark:text-slate-300 mt-2 text-sm">
                Exercises
              </Text>
            </Pressable>
            <Pressable className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-4 items-center active:bg-slate-200 dark:active:bg-slate-700">
              <Ionicons name="trophy" size={24} color="#10b981" />
              <Text className="text-slate-700 dark:text-slate-300 mt-2 text-sm">
                PRs
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
