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
    <div className="flex min-h-[100dvh] w-full bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto overflow-x-hidden transition-all duration-300 ease-in-out">
        <div
          className="w-full mx-auto animate-fade-in-scale"
          style={{
            maxWidth: "var(--page-max-width)",
            paddingInline: "var(--app-container-x)",
            paddingTop: "var(--app-container-top)",
            paddingBottom: "var(--app-container-bottom)",
          }}
        >
          {children}
        </div>
      </main>
      <ChatWidget />
    </div>
  );
}
