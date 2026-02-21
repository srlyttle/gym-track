import { useState, useRef, useEffect } from "react";
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
  suggestSplit,
  matchExercisesToDb,
  getApiKey,
  type SuggestWorkoutParams,
  type SuggestSplitParams,
  type SuggestedWorkout,
  type SuggestedSplitPlan,
  type SuggestedSet,
  type WorkoutSummary,
} from "@/lib/ai/claude";
import {
  getRecentWorkouts,
  getWorkoutWithDetails,
  getAllExercises,
  generateId,
} from "@/lib/db";
import { useWorkoutStore } from "@/stores/workout-store";
import { useSplitStore } from "@/stores/split-store";
import { getPTTrainers } from "@/lib/pt-splits";
import type { Exercise, ActiveSplit, PTProgram, PTTrainer } from "@/types";

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

const DAYS_PER_WEEK = [2, 3, 4, 5];

const ENERGY_LEVELS = [
  { label: "Energized", value: "energized" as const },
  { label: "Normal", value: "normal" as const },
  { label: "Tired", value: "tired" as const },
];

const EQUIPMENT_OPTIONS = [
  { label: "Full Gym", value: "full_gym" as const },
  { label: "Home Gym", value: "home_gym" as const },
  { label: "No Equipment", value: "no_equipment" as const },
];

type PTGoal = "build_muscle" | "lose_weight" | "get_fitter" | "athletic";
type PTEquipment = "full_gym" | "home_gym" | "no_equipment";

interface PTQuizAnswers {
  goal: PTGoal | null;
  equipment: PTEquipment | null;
  days: number | null;
}

const PT_GOALS: { label: string; description: string; value: PTGoal; icon: string }[] = [
  { label: "Build Muscle", description: "Grow size and strength", value: "build_muscle", icon: "barbell" },
  { label: "Lose Weight", description: "Burn fat, improve body comp", value: "lose_weight", icon: "flame" },
  { label: "Get Fitter", description: "Improve cardio and endurance", value: "get_fitter", icon: "walk" },
  { label: "Athletic Performance", description: "Power, speed, coordination", value: "athletic", icon: "trophy" },
];

// Relevance scoring — goal+equipment+days against a program
function scoreProgramForQuiz(
  program: { id: string; trainerId: string; daysPerWeek: number },
  quiz: PTQuizAnswers
): number {
  let score = 0;

  // Days per week (highest weight)
  if (quiz.days !== null) {
    if (program.daysPerWeek === quiz.days) score += 4;
    else if (Math.abs(program.daysPerWeek - quiz.days) === 1) score += 2;
  }

  // Goal
  const goalFit: Record<PTGoal, string[]> = {
    build_muscle: ["531-foundation", "ppl-hypertrophy"],
    lose_weight: ["ppl-hypertrophy", "full-body-3day"],
    get_fitter: ["full-body-3day", "2day-athletic"],
    athletic: ["2day-athletic"],
  };
  if (quiz.goal && goalFit[quiz.goal]?.includes(program.id)) score += 3;

  // Equipment
  const homeOk = ["full-body-3day", "2day-athletic"];
  if (quiz.equipment === "full_gym") score += 1;
  else if (quiz.equipment === "home_gym" && homeOk.includes(program.id)) score += 2;

  return score;
}

type Step =
  | "mode_select"
  | "goal_select"
  | "feeling"
  | "split_config"
  | "pt_quiz"
  | "pt_trainer_select"
  | "pt_program_select"
  | "loading"
  | "summary"
  | "split_summary"
  | "error";

interface MatchedExercise {
  exercise: Exercise;
  reason: string;
  sets: SuggestedSet[];
}

