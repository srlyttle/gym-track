import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useWorkoutStore } from "@/stores/workout-store";
import { seedExercisesIfNeeded, filterExercises, createCustomExercise } from "@/lib/db";
import type { Exercise, WorkoutExerciseWithDetails, WorkoutSet, MuscleGroup, Equipment, MovementPattern } from "@/types";

const MUSCLE_GROUPS: { id: MuscleGroup; label: string }[] = [
  { id: "chest", label: "Chest" },
  { id: "back", label: "Back" },
  { id: "shoulders", label: "Shoulders" },
  { id: "biceps", label: "Biceps" },
  { id: "triceps", label: "Triceps" },
  { id: "legs", label: "Legs" },
  { id: "core", label: "Core" },
  { id: "forearms", label: "Forearms" },
];

const EQUIPMENT_OPTIONS: { id: Equipment | null; label: string }[] = [
  { id: null, label: "None" },
  { id: "barbell", label: "Barbell" },
  { id: "dumbbell", label: "Dumbbell" },
  { id: "cable", label: "Cable" },
  { id: "machine", label: "Machine" },
  { id: "bodyweight", label: "Bodyweight" },
];

export default function WorkoutScreen() {
  const {
    active,
    isLoading,
    restTimerEndTime,
    startWorkout,
    completeWorkout,
    discardWorkout,
    addExercise,
    removeExercise,
    addSet,
    completeSet,
    deleteSet,
    clearRestTimer,
  } = useWorkoutStore();

  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [timerDisplay, setTimerDisplay] = useState<string | null>(null);

  // Rest timer effect
  useEffect(() => {
    if (!restTimerEndTime) {
      setTimerDisplay(null);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, restTimerEndTime - Date.now());
      if (remaining <= 0) {
        clearRestTimer();
        setTimerDisplay(null);
      } else {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setTimerDisplay(`${mins}:${secs.toString().padStart(2, "0")}`);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [restTimerEndTime, clearRestTimer]);

  // Initialize database on mount
  useEffect(() => {
    seedExercisesIfNeeded();
  }, []);

  const handleStartWorkout = async () => {
    await startWorkout();
  };

  const handleCompleteWorkout = () => {
    Alert.alert(
      "Complete Workout",
      "Are you sure you want to finish this workout?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Complete", onPress: () => completeWorkout() },
      ]
    );
  };

  const handleDiscardWorkout = () => {
    Alert.alert(
      "Discard Workout",
      "Are you sure you want to discard this workout? All data will be lost.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => discardWorkout() },
      ]
    );
  };

  const handleAddExercise = async (exercise: Exercise) => {
    setShowExercisePicker(false);
    await addExercise(exercise);
  };

  if (!active) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
        <ScrollView className="flex-1 px-4">
          <View className="py-6">
            <Text className="text-2xl font-bold text-slate-900 dark:text-white">
              Start Workout
            </Text>
          </View>

          <View className="flex-1 items-center justify-center py-12">
            <View className="bg-slate-100 dark:bg-slate-800 rounded-full p-6 mb-4">
              <Ionicons name="barbell-outline" size={64} color="#10b981" />
            </View>
            <Text className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              No Active Workout
            </Text>
            <Text className="text-slate-500 dark:text-slate-400 text-center mb-6 px-8">
              Start a new workout to begin tracking
            </Text>

            <View className="w-full gap-3">
              <Pressable
                onPress={handleStartWorkout}
                disabled={isLoading}
                className="bg-primary-500 rounded-xl p-4 active:bg-primary-600"
              >
                <View className="flex-row items-center justify-center gap-2">
                  <Ionicons name="add-circle" size={24} color="white" />
                  <Text className="text-white font-semibold text-lg">
                    Start Empty Workout
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const workoutDuration = active.workout
    ? Math.floor((Date.now() - new Date(active.workout.started_at).getTime()) / 1000)
    : 0;
  const durationMins = Math.floor(workoutDuration / 60);
  const durationSecs = workoutDuration % 60;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <Pressable onPress={handleDiscardWorkout}>
          <Text className="text-red-500 font-medium">Discard</Text>
        </Pressable>
        <View className="items-center">
          <Text className="text-lg font-semibold text-slate-900 dark:text-white">
            Workout
          </Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400">
            {durationMins}:{durationSecs.toString().padStart(2, "0")}
          </Text>
        </View>
        <Pressable onPress={handleCompleteWorkout}>
          <Text className="text-primary-500 font-semibold">Finish</Text>
        </Pressable>
      </View>

      {/* Rest Timer Banner */}
      {timerDisplay && (
        <Pressable
          onPress={clearRestTimer}
          className="bg-primary-500 px-4 py-3 flex-row items-center justify-center"
        >
          <Ionicons name="timer" size={20} color="white" />
          <Text className="text-white font-semibold ml-2">
            Rest: {timerDisplay}
          </Text>
          <Text className="text-white/70 ml-2">(tap to dismiss)</Text>
        </Pressable>
      )}

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Exercises */}
        {active.exercises.map((workoutExercise) => (
          <ExerciseCard
            key={workoutExercise.id}
            workoutExercise={workoutExercise}
            onAddSet={() => addSet(workoutExercise.id)}
            onCompleteSet={(setId, reps, weight, isWarmup) =>
              completeSet(setId, reps, weight, isWarmup)
            }
            onDeleteSet={(setId) => deleteSet(workoutExercise.id, setId)}
            onRemoveExercise={() => removeExercise(workoutExercise.id)}
          />
        ))}

        {/* Add Exercise Button */}
        <Pressable
          onPress={() => setShowExercisePicker(true)}
          className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 mt-2 active:bg-slate-200 dark:active:bg-slate-700"
        >
          <View className="flex-row items-center justify-center gap-2">
            <Ionicons name="add" size={24} color="#10b981" />
            <Text className="text-primary-500 font-semibold">Add Exercise</Text>
          </View>
        </Pressable>
      </ScrollView>

      {/* Exercise Picker Modal */}
      <ExercisePickerModal
        visible={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        onSelect={handleAddExercise}
      />
    </SafeAreaView>
  );
}

