import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProcessPartiesHeaderProps {
  cliente: string;
  parteContraria: string | null;
  advogado: string;
  vara: string;
  comarca: string;
  tipoAcao: string | null;
  dataDistribuicao: string | null;
}

export function ProcessPartiesHeader({
  cliente,
  parteContraria,
  advogado,
  vara,
  comarca,
  tipoAcao,
  dataDistribuicao,
}: ProcessPartiesHeaderProps) {
  const formattedDate = dataDistribuicao
    ? format(parseISO(dataDistribuicao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : "Não informada";

  const Item = ({ label, value, className }: { label: string; value: string; className?: string }) => (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[11px] font-medium text-[#86868B] uppercase tracking-wide font-sans select-text">
        {label}
      </span>
      <span className="text-[15px] font-semibold text-[#1D1D1F] leading-snug select-text">
        {value}
      </span>
    </div>
  );

  return (
    <div className="w-full bg-[#F5F5F7] border-b border-[#D2D2D7] shadow-[0_2px_8px_rgba(0,0,0,0.04)] px-6 py-6 cursor-default">
      <div className="flex flex-col gap-4 md:grid md:grid-cols-2 lg:grid-cols-[10fr_12fr_9fr_9fr] md:gap-x-8 md:gap-y-6 max-w-[1280px] mx-auto">
        {/* Coluna 1: Cliente + Parte Contrária */}
        <div className="contents md:flex md:flex-col md:gap-4">
          <Item label="Cliente" value={cliente} className="order-1 md:order-none" />
          <Item label="Parte Contrária" value={parteContraria || "Não informada"} className="order-2 md:order-none" />
        </div>

        {/* Coluna 2: Advogado + Vara */}
        <div className="contents md:flex md:flex-col md:gap-4">
          <Item label="Advogado" value={advogado} className="order-3 md:order-none" />
          <Item label="Vara / Comarca" value={`${vara} — ${comarca}`} className="order-5 md:order-none" />
        </div>

        {/* Coluna 3: Tipo de Ação */}
        <div className="contents md:flex md:flex-col md:gap-4">
          <Item label="Tipo de Ação" value={tipoAcao || "Não informado"} className="order-4 md:order-none" />
        </div>

        {/* Coluna 4: Data de Distribuição */}
        <div className="contents md:flex md:flex-col md:gap-4">
          <Item label="Data de Distribuição" value={formattedDate} className="order-6 md:order-none" />
        </div>
      </div>
    </div>
  );
}
