import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function WorkoutScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <ScrollView className="flex-1 px-4">
        {/* Header */}
        <View className="py-6">
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">
            Active Workout
          </Text>
        </View>

        {/* No Active Workout State */}
        <View className="flex-1 items-center justify-center py-12">
          <View className="bg-slate-100 dark:bg-slate-800 rounded-full p-6 mb-4">
            <Ionicons name="barbell-outline" size={64} color="#10b981" />
          </View>
          <Text className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            No Active Workout
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-center mb-6 px-8">
            Start a new workout or select from your saved routines
          </Text>

          {/* Start Options */}
          <View className="w-full gap-3">
            <Pressable className="bg-primary-500 rounded-xl p-4 active:bg-primary-600">
              <View className="flex-row items-center justify-center gap-2">
                <Ionicons name="add-circle" size={24} color="white" />
                <Text className="text-white font-semibold text-lg">
                  Empty Workout
                </Text>
              </View>
            </Pressable>

            <Pressable className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 active:bg-slate-200 dark:active:bg-slate-700">
              <View className="flex-row items-center justify-center gap-2">
                <Ionicons name="list" size={24} color="#10b981" />
                <Text className="text-slate-700 dark:text-slate-300 font-semibold text-lg">
                  From Routine
                </Text>
              </View>
            </Pressable>

            <Pressable className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 active:bg-slate-200 dark:active:bg-slate-700">
              <View className="flex-row items-center justify-center gap-2">
                <Ionicons name="refresh" size={24} color="#10b981" />
                <Text className="text-slate-700 dark:text-slate-300 font-semibold text-lg">
                  Repeat Last Workout
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
