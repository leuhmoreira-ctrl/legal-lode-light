import { differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiasParadoBadgeProps {
  ultimaMovimentacao: string | null;
  ultimaAcaoManual?: string | null;
}

export function getDiasParado(ultimaMovimentacao: string | null, ultimaAcaoManual?: string | null): number {
  const dates: Date[] = [];
  if (ultimaMovimentacao) dates.push(new Date(ultimaMovimentacao));
  if (ultimaAcaoManual) dates.push(new Date(ultimaAcaoManual));
  if (dates.length === 0) return 0;
  const latest = new Date(Math.max(...dates.map((d) => d.getTime())));
  return differenceInDays(new Date(), latest);
}

export function DiasParadoBadge({ ultimaMovimentacao, ultimaAcaoManual }: DiasParadoBadgeProps) {
  const dias = getDiasParado(ultimaMovimentacao, ultimaAcaoManual);

  if (dias <= 30) return null;

  const config = dias > 90
    ? { label: `🔴 ${dias} dias parado`, className: "bg-destructive/10 text-destructive border-destructive/20" }
    : dias > 60
    ? { label: `⚠️ ${dias} dias parado`, className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800" }
    : { label: `⏰ ${dias} dias parado`, className: "bg-warning/10 text-warning border-warning/20" };

  return (
    <Badge variant="outline" className={cn("text-[10px] gap-1", config.className)}>
      <Clock className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}