export default function SuggestWorkoutScreen() {
  const router = useRouter();
  const { startWorkoutWithExercises } = useWorkoutStore();
  const { activeSplit, setActiveSplit, advanceDay, clearActiveSplit } =
    useSplitStore();

  const [step, setStep] = useState<Step>("mode_select");
  const [selectedSplit, setSelectedSplit] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [selectedDaysPerWeek, setSelectedDaysPerWeek] = useState<number | null>(
    null
  );
  const [selectedEnergy, setSelectedEnergy] = useState<
    "energized" | "normal" | "tired" | null
  >(null);
  const [selectedEquipment, setSelectedEquipment] = useState<
    "full_gym" | "home_gym" | "no_equipment" | null
  >(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [expandedDayIndex, setExpandedDayIndex] = useState<number | null>(null);

  // PT state
  const [selectedTrainer, setSelectedTrainer] = useState<PTTrainer | null>(
    null
  );
  const [pendingSplit, setPendingSplit] = useState<ActiveSplit | null>(null);
  const [ptQuiz, setPtQuiz] = useState<PTQuizAnswers>({
    goal: null,
    equipment: null,
    days: null,
  });

  // Individual workout summary state
  const [suggestion, setSuggestion] = useState<SuggestedWorkout | null>(null);
  const [matchedExercises, setMatchedExercises] = useState<MatchedExercise[]>(
    []
  );

  // AI split preview state
  const [suggestedSplitPlan, setSuggestedSplitPlan] =
    useState<SuggestedSplitPlan | null>(null);

  // Cache DB params
  const cachedParamsRef = useRef<{
    recentWorkouts: WorkoutSummary[];
    availableExercises: Exercise[];
  } | null>(null);

  // On mount: if active split exists, go straight to split_summary
  useEffect(() => {
    if (activeSplit) {
      setStep("split_summary");
    }
  }, []);

  const gatherParams = async () => {
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
    cachedParamsRef.current = { recentWorkouts, availableExercises };
    return cachedParamsRef.current;
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
      parts.push(`${working.length}x${working[0].reps} @ ${working[0].weight}kg`);
    }
    return parts.join(" + ");
  };

  // ── Individual workout generation ──────────────────────────────────────────

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
      const { recentWorkouts, availableExercises } = await gatherParams();
      const params: SuggestWorkoutParams = {
        recentWorkouts,
        split: selectedSplit,
        duration: selectedDuration,
        availableExercises,
        energyLevel: selectedEnergy ?? undefined,
        equipment: selectedEquipment ?? undefined,
      };

      const result = await suggestWorkout(params);
      const { matched, unmatched } = matchExercisesToDb(
        result.exercises,
        availableExercises
      );

      if (matched.length === 0) {
        throw new Error(
          "Could not match any suggested exercises to your exercise database."
        );
      }
      if (unmatched.length > 0) {
        console.warn("Unmatched exercises:", unmatched);
      }

      const matchedWithReasons: MatchedExercise[] = matched.map((m) => {
        const sugEx = result.exercises.find(
          (e) => e.exerciseName.toLowerCase() === m.exercise.name.toLowerCase()
        );
        return { exercise: m.exercise, reason: sugEx?.reason || "", sets: m.sets };
      });

      setSuggestion(result);
      setMatchedExercises(matchedWithReasons);
      setStep("summary");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
      setStep("error");
    }
  };

  const handleAccept = async () => {
    if (!suggestion || matchedExercises.length === 0) return;
    setStep("loading");
    try {
      await startWorkoutWithExercises(
        suggestion.name,
        matchedExercises.map((m) => ({
          exerciseId: m.exercise.id,
          sets: m.sets.map((s) => ({
            reps: s.reps,
            weight: s.weight,
            isWarmup: s.isWarmup,
          })),
        }))
      );
      router.replace("/(tabs)/workout");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create workout."
      );
      setStep("error");
    }
  };

  const handleSuggestAnother = () => {
    setSuggestion(null);
    setMatchedExercises([]);
    handleGenerate();
  };

  // ── AI Split generation ────────────────────────────────────────────────────

  const buildActiveSplitFromAI = (
    plan: SuggestedSplitPlan,
    dbExercises: Exercise[]
  ): ActiveSplit => {
    return {
      id: generateId(),
      name: plan.name,
      source: "ai",
      currentDayIndex: 0,
      activatedAt: new Date().toISOString(),
      days: plan.days.map((day) => {
        const { matched } = matchExercisesToDb(day.exercises, dbExercises);
        return {
          dayName: day.dayName,
          splitType: day.splitType,
          exercises: matched.map((m) => ({
            exerciseId: m.exercise.id,
            exerciseName: m.exercise.name,
            sets: m.sets,
          })),
        };
      }),
    };
  };

  const buildActiveSplitFromPT = (
    program: PTProgram,
    dbExercises: Exercise[]
  ): ActiveSplit => {
    return {
      id: generateId(),
      name: program.name,
      source: "pt",
      ptTrainerId: program.trainerId,
      ptProgramId: program.id,
      currentDayIndex: 0,
      activatedAt: new Date().toISOString(),
      days: program.days.map((day) => {
        const withReason = day.exercises.map((e) => ({
          exerciseName: e.exerciseName,
          reason: "",
          sets: e.sets,
        }));
        const { matched } = matchExercisesToDb(withReason, dbExercises);
        return {
          dayName: day.dayName,
          splitType: day.splitType,
          exercises: matched.map((m) => ({
            exerciseId: m.exercise.id,
            exerciseName: m.exercise.name,
            sets: m.sets,
          })),
        };
      }),
    };
  };

  const handleGenerateSplit = async () => {
    if (!selectedDaysPerWeek) return;

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
      const { recentWorkouts, availableExercises } = await gatherParams();
      const params: SuggestSplitParams = {
        daysPerWeek: selectedDaysPerWeek,
        recentWorkouts,
        availableExercises,
        energyLevel: selectedEnergy ?? undefined,
        equipment: selectedEquipment ?? undefined,
      };

      const plan = await suggestSplit(params);
      setSuggestedSplitPlan(plan);
      const built = buildActiveSplitFromAI(plan, availableExercises);
      setPendingSplit(built);
      setStep("split_summary");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
      setStep("error");
    }
  };

  const handleActivatePTSplit = async (program: PTProgram) => {
    setStep("loading");
    try {
      const { availableExercises } = await gatherParams();
      const built = buildActiveSplitFromPT(program, availableExercises);
      setPendingSplit(built);
      setStep("split_summary");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load program."
      );
      setStep("error");
    }
  };

  const handleActivatePendingSplit = () => {
    if (!pendingSplit) return;
    setActiveSplit(pendingSplit);
    setPendingSplit(null);
    // Stay on split_summary to show the active split view
  };

  const handleGenerateAnotherSplit = () => {
    cachedParamsRef.current = null;
    setSuggestedSplitPlan(null);
    setPendingSplit(null);
    setStep("split_config");
  };

  const startDayFromActiveSplit = async (split: ActiveSplit, dayIndex: number) => {
    const day = split.days[dayIndex];
    if (!day || day.exercises.length === 0) {
      Alert.alert("No exercises", "This day has no matched exercises.");
      return;
    }

    setStep("loading");
    try {
      await startWorkoutWithExercises(
        `${split.name} — ${day.dayName}`,
        day.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          sets: ex.sets.map((s) => ({
            reps: s.reps,
            weight: s.weight,
            isWarmup: s.isWarmup,
          })),
        }))
      );
      advanceDay();
      router.replace("/(tabs)/workout");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to start workout."
      );
      setStep("error");
    }
  };

  const handleRetry = () => {
    setErrorMessage("");
    setStep("mode_select");
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const currentActiveSplit = activeSplit;

  const renderChip = <T,>(
    options: { label: string; value: T }[],
    selected: T | null,
    onSelect: (v: T) => void
  ) => (
    <View className="flex-row flex-wrap gap-2">
      {options.map((opt) => (
        <Pressable
          key={String(opt.value)}
          onPress={() => onSelect(opt.value)}
          className={`px-4 py-2.5 rounded-xl border ${
            selected === opt.value
              ? "bg-primary-500 border-primary-500"
              : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          }`}
        >
          <Text
            className={`font-medium ${
              selected === opt.value
                ? "text-white"
                : "text-slate-900 dark:text-white"
            }`}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <Pressable
          onPress={() => {
            if (step === "goal_select") setStep("mode_select");
            else if (step === "feeling") setStep("goal_select");
            else if (step === "split_config") setStep("goal_select");
            else if (step === "pt_quiz") setStep("mode_select");
            else if (step === "pt_trainer_select") setStep("pt_quiz");
            else if (step === "pt_program_select") setStep("pt_trainer_select");
            else if (step === "summary" || step === "split_summary" || step === "error")
              setStep("mode_select");
            else router.back();
          }}
        >
          <Text className="text-slate-500 dark:text-slate-400">
            {step === "mode_select" ? "Cancel" : "Back"}
          </Text>
        </Pressable>
        <Text className="text-lg font-semibold text-slate-900 dark:text-white">
          {step === "mode_select" && "Workouts"}
          {step === "goal_select" && "AI Suggest"}
          {step === "feeling" && "Configure"}
          {step === "split_config" && "Split Config"}
          {step === "pt_quiz" && "Your Goals"}
          {step === "pt_trainer_select" && "Choose Trainer"}
          {step === "pt_program_select" && selectedTrainer?.name}
          {step === "loading" && "Generating..."}
          {step === "summary" && "Your Workout"}
          {step === "split_summary" && "Split Program"}
          {step === "error" && "Error"}
        </Text>
        <View style={{ width: 50 }} />
      </View>

      {/* ── Mode Select ──────────────────────────────────────────────────── */}
      {step === "mode_select" && (
        <ScrollView className="flex-1 px-4">
          {/* Active split card */}
          {currentActiveSplit && (
            <Pressable
              onPress={() => setStep("split_summary")}
              className="mt-4 bg-primary-500/10 border border-primary-500/30 rounded-xl p-4 mb-2"
            >
              <View className="flex-row items-center gap-2">
                <Ionicons name="layers" size={18} color="#10b981" />
                <View className="flex-1">
                  <Text className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                    Active Split
                  </Text>
                  <Text className="font-semibold text-slate-900 dark:text-white">
                    {currentActiveSplit.name} · Day{" "}
                    {currentActiveSplit.currentDayIndex + 1}/
                    {currentActiveSplit.days.length}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#10b981" />
              </View>
            </Pressable>
          )}

          <View className="mt-6 mb-3">
            <Text className="text-xl font-bold text-slate-900 dark:text-white">
              How would you like to train?
            </Text>
          </View>

          <View className="gap-3 mb-6">
            <Pressable
              onPress={() => setStep("goal_select")}
              className="bg-primary-500 rounded-2xl p-5 active:bg-primary-600"
            >
              <View className="flex-row items-center gap-3 mb-2">
                <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
                  <Ionicons name="sparkles" size={22} color="white" />
                </View>
                <Text className="text-white font-bold text-lg">AI Suggest</Text>
              </View>
              <Text className="text-white/80 text-sm leading-5">
                Claude generates a personalised workout or full multi-day split
                based on your history.
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setStep("pt_quiz")}
              className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 active:bg-slate-200 dark:active:bg-slate-700"
            >
              <View className="flex-row items-center gap-3 mb-2">
                <View className="w-10 h-10 rounded-full bg-primary-500/10 items-center justify-center">
                  <Ionicons name="person" size={22} color="#10b981" />
                </View>
                <Text className="text-slate-900 dark:text-white font-bold text-lg">
                  PT Program
                </Text>
              </View>
              <Text className="text-slate-500 dark:text-slate-400 text-sm leading-5">
                Follow a structured program from one of our expert trainers.
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {/* ── Goal Select (AI) ─────────────────────────────────────────────── */}
      {step === "goal_select" && (
        <ScrollView className="flex-1 px-4">
          <View className="mt-6 mb-3">
            <Text className="text-xl font-bold text-slate-900 dark:text-white">
              What do you want to generate?
            </Text>
          </View>
          <View className="gap-3 mb-6">
            <Pressable
              onPress={() => setStep("feeling")}
              className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 active:bg-slate-200 dark:active:bg-slate-700"
            >
              <View className="flex-row items-center gap-3 mb-2">
                <View className="w-10 h-10 rounded-full bg-primary-500/10 items-center justify-center">
                  <Ionicons name="barbell" size={22} color="#10b981" />
                </View>
                <Text className="text-slate-900 dark:text-white font-bold text-lg">
                  Individual Workout
                </Text>
              </View>
              <Text className="text-slate-500 dark:text-slate-400 text-sm leading-5">
                Generate a single session tailored to your split and available
                time.
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setStep("split_config")}
              className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 active:bg-slate-200 dark:active:bg-slate-700"
            >
              <View className="flex-row items-center gap-3 mb-2">
                <View className="w-10 h-10 rounded-full bg-primary-500/10 items-center justify-center">
                  <Ionicons name="layers" size={22} color="#10b981" />
                </View>
                <Text className="text-slate-900 dark:text-white font-bold text-lg">
                  Split Program
                </Text>
              </View>
              <Text className="text-slate-500 dark:text-slate-400 text-sm leading-5">
                Generate a full N-day split. Cycle through days with progress
                tracking.
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {/* ── Feeling / Configure (Individual) ────────────────────────────── */}
      {step === "feeling" && (
        <ScrollView className="flex-1 px-4">
          <View className="mt-6 mb-6">
            <Text className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              Workout Split
            </Text>
            <Text className="text-slate-500 dark:text-slate-400 text-sm mb-3">
              What muscle groups do you want to train?
            </Text>
            {renderChip(SPLITS, selectedSplit, setSelectedSplit)}
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

          <View className="mb-4">
            <Text className="text-base font-medium text-slate-700 dark:text-slate-300 mb-2">
              Energy Level{" "}
              <Text className="text-slate-400 font-normal text-sm">
                (optional)
              </Text>
            </Text>
            {renderChip(ENERGY_LEVELS, selectedEnergy, setSelectedEnergy)}
          </View>

          <View className="mb-8">
            <Text className="text-base font-medium text-slate-700 dark:text-slate-300 mb-2">
              Equipment{" "}
              <Text className="text-slate-400 font-normal text-sm">
                (optional)
              </Text>
            </Text>
            {renderChip(EQUIPMENT_OPTIONS, selectedEquipment, setSelectedEquipment)}
          </View>

          <Pressable
            onPress={handleGenerate}
            disabled={!selectedSplit || !selectedDuration}
            className={`rounded-xl p-4 items-center mb-8 ${
              selectedSplit && selectedDuration
                ? "bg-primary-500 active:bg-primary-600"
                : "bg-slate-300 dark:bg-slate-700"
            }`}
          >
            <View className="flex-row items-center gap-2">
              <Ionicons
                name="sparkles"
                size={20}
                color={selectedSplit && selectedDuration ? "white" : "#9ca3af"}
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

      {/* ── Split Config (AI Split) ──────────────────────────────────────── */}
      {step === "split_config" && (
        <ScrollView className="flex-1 px-4">
          <View className="mt-6 mb-6">
            <Text className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              Days Per Week
            </Text>
            <Text className="text-slate-500 dark:text-slate-400 text-sm mb-3">
              How many days per week can you train?
            </Text>
            <View className="flex-row gap-2">
              {DAYS_PER_WEEK.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setSelectedDaysPerWeek(d)}
                  className={`flex-1 py-3 rounded-xl border items-center ${
                    selectedDaysPerWeek === d
                      ? "bg-primary-500 border-primary-500"
                      : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <Text
                    className={`font-bold text-lg ${
                      selectedDaysPerWeek === d
                        ? "text-white"
                        : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {d}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-base font-medium text-slate-700 dark:text-slate-300 mb-2">
              Energy Level{" "}
              <Text className="text-slate-400 font-normal text-sm">
                (optional)
              </Text>
            </Text>
            {renderChip(ENERGY_LEVELS, selectedEnergy, setSelectedEnergy)}
          </View>

          <View className="mb-8">
            <Text className="text-base font-medium text-slate-700 dark:text-slate-300 mb-2">
              Equipment{" "}
              <Text className="text-slate-400 font-normal text-sm">
                (optional)
              </Text>
            </Text>
            {renderChip(EQUIPMENT_OPTIONS, selectedEquipment, setSelectedEquipment)}
          </View>

          <Pressable
            onPress={handleGenerateSplit}
            disabled={!selectedDaysPerWeek}
            className={`rounded-xl p-4 items-center mb-8 ${
              selectedDaysPerWeek
                ? "bg-primary-500 active:bg-primary-600"
                : "bg-slate-300 dark:bg-slate-700"
            }`}
          >
            <View className="flex-row items-center gap-2">
              <Ionicons
                name="sparkles"
                size={20}
                color={selectedDaysPerWeek ? "white" : "#9ca3af"}
              />
              <Text
                className={`font-semibold text-lg ${
                  selectedDaysPerWeek ? "text-white" : "text-slate-400"
                }`}
              >
                Generate Split
              </Text>
            </View>
          </Pressable>
        </ScrollView>
      )}

      {/* ── PT Quiz ─────────────────────────────────────────────────────── */}
      {step === "pt_quiz" && (
        <ScrollView className="flex-1 px-4">
          <View className="mt-6 mb-2">
            <Text className="text-xl font-bold text-slate-900 dark:text-white">
              Let's find the right program
            </Text>
            <Text className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Answer a few questions so we can match you with the best trainer.
            </Text>
          </View>

          {/* Q1 — Goal */}
          <View className="mt-6 mb-6">
            <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
              What's your primary goal?
            </Text>
            <View className="gap-2">
              {PT_GOALS.map((g) => {
                const active = ptQuiz.goal === g.value;
                return (
                  <Pressable
                    key={g.value}
                    onPress={() => setPtQuiz((prev) => ({ ...prev, goal: g.value }))}
                    className={`flex-row items-center gap-3 p-4 rounded-xl border ${
                      active
                        ? "bg-primary-500 border-primary-500"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <View
                      className={`w-9 h-9 rounded-full items-center justify-center ${
                        active ? "bg-white/20" : "bg-primary-500/10"
                      }`}
                    >
                      <Ionicons
                        name={g.icon as any}
                        size={18}
                        color={active ? "white" : "#10b981"}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`font-semibold ${
                          active ? "text-white" : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {g.label}
                      </Text>
                      <Text
                        className={`text-xs mt-0.5 ${
                          active ? "text-white/70" : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {g.description}
                      </Text>
                    </View>
                    {active && (
                      <Ionicons name="checkmark-circle" size={20} color="white" />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Q2 — Equipment */}
          <View className="mb-6">
            <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
              What equipment do you have access to?
            </Text>
            <View className="gap-2">
              {[
                { label: "Full Gym", description: "Barbells, cables, machines", value: "full_gym" as PTEquipment, icon: "fitness" },
                { label: "Home Gym", description: "Dumbbells, some equipment", value: "home_gym" as PTEquipment, icon: "home" },
                { label: "No Equipment", description: "Bodyweight only", value: "no_equipment" as PTEquipment, icon: "body" },
              ].map((opt) => {
                const active = ptQuiz.equipment === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setPtQuiz((prev) => ({ ...prev, equipment: opt.value }))}
                    className={`flex-row items-center gap-3 p-4 rounded-xl border ${
                      active
                        ? "bg-primary-500 border-primary-500"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <View
                      className={`w-9 h-9 rounded-full items-center justify-center ${
                        active ? "bg-white/20" : "bg-primary-500/10"
                      }`}
                    >
                      <Ionicons
                        name={opt.icon as any}
                        size={18}
                        color={active ? "white" : "#10b981"}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`font-semibold ${
                          active ? "text-white" : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {opt.label}
                      </Text>
                      <Text
                        className={`text-xs mt-0.5 ${
                          active ? "text-white/70" : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {opt.description}
                      </Text>
                    </View>
                    {active && (
                      <Ionicons name="checkmark-circle" size={20} color="white" />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Q3 — Days per week */}
          <View className="mb-8">
            <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
              How many days per week can you train?
            </Text>
            <View className="flex-row gap-2">
              {[2, 3, 4, 5].map((d) => {
                const active = ptQuiz.days === d;
                return (
                  <Pressable
                    key={d}
                    onPress={() => setPtQuiz((prev) => ({ ...prev, days: d }))}
                    className={`flex-1 py-4 rounded-xl border items-center ${
                      active
                        ? "bg-primary-500 border-primary-500"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <Text
                      className={`font-bold text-xl ${
                        active ? "text-white" : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {d}
                    </Text>
                    <Text
                      className={`text-xs mt-0.5 ${
                        active ? "text-white/70" : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      days
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            onPress={() => setStep("pt_trainer_select")}
            className="bg-primary-500 rounded-xl p-4 items-center mb-8 active:bg-primary-600"
          >
            <View className="flex-row items-center gap-2">
              <Text className="text-white font-semibold text-lg">
                See Recommended Trainers
              </Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </View>
          </Pressable>
        </ScrollView>
      )}

      {/* ── PT Trainer Select ────────────────────────────────────────────── */}
      {step === "pt_trainer_select" && (() => {
        const quizUsed = ptQuiz.goal || ptQuiz.equipment || ptQuiz.days;

        // Score each trainer by their best-matching program
        const scored = getPTTrainers()
          .map((trainer) => {
            const maxScore = Math.max(
              ...trainer.programs.map((p) => scoreProgramForQuiz(p, ptQuiz))
            );
            return { trainer, maxScore };
          })
          .sort((a, b) => b.maxScore - a.maxScore);

        const topScore = scored[0]?.maxScore ?? 0;

        return (
          <ScrollView className="flex-1 px-4">
            <View className="mt-6 mb-3">
              <Text className="text-xl font-bold text-slate-900 dark:text-white">
                Choose a Trainer
              </Text>
              {quizUsed ? (
                <Text className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                  Sorted by how well they match your goals.
                </Text>
              ) : (
                <Text className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                  Select a trainer to browse their programs.
                </Text>
              )}
            </View>
            <View className="gap-3 mb-6">
              {scored.map(({ trainer, maxScore }, index) => {
                const isBestMatch = quizUsed && maxScore === topScore && maxScore > 0;
                const matchPct = topScore > 0 ? Math.round((maxScore / topScore) * 100) : null;
                return (
                  <Pressable
                    key={trainer.id}
                    onPress={() => {
                      setSelectedTrainer(trainer);
                      setStep("pt_program_select");
                    }}
                    className={`rounded-2xl p-4 border active:opacity-80 ${
                      isBestMatch
                        ? "bg-primary-500/5 border-primary-500/40 dark:bg-primary-500/10"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <View className="flex-row items-center gap-3 mb-2">
                      <View className="w-10 h-10 rounded-full bg-primary-500/10 items-center justify-center">
                        <Ionicons name="person-circle" size={28} color="#10b981" />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text className="font-bold text-slate-900 dark:text-white">
                            {trainer.name}
                          </Text>
                          {isBestMatch && (
                            <View className="bg-primary-500 rounded-full px-2 py-0.5">
                              <Text className="text-white text-xs font-semibold">
                                Best Match
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-xs text-primary-500">
                          {trainer.specialty}
                        </Text>
                      </View>
                      <Text className="text-xs text-slate-400">
                        {trainer.programs.length}{" "}
                        {trainer.programs.length === 1 ? "program" : "programs"}
                      </Text>
                    </View>
                    <Text className="text-sm text-slate-500 dark:text-slate-400 leading-5">
                      {trainer.bio}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        );
      })()}

      {/* ── PT Program Select ────────────────────────────────────────────── */}
      {step === "pt_program_select" && selectedTrainer && (() => {
        const scoredPrograms = selectedTrainer.programs
          .map((p) => ({ program: p, score: scoreProgramForQuiz(p, ptQuiz) }))
          .sort((a, b) => b.score - a.score);
        const topProgramScore = scoredPrograms[0]?.score ?? 0;
        const quizUsed = ptQuiz.goal || ptQuiz.equipment || ptQuiz.days;

        return (
          <ScrollView className="flex-1 px-4">
            <View className="mt-6 mb-3">
              <Text className="text-xl font-bold text-slate-900 dark:text-white">
                {selectedTrainer.name}'s Programs
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Select a program to activate.
              </Text>
            </View>
            <View className="gap-3 mb-6">
              {scoredPrograms.map(({ program, score }) => {
                const isBestMatch = quizUsed && score === topProgramScore && score > 0;
                const daysMatch = ptQuiz.days === null || program.daysPerWeek === ptQuiz.days;
                const daysDiff = ptQuiz.days !== null ? program.daysPerWeek - ptQuiz.days : 0;

                return (
                  <Pressable
                    key={program.id}
                    onPress={() => handleActivatePTSplit(program)}
                    className={`rounded-2xl p-4 border active:opacity-80 ${
                      isBestMatch
                        ? "bg-primary-500/5 border-primary-500/40 dark:bg-primary-500/10"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <View className="flex-row items-start justify-between mb-2">
                      <View className="flex-1 mr-3">
                        <View className="flex-row items-center gap-2 flex-wrap">
                          <Text className="font-bold text-slate-900 dark:text-white text-base">
                            {program.name}
                          </Text>
                          {isBestMatch && (
                            <View className="bg-primary-500 rounded-full px-2 py-0.5">
                              <Text className="text-white text-xs font-semibold">
                                Best Match
                              </Text>
                            </View>
                          )}
                        </View>
                        <View className="flex-row items-center gap-2 mt-0.5">
                          <Text className={`text-xs font-medium ${daysMatch ? "text-primary-500" : "text-slate-400"}`}>
                            {program.daysPerWeek} days/week
                          </Text>
                          {!daysMatch && ptQuiz.days !== null && (
                            <Text className="text-xs text-slate-400">
                              (you selected {ptQuiz.days}{daysDiff > 0 ? ` — ${daysDiff} more` : ` — ${Math.abs(daysDiff)} fewer`})
                            </Text>
                          )}
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#64748b" />
                    </View>
                    <Text className="text-sm text-slate-500 dark:text-slate-400 leading-5 mb-3">
                      {program.description}
                    </Text>
                    <View className="gap-1">
                      {program.days.map((day, i) => (
                        <Text
                          key={i}
                          className="text-xs text-slate-400 dark:text-slate-500"
                        >
                          Day {i + 1}: {day.dayName}
                        </Text>
                      ))}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        );
      })()}

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {step === "loading" && (
        <View className="flex-1 items-center justify-center px-4">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="text-lg font-medium text-slate-900 dark:text-white mt-4">
            Generating your workout...
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-sm mt-2 text-center">
            Analysing your history and building a personalised plan
          </Text>
        </View>
      )}

      {/* ── Individual Summary ───────────────────────────────────────────── */}
      {step === "summary" && suggestion && (
        <ScrollView className="flex-1 px-4">
          <View className="mt-6 mb-4">
            <Text className="text-2xl font-bold text-slate-900 dark:text-white">
              {suggestion.name}
            </Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {selectedSplit} &middot; {selectedDuration} min &middot;{" "}
              {matchedExercises.length} exercises
            </Text>
          </View>

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

      {/* ── Split Summary ────────────────────────────────────────────────── */}
      {step === "split_summary" && (
        <ScrollView className="flex-1 px-4">
          {(() => {
            // Show active split if no pending, else show pending preview
            const displaySplit = pendingSplit ?? currentActiveSplit;
            if (!displaySplit) return null;
            const isActive = !pendingSplit && !!currentActiveSplit;
            const currentDay = isActive
              ? displaySplit.days[displaySplit.currentDayIndex]
              : null;

            return (
              <>
                <View className="mt-6 mb-1">
                  <Text className="text-2xl font-bold text-slate-900 dark:text-white">
                    {displaySplit.name}
                  </Text>
                  <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {displaySplit.source === "ai" ? "AI Generated" : "PT Program"}{" "}
                    &middot; {displaySplit.days.length} days
                    {isActive
                      ? ` · Day ${displaySplit.currentDayIndex + 1}/${displaySplit.days.length}`
                      : ""}
                  </Text>
                </View>

                {isActive && currentDay && (
                  <View className="bg-primary-500/10 rounded-xl p-3 mt-4 mb-2">
                    <Text className="text-xs text-primary-600 dark:text-primary-400 font-medium mb-0.5">
                      Up Next
                    </Text>
                    <Text className="font-semibold text-slate-900 dark:text-white">
                      {currentDay.dayName}
                    </Text>
                    <Text className="text-xs text-slate-500 mt-0.5">
                      {currentDay.exercises.length} exercises
                    </Text>
                  </View>
                )}

                {/* Day accordion */}
                <View className="gap-2 mt-4 mb-4">
                  {displaySplit.days.map((day, i) => {
                    const isCurrentDay = isActive && i === displaySplit.currentDayIndex;
                    const isExpanded = expandedDayIndex === i;
                    return (
                      <View
                        key={i}
                        className={`rounded-xl border overflow-hidden ${
                          isCurrentDay
                            ? "border-primary-500 bg-primary-500/5"
                            : "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                        }`}
                      >
                        <Pressable
                          onPress={() =>
                            setExpandedDayIndex(isExpanded ? null : i)
                          }
                          className="flex-row items-center justify-between px-4 py-3"
                        >
                          <View className="flex-1">
                            <Text
                              className={`font-semibold ${
                                isCurrentDay
                                  ? "text-primary-600 dark:text-primary-400"
                                  : "text-slate-900 dark:text-white"
                              }`}
                            >
                              Day {i + 1}: {day.dayName}
                              {isCurrentDay ? " ← Today" : ""}
                            </Text>
                            <Text className="text-xs text-slate-500 mt-0.5">
                              {day.exercises.length} exercises
                            </Text>
                          </View>
                          <Ionicons
                            name={isExpanded ? "chevron-up" : "chevron-down"}
                            size={16}
                            color="#64748b"
                          />
                        </Pressable>
                        {isExpanded && (
                          <View className="px-4 pb-3 gap-1.5">
                            {day.exercises.map((ex, j) => (
                              <View
                                key={j}
                                className="flex-row items-center justify-between"
                              >
                                <Text className="text-sm text-slate-700 dark:text-slate-300 flex-1 mr-2">
                                  {j + 1}. {ex.exerciseName}
                                </Text>
                                <Text className="text-xs text-slate-500 dark:text-slate-400">
                                  {formatSets(ex.sets)}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>

                {/* Action buttons */}
                {isActive ? (
                  <View className="gap-3 mb-8">
                    <Pressable
                      onPress={() =>
                        startDayFromActiveSplit(
                          displaySplit,
                          displaySplit.currentDayIndex
                        )
                      }
                      className="bg-primary-500 rounded-xl p-4 active:bg-primary-600"
                    >
                      <View className="flex-row items-center justify-center gap-2">
                        <Ionicons
                          name="play-circle"
                          size={22}
                          color="white"
                        />
                        <Text className="text-white font-semibold text-lg">
                          Start Day {displaySplit.currentDayIndex + 1}
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        clearActiveSplit();
                        router.back();
                      }}
                      className="border-2 border-slate-300 dark:border-slate-600 rounded-xl p-4 active:bg-slate-100 dark:active:bg-slate-800"
                    >
                      <View className="flex-row items-center justify-center gap-2">
                        <Ionicons name="close-circle" size={20} color="#64748b" />
                        <Text className="text-slate-600 dark:text-slate-400 font-semibold text-lg">
                          Clear Split
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                ) : (
                  <View className="gap-3 mb-8">
                    <Pressable
                      onPress={handleActivatePendingSplit}
                      className="bg-primary-500 rounded-xl p-4 active:bg-primary-600"
                    >
                      <View className="flex-row items-center justify-center gap-2">
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color="white"
                        />
                        <Text className="text-white font-semibold text-lg">
                          Activate This Split
                        </Text>
                      </View>
                    </Pressable>
                    {displaySplit.source === "ai" && (
                      <Pressable
                        onPress={handleGenerateAnotherSplit}
                        className="border-2 border-slate-300 dark:border-slate-600 rounded-xl p-4 active:bg-slate-100 dark:active:bg-slate-800"
                      >
                        <View className="flex-row items-center justify-center gap-2">
                          <Ionicons name="refresh" size={20} color="#64748b" />
                          <Text className="text-slate-600 dark:text-slate-400 font-semibold text-lg">
                            Generate Another
                          </Text>
                        </View>
                      </Pressable>
                    )}
                  </View>
                )}
              </>
            );
          })()}
        </ScrollView>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
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
