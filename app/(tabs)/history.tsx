import { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";
import {
  getAllWorkouts,
  getWorkoutExerciseCount,
  getWorkoutVolume,
} from "@/lib/db";
import type { Workout } from "@/types";

interface WorkoutWithStats extends Workout {
  exerciseCount: number;
  totalVolume: number;
}

export default function HistoryScreen() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<WorkoutWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadWorkouts = useCallback(async () => {
    try {
      const allWorkouts = await getAllWorkouts();

      // Fetch stats for each workout
      const workoutsWithStats = await Promise.all(
        allWorkouts.map(async (workout) => {
          const [exerciseCount, totalVolume] = await Promise.all([
            getWorkoutExerciseCount(workout.id),
            getWorkoutVolume(workout.id),
          ]);
          return {
            ...workout,
            exerciseCount,
            totalVolume: Math.round(totalVolume),
          };
        })
      );

      setWorkouts(workoutsWithStats);
    } catch (error) {
      console.error("Failed to load workouts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
    }, [loadWorkouts])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWorkouts();
    setRefreshing(false);
  };

  const formatWorkoutDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "EEE, MMM d");
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "--";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k kg`;
    }
    return `${volume} kg`;
  };

  // Group workouts by time period
  const groupedWorkouts = workouts.reduce((groups, workout) => {
    const date = new Date(workout.started_at);
    let groupKey: string;

    if (isToday(date) || isYesterday(date)) {
      groupKey = "Recent";
    } else if (isThisWeek(date)) {
      groupKey = "This Week";
    } else if (isThisMonth(date)) {
      groupKey = "This Month";
    } else {
      groupKey = format(date, "MMMM yyyy");
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(workout);
    return groups;
  }, {} as Record<string, WorkoutWithStats[]>);

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
            Workout History
          </Text>
          {workouts.length > 0 && (
            <Text className="text-slate-500 dark:text-slate-400 mt-1">
              {workouts.length} workout{workouts.length !== 1 ? "s" : ""} logged
            </Text>
          )}
        </View>

        {loading ? (
          <View className="items-center py-12">
            <Text className="text-slate-500 dark:text-slate-400">
              Loading workouts...
            </Text>
          </View>
        ) : workouts.length === 0 ? (
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
        ) : (
          Object.entries(groupedWorkouts).map(([groupName, groupWorkouts]) => (
            <View key={groupName} className="mb-6">
              <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                {groupName}
              </Text>
              <View className="gap-2">
                {groupWorkouts.map((workout) => (
                  <Pressable
                    key={workout.id}
                    onPress={() => router.push(`/workout/${workout.id}`)}
                    className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 active:bg-slate-200 dark:active:bg-slate-700"
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <Text className="font-semibold text-slate-900 dark:text-white text-base">
                          {workout.name || "Workout"}
                        </Text>
                        <Text className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                          {formatWorkoutDate(workout.started_at)}
                          {workout.started_at && (
                            <Text> at {format(new Date(workout.started_at), "h:mm a")}</Text>
                          )}
                        </Text>
                      </View>
                    </View>

                    {/* Stats Row */}
                    <View className="flex-row mt-3 gap-4">
                      <View className="flex-row items-center">
                        <Ionicons name="fitness-outline" size={16} color="#6b7280" />
                        <Text className="text-sm text-slate-600 dark:text-slate-400 ml-1">
                          {workout.exerciseCount} exercise{workout.exerciseCount !== 1 ? "s" : ""}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Ionicons name="time-outline" size={16} color="#6b7280" />
                        <Text className="text-sm text-slate-600 dark:text-slate-400 ml-1">
                          {formatDuration(workout.duration_seconds)}
                        </Text>
                      </View>
                      {workout.totalVolume > 0 && (
                        <View className="flex-row items-center">
                          <Ionicons name="barbell-outline" size={16} color="#6b7280" />
                          <Text className="text-sm text-slate-600 dark:text-slate-400 ml-1">
                            {formatVolume(workout.totalVolume)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ))
        )}

        {/* Bottom padding */}
        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}
