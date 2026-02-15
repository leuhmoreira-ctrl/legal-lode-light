import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

interface UserAvatarProps {
  userId?: string;
  name?: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function UserAvatar({ name, avatarUrl, size = "md", className }: UserAvatarProps) {
  const sizeClasses = {
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-10 w-10 text-sm",
    xl: "h-20 w-20 text-xl",
  };

  const getInitials = (name?: string) => {
    if (!name) return "";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(name);

  // Generate a consistent background color based on name
  const getBackgroundColor = (name?: string) => {
    if (!name) return "bg-muted";
    const colors = [
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
      "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
      "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
      "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400",
      "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
      "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const bgColorClass = !avatarUrl ? getBackgroundColor(name) : "";

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={name || "Avatar"} className="object-cover" />
      ) : null}
      <AvatarFallback className={cn("font-medium", bgColorClass)}>
        {initials || <User className="w-1/2 h-1/2 opacity-50" />}
      </AvatarFallback>
    </Avatar>
  );
}
