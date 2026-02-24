import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getWorkoutWithDetails } from "@/lib/db";
import { useWorkoutStore } from "@/stores/workout-store";
import { useSettingsStore } from "@/stores/settings-store";
import type { WorkoutWithDetails } from "@/types";

interface Props {
  visible: boolean;
  workoutId: string | null;
  workoutName: string | null;
  onClose: () => void;
}

const KG_INCREMENTS = [1.25, 2.5, 5] as const;
const LBS_INCREMENTS = [2.5, 5, 10] as const;

export default function CopyWorkoutModal({
  visible,
  workoutId,
  workoutName,
  onClose,
}: Props) {
  const router = useRouter();
  const startWorkoutWithExercises = useWorkoutStore(
    (s) => s.startWorkoutWithExercises
  );
  const activeWorkout = useWorkoutStore((s) => s.active);
  const unit = useSettingsStore((s) => s.unitPreference);

  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [workoutDetails, setWorkoutDetails] =
    useState<WorkoutWithDetails | null>(null);
  const [applyOverload, setApplyOverload] = useState(false);
  const [overloadIncrement, setOverloadIncrement] = useState<number>(2.5);

  const increments = unit === "lbs" ? LBS_INCREMENTS : KG_INCREMENTS;

  useEffect(() => {
    if (visible && workoutId) {
      setLoading(true);
      setApplyOverload(false);
      setOverloadIncrement(unit === "lbs" ? 5 : 2.5);
      getWorkoutWithDetails(workoutId)
        .then((details) => setWorkoutDetails(details))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setWorkoutDetails(null);
    }
  }, [visible, workoutId]);

  const getAdjustedWeight = (
    weight: number | null,
    isWarmup: boolean
  ): number | null => {
    if (!weight || !applyOverload || isWarmup) return weight;
    return Math.round((weight + overloadIncrement) * 100) / 100;
  };

  const handleStart = async () => {
    if (!workoutDetails) return;
    setStarting(true);
    try {
      const exercises = workoutDetails.exercises
        .map((ex) => ({
          exerciseId: ex.exercise_id,
          sets: ex.sets
            .filter((s) => s.is_completed === 1)
            .map((s) => ({
              reps: s.reps ?? 0,
              weight: getAdjustedWeight(s.weight, s.is_warmup === 1) ?? 0,
              isWarmup: s.is_warmup === 1,
            })),
        }))
        .filter((ex) => ex.sets.length > 0);

      await startWorkoutWithExercises(
        workoutDetails.name ?? "Workout",
        exercises
      );
      onClose();
      router.navigate("/workout");
    } catch (error) {
      console.error("Failed to start copied workout:", error);
      setStarting(false);
    }
  };

  // Compute total working-set volume before and after overload
  const volumeStats = workoutDetails
    ? workoutDetails.exercises.reduce(
        (acc, ex) => {
          for (const s of ex.sets.filter(
            (s) => s.is_completed === 1 && s.is_warmup === 0
          )) {
            acc.orig += (s.weight ?? 0) * (s.reps ?? 0);
            acc.adj +=
              (getAdjustedWeight(s.weight, false) ?? 0) * (s.reps ?? 0);
          }
          return acc;
        },
        { orig: 0, adj: 0 }
      )
    : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white dark:bg-slate-900">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <Pressable onPress={onClose} className="p-2 -ml-2">
            <Ionicons name="close" size={24} color="#6b7280" />
          </Pressable>
          <Text className="text-lg font-bold text-slate-900 dark:text-white">
            Copy Workout
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#10b981" />
          </View>
        ) : workoutDetails ? (
          <>
            <ScrollView className="flex-1 px-4 pt-4">
              {/* Subtitle */}
              <Text className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                Copying:{" "}
                <Text className="font-semibold text-slate-900 dark:text-white">
                  {workoutName ?? workoutDetails.name ?? "Workout"}
                </Text>
              </Text>

              {/* Active workout warning */}
              {activeWorkout && (
                <View className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-3 mb-4 flex-row items-start gap-2">
                  <Ionicons name="warning-outline" size={18} color="#d97706" />
                  <Text className="text-sm text-amber-700 dark:text-amber-300 flex-1">
                    You have an active workout in progress. Starting this will
                    replace it.
                  </Text>
                </View>
              )}

              {/* Progressive Overload Toggle */}
              <View className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 mb-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-3">
                    <Text className="font-semibold text-slate-900 dark:text-white text-base">
                      Progressive Overload
                    </Text>
                    <Text className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      Increase weight on all working sets
                    </Text>
                  </View>
                  <Switch
                    value={applyOverload}
                    onValueChange={setApplyOverload}
                    trackColor={{ false: "#cbd5e1", true: "#10b981" }}
                    thumbColor="#ffffff"
                  />
                </View>

                {applyOverload && (
                  <View className="mt-4">
                    <Text className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                      Weight increase per working set
                    </Text>
                    <View className="flex-row gap-2">
                      {increments.map((inc) => (
                        <Pressable
                          key={inc}
                          onPress={() => setOverloadIncrement(inc)}
                          className={`flex-1 py-2.5 rounded-lg items-center ${
                            overloadIncrement === inc
                              ? "bg-emerald-500"
                              : "bg-slate-200 dark:bg-slate-700"
                          }`}
                        >
                          <Text
                            className={`font-semibold text-sm ${
                              overloadIncrement === inc
                                ? "text-white"
                                : "text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            +{inc} {unit}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Volume summary banner */}
              {applyOverload && volumeStats && volumeStats.orig > 0 && (
                <View className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-xl p-3 mb-4 flex-row items-center gap-2">
                  <Ionicons name="trending-up" size={18} color="#10b981" />
                  <Text className="text-sm text-emerald-700 dark:text-emerald-300 flex-1">
                    Working volume: {Math.round(volumeStats.orig)} →{" "}
                    {Math.round(volumeStats.adj)} {unit} (+
                    {Math.round(volumeStats.adj - volumeStats.orig)} {unit})
                  </Text>
                </View>
              )}

              {/* Exercise summary */}
              <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                Workout Summary
              </Text>
              <View className="gap-3 pb-6">
                {workoutDetails.exercises.map((ex) => {
                  const completedSets = ex.sets.filter(
                    (s) => s.is_completed === 1
                  );
                  let workingSetNum = 0;
                  return (
                    <View
                      key={ex.id}
                      className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4"
                    >
                      <Text className="font-semibold text-slate-900 dark:text-white">
                        {ex.exercise.name}
                      </Text>
                      <Text className="text-xs text-slate-400 dark:text-slate-500 capitalize mt-0.5 mb-3">
                        {ex.exercise.primary_muscle}
                      </Text>

                      {completedSets.length === 0 ? (
                        <Text className="text-sm text-slate-400 dark:text-slate-500 italic">
                          No completed sets
                        </Text>
                      ) : (
                        <View className="gap-1.5">
                          {completedSets.map((s) => {
                            const isWarmup = s.is_warmup === 1;
                            if (!isWarmup) workingSetNum++;
                            const label = isWarmup
                              ? "Warmup"
                              : `Set ${workingSetNum}`;
                            const origWeight = s.weight ?? 0;
                            const newWeight =
                              getAdjustedWeight(s.weight, isWarmup) ?? 0;
                            const weightChanged =
                              applyOverload && !isWarmup && origWeight > 0;

                            return (
                              <View
                                key={s.id}
                                className="flex-row items-center"
                              >
                                <Text className="text-xs text-slate-400 dark:text-slate-500 w-16">
                                  {label}
                                </Text>
                                <View className="flex-1 flex-row items-center">
                                  {weightChanged ? (
                                    <>
                                      <Text className="text-sm text-slate-400 dark:text-slate-500 line-through">
                                        {origWeight}
                                        {unit}
                                      </Text>
                                      <Ionicons
                                        name="arrow-forward"
                                        size={12}
                                        color="#10b981"
                                        style={{ marginHorizontal: 4 }}
                                      />
                                      <Text className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                        {newWeight}
                                        {unit}
                                      </Text>
                                    </>
                                  ) : (
                                    <Text className="text-sm text-slate-700 dark:text-slate-300">
                                      {origWeight > 0
                                        ? `${origWeight}${unit}`
                                        : "Bodyweight"}
                                    </Text>
                                  )}
                                  <Text className="text-sm text-slate-400 dark:text-slate-500 ml-2">
                                    × {s.reps ?? 0} reps
                                  </Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            {/* Bottom buttons */}
            <View className="px-4 pb-8 pt-3 border-t border-slate-200 dark:border-slate-700 gap-2">
              <Pressable
                onPress={handleStart}
                disabled={starting}
                className="bg-emerald-500 rounded-xl py-4 items-center active:bg-emerald-600"
              >
                {starting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-white font-bold text-base">
                    Start Workout
                  </Text>
                )}
              </Pressable>
              <Pressable onPress={onClose} className="py-3 items-center">
                <Text className="text-slate-500 dark:text-slate-400 font-medium">
                  Cancel
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </View>
    </Modal>
  );
}
