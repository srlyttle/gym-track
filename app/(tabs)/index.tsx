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
  getMuscleGroupsThisWeek,
} from "@/lib/db";
import { useWorkoutStore } from "@/stores/workout-store";
import { useSplitStore } from "@/stores/split-store";
import type { Workout } from "@/types";
import { formatDistanceToNow } from "date-fns";

const MUSCLE_LABELS: Record<string, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  legs: "Legs",
  core: "Core",
  forearms: "Forearms",
};

export default function HomeScreen() {
  const router = useRouter();
  const { active, startWorkout } = useWorkoutStore();
  const { activeSplit } = useSplitStore();
  const [workoutsThisWeek, setWorkoutsThisWeek] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<{ muscle: string; count: number }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const loadData = useCallback(async () => {
    try {
      await seedExercisesIfNeeded();

      const [weekWorkouts, volume, recent, muscles] = await Promise.all([
        getWorkoutsThisWeek(),
        getTotalVolumeThisWeek(),
        getRecentWorkouts(5),
        getMuscleGroupsThisWeek(),
      ]);

      setWorkoutsThisWeek(weekWorkouts.length);
      setTotalVolume(Math.round(volume));
      setRecentWorkouts(recent);
      setMuscleGroups(muscles);
      setInitialized(true);
    } catch (error) {
      console.error("Failed to load data:", error);
      setInitialized(true);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        <View className="pt-4 pb-3">
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">
            GymTrack
          </Text>
        </View>

        {/* Active Workout Banner */}
        {active && (
          <Pressable
            onPress={() => router.push("/(tabs)/workout")}
            className="bg-primary-500 rounded-xl px-4 py-3 mb-3"
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-white/80 text-xs">Active Workout</Text>
                <Text className="text-white font-semibold">
                  {active.exercises.length} exercises
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Text className="text-white text-sm">Continue</Text>
                <Ionicons name="arrow-forward" size={16} color="white" />
              </View>
            </View>
          </Pressable>
        )}

        {/* Active Split */}
        {activeSplit && !active && (
          <View className="bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2 flex-1">
              <Ionicons name="layers-outline" size={16} color="#10b981" />
              <Text className="font-medium text-slate-900 dark:text-white text-sm">
                {activeSplit.name}
                <Text className="text-slate-500 dark:text-slate-400 font-normal">
                  {" "}· Day {activeSplit.currentDayIndex + 1}/{activeSplit.days.length}
                </Text>
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/suggest-workout")}
              className="active:opacity-70 ml-2"
            >
              <Text className="text-primary-500 text-xs font-medium">View</Text>
            </Pressable>
          </View>
        )}

        {/* Stats row */}
        <View className="flex-row gap-2 mb-3">
          <View className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2.5">
            <Text className="text-slate-500 dark:text-slate-400 text-xs">This Week</Text>
            <Text className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
              {workoutsThisWeek}
              <Text className="text-sm font-normal text-slate-500 dark:text-slate-400"> workouts</Text>
            </Text>
          </View>
          <View className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2.5">
            <Text className="text-slate-500 dark:text-slate-400 text-xs">Volume</Text>
            <Text className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
              {formatVolume(totalVolume)}
              <Text className="text-sm font-normal text-slate-500 dark:text-slate-400"> kg</Text>
            </Text>
          </View>
        </View>

        {/* Muscle groups hit this week */}
        {muscleGroups.length > 0 && (
          <View className="mb-3">
            <Text className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide font-medium">
              Muscles this week
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {muscleGroups.map(({ muscle, count }) => (
                <View
                  key={muscle}
                  className="bg-primary-500/10 rounded-full px-2.5 py-1 flex-row items-center gap-1"
                >
                  <Text className="text-primary-600 dark:text-primary-400 text-xs font-medium">
                    {MUSCLE_LABELS[muscle] ?? muscle}
                  </Text>
                  {count > 1 && (
                    <Text className="text-primary-500/70 text-xs">×{count}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Start Workout Buttons */}
        {!active && (
          <View className="gap-2 mb-4">
            <Pressable
              onPress={handleStartWorkout}
              className="bg-primary-500 rounded-xl py-3.5 active:bg-primary-600"
            >
              <View className="flex-row items-center justify-center gap-2">
                <Ionicons name="play-circle" size={22} color="white" />
                <Text className="text-white font-semibold text-base">
                  Start Workout
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => router.push("/suggest-workout")}
              className="border border-primary-500 rounded-xl py-3 active:bg-primary-500/10"
            >
              <View className="flex-row items-center justify-center gap-2">
                <Ionicons name="sparkles" size={20} color="#10b981" />
                <Text className="text-primary-500 font-semibold text-base">
                  Suggest Workout
                </Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* Recent Workouts */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-base font-semibold text-slate-900 dark:text-white">
              Recent Workouts
            </Text>
            <Pressable onPress={() => router.push("/(tabs)/history")} className="active:opacity-70">
              <Text className="text-primary-500 text-xs font-medium">See all</Text>
            </Pressable>
          </View>
          {recentWorkouts.length === 0 ? (
            <View className="bg-slate-100 dark:bg-slate-800 rounded-xl p-5 items-center">
              <Ionicons name="barbell-outline" size={36} color="#9ca3af" />
              <Text className="text-slate-500 dark:text-slate-400 mt-2 text-sm text-center">
                No workouts yet.{"\n"}Start your first workout!
              </Text>
            </View>
          ) : (
            <View className="gap-1.5">
              {recentWorkouts.map((workout) => (
                <Pressable
                  key={workout.id}
                  className="bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2.5 active:bg-slate-200 dark:active:bg-slate-700 flex-row items-center justify-between"
                >
                  <View className="flex-1 mr-2">
                    <Text className="font-medium text-slate-900 dark:text-white text-sm" numberOfLines={1}>
                      {workout.name || "Workout"}
                    </Text>
                    <Text className="text-xs text-slate-500 dark:text-slate-400">
                      {formatWorkoutDate(workout.started_at)}
                    </Text>
                  </View>
                  <Text className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {formatDuration(workout.duration_seconds)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View className="mb-6">
          <Text className="text-base font-semibold text-slate-900 dark:text-white mb-2">
            Quick Actions
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => router.push("/exercises")}
              className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl py-3 items-center active:bg-slate-200 dark:active:bg-slate-700"
            >
              <Ionicons name="fitness" size={20} color="#10b981" />
              <Text className="text-slate-700 dark:text-slate-300 mt-1 text-xs">
                Exercises
              </Text>
            </Pressable>
            <Pressable className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl py-3 items-center active:bg-slate-200 dark:active:bg-slate-700">
              <Ionicons name="list" size={20} color="#10b981" />
              <Text className="text-slate-700 dark:text-slate-300 mt-1 text-xs">
                Routines
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/(tabs)/progress")}
              className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl py-3 items-center active:bg-slate-200 dark:active:bg-slate-700"
            >
              <Ionicons name="trophy" size={20} color="#10b981" />
              <Text className="text-slate-700 dark:text-slate-300 mt-1 text-xs">
                PRs
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
