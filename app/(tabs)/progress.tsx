import { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { format, formatDistanceToNow } from "date-fns";
import {
  getTotalWorkoutCount,
  getPersonalRecordsCount,
  getRecentPersonalRecords,
  getTotalVolumeThisWeek,
} from "@/lib/db";
import type { PersonalRecord } from "@/types";

type TimeRange = "1M" | "3M" | "6M" | "1Y" | "All";

interface PRWithExercise extends PersonalRecord {
  exercise_name: string;
}

export default function ProgressScreen() {
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [totalPRs, setTotalPRs] = useState(0);
  const [recentPRs, setRecentPRs] = useState<PRWithExercise[]>([]);
  const [weeklyVolume, setWeeklyVolume] = useState(0);
  const [selectedRange, setSelectedRange] = useState<TimeRange>("1M");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [workoutCount, prCount, prs, volume] = await Promise.all([
        getTotalWorkoutCount(),
        getPersonalRecordsCount(),
        getRecentPersonalRecords(10),
        getTotalVolumeThisWeek(),
      ]);

      setTotalWorkouts(workoutCount);
      setTotalPRs(prCount);
      setRecentPRs(prs);
      setWeeklyVolume(Math.round(volume));
    } catch (error) {
      console.error("Failed to load progress data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k`;
    }
    return volume.toString();
  };

  const formatPRDate = (dateStr: string): string => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return dateStr;
    }
  };

  const timeRanges: TimeRange[] = ["1M", "3M", "6M", "1Y", "All"];

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <ScrollView
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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
            <Text className="text-white text-2xl font-bold mt-2">{totalPRs}</Text>
            <Text className="text-primary-100">Personal Records</Text>
          </View>
          <View className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-4">
            <Ionicons name="barbell" size={24} color="#10b981" />
            <Text className="text-slate-900 dark:text-white text-2xl font-bold mt-2">
              {totalWorkouts}
            </Text>
            <Text className="text-slate-500 dark:text-slate-400">
              Total Workouts
            </Text>
          </View>
        </View>

        {/* Weekly Volume Card */}
        <View className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 mb-6">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-slate-500 dark:text-slate-400 text-sm">
                This Week's Volume
              </Text>
              <Text className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatVolume(weeklyVolume)} kg
              </Text>
            </View>
            <View className="bg-primary-100 dark:bg-primary-900/30 rounded-full p-3">
              <Ionicons name="trending-up" size={24} color="#10b981" />
            </View>
          </View>
        </View>

        {/* Time Range Selector */}
        <View className="flex-row bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-6">
          {timeRanges.map((range) => (
            <Pressable
              key={range}
              onPress={() => setSelectedRange(range)}
              className={`flex-1 py-2 rounded-lg ${
                selectedRange === range ? "bg-white dark:bg-slate-700" : ""
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  selectedRange === range
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {range}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Chart Placeholder */}
        <View className="bg-slate-100 dark:bg-slate-800 rounded-xl p-6 mb-6 h-48 items-center justify-center">
          <Ionicons name="analytics-outline" size={48} color="#9ca3af" />
          <Text className="text-slate-500 dark:text-slate-400 mt-2 text-center">
            Progress charts coming soon
          </Text>
          <Text className="text-slate-400 dark:text-slate-500 text-sm mt-1">
            Track your lifting trends over time
          </Text>
        </View>

        {/* Recent PRs */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
            Recent PRs
          </Text>
          {loading ? (
            <View className="bg-slate-100 dark:bg-slate-800 rounded-xl p-6 items-center">
              <Text className="text-slate-500 dark:text-slate-400">
                Loading...
              </Text>
            </View>
          ) : recentPRs.length === 0 ? (
            <View className="bg-slate-100 dark:bg-slate-800 rounded-xl p-6 items-center">
              <Ionicons name="trophy-outline" size={48} color="#9ca3af" />
              <Text className="text-slate-500 dark:text-slate-400 mt-2 text-center">
                No personal records yet.{"\n"}Keep training!
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {recentPRs.map((pr) => (
                <View
                  key={pr.id}
                  className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View className="bg-yellow-100 dark:bg-yellow-900/30 rounded-full p-2 mr-3">
                        <Ionicons name="trophy" size={20} color="#eab308" />
                      </View>
                      <View className="flex-1">
                        <Text className="font-semibold text-slate-900 dark:text-white">
                          {pr.exercise_name}
                        </Text>
                        <Text className="text-sm text-slate-500 dark:text-slate-400">
                          {formatPRDate(pr.achieved_at)}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-lg font-bold text-primary-600 dark:text-primary-400">
                        {pr.weight} kg
                      </Text>
                      <Text className="text-sm text-slate-500 dark:text-slate-400">
                        × {pr.reps} rep{pr.reps !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Bottom padding */}
        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}
