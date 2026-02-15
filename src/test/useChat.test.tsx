import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useChat } from "../hooks/useChat";

// Hoist the mocks so they can be used in vi.mock
const { mockFrom } = vi.hoisted(() => {
  return { mockFrom: vi.fn() };
});

// Mock useAuth
const mockUser = { id: "test-user-id" };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockFrom,
    channel: vi.fn(() => ({
      on: vi.fn(() => ({ subscribe: vi.fn() })),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

describe("useChat Performance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should optimize fetch queries", async () => {
    const mockConvos = [
      { id: "c1", type: "direct", updated_at: "2023-01-02" },
      { id: "c2", type: "direct", updated_at: "2023-01-01" },
    ];

    // Setup mock implementation
    mockFrom.mockImplementation((table: string) => {
      const builder: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
      };

      // Define return values based on table
      // We must make 'then' exist so await works
      builder.then = (resolve: any) => {
        let data: any = [];
        let count = 0;

        if (table === "chat_conversations") {
          data = mockConvos;
        } else if (table === "chat_participants") {
          // Return some dummy participants
          // Current code fetches by conversation_id=eq.X
          // New code will fetch by conversation_id=in(X,Y)
          // The mock just returns data irrelevant of filter for simplicity,
          // but strictly we should filter if we want correct behavior.
          // However, for counting calls, we just need it to return something valid.
          data = [
            { user_id: "u1", conversation_id: "c1", last_read_at: "2023-01-01" },
            { user_id: "test-user-id", conversation_id: "c1", last_read_at: "2023-01-01" },
            { user_id: "u2", conversation_id: "c2", last_read_at: "2023-01-01" },
            { user_id: "test-user-id", conversation_id: "c2", last_read_at: "2023-01-01" },
          ];
        } else if (table === "profiles") {
            data = [{ id: "u1", full_name: "User 1", avatar_url: null }, { id: "u2", full_name: "User 2", avatar_url: null }];
        } else if (table === "chat_messages") {
            data = [{ id: "m1", content: "hello", created_at: "2023-01-02", sender_id: "u1" }];
            count = 5;
        }

        resolve({ data, count, error: null });
      };

      return builder;
    });

    const { result } = renderHook(() => useChat());

    // Wait for loading to finish
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Analyze calls
    const participantsCalls = mockFrom.mock.calls.filter(call => call[0] === "chat_participants").length;
    const profilesCalls = mockFrom.mock.calls.filter(call => call[0] === "profiles").length;

    // Assert that we have optimized the calls to 1 batch query each
    expect(participantsCalls).toBe(1);
    expect(profilesCalls).toBe(1);
  });
});
