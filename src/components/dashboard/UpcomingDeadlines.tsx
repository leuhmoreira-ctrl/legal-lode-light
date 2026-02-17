import { prazosMock } from "@/data/mockData";
import { DeadlineItem } from "./DeadlineItem";
import { AlertTriangle, Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function UpcomingDeadlines() {
  const urgentTasks = prazosMock.filter((p) => p.status === "urgente");
  const upcomingTasks = prazosMock.filter((p) => p.status === "proximo");

  // Logic to limit items to ~6 total, prioritizing urgent
  const maxItems = 6;
  const shownUrgent = urgentTasks.slice(0, maxItems);
  const remainingSlots = Math.max(0, maxItems - shownUrgent.length);
  const shownUpcoming = upcomingTasks.slice(0, remainingSlots);

  const totalShown = shownUrgent.length + shownUpcoming.length;
  const totalHidden = prazosMock.length - totalShown;

  if (totalShown === 0) {
      return (
          <div className="text-center py-10">
              <p className="text-[#6E6E73]">Nenhum prazo próximo.</p>
          </div>
      )
  }

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
         <div>
          <h2 className="text-[18px] sm:text-[20px] font-bold tracking-[-0.3px] text-[#1D1D1F] dark:text-white">
            Próximos Prazos
          </h2>
          <p className="text-[13px] sm:text-[14px] text-[#6E6E73] mt-1">
            Visão geral das prioridades da semana
          </p>
        </div>
        <Link to="/prazos" className="inline-flex min-h-[44px] items-center text-[14px] font-medium text-[#007AFF] hover:text-[#007AFF]/80 gap-1">
            Ver calendário
            <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-4">
        {/* Urgent Section */}
        {shownUrgent.length > 0 && (
          <div className="rounded-[14px] bg-[#FFF5F5] dark:bg-[rgba(255,69,58,0.12)] shadow-sm overflow-hidden border-l-[4px] border-[#FF3B30]">
            {/* Header */}
            <div className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 bg-[#FFE5E5] dark:bg-[rgba(255,69,58,0.2)] border-b border-[#FF3B30]/10">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#FF3B30]" />
                    <h3 className="text-[15px] sm:text-[16px] font-semibold text-[#1D1D1F] dark:text-white">Urgente</h3>
                    <span className="bg-[#FF3B30] text-white text-[12px] font-bold px-2 py-0.5 rounded-full">
                        {shownUrgent.length}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-3 sm:p-4">
                {shownUrgent.map((prazo) => (
                    <DeadlineItem key={prazo.id} prazo={prazo} />
                ))}
            </div>
          </div>
        )}

        {/* Upcoming Section */}
        {shownUpcoming.length > 0 && (
          <div className="rounded-[14px] bg-[#FFFBF0] dark:bg-[rgba(255,159,10,0.12)] shadow-sm overflow-hidden border-l-[4px] border-[#FF9500]">
             {/* Header */}
             <div className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 bg-[#FFF3CD] dark:bg-[rgba(255,159,10,0.2)] border-b border-[#FF9500]/10">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#FF9500]" />
                    <h3 className="text-[15px] sm:text-[16px] font-semibold text-[#1D1D1F] dark:text-white">Próximos 7 dias</h3>
                    <span className="bg-[#FF9500] text-white text-[12px] font-bold px-2 py-0.5 rounded-full">
                        {shownUpcoming.length}
                    </span>
                </div>
            </div>

             {/* Content */}
             <div className="p-3 sm:p-4">
                {shownUpcoming.map((prazo) => (
                    <DeadlineItem key={prazo.id} prazo={prazo} />
                ))}
            </div>
          </div>
        )}
      </div>

      {totalHidden > 0 && (
          <div className="flex justify-center pt-2">
              <Link to="/prazos" className="text-[14px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] transition-colors">
                  + {totalHidden} outros prazos
              </Link>
          </div>
      )}
    </div>
  );
}
