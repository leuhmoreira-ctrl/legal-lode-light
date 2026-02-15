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

        // 2. Fetch all relevant notifications for today upfront
        const { data: existingNotifications, error: notificationsError } = await supabase
          .from("notifications")
          .select("title, message")
          .eq("user_id", user.id)
          .gte("created_at", format(startOfDay(today), "yyyy-MM-dd'T'HH:mm:ss"));

        if (notificationsError) {
          console.error("Error fetching notifications:", notificationsError);
          return;
        }

        // 3. Process each task
        for (const task of tasks) {
          if (!task.due_date) continue;

          const daysRemaining = shouldNotify(task.due_date, today);

          if (daysRemaining !== null) {
            const notificationTitle = `Prazo: ${task.title}`;
            // Use local storage to prevent duplicate checks/inserts on same day
            const storageKey = `deadline_checked_${task.id}_${daysRemaining}days_${format(today, 'yyyy-MM-dd')}`;
            if (localStorage.getItem(storageKey)) continue;

            // Check against pre-fetched notifications to avoid N+1 query
            const alreadyNotified = existingNotifications?.some(n =>
              n.title === notificationTitle &&
              n.message?.includes(`${daysRemaining} dia(s)`)
            );

            if (alreadyNotified) {
               localStorage.setItem(storageKey, "true");
               continue;
            }

            // 4. Send notification
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
