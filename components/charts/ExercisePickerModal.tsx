import { useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  SafeAreaView,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ExerciseUsageSummary } from "@/lib/db/workouts";

interface Props {
  visible: boolean;
  onClose: () => void;
  exercises: ExerciseUsageSummary[];
  onSelect: (exercise: ExerciseUsageSummary) => void;
  selectedId: string | null;
}

export default function ExercisePickerModal({
  visible,
  onClose,
  exercises,
  onSelect,
  selectedId,
}: Props) {
  const [search, setSearch] = useState("");
  const isDark = useColorScheme() === "dark";

  const filtered = useMemo(() => {
    if (!search.trim()) return exercises;
    const q = search.toLowerCase();
    return exercises.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.primary_muscle.toLowerCase().includes(q)
    );
  }, [exercises, search]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView
        style={{ flex: 1, backgroundColor: isDark ? "#0f172a" : "#f8fafc" }}
      >
        <View className="flex-row items-center justify-between px-4 py-4">
          <Text className="text-lg font-semibold text-slate-900 dark:text-white">
            Select Exercise
          </Text>
          <Pressable onPress={onClose} className="p-2">
            <Ionicons name="close" size={22} color={isDark ? "#94a3b8" : "#64748b"} />
          </Pressable>
        </View>

        <View className="px-4 mb-3">
          <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 gap-2">
            <Ionicons name="search" size={16} color={isDark ? "#94a3b8" : "#64748b"} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search exercises..."
              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
              className="flex-1 text-slate-900 dark:text-white text-sm"
              autoFocus
            />
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          renderItem={({ item }) => {
            const isSelected = item.id === selectedId;
            return (
              <Pressable
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
                className={`flex-row items-center justify-between p-4 rounded-xl mb-2 ${
                  isSelected
                    ? "bg-primary-50 dark:bg-primary-900/30"
                    : "bg-white dark:bg-slate-800"
                }`}
              >
                <View className="flex-1">
                  <Text
                    className={`font-medium ${
                      isSelected
                        ? "text-primary-700 dark:text-primary-300"
                        : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {item.name}
                  </Text>
                  <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 capitalize">
                    {item.primary_muscle} · {item.session_count} session{item.session_count !== 1 ? "s" : ""}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View className="items-center py-10">
              <Text className="text-slate-400 dark:text-slate-500">No exercises found</Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}
