import { describe, it, expect } from 'vitest';
import { shouldNotify } from '../utils/deadlineUtils';
import { addDays, format } from 'date-fns';

describe('shouldNotify', () => {
  const today = new Date('2023-10-10T00:00:00');

  it('should return 7 when due date is in 7 days', () => {
    const dueDate = addDays(today, 7);
    expect(shouldNotify(dueDate, today)).toBe(7);
  });

  it('should return 3 when due date is in 3 days', () => {
    const dueDate = addDays(today, 3);
    expect(shouldNotify(dueDate, today)).toBe(3);
  });

  it('should return 1 when due date is in 1 day', () => {
    const dueDate = addDays(today, 1);
    expect(shouldNotify(dueDate, today)).toBe(1);
  });

  it('should return null when due date is in 5 days', () => {
    const dueDate = addDays(today, 5);
    expect(shouldNotify(dueDate, today)).toBe(null);
  });

  it('should return null when due date is today', () => {
    expect(shouldNotify(today, today)).toBe(null);
  });

  it('should work with string dates', () => {
    const dueDate = addDays(today, 7);
    const dueDateStr = format(dueDate, 'yyyy-MM-dd');
    expect(shouldNotify(dueDateStr, today)).toBe(7);
  });
});
