import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { getTimeInStage, getTimeBadgeColor, getStageEntryDate } from './kanbanUtils';
import { TaskActivity } from '../types/kanban';

describe('kanbanUtils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getTimeInStage', () => {
    it('returns "Hoje" for same day', () => {
      const now = new Date(2023, 10, 10, 12, 0, 0);
      vi.setSystemTime(now);
      // Task created 2 hours ago
      const entryDate = new Date(2023, 10, 10, 10, 0, 0);

      const result = getTimeInStage(entryDate.toISOString());
      expect(result.label).toBe('Hoje');
      expect(result.days).toBe(0);
    });

    it('returns "Há 1 dia" for yesterday', () => {
      const now = new Date(2023, 10, 11, 12, 0, 0);
      vi.setSystemTime(now);
      // Task created yesterday
      const entryDate = new Date(2023, 10, 10, 12, 0, 0);

      const result = getTimeInStage(entryDate.toISOString());
      expect(result.label).toBe('Há 1 dia'); // differenceInDays might be 1
    });

    it('returns "Há 2 dias" for 2 days ago', () => {
      const now = new Date(2023, 10, 12, 12, 0, 0);
      vi.setSystemTime(now);
      const entryDate = new Date(2023, 10, 10, 12, 0, 0);

      const result = getTimeInStage(entryDate.toISOString());
      expect(result.label).toBe('Há 2 dias');
    });
  });

  describe('getTimeBadgeColor', () => {
    it('returns green for <= 2 days', () => {
      expect(getTimeBadgeColor(0)).toContain('green');
      expect(getTimeBadgeColor(2)).toContain('green');
    });

    it('returns yellow for 3-5 days', () => {
      expect(getTimeBadgeColor(3)).toContain('yellow');
      expect(getTimeBadgeColor(5)).toContain('yellow');
    });

    it('returns orange for 6-7 days', () => {
      expect(getTimeBadgeColor(6)).toContain('orange');
      expect(getTimeBadgeColor(7)).toContain('orange');
    });

    it('returns red for 8+ days', () => {
      expect(getTimeBadgeColor(8)).toContain('red');
      expect(getTimeBadgeColor(100)).toContain('red');
    });
  });

  describe('getStageEntryDate', () => {
    const activities: TaskActivity[] = [
      {
        id: '1',
        task_id: 'task1',
        action_type: 'status_changed',
        new_value: 'in_progress',
        old_value: 'todo',
        created_at: '2023-10-10T10:00:00Z',
        user_id: 'user1'
      },
      {
        id: '2',
        task_id: 'task1',
        action_type: 'status_changed',
        new_value: 'todo', // Moved back
        old_value: 'in_progress',
        created_at: '2023-10-11T10:00:00Z',
        user_id: 'user1'
      },
      {
        id: '3',
        task_id: 'task1',
        action_type: 'status_changed',
        new_value: 'in_progress', // Moved forward again
        old_value: 'todo',
        created_at: '2023-10-12T10:00:00Z',
        user_id: 'user1'
      }
    ];

    it('returns the latest entry date for the current status', () => {
      // Current status is 'in_progress', latest activity should be id 3
      const result = getStageEntryDate('task1', 'in_progress', activities);
      expect(result).toBe('2023-10-12T10:00:00Z');
    });

    it('returns undefined if no matching activity', () => {
      const result = getStageEntryDate('task1', 'done', activities);
      expect(result).toBeUndefined();
    });
  });
});
