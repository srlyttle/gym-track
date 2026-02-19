import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { getWorkoutWithDetails } from "@/lib/db";
import type { WorkoutWithDetails, WorkoutExerciseWithDetails } from "@/types";

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  chest: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  back: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  shoulders:
    "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  biceps:
    "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  triceps: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  legs: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  core: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
  forearms: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatVolume(volume: number): string {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}k kg`;
  }
  return `${volume} kg`;
}

function getTotalVolume(exercises: WorkoutExerciseWithDetails[]): number {
  let total = 0;
  for (const ex of exercises) {
    for (const set of ex.sets) {
      if (set.is_completed && !set.is_warmup && set.reps && set.weight) {
        total += set.reps * set.weight;
      }
    }
  }
  return Math.round(total);
}

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [workout, setWorkout] = useState<WorkoutWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const data = await getWorkoutWithDetails(id);
        setWorkout(data);
      } catch (error) {
        console.error("Failed to load workout details:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
        <View className="items-center justify-center flex-1">
          <Text className="text-slate-500 dark:text-slate-400">
            Loading workout...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!workout) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
        <View className="px-4 py-4">
          <Pressable onPress={() => router.back()} className="flex-row items-center">
            <Ionicons name="chevron-back" size={24} color="#6b7280" />
            <Text className="text-primary-500 ml-1">Back</Text>
          </Pressable>
        </View>
        <View className="items-center justify-center flex-1">
          <Text className="text-slate-500 dark:text-slate-400">
            Workout not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalVolume = getTotalVolume(workout.exercises);
  const workoutDate = new Date(workout.started_at);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-4 py-4 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="mr-3 p-1"
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={24} color="#6b7280" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-bold text-slate-900 dark:text-white">
              {workout.name || "Workout"}
            </Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400">
              {format(workoutDate, "EEEE, MMMM d, yyyy")} at{" "}
              {format(workoutDate, "h:mm a")}
            </Text>
          </View>
        </View>

        {/* Summary Stats */}
        <View className="px-4 mb-4">
          <View className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 flex-row justify-around">
            <View className="items-center">
              <View className="flex-row items-center mb-1">
                <Ionicons name="time-outline" size={16} color="#6b7280" />
              </View>
              <Text className="text-lg font-semibold text-slate-900 dark:text-white">
                {formatDuration(workout.duration_seconds)}
              </Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400">
                Duration
              </Text>
            </View>
            <View className="items-center">
              <View className="flex-row items-center mb-1">
                <Ionicons name="fitness-outline" size={16} color="#6b7280" />
              </View>
              <Text className="text-lg font-semibold text-slate-900 dark:text-white">
                {workout.exercises.length}
              </Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400">
                Exercises
              </Text>
            </View>
            {totalVolume > 0 && (
              <View className="items-center">
                <View className="flex-row items-center mb-1">
                  <Ionicons name="barbell-outline" size={16} color="#6b7280" />
                </View>
                <Text className="text-lg font-semibold text-slate-900 dark:text-white">
                  {formatVolume(totalVolume)}
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400">
                  Volume
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Workout Notes */}
        {workout.notes ? (
          <View className="px-4 mb-4">
            <View className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="document-text-outline" size={16} color="#6b7280" />
                <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 ml-1">
                  Notes
                </Text>
              </View>
              <Text className="text-slate-700 dark:text-slate-300">
                {workout.notes}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Exercises */}
        <View className="px-4 gap-3">
          {workout.exercises.map((we, index) => (
            <ExerciseCard key={we.id} exercise={we} index={index} />
          ))}
        </View>

        {/* Bottom padding */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

function ExerciseCard({
  exercise,
  index,
}: {
  exercise: WorkoutExerciseWithDetails;
  index: number;
}) {
  const muscleColorClass =
    MUSCLE_GROUP_COLORS[exercise.exercise.primary_muscle] ||
    "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
  const [bgClass, textClass, darkBgClass, darkTextClass] =
    muscleColorClass.split(" ");

  const completedSets = exercise.sets.filter((s) => s.is_completed);

  return (
    <View className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4">
      {/* Exercise Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1">
          <Text className="text-base font-semibold text-slate-900 dark:text-white">
            {exercise.exercise.name}
          </Text>
          <View className={`ml-2 px-2 py-0.5 rounded-full ${bgClass} ${darkBgClass}`}>
            <Text className={`text-xs font-medium capitalize ${textClass} ${darkTextClass}`}>
              {exercise.exercise.primary_muscle}
            </Text>
          </View>
        </View>
      </View>

      {/* Exercise Notes */}
      {exercise.notes ? (
        <View className="mb-3">
          <Text className="text-sm text-slate-500 dark:text-slate-400 italic">
            {exercise.notes}
          </Text>
        </View>
      ) : null}

      {/* Sets Table */}
      {completedSets.length > 0 ? (
        <View>
          {/* Table Header */}
          <View className="flex-row pb-2 mb-1 border-b border-slate-200 dark:border-slate-700">
            <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 w-12">
              Set
            </Text>
            <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 flex-1 text-center">
              Weight
            </Text>
            <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 flex-1 text-center">
              Reps
            </Text>
            <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 w-12 text-right">
              Type
            </Text>
          </View>

          {/* Table Rows */}
          {completedSets.map((set, setIndex) => (
            <View
              key={set.id}
              className="flex-row py-2 items-center"
            >
              <Text className="text-sm text-slate-700 dark:text-slate-300 w-12">
                {setIndex + 1}
              </Text>
              <Text className="text-sm text-slate-900 dark:text-white flex-1 text-center font-medium">
                {set.weight != null ? `${set.weight} kg` : "--"}
              </Text>
              <Text className="text-sm text-slate-900 dark:text-white flex-1 text-center font-medium">
                {set.reps != null ? set.reps : "--"}
              </Text>
              <View className="w-12 items-end">
                {set.is_warmup ? (
                  <View className="bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 rounded">
                    <Text className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                      W
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text className="text-sm text-slate-500 dark:text-slate-400">
          No completed sets
        </Text>
      )}
    </View>
  );
}
