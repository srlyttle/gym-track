import { useState } from "react";
import { View, Text, Pressable, Dimensions, useColorScheme } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import type { ExerciseStrengthPoint, ExerciseUsageSummary } from "@/lib/db/workouts";
import ExercisePickerModal from "./ExercisePickerModal";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_H_PADDING = 32;

type Metric = "best_weight" | "estimated_1rm";

interface Props {
  data: ExerciseStrengthPoint[];
  selectedExercise: ExerciseUsageSummary | null;
  exercises: ExerciseUsageSummary[];
  onSelectExercise: (exercise: ExerciseUsageSummary) => void;
  unit: "kg" | "lbs";
}

export default function StrengthProgressChart({
  data,
  selectedExercise,
  exercises,
  onSelectExercise,
  unit,
}: Props) {
  const [metric, setMetric] = useState<Metric>("best_weight");
  const [pickerVisible, setPickerVisible] = useState(false);
  const isDark = useColorScheme() === "dark";
  const textColor = isDark ? "#94a3b8" : "#64748b";
  const unitMultiplier = unit === "lbs" ? 2.20462 : 1;

  const chartWidth = SCREEN_WIDTH - CHART_H_PADDING * 2;

  const lineData = data.map((d, i) => {
    const rawVal = metric === "best_weight" ? d.best_weight : d.estimated_1rm;
    const val = rawVal * unitMultiplier;
    const showLabel = data.length <= 8 || i % Math.ceil(data.length / 6) === 0;
    return {
      value: Math.round(val * 10) / 10,
      label: showLabel ? format(new Date(d.session_date + "T12:00:00"), "MMM d") : "",
      dataPointText: "",
      labelTextStyle: { color: textColor, fontSize: 9 },
    };
  });

  return (
    <View>
      {/* Exercise picker button */}
      <Pressable
        onPress={() => setPickerVisible(true)}
        className="flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 mb-4"
      >
        <Ionicons name="barbell-outline" size={16} color={isDark ? "#94a3b8" : "#64748b"} />
        <Text className="flex-1 mx-2 text-slate-900 dark:text-white font-medium" numberOfLines={1}>
          {selectedExercise?.name ?? "Select exercise…"}
        </Text>
        <Ionicons name="chevron-down" size={14} color={isDark ? "#94a3b8" : "#64748b"} />
      </Pressable>

      {/* Metric toggle */}
      <View className="flex-row bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-4">
        {(["best_weight", "estimated_1rm"] as Metric[]).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMetric(m)}
            className={`flex-1 py-2 rounded-lg ${metric === m ? "bg-white dark:bg-slate-700" : ""}`}
          >
            <Text
              className={`text-center text-sm font-medium ${
                metric === m
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {m === "best_weight" ? "Best Weight" : "Est. 1RM"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Chart or empty state */}
      {exercises.length === 0 ? (
        <View className="h-32 items-center justify-center">
          <Text className="text-slate-400 dark:text-slate-500 text-sm">No exercises in this period</Text>
        </View>
      ) : !selectedExercise ? (
        <View className="h-32 items-center justify-center">
          <Text className="text-slate-400 dark:text-slate-500 text-sm">Select an exercise above</Text>
        </View>
      ) : data.length < 2 ? (
        <View className="h-32 items-center justify-center">
          <Text className="text-slate-400 dark:text-slate-500 text-sm text-center">
            Need at least 2 sessions to show a trend
          </Text>
        </View>
      ) : (
        <View style={{ marginLeft: -4 }}>
          <LineChart
            data={lineData}
            color="#10b981"
            curved
            areaChart
            startFillColor="#10b981"
            endFillColor="#10b981"
            startOpacity={0.25}
            endOpacity={0.01}
            thickness={2}
            dataPointsColor="#10b981"
            dataPointsRadius={4}
            xAxisThickness={0}
            yAxisThickness={0}
            yAxisTextStyle={{ color: textColor, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: textColor, fontSize: 9 }}
            noOfSections={4}
            width={chartWidth - 44}
            height={160}
            hideRules
            isAnimated
          />
          <Text className="text-xs text-slate-400 dark:text-slate-500 text-right mt-1">
            {metric === "best_weight" ? "Best weight" : "Est. 1RM"} ({unit})
          </Text>
        </View>
      )}

      <ExercisePickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        exercises={exercises}
        onSelect={onSelectExercise}
        selectedId={selectedExercise?.id ?? null}
      />
    </View>
  );
}
