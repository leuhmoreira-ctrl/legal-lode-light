import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { shouldNotify } from "@/utils/deadlineUtils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { addDays, format, startOfDay } from "date-fns";

export function useDeadlineNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const checkDeadlines = async () => {
      try {
        const today = new Date();
        const endDate = addDays(today, 8); // Check next 8 days

        // 1. Fetch tasks due soon
        const { data: tasks, error } = await supabase
          .from("kanban_tasks")
          .select("id, title, due_date, status, assigned_to, user_id")
          .not("due_date", "is", null)
          .gte("due_date", format(today, "yyyy-MM-dd"))
          .lte("due_date", format(endDate, "yyyy-MM-dd"))
          .neq("status", "done")
          .or(`assigned_to.eq.${user.id},user_id.eq.${user.id}`); // Filter for current user

        if (error) {
          console.error("Error fetching tasks for deadlines:", error);
          return;
        }

        if (!tasks || tasks.length === 0) return;

        // 2. Process each task
        for (const task of tasks) {
          if (!task.due_date) continue;

          const daysRemaining = shouldNotify(task.due_date, today);

          if (daysRemaining !== null) {
            const notificationTitle = `Prazo: ${task.title}`;
            // Use local storage to prevent duplicate checks/inserts on same day
            const storageKey = `deadline_checked_${task.id}_${daysRemaining}days_${format(today, 'yyyy-MM-dd')}`;
            if (localStorage.getItem(storageKey)) continue;

            // Check DB to avoid duplicate notifications
            const { data: existing } = await supabase
              .from("notifications")
              .select("id")
              .eq("user_id", user.id)
              .eq("title", notificationTitle)
              .like("message", `%${daysRemaining} dia(s)%`)
              .gte("created_at", format(startOfDay(today), "yyyy-MM-dd'T'HH:mm:ss"));

            if (existing && existing.length > 0) {
               localStorage.setItem(storageKey, "true");
               continue;
            }

            // 3. Send notification
            const message = `O prazo para "${task.title}" vence em ${daysRemaining} dia(s).`;

            const { error: insertError } = await supabase.from("notifications").insert({
              user_id: user.id,
              title: notificationTitle,
              message: message,
              type: "deadline_alert",
              is_read: false,
              link: `/kanban?taskId=${task.id}`
            });

            if (!insertError) {
                toast({
                  title: "Atenção ao Prazo!",
                  description: message,
                  variant: daysRemaining === 1 ? "destructive" : "default",
                });
                localStorage.setItem(storageKey, "true");
            }
          }
        }
      } catch (err) {
        console.error("Error in deadline check:", err);
      }
    };

    checkDeadlines();
  }, [user, toast]);
}
