import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import {
  seedExercisesIfNeeded,
  getWorkoutsThisWeek,
  getRecentWorkouts,
  getTotalVolumeThisWeek,
} from "@/lib/db";
import { useWorkoutStore } from "@/stores/workout-store";
import type { Workout } from "@/types";
import { formatDistanceToNow } from "date-fns";

export default function HomeScreen() {
  const router = useRouter();
  const { active, startWorkout } = useWorkoutStore();
  const [workoutsThisWeek, setWorkoutsThisWeek] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const loadData = useCallback(async () => {
    try {
      await seedExercisesIfNeeded();

      const [weekWorkouts, volume, recent] = await Promise.all([
        getWorkoutsThisWeek(),
        getTotalVolumeThisWeek(),
        getRecentWorkouts(5),
      ]);

      setWorkoutsThisWeek(weekWorkouts.length);
      setTotalVolume(Math.round(volume));
      setRecentWorkouts(recent);
      setInitialized(true);
    } catch (error) {
      console.error("Failed to load data:", error);
      setInitialized(true);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (initialized) {
        loadData();
      }
    }, [initialized, loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleStartWorkout = async () => {
    if (active) {
      router.push("/(tabs)/workout");
    } else {
      await startWorkout();
      router.push("/(tabs)/workout");
    }
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k`;
    }
    return volume.toString();
  };

  const formatWorkoutDate = (dateStr: string): string => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return dateStr;
    }
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "--";
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  };

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
          <Text className="text-3xl font-bold text-slate-900 dark:text-white">
            Welcome back! 
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 mt-1">
            Ready to crush your workout?
          </Text>
        </View>

        {/* Active Workout Banner */}
        {active && (
          <Pressable
            onPress={() => router.push("/(tabs)/workout")}
            className="bg-primary-500 rounded-xl p-4 mb-4"
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-white/80 text-sm">Active Workout</Text>
                <Text className="text-white font-semibold text-lg">
                  {active.exercises.length} exercises
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-white mr-2">Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </View>
            </View>
          </Pressable>
        )}

        {/* Quick Stats */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-4">
            <Text className="text-slate-500 dark:text-slate-400 text-sm">
              This Week
            </Text>
            <Text className="text-2xl font-bold text-slate-900 dark:text-white">
              {workoutsThisWeek}
            </Text>
            <Text className="text-slate-500 dark:text-slate-400 text-sm">
              workouts
            </Text>
          </View>
          <View className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-4">
            <Text className="text-slate-500 dark:text-slate-400 text-sm">
              Volume
            </Text>
            <Text className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatVolume(totalVolume)} kg
            </Text>
            <Text className="text-slate-500 dark:text-slate-400 text-sm">
              this week
            </Text>
          </View>
        </View>

        {/* Start Workout Button */}
        {!active && (
          <Pressable
            onPress={handleStartWorkout}
            className="bg-primary-500 rounded-xl p-4 mb-6 active:bg-primary-600"
          >
            <View className="flex-row items-center justify-center gap-2">
              <Ionicons name="play-circle" size={24} color="white" />
              <Text className="text-white font-semibold text-lg">
                Start Workout
              </Text>
            </View>
          </Pressable>
        )}

        {/* Recent Workouts */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
            Recent Workouts
          </Text>
          {recentWorkouts.length === 0 ? (
            <View className="bg-slate-100 dark:bg-slate-800 rounded-xl p-6 items-center">
              <Ionicons name="barbell-outline" size={48} color="#9ca3af" />
              <Text className="text-slate-500 dark:text-slate-400 mt-2 text-center">
                No workouts yet.{"\n"}Start your first workout!
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {recentWorkouts.map((workout) => (
                <Pressable
                  key={workout.id}
                  className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 active:bg-slate-200 dark:active:bg-slate-700"
                >
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="font-medium text-slate-900 dark:text-white">
                        {workout.name || "Workout"}
                      </Text>
                      <Text className="text-sm text-slate-500 dark:text-slate-400">
                        {formatWorkoutDate(workout.started_at)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-sm text-slate-600 dark:text-slate-400">
                        {formatDuration(workout.duration_seconds)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
            Quick Actions
          </Text>
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => router.push("/exercises")}
              className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-4 items-center active:bg-slate-200 dark:active:bg-slate-700"
            >
              <Ionicons name="fitness" size={24} color="#10b981" />
              <Text className="text-slate-700 dark:text-slate-300 mt-2 text-sm">
                Exercises 1
              </Text>
            </Pressable>
            <Pressable className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-4 items-center active:bg-slate-200 dark:active:bg-slate-700">
              <Ionicons name="list" size={24} color="#10b981" />
              <Text className="text-slate-700 dark:text-slate-300 mt-2 text-sm">
                Routines
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/(tabs)/progress")}
              className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-4 items-center active:bg-slate-200 dark:active:bg-slate-700"
            >
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
