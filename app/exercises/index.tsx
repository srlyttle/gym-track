import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  filterExercises,
  seedExercisesIfNeeded,
  createCustomExercise,
} from "@/lib/db";
import type {
  Exercise,
  MuscleGroup,
  Equipment,
  MovementPattern,
} from "@/types";

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

const EQUIPMENT: { id: Equipment; label: string }[] = [
  { id: "barbell", label: "Barbell" },
  { id: "dumbbell", label: "Dumbbell" },
  { id: "cable", label: "Cable" },
  { id: "machine", label: "Machine" },
  { id: "bodyweight", label: "Bodyweight" },
];

const MOVEMENT_PATTERNS: { id: MovementPattern; label: string }[] = [
  { id: "push", label: "Push" },
  { id: "pull", label: "Pull" },
  { id: "squat", label: "Squat" },
  { id: "hinge", label: "Hinge" },
  { id: "lunge", label: "Lunge" },
  { id: "carry", label: "Carry" },
  { id: "rotation", label: "Rotation" },
];

interface Props {
  onSelect?: (exercise: Exercise) => void;
  selectionMode?: boolean;
}

export default function ExerciseListScreen({ onSelect, selectionMode }: Props) {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(
    null,
  );
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(
    null,
  );
  const [showFilters, setShowFilters] = useState(false);

  // Add exercise modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseMuscle, setNewExerciseMuscle] =
    useState<MuscleGroup>("chest");
  const [newExerciseEquipment, setNewExerciseEquipment] =
    useState<Equipment | null>(null);
  const [newExerciseMovement, setNewExerciseMovement] =
    useState<MovementPattern | null>(null);
  const [newExerciseInstructions, setNewExerciseInstructions] = useState("");
  const [saving, setSaving] = useState(false);

  const loadExercises = useCallback(async () => {
    setLoading(true);
    try {
      await seedExercisesIfNeeded();
      const results = await filterExercises({
        muscle: selectedMuscle || undefined,
        equipment: selectedEquipment || undefined,
        search: search || undefined,
      });
      setExercises(results);
    } catch (error) {
      console.error("Failed to load exercises:", error);
    } finally {
      setLoading(false);
    }
  }, [search, selectedMuscle, selectedEquipment]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  const handleExercisePress = (exercise: Exercise) => {
    if (onSelect) {
      onSelect(exercise);
    } else {
      // Exercise detail screen - cast needed as route may not exist yet
      router.push(`/exercises/${exercise.id}` as any);
    }
  };

  const clearFilters = () => {
    setSelectedMuscle(null);
    setSelectedEquipment(null);
    setSearch("");
  };

  const hasActiveFilters = selectedMuscle || selectedEquipment || search;

  const resetAddForm = () => {
    setNewExerciseName("");
    setNewExerciseMuscle("chest");
    setNewExerciseEquipment(null);
    setNewExerciseMovement(null);
    setNewExerciseInstructions("");
  };

  const handleAddExercise = async () => {
    if (!newExerciseName.trim()) return;

    setSaving(true);
    try {
      const newExercise = await createCustomExercise({
        name: newExerciseName.trim(),
        primary_muscle: newExerciseMuscle,
        secondary_muscles: null,
        equipment: newExerciseEquipment,
        movement_pattern: newExerciseMovement,
        instructions: newExerciseInstructions.trim() || null,
      });

      // If in selection mode, select the new exercise
      if (onSelect) {
        onSelect(newExercise);
      }

      setShowAddModal(false);
      resetAddForm();
      loadExercises(); // Refresh the list
    } catch (error) {
      console.error("Failed to create exercise:", error);
    } finally {
      setSaving(false);
    }
  };

  const renderExercise = ({ item }: { item: Exercise }) => (
    <Pressable
      onPress={() => handleExercisePress(item)}
      className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 mb-2 active:bg-slate-200 dark:active:bg-slate-700"
    >
      <Text className="text-lg font-medium text-slate-900 dark:text-white">
        {item.name}
      </Text>
      <View className="flex-row items-center mt-1 gap-2">
        <View className="bg-primary-100 dark:bg-primary-900/30 px-2 py-0.5 rounded">
          <Text className="text-primary-700 dark:text-primary-400 text-xs capitalize">
            {item.primary_muscle}
          </Text>
        </View>
        {item.equipment && (
          <View className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">
            <Text className="text-slate-600 dark:text-slate-400 text-xs capitalize">
              {item.equipment}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );

  // Show back button when not in selection mode (i.e., accessed as standalone screen)
  const showBackButton = !selectionMode && !onSelect;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900" edges={["top"]}>
      <View className="flex-1 px-4">
        {/* Header */}
        <View className="flex-row items-center justify-between py-4">
          <View className="flex-row items-center">
            {showBackButton && (
              <Pressable
                onPress={() => router.back()}
                className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 items-center justify-center mr-3 active:bg-slate-200 dark:active:bg-slate-700"
              >
                <Ionicons name="chevron-back" size={24} color="#10b981" />
              </Pressable>
            )}
            <Text className="text-2xl font-bold text-slate-900 dark:text-white">
              {selectionMode ? "Select Exercise" : "Exercises 11"}
            </Text>
          </View>
          <View className="flex-row gap-2">
            {/* <Pressable
              onPress={() => setShowAddModal(true)}
              className="p-2 rounded-lg bg-primary-500"
            >
              <Ionicons name="add" size={20} color="#ffffff" />
            </Pressable> */}
            <Pressable
              onPress={() => setShowFilters(!showFilters)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800"
            >
              <Ionicons
                name="filter"
                size={20}
                color={showFilters ? "#10b981" : "#6b7280"}
              />
            </Pressable>
          </View>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 mb-4">
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 text-slate-900 dark:text-white"
            placeholder="Search exercises..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
          {search && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </Pressable>
          )}
        </View>

        {/* Filters */}
        {showFilters && (
          <View className="mb-4">
            {/* Muscle Groups */}
            <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
              Muscle Group
            </Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={MUSCLE_GROUPS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() =>
                    setSelectedMuscle(
                      selectedMuscle === item.id ? null : item.id,
                    )
                  }
                  className={`mr-2 px-3 py-1.5 rounded-full ${
                    selectedMuscle === item.id
                      ? "bg-primary-500"
                      : "bg-slate-100 dark:bg-slate-800"
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      selectedMuscle === item.id
                        ? "text-white font-medium"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )}
              className="mb-3"
            />

            {/* Equipment */}
            <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
              Equipment
            </Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={EQUIPMENT}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() =>
                    setSelectedEquipment(
                      selectedEquipment === item.id ? null : item.id,
                    )
                  }
                  className={`mr-2 px-3 py-1.5 rounded-full ${
                    selectedEquipment === item.id
                      ? "bg-primary-500"
                      : "bg-slate-100 dark:bg-slate-800"
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      selectedEquipment === item.id
                        ? "text-white font-medium"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )}
              className="mb-3"
            />

            {hasActiveFilters && (
              <Pressable
                onPress={clearFilters}
                className="flex-row items-center justify-center py-2"
              >
                <Ionicons name="close" size={16} color="#ef4444" />
                <Text className="text-red-500 ml-1 text-sm">Clear filters</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Results count */}
        {!loading && (
          <Text className="text-sm text-slate-500 dark:text-slate-400 mb-2">
            {exercises.length} exercises
          </Text>
        )}

        {/* Exercise List */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#10b981" />
          </View>
        ) : exercises.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="barbell-outline" size={48} color="#9ca3af" />
            <Text className="text-slate-500 dark:text-slate-400 mt-2">
              No exercises found
            </Text>
          </View>
        ) : (
          <FlatList
            data={exercises}
            keyExtractor={(item) => item.id}
            renderItem={renderExercise}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>

      {/* Add Exercise Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-white dark:bg-slate-900"
        >
          <SafeAreaView className="flex-1" edges={["top"]}>
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-700">
              <Pressable
                onPress={() => {
                  setShowAddModal(false);
                  resetAddForm();
                }}
              >
                <Text className="text-slate-500 text-base">Cancel</Text>
              </Pressable>
              <Text className="text-lg font-semibold text-slate-900 dark:text-white">
                Add Exercise
              </Text>
              <Pressable
                onPress={handleAddExercise}
                disabled={!newExerciseName.trim() || saving}
              >
                <Text
                  className={`text-base font-medium ${
                    newExerciseName.trim() && !saving
                      ? "text-primary-500"
                      : "text-slate-300 dark:text-slate-600"
                  }`}
                >
                  {saving ? "Saving..." : "Save"}
                </Text>
              </Pressable>
            </View>

            <ScrollView
              className="flex-1 px-4"
              keyboardShouldPersistTaps="handled"
            >
              {/* Exercise Name */}
              <View className="mt-4">
                <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Exercise Name *
                </Text>
                <TextInput
                  className="bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white"
                  placeholder="e.g. Bulgarian Split Squat"
                  placeholderTextColor="#9ca3af"
                  value={newExerciseName}
                  onChangeText={setNewExerciseName}
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
                      onPress={() => setNewExerciseMuscle(muscle.id)}
                      className={`px-3 py-2 rounded-lg ${
                        newExerciseMuscle === muscle.id
                          ? "bg-primary-500"
                          : "bg-slate-100 dark:bg-slate-800"
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          newExerciseMuscle === muscle.id
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
                  <Pressable
                    onPress={() => setNewExerciseEquipment(null)}
                    className={`px-3 py-2 rounded-lg ${
                      newExerciseEquipment === null
                        ? "bg-primary-500"
                        : "bg-slate-100 dark:bg-slate-800"
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        newExerciseEquipment === null
                          ? "text-white font-medium"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      None
                    </Text>
                  </Pressable>
                  {EQUIPMENT.map((equip) => (
                    <Pressable
                      key={equip.id}
                      onPress={() => setNewExerciseEquipment(equip.id)}
                      className={`px-3 py-2 rounded-lg ${
                        newExerciseEquipment === equip.id
                          ? "bg-primary-500"
                          : "bg-slate-100 dark:bg-slate-800"
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          newExerciseEquipment === equip.id
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

              {/* Movement Pattern */}
              <View className="mt-6">
                <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Movement Pattern
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  <Pressable
                    onPress={() => setNewExerciseMovement(null)}
                    className={`px-3 py-2 rounded-lg ${
                      newExerciseMovement === null
                        ? "bg-primary-500"
                        : "bg-slate-100 dark:bg-slate-800"
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        newExerciseMovement === null
                          ? "text-white font-medium"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      None
                    </Text>
                  </Pressable>
                  {MOVEMENT_PATTERNS.map((pattern) => (
                    <Pressable
                      key={pattern.id}
                      onPress={() => setNewExerciseMovement(pattern.id)}
                      className={`px-3 py-2 rounded-lg ${
                        newExerciseMovement === pattern.id
                          ? "bg-primary-500"
                          : "bg-slate-100 dark:bg-slate-800"
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          newExerciseMovement === pattern.id
                            ? "text-white font-medium"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {pattern.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Instructions */}
              <View className="mt-6 mb-8">
                <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Instructions (optional)
                </Text>
                <TextInput
                  className="bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white min-h-[100px]"
                  placeholder="Describe how to perform this exercise..."
                  placeholderTextColor="#9ca3af"
                  value={newExerciseInstructions}
                  onChangeText={setNewExerciseInstructions}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
