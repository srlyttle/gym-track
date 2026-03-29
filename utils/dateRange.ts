import { subMonths, subYears } from "date-fns";

export type DateRangeKey = "1M" | "3M" | "6M" | "1Y" | "All";

export function getDateRange(range: DateRangeKey): { startDate: string; endDate: string } {
  const now = new Date();
  let start: Date;

  switch (range) {
    case "1M":
      start = subMonths(now, 1);
      break;
    case "3M":
      start = subMonths(now, 3);
      break;
    case "6M":
      start = subMonths(now, 6);
      break;
    case "1Y":
      start = subYears(now, 1);
      break;
    case "All":
      start = new Date(0);
      break;
  }

  return {
    startDate: start.toISOString(),
    endDate: now.toISOString(),
  };
}
