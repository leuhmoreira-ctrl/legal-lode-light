import { ReactNode } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { useDeadlineNotifications } from "@/hooks/useDeadlineNotifications";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  useDeadlineNotifications();

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto transition-all duration-300 ease-in-out">
        <div className="p-6 pt-16 md:pt-6 max-w-[1400px] mx-auto animate-fade-in-scale">
          {children}
        </div>
      </main>
      <ChatWidget />
    </div>
  );
}
