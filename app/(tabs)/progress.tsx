import { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import {
  getRecentPersonalRecords,
  getWeeklyVolumeInRange,
  getMuscleGroupVolumeInRange,
  getConsistencyStats,
  getExercisesUsedInRange,
  getExerciseBestSetPerSession,
} from "@/lib/db";
import type {
  WeeklyVolumePoint,
  MuscleGroupVolumePoint,
  ConsistencyStats,
  ExerciseUsageSummary,
  ExerciseStrengthPoint,
} from "@/lib/db/workouts";
import type { PersonalRecord } from "@/types";
import { useSettingsStore } from "@/stores";
import { getDateRange } from "@/utils/dateRange";
import VolumeChart from "@/components/charts/VolumeChart";
import MuscleBalanceChart from "@/components/charts/MuscleBalanceChart";
import StrengthProgressChart from "@/components/charts/StrengthProgressChart";

type TimeRange = "1M" | "3M" | "6M" | "1Y" | "All";

interface PRWithExercise extends PersonalRecord {
  exercise_name: string;
}

export default function ProgressScreen() {
  const { unitPreference } = useSettingsStore();

  const [selectedRange, setSelectedRange] = useState<TimeRange>("3M");
  const [weeklyVolume, setWeeklyVolume] = useState<WeeklyVolumePoint[]>([]);
  const [muscleBalance, setMuscleBalance] = useState<MuscleGroupVolumePoint[]>([]);
  const [consistencyStats, setConsistencyStats] = useState<ConsistencyStats | null>(null);
  const [exercises, setExercises] = useState<ExerciseUsageSummary[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [strengthData, setStrengthData] = useState<ExerciseStrengthPoint[]>([]);
  const [recentPRs, setRecentPRs] = useState<PRWithExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Trigger focus-based refresh
  const [focusTick, setFocusTick] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setFocusTick((t) => t + 1);
    }, [])
  );

  // Load range data + PRs
  useEffect(() => {
    const { startDate, endDate } = getDateRange(selectedRange);
    let cancelled = false;

    (async () => {
      if (focusTick === 0) return;
      try {
        const [volume, muscle, consistency, exerciseList, prs] = await Promise.all([
          getWeeklyVolumeInRange(startDate, endDate),
          getMuscleGroupVolumeInRange(startDate, endDate),
          getConsistencyStats(startDate, endDate),
          getExercisesUsedInRange(startDate, endDate),
          getRecentPersonalRecords(20),
        ]);
        if (cancelled) return;
        setWeeklyVolume(volume);
        setMuscleBalance(muscle);
        setConsistencyStats(consistency);
        setExercises(exerciseList);
        setRecentPRs(prs);
        setSelectedExerciseId((prev) => prev ?? (exerciseList[0]?.id ?? null));
      } catch (err) {
        console.error("Failed to load progress data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedRange, focusTick]);

  // Load strength chart data
  useEffect(() => {
    if (!selectedExerciseId) return;
    const { startDate, endDate } = getDateRange(selectedRange);
    let cancelled = false;

    getExerciseBestSetPerSession(selectedExerciseId, startDate, endDate)
      .then((d) => { if (!cancelled) setStrengthData(d); })
      .catch(console.error);

    return () => { cancelled = true; };
  }, [selectedExerciseId, selectedRange]);

  const onRefresh = async () => {
    setRefreshing(true);
    setFocusTick((t) => t + 1);
    setRefreshing(false);
  };

  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId) ?? null;
  const { startDate, endDate } = getDateRange(selectedRange);

  const formatPRDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return dateStr;
    }
  };

  const formatWeight = (w: number) => {
    const val = unitPreference === "lbs" ? w * 2.20462 : w;
    return `${Math.round(val * 10) / 10} ${unitPreference}`;
  };

  const timeRanges: TimeRange[] = ["1M", "3M", "6M", "1Y", "All"];

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <ScrollView
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="py-6">
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">Progress</Text>
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
                className={`text-center font-medium text-sm ${
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

        {/* Consistency Strip */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-4 items-center">
            <Text className="text-xl">🔥</Text>
            <Text className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {consistencyStats?.current_streak_weeks ?? "—"}
            </Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mt-0.5">
              Week streak
            </Text>
          </View>
          <View className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-4 items-center">
            <Ionicons name="barbell" size={22} color="#10b981" />
            <Text className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {consistencyStats?.total_workouts ?? "—"}
            </Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mt-0.5">
              Workouts
            </Text>
          </View>
          <View className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-4 items-center">
            <Ionicons name="calendar" size={22} color="#10b981" />
            <Text className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {consistencyStats?.avg_workouts_per_week ?? "—"}
            </Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mt-0.5">
              Avg/week
            </Text>
          </View>
        </View>

        {/* Volume Over Time */}
        <View className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 mb-6">
          <Text className="text-base font-semibold text-slate-900 dark:text-white mb-4">
            Volume Over Time
          </Text>
          {loading ? (
            <View className="h-44 items-center justify-center">
              <Text className="text-slate-400 dark:text-slate-500 text-sm">Loading…</Text>
            </View>
          ) : (
            <VolumeChart
              data={weeklyVolume}
              startDate={startDate}
              endDate={endDate}
              unit={unitPreference}
            />
          )}
        </View>

        {/* Muscle Group Balance */}
        <View className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 mb-6">
          <Text className="text-base font-semibold text-slate-900 dark:text-white mb-4">
            Muscle Group Balance
          </Text>
          {loading ? (
            <View className="h-32 items-center justify-center">
              <Text className="text-slate-400 dark:text-slate-500 text-sm">Loading…</Text>
            </View>
          ) : (
            <MuscleBalanceChart data={muscleBalance} unit={unitPreference} />
          )}
        </View>

        {/* Strength Progress */}
        <View className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 mb-6">
          <Text className="text-base font-semibold text-slate-900 dark:text-white mb-4">
            Strength Progress
          </Text>
          <StrengthProgressChart
            data={strengthData}
            selectedExercise={selectedExercise}
            exercises={exercises}
            onSelectExercise={(ex) => setSelectedExerciseId(ex.id)}
            unit={unitPreference}
          />
        </View>

        {/* Personal Records */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
            Personal Records
          </Text>
          {loading ? (
            <View className="bg-slate-100 dark:bg-slate-800 rounded-xl p-6 items-center">
              <Text className="text-slate-500 dark:text-slate-400">Loading…</Text>
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
                        {formatWeight(pr.weight)}
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

        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}
