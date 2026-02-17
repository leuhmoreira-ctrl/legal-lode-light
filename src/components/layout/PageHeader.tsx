import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  className,
  titleClassName,
  subtitleClassName,
}: PageHeaderProps) {
  return (
    <header className={cn("page-hero", className)}>
      <div className={cn("flex flex-col gap-3 sm:gap-4", actions && "sm:flex-row sm:items-end sm:justify-between")}>
        <div className="page-hero-head">
          {eyebrow ? (
            <p className="text-[11px] sm:text-[12px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <h1 className={cn("page-title", titleClassName)}>{title}</h1>
          {subtitle ? <p className={cn("page-subtitle", subtitleClassName)}>{subtitle}</p> : null}
        </div>

        {actions ? <div className="page-actions w-full sm:w-auto">{actions}</div> : null}
      </div>
    </header>
  );
}
