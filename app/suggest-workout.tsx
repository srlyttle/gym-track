import { useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  suggestWorkout,
  matchExercisesToDb,
  getApiKey,
  type SuggestWorkoutParams,
  type SuggestedWorkout,
  type SuggestedSet,
  type WorkoutSummary,
} from "@/lib/ai/claude";
import {
  getRecentWorkouts,
  getWorkoutWithDetails,
  getAllExercises,
} from "@/lib/db";
import { useWorkoutStore } from "@/stores/workout-store";
import type { Exercise } from "@/types";

const SPLITS = [
  { label: "Upper", value: "Upper Body" },
  { label: "Lower", value: "Lower Body" },
  { label: "Push", value: "Push" },
  { label: "Pull", value: "Pull" },
  { label: "Legs", value: "Legs" },
  { label: "Full Body", value: "Full Body" },
];

const DURATIONS = [
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
  { label: "90 min", value: 90 },
];

type Step = "configure" | "loading" | "summary" | "error";

interface MatchedExercise {
  exercise: Exercise;
  reason: string;
  sets: SuggestedSet[];
}

export default function SuggestWorkoutScreen() {
  const router = useRouter();
  const { startWorkoutWithExercises } = useWorkoutStore();

  const [step, setStep] = useState<Step>("configure");
  const [selectedSplit, setSelectedSplit] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Summary state
  const [suggestion, setSuggestion] = useState<SuggestedWorkout | null>(null);
  const [matchedExercises, setMatchedExercises] = useState<MatchedExercise[]>(
    []
  );

  // Cache params so "Suggest Another" can re-call without re-fetching data
  const cachedParamsRef = useRef<SuggestWorkoutParams | null>(null);

  const gatherParams = async (): Promise<SuggestWorkoutParams> => {
    if (cachedParamsRef.current) return cachedParamsRef.current;

    const recentWorkoutsRaw = await getRecentWorkouts(10);
    const recentWorkouts: WorkoutSummary[] = [];

    for (const w of recentWorkoutsRaw) {
      const details = await getWorkoutWithDetails(w.id);
      if (details) {
        recentWorkouts.push({
          date: w.started_at.split("T")[0],
          exercises: details.exercises.map((e) => ({
            name: e.exercise.name,
            primaryMuscle: e.exercise.primary_muscle,
            sets: e.sets.length,
          })),
        });
      }
    }

    const availableExercises = await getAllExercises();

    const params: SuggestWorkoutParams = {
      recentWorkouts,
      split: selectedSplit!,
      duration: selectedDuration!,
      availableExercises,
    };

    cachedParamsRef.current = params;
    return params;
  };

  const handleGenerate = async () => {
    if (!selectedSplit || !selectedDuration) return;

    const apiKey = await getApiKey();
    if (!apiKey) {
      Alert.alert(
        "API Key Required",
        "Set your Claude API key in Profile > Settings to use workout suggestions.",
        [{ text: "OK", onPress: () => router.back() }]
      );
      return;
    }

    setStep("loading");

    try {
      const params = await gatherParams();
      const result = await suggestWorkout(params);

      const { matched, unmatched } = matchExercisesToDb(
        result.exercises,
        params.availableExercises
      );

      if (matched.length === 0) {
        throw new Error(
          "Could not match any suggested exercises to your exercise database."
        );
      }

      if (unmatched.length > 0) {
        console.warn("Unmatched exercises:", unmatched);
      }

      // Combine matched DB exercises with reasoning from the suggestion
      const matchedWithReasons: MatchedExercise[] = matched.map((m) => {
        const sugEx = result.exercises.find(
          (e) =>
            e.exerciseName.toLowerCase() === m.exercise.name.toLowerCase()
        );
        return {
          exercise: m.exercise,
          reason: sugEx?.reason || "",
          sets: m.sets,
        };
      });

      setSuggestion(result);
      setMatchedExercises(matchedWithReasons);
      setStep("summary");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";
      setErrorMessage(message);
      setStep("error");
    }
  };

  const handleAccept = async () => {
    if (!suggestion || matchedExercises.length === 0) return;

    setStep("loading");

    try {
      const exercisesForWorkout = matchedExercises.map((m) => ({
        exerciseId: m.exercise.id,
        sets: m.sets.map((s) => ({
          reps: s.reps,
          weight: s.weight,
          isWarmup: s.isWarmup,
        })),
      }));

      await startWorkoutWithExercises(suggestion.name, exercisesForWorkout);
      router.replace("/(tabs)/workout");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create workout.";
      setErrorMessage(message);
      setStep("error");
    }
  };

  const handleSuggestAnother = () => {
    setSuggestion(null);
    setMatchedExercises([]);
    handleGenerate();
  };

  const handleRetry = () => {
    setErrorMessage("");
    setStep("configure");
  };

  const formatSets = (sets: SuggestedSet[]): string => {
    const warmups = sets.filter((s) => s.isWarmup);
    const working = sets.filter((s) => !s.isWarmup);

    const parts: string[] = [];
    if (warmups.length > 0) {
      parts.push(
        `${warmups.length} warmup (${warmups[0].reps}r @ ${warmups[0].weight}kg)`
      );
    }
    if (working.length > 0) {
      const reps = working[0].reps;
      const weight = working[0].weight;
      parts.push(`${working.length}x${reps} @ ${weight}kg`);
    }
    return parts.join(" + ");
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <Pressable onPress={() => router.back()}>
          <Text className="text-slate-500 dark:text-slate-400">Cancel</Text>
        </Pressable>
        <Text className="text-lg font-semibold text-slate-900 dark:text-white">
          Suggest Workout
        </Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Step 1: Configure */}
      {step === "configure" && (
        <ScrollView className="flex-1 px-4">
          <View className="mt-6 mb-6">
            <Text className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              Workout Split
            </Text>
            <Text className="text-slate-500 dark:text-slate-400 text-sm mb-3">
              What muscle groups do you want to train?
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {SPLITS.map((split) => (
                <Pressable
                  key={split.value}
                  onPress={() => setSelectedSplit(split.value)}
                  className={`px-4 py-3 rounded-xl border ${
                    selectedSplit === split.value
                      ? "bg-primary-500 border-primary-500"
                      : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      selectedSplit === split.value
                        ? "text-white"
                        : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {split.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              Available Time
            </Text>
            <Text className="text-slate-500 dark:text-slate-400 text-sm mb-3">
              How long do you have to train?
            </Text>
            <View className="flex-row gap-2">
              {DURATIONS.map((dur) => (
                <Pressable
                  key={dur.value}
                  onPress={() => setSelectedDuration(dur.value)}
                  className={`flex-1 py-3 rounded-xl border items-center ${
                    selectedDuration === dur.value
                      ? "bg-primary-500 border-primary-500"
                      : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      selectedDuration === dur.value
                        ? "text-white"
                        : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {dur.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            onPress={handleGenerate}
            disabled={!selectedSplit || !selectedDuration}
            className={`rounded-xl p-4 items-center ${
              selectedSplit && selectedDuration
                ? "bg-primary-500 active:bg-primary-600"
                : "bg-slate-300 dark:bg-slate-700"
            }`}
          >
            <View className="flex-row items-center gap-2">
              <Ionicons
                name="sparkles"
                size={20}
                color={
                  selectedSplit && selectedDuration ? "white" : "#9ca3af"
                }
              />
              <Text
                className={`font-semibold text-lg ${
                  selectedSplit && selectedDuration
                    ? "text-white"
                    : "text-slate-400"
                }`}
              >
                Generate Workout
              </Text>
            </View>
          </Pressable>
        </ScrollView>
      )}

      {/* Step 2: Loading */}
      {step === "loading" && (
        <View className="flex-1 items-center justify-center px-4">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="text-lg font-medium text-slate-900 dark:text-white mt-4">
            Generating your workout...
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-sm mt-2 text-center">
            Analyzing your history and building a personalized{" "}
            {selectedSplit?.toLowerCase()} workout
          </Text>
        </View>
      )}

      {/* Step 3: Summary */}
      {step === "summary" && suggestion && (
        <ScrollView className="flex-1 px-4">
          {/* Workout Name */}
          <View className="mt-6 mb-4">
            <Text className="text-2xl font-bold text-slate-900 dark:text-white">
              {suggestion.name}
            </Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {selectedSplit} &middot; {selectedDuration} min &middot;{" "}
              {matchedExercises.length} exercises
            </Text>
          </View>

          {/* Overall Reasoning */}
          <View className="bg-primary-500/10 rounded-xl p-4 mb-6">
            <View className="flex-row items-start gap-2">
              <Ionicons
                name="bulb-outline"
                size={20}
                color="#10b981"
                style={{ marginTop: 2 }}
              />
              <Text className="text-slate-700 dark:text-slate-300 flex-1 leading-5">
                {suggestion.reasoning}
              </Text>
            </View>
          </View>

          {/* Exercise List */}
          <View className="gap-3 mb-6">
            {matchedExercises.map((m, index) => (
              <View
                key={m.exercise.id}
                className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4"
              >
                <View className="flex-row items-start justify-between mb-1">
                  <View className="flex-1 mr-3">
                    <Text className="font-semibold text-slate-900 dark:text-white">
                      {index + 1}. {m.exercise.name}
                    </Text>
                    <Text className="text-xs text-primary-500 capitalize mt-0.5">
                      {m.exercise.primary_muscle}
                      {m.exercise.equipment ? ` · ${m.exercise.equipment}` : ""}
                    </Text>
                  </View>
                  <Text className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {formatSets(m.sets)}
                  </Text>
                </View>
                {m.reason ? (
                  <Text className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-5">
                    {m.reason}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View className="gap-3 mb-8">
            <Pressable
              onPress={handleAccept}
              className="bg-primary-500 rounded-xl p-4 active:bg-primary-600"
            >
              <View className="flex-row items-center justify-center gap-2">
                <Ionicons name="checkmark-circle" size={22} color="white" />
                <Text className="text-white font-semibold text-lg">
                  Start This Workout
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={handleSuggestAnother}
              className="border-2 border-slate-300 dark:border-slate-600 rounded-xl p-4 active:bg-slate-100 dark:active:bg-slate-800"
            >
              <View className="flex-row items-center justify-center gap-2">
                <Ionicons name="refresh" size={20} color="#64748b" />
                <Text className="text-slate-600 dark:text-slate-400 font-semibold text-lg">
                  Suggest Another
                </Text>
              </View>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {/* Error */}
      {step === "error" && (
        <View className="flex-1 items-center justify-center px-4">
          <View className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center mb-4">
            <Ionicons name="alert-circle" size={32} color="#ef4444" />
          </View>
          <Text className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            Something went wrong
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-center mb-6 px-4">
            {errorMessage}
          </Text>
          <Pressable
            onPress={handleRetry}
            className="bg-primary-500 rounded-xl px-8 py-3 active:bg-primary-600"
          >
            <Text className="text-white font-semibold">Try Again</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