// Exercise Card Component
function ExerciseCard({
  workoutExercise,
  onAddSet,
  onCompleteSet,
  onDeleteSet,
  onRemoveExercise,
}: {
  workoutExercise: WorkoutExerciseWithDetails;
  onAddSet: () => void;
  onCompleteSet: (setId: string, reps: number, weight: number, isWarmup: boolean) => void;
  onDeleteSet: (setId: string) => void;
  onRemoveExercise: () => void;
}) {
  return (
    <View className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-4">
      {/* Exercise Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-slate-900 dark:text-white">
            {workoutExercise.exercise.name}
          </Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 capitalize">
            {workoutExercise.exercise.primary_muscle}
            {workoutExercise.exercise.equipment &&
              ` • ${workoutExercise.exercise.equipment}`}
          </Text>
        </View>
        <Pressable onPress={onRemoveExercise} className="p-2">
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </Pressable>
      </View>

      {/* Sets Header */}
      <View className="flex-row items-center px-2 mb-2">
        <Text className="w-10 text-xs text-slate-500 dark:text-slate-400 text-center">
          SET
        </Text>
        <Text className="flex-1 text-xs text-slate-500 dark:text-slate-400 text-center">
          WEIGHT
        </Text>
        <Text className="flex-1 text-xs text-slate-500 dark:text-slate-400 text-center">
          REPS
        </Text>
        <View className="w-12" />
      </View>

      {/* Sets */}
      {workoutExercise.sets.map((set) => (
        <SetRow
          key={set.id}
          set={set}
          onComplete={(reps, weight, isWarmup) =>
            onCompleteSet(set.id, reps, weight, isWarmup)
          }
          onDelete={() => onDeleteSet(set.id)}
        />
      ))}

      {/* Add Set Button */}
      <Pressable
        onPress={onAddSet}
        className="flex-row items-center justify-center py-2 mt-2"
      >
        <Ionicons name="add-circle" size={20} color="#10b981" />
        <Text className="text-primary-500 font-medium ml-1">Add Set</Text>
      </Pressable>
    </View>
  );
}

