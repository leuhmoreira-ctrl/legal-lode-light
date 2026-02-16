import { differenceInCalendarDays, isSameDay, parseISO } from 'date-fns';
import { TaskActivity } from '../types/kanban';

export function getTimeInStage(entryDateStr: string): { days: number; label: string } {
  const entryDate = parseISO(entryDateStr);
  const now = new Date();

  const days = differenceInCalendarDays(now, entryDate);

  if (days === 0) {
    return { days, label: "Hoje" };
  } else if (days === 1) {
    return { days, label: "Há 1 dia" };
  } else {
    return { days, label: `Há ${days} dias` };
  }
}

export function getTimeBadgeColor(days: number): string {
  if (days <= 2) return "text-green-600 bg-green-100";
  if (days <= 5) return "text-yellow-600 bg-yellow-100";
  if (days <= 7) return "text-orange-600 bg-orange-100";
  return "text-red-600 bg-red-100";
}

export function getStageEntryDate(taskId: string, currentStatus: string, activities: TaskActivity[]): string | undefined {
  // Filter activities for this task that are status changes to the current status
  const relevantActivities = activities
    .filter(a => a.task_id === taskId && a.action_type === 'status_changed' && a.new_value === currentStatus)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (relevantActivities.length > 0) {
    return relevantActivities[0].created_at;
  }
  return undefined;
}

export function getTaskStartDate(taskId: string, activities: TaskActivity[]): string | undefined {
  // First time moved to 'in_progress'
  const relevantActivities = activities
    .filter(a => a.task_id === taskId && a.action_type === 'status_changed' && a.new_value === 'in_progress')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); // Ascending to find first

  if (relevantActivities.length > 0) {
    return relevantActivities[0].created_at;
  }
  return undefined;
}

export function getTaskCompletionDate(taskId: string, activities: TaskActivity[]): string | undefined {
  // Latest time moved to 'done'
  const relevantActivities = activities
    .filter(a => a.task_id === taskId && a.action_type === 'status_changed' && a.new_value === 'done')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // Descending to find latest

  if (relevantActivities.length > 0) {
    return relevantActivities[0].created_at;
  }
  return undefined;
}
