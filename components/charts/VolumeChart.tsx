import { useMemo } from "react";
import { View, Text, useColorScheme, Dimensions } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { format, eachWeekOfInterval, startOfWeek } from "date-fns";
import type { WeeklyVolumePoint } from "@/lib/db/workouts";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_H_PADDING = 32; // px - matches px-4 on both sides

interface Props {
  data: WeeklyVolumePoint[];
  startDate: string;
  endDate: string;
  unit: "kg" | "lbs";
}

function formatVolume(v: number, unit: "kg" | "lbs"): string {
  const val = unit === "lbs" ? v * 2.20462 : v;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  return Math.round(val).toString();
}

export default function VolumeChart({ data, startDate, endDate, unit }: Props) {
  const isDark = useColorScheme() === "dark";
  const textColor = isDark ? "#94a3b8" : "#64748b";
  const barColor = "#10b981";

  const filledData = useMemo(() => {
    if (data.length === 0) return [];

    // Use earliest data point as start to avoid huge gaps for "All"
    const effectiveStart = startOfWeek(
      new Date(data[0].week_start + "T12:00:00"),
      { weekStartsOn: 1 }
    );
    const effectiveEnd = new Date(endDate);

    let weeks: Date[];
    try {
      weeks = eachWeekOfInterval(
        { start: effectiveStart, end: effectiveEnd },
        { weekStartsOn: 1 }
      );
    } catch {
      return data.map((d) => ({ value: d.total_volume, week_start: d.week_start }));
    }

    const dataMap = new Map(data.map((d) => [d.week_start, d.total_volume]));

    return weeks.map((week) => {
      const weekStr = format(week, "yyyy-MM-dd");
      return { value: dataMap.get(weekStr) ?? 0, week_start: weekStr };
    });
  }, [data, startDate, endDate]);

  if (data.length === 0) {
    return (
      <View className="h-44 items-center justify-center">
        <Text className="text-slate-400 dark:text-slate-500 text-sm">No workout data in this period</Text>
      </View>
    );
  }

  const maxValue = Math.max(...filledData.map((d) => d.value), 1);
  const barCount = filledData.length;
  const chartWidth = SCREEN_WIDTH - CHART_H_PADDING * 2;
  // Show label every ~4 weeks; minimum 1
  const labelInterval = Math.max(1, Math.ceil(barCount / 10));

  const barData = filledData.map((d, i) => ({
    value: unit === "lbs" ? d.value * 2.20462 : d.value,
    frontColor: d.value > 0 ? barColor : (isDark ? "#334155" : "#e2e8f0"),
    label: i % labelInterval === 0 ? format(new Date(d.week_start + "T12:00:00"), "MMM d") : "",
    labelTextStyle: { color: textColor, fontSize: 9, width: 40 },
  }));

  return (
    <View style={{ marginLeft: -4 }}>
      <BarChart
        data={barData}
        barWidth={Math.max(4, Math.floor((chartWidth - 40) / barCount) - 2)}
        spacing={2}
        roundedTop
        xAxisThickness={0}
        yAxisThickness={0}
        yAxisTextStyle={{ color: textColor, fontSize: 10 }}
        noOfSections={4}
        maxValue={unit === "lbs" ? maxValue * 2.20462 : maxValue}
        width={chartWidth}
        height={160}
        hideRules
        barBorderRadius={3}
        isAnimated
      />
      <Text className="text-xs text-slate-400 dark:text-slate-500 text-right mt-1">
        Volume ({unit})
      </Text>
    </View>
  );
}
