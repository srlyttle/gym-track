import { useMemo } from "react";
import { View, Text, Dimensions, useColorScheme } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { MUSCLE_COLORS } from "@/constants";
import type { MuscleGroupVolumePoint } from "@/lib/db/workouts";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_H_PADDING = 32;

interface Props {
  data: MuscleGroupVolumePoint[];
  unit: "kg" | "lbs";
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function MuscleBalanceChart({ data, unit }: Props) {
  const isDark = useColorScheme() === "dark";
  const textColor = isDark ? "#94a3b8" : "#64748b";

  const totalVolume = useMemo(() => data.reduce((s, d) => s + d.total_volume, 0), [data]);

  if (data.length === 0) {
    return (
      <View className="h-32 items-center justify-center">
        <Text className="text-slate-400 dark:text-slate-500 text-sm">No workout data in this period</Text>
      </View>
    );
  }

  const chartWidth = SCREEN_WIDTH - CHART_H_PADDING * 2;
  const unitMultiplier = unit === "lbs" ? 2.20462 : 1;

  const barData = data.map((d) => {
    const vol = d.total_volume * unitMultiplier;
    const pct = totalVolume > 0 ? Math.round((d.total_volume / totalVolume) * 100) : 0;
    return {
      value: vol,
      label: capitalize(d.muscle),
      frontColor: MUSCLE_COLORS[d.muscle] ?? "#10b981",
      topLabelComponent: () => (
        <Text style={{ color: textColor, fontSize: 9, marginBottom: 2 }}>{pct}%</Text>
      ),
      labelTextStyle: { color: textColor, fontSize: 10 },
    };
  });

  return (
    <View style={{ marginLeft: -4 }}>
      <BarChart
        data={barData}
        barWidth={28}
        spacing={8}
        roundedTop
        xAxisThickness={0}
        yAxisThickness={0}
        yAxisTextStyle={{ color: textColor, fontSize: 10 }}
        noOfSections={4}
        width={chartWidth}
        height={160}
        hideRules
        barBorderRadius={3}
        isAnimated
        rotateLabel
        xAxisLabelTextStyle={{ color: textColor, fontSize: 9 }}
      />
      <Text className="text-xs text-slate-400 dark:text-slate-500 text-right mt-1">
        Volume ({unit})
      </Text>
    </View>
  );
}
