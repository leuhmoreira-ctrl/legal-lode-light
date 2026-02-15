import { renderHook, waitFor } from "@testing-library/react";
import { useDeadlineNotifications } from "./useDeadlineNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { addDays, format } from "date-fns";

// Mock dependencies
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(),
}));

describe("useDeadlineNotifications", () => {
  const mockUser = { id: "user-123", email: "test@example.com" };
  const mockToast = vi.fn();
  const today = new Date();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser });
    (useToast as any).mockReturnValue({ toast: mockToast });
    localStorage.clear();
  });

  it("should make only ONE notification check (1+1 queries) after optimization", async () => {
    // Setup tasks that require notifications
    const tasks = [
      { id: "1", title: "Task 1", due_date: format(addDays(today, 1), "yyyy-MM-dd"), user_id: mockUser.id },
      { id: "2", title: "Task 2", due_date: format(addDays(today, 3), "yyyy-MM-dd"), user_id: mockUser.id },
      { id: "3", title: "Task 3", due_date: format(addDays(today, 7), "yyyy-MM-dd"), user_id: mockUser.id },
    ];

    const notificationSelectMock = vi.fn();
    const notificationInsertMock = vi.fn().mockResolvedValue({ error: null });

    // New query chain: .select("title, message").eq(...).gte(...)
    const notificationSelectChain = {
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    notificationSelectMock.mockReturnValue(notificationSelectChain);

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === "kanban_tasks") {
        return {
          select: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          or: vi.fn().mockResolvedValue({ data: tasks, error: null }),
        };
      }
      if (table === "notifications") {
        return {
          select: notificationSelectMock,
          insert: notificationInsertMock,
        };
      }
      return { select: vi.fn() };
    });

    renderHook(() => useDeadlineNotifications());

    await waitFor(() => {
      // Expect 1 call to select (fetching all notifications upfront)
      expect(notificationSelectMock).toHaveBeenCalledTimes(1);

      // We expect 3 inserts because we mocked empty existing notifications
      expect(notificationInsertMock).toHaveBeenCalledTimes(3);
    });
  });

  it("should not insert notification if it already exists (in-memory check)", async () => {
    const tasks = [
      { id: "1", title: "Task 1", due_date: format(addDays(today, 1), "yyyy-MM-dd"), user_id: mockUser.id },
    ];

    const notificationSelectMock = vi.fn();
    const notificationInsertMock = vi.fn().mockResolvedValue({ error: null });

    // Mock existing notifications
    const existingNotifications = [
      {
        title: "Prazo: Task 1",
        message: "O prazo para \"Task 1\" vence em 1 dia(s)."
      }
    ];

    const notificationSelectChain = {
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ data: existingNotifications, error: null }),
    };

    notificationSelectMock.mockReturnValue(notificationSelectChain);

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === "kanban_tasks") {
        return {
          select: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          or: vi.fn().mockResolvedValue({ data: tasks, error: null }),
        };
      }
      if (table === "notifications") {
        return {
          select: notificationSelectMock,
          insert: notificationInsertMock,
        };
      }
      return { select: vi.fn() };
    });

    renderHook(() => useDeadlineNotifications());

    await waitFor(() => {
      expect(notificationSelectMock).toHaveBeenCalledTimes(1);
      expect(notificationInsertMock).not.toHaveBeenCalled();
    });
  });
});
