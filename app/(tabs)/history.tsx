import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function HistoryScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <ScrollView className="flex-1 px-4">
        {/* Header */}
        <View className="py-6">
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">
            Workout History
          </Text>
        </View>

        {/* Calendar Placeholder */}
        <View className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 mb-6">
          <Text className="text-slate-500 dark:text-slate-400 text-center">
            Calendar view coming soon
          </Text>
        </View>

        {/* Empty State */}
        <View className="items-center py-12">
          <View className="bg-slate-100 dark:bg-slate-800 rounded-full p-6 mb-4">
            <Ionicons name="calendar-outline" size={64} color="#9ca3af" />
          </View>
          <Text className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            No Workout History
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-center px-8">
            Complete your first workout to see it here
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
