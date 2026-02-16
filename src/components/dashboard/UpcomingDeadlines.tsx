import { prazosMock } from "@/data/mockData";
import { DeadlineCard } from "./DeadlineCard";
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

export function UpcomingDeadlines() {
  const urgentTasks = prazosMock.filter((p) => p.status === "urgente");
  const upcomingTasks = prazosMock.filter((p) => p.status === "proximo");
  const onTimeTasks = prazosMock.filter((p) => p.status === "em_dia");

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex items-center justify-between">
         <div>
          <h2 className="text-[24px] font-bold tracking-[-0.5px] text-[#1D1D1F] dark:text-white">
            Próximos Prazos
          </h2>
          <p className="text-[15px] text-[#6E6E73] mt-1">
            Você tem <span className="font-semibold text-[#1D1D1F] dark:text-white">{prazosMock.length}</span> prazos pendentes.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Urgent Section */}
        {urgentTasks.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-[#FF3B30]/10 flex items-center justify-center">
                 <AlertTriangle className="w-3.5 h-3.5 text-[#FF3B30]" />
              </div>
              <h3 className="text-[17px] font-semibold text-[#1D1D1F] dark:text-white">
                Urgente
                <span className="ml-2 text-[13px] font-medium text-[#86868B] bg-[#E5E5EA] dark:bg-[#38383A] px-2 py-0.5 rounded-full">
                  {urgentTasks.length}
                </span>
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {urgentTasks.map((prazo) => (
                <DeadlineCard key={prazo.id} prazo={prazo} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Section */}
        {upcomingTasks.length > 0 && (
          <section>
             <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-[#FF9500]/10 flex items-center justify-center">
                 <Clock className="w-3.5 h-3.5 text-[#FF9500]" />
              </div>
              <h3 className="text-[17px] font-semibold text-[#1D1D1F] dark:text-white">
                Próximos 7 dias
                <span className="ml-2 text-[13px] font-medium text-[#86868B] bg-[#E5E5EA] dark:bg-[#38383A] px-2 py-0.5 rounded-full">
                  {upcomingTasks.length}
                </span>
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {upcomingTasks.map((prazo) => (
                <DeadlineCard key={prazo.id} prazo={prazo} />
              ))}
            </div>
          </section>
        )}

        {/* On Time Section */}
        {onTimeTasks.length > 0 && (
          <section>
             <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-[#34C759]/10 flex items-center justify-center">
                 <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759]" />
              </div>
              <h3 className="text-[17px] font-semibold text-[#1D1D1F] dark:text-white">
                No prazo
                <span className="ml-2 text-[13px] font-medium text-[#86868B] bg-[#E5E5EA] dark:bg-[#38383A] px-2 py-0.5 rounded-full">
                  {onTimeTasks.length}
                </span>
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {onTimeTasks.map((prazo) => (
                <DeadlineCard key={prazo.id} prazo={prazo} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