// Set Row Component
function SetRow({
  set,
  onComplete,
  onDelete,
}: {
  set: WorkoutSet;
  onComplete: (reps: number, weight: number, isWarmup: boolean) => void;
  onDelete: () => void;
}) {
  const [weight, setWeight] = useState(set.weight?.toString() || "");
  const [reps, setReps] = useState(set.reps?.toString() || "");
  const [isWarmup, setIsWarmup] = useState(!!set.is_warmup);
  const isCompleted = !!set.is_completed;

  const handleComplete = () => {
    const weightNum = parseFloat(weight) || 0;
    const repsNum = parseInt(reps) || 0;
    if (repsNum > 0) {
      onComplete(repsNum, weightNum, isWarmup);
    }
  };

  return (
    <View
      className={`flex-row items-center py-2 px-2 rounded-lg mb-1 ${
        isCompleted
          ? "bg-primary-100 dark:bg-primary-900/20"
          : "bg-white dark:bg-slate-800"
      }`}
    >
      {/* Set Number */}
      <Pressable
        onPress={() => setIsWarmup(!isWarmup)}
        className="w-10 items-center"
      >
        <Text
          className={`text-sm font-medium ${
            isWarmup
              ? "text-orange-500"
              : isCompleted
              ? "text-primary-600 dark:text-primary-400"
              : "text-slate-600 dark:text-slate-400"
          }`}
        >
          {isWarmup ? "W" : set.set_number}
        </Text>
      </Pressable>

      {/* Weight Input */}
      <View className="flex-1 px-1">
        <TextInput
          className={`text-center py-2 rounded-lg ${
            isCompleted
              ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
              : "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white"
          }`}
          placeholder="0"
          placeholderTextColor="#9ca3af"
          keyboardType="decimal-pad"
          value={weight}
          onChangeText={setWeight}
          editable={!isCompleted}
        />
      </View>

      {/* Reps Input */}
      <View className="flex-1 px-1">
        <TextInput
          className={`text-center py-2 rounded-lg ${
            isCompleted
              ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
              : "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white"
          }`}
          placeholder="0"
          placeholderTextColor="#9ca3af"
          keyboardType="number-pad"
          value={reps}
          onChangeText={setReps}
          editable={!isCompleted}
        />
      </View>

      {/* Complete/Delete Button */}
      <View className="w-12 items-center">
        {isCompleted ? (
          <Ionicons name="checkmark-circle" size={24} color="#10b981" />
        ) : (
          <Pressable onPress={handleComplete} className="p-1">
            <Ionicons name="checkmark-circle-outline" size={24} color="#9ca3af" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

// Exercise Picker Modal
function ExercisePickerModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create exercise form state
  const [newName, setNewName] = useState("");
  const [newMuscle, setNewMuscle] = useState<MuscleGroup>("chest");
  const [newEquipment, setNewEquipment] = useState<Equipment | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadExercises();
    }
  }, [visible, search]);

  const loadExercises = async () => {
    setLoading(true);
    try {
      const results = await filterExercises({
        search: search || undefined,
      });
      setExercises(results.slice(0, 50)); // Limit for performance
    } catch (error) {
      console.error("Failed to load exercises:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewName("");
    setNewMuscle("chest");
    setNewEquipment(null);
    setShowCreateForm(false);
  };

  const handleClose = () => {
    resetForm();
    setSearch("");
    onClose();
  };

  const handleCreateExercise = async () => {
    if (!newName.trim()) return;

    setSaving(true);
    try {
      const exercise = await createCustomExercise({
        name: newName.trim(),
        primary_muscle: newMuscle,
        secondary_muscles: null,
        equipment: newEquipment,
        movement_pattern: null,
        instructions: null,
      });
      resetForm();
      onSelect(exercise);
    } catch (error) {
      console.error("Failed to create exercise:", error);
      Alert.alert("Error", "Failed to create exercise");
    } finally {
      setSaving(false);
    }
  };

  if (showCreateForm) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-white dark:bg-slate-900"
        >
          <SafeAreaView className="flex-1">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <Pressable onPress={() => setShowCreateForm(false)}>
                <Ionicons name="arrow-back" size={24} color="#6b7280" />
              </Pressable>
              <Text className="text-lg font-semibold text-slate-900 dark:text-white">
                Create Exercise
              </Text>
              <Pressable
                onPress={handleCreateExercise}
                disabled={!newName.trim() || saving}
              >
                <Text
                  className={`font-medium ${
                    newName.trim() && !saving
                      ? "text-primary-500"
                      : "text-slate-300 dark:text-slate-600"
                  }`}
                >
                  {saving ? "Saving..." : "Add"}
                </Text>
              </Pressable>
            </View>

            <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
              {/* Exercise Name */}
              <View className="mt-4">
                <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Exercise Name *
                </Text>
                <TextInput
                  className="bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white"
                  placeholder="e.g. Bulgarian Split Squat"
                  placeholderTextColor="#9ca3af"
                  value={newName}
                  onChangeText={setNewName}
                  autoFocus
                />
              </View>

              {/* Primary Muscle Group */}
              <View className="mt-6">
                <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Primary Muscle Group *
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {MUSCLE_GROUPS.map((muscle) => (
                    <Pressable
                      key={muscle.id}
                      onPress={() => setNewMuscle(muscle.id)}
                      className={`px-3 py-2 rounded-lg ${
                        newMuscle === muscle.id
                          ? "bg-primary-500"
                          : "bg-slate-100 dark:bg-slate-800"
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          newMuscle === muscle.id
                            ? "text-white font-medium"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {muscle.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Equipment */}
              <View className="mt-6">
                <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Equipment
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {EQUIPMENT_OPTIONS.map((equip) => (
                    <Pressable
                      key={equip.id ?? "none"}
                      onPress={() => setNewEquipment(equip.id)}
                      className={`px-3 py-2 rounded-lg ${
                        newEquipment === equip.id
                          ? "bg-primary-500"
                          : "bg-slate-100 dark:bg-slate-800"
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          newEquipment === equip.id
                            ? "text-white font-medium"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {equip.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <Pressable onPress={handleClose}>
            <Text className="text-slate-500">Cancel</Text>
          </Pressable>
          <Text className="text-lg font-semibold text-slate-900 dark:text-white">
            Add Exercise
          </Text>
          <Pressable onPress={() => setShowCreateForm(true)}>
            <Ionicons name="add-circle" size={24} color="#10b981" />
          </Pressable>
        </View>

        {/* Search */}
        <View className="px-4 py-3">
          <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3">
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              className="flex-1 ml-2 text-slate-900 dark:text-white"
              placeholder="Search exercises..."
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </View>
        </View>

        {/* Create Custom Exercise Button */}
        <Pressable
          onPress={() => setShowCreateForm(true)}
          className="mx-4 mb-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4 flex-row items-center"
        >
          <View className="bg-primary-500 rounded-full p-2 mr-3">
            <Ionicons name="add" size={20} color="white" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-medium text-primary-700 dark:text-primary-300">
              Create Custom Exercise
            </Text>
            <Text className="text-sm text-primary-600/70 dark:text-primary-400/70">
              Can't find what you need? Add your own
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#10b981" />
        </Pressable>

        {/* Exercise List */}
        <ScrollView className="flex-1 px-4">
          {exercises.map((exercise) => (
            <Pressable
              key={exercise.id}
              onPress={() => onSelect(exercise)}
              className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-2 active:bg-slate-100 dark:active:bg-slate-700"
            >
              <View className="flex-row items-center">
                <View className="flex-1">
                  <Text className="text-base font-medium text-slate-900 dark:text-white">
                    {exercise.name}
                  </Text>
                  <Text className="text-sm text-slate-500 dark:text-slate-400 capitalize">
                    {exercise.primary_muscle}
                    {exercise.equipment && ` • ${exercise.equipment}`}
                  </Text>
                </View>
                {exercise.is_custom === 1 && (
                  <View className="bg-primary-100 dark:bg-primary-900/30 px-2 py-0.5 rounded">
                    <Text className="text-xs text-primary-600 dark:text-primary-400">Custom</Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
