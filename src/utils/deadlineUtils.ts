import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";

/**
 * Checks if a notification should be sent based on the due date.
 * Returns the number of days remaining if it matches 7, 3, or 1.
 * Otherwise returns null.
 */
export function shouldNotify(dueDate: string | Date, today: Date = new Date()): number | null {
  const date = typeof dueDate === "string" ? parseISO(dueDate) : dueDate;

  // Compare start of days to ignore time differences
  const startDueDate = startOfDay(date);
  const startToday = startOfDay(today);

  const diff = differenceInCalendarDays(startDueDate, startToday);

  if (diff === 7) return 7;
  if (diff === 3) return 3;
  if (diff === 1) return 1;

  return null;
}
