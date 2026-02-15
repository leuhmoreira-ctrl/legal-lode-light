import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProcessosSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex flex-col md:flex-row md:items-start gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 rounded-lg bg-primary/5">
                 <Skeleton className="w-5 h-5 rounded-full" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <div className="flex items-center gap-1 mt-0.5">
                   <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-3 w-1/5" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 ml-12 flex-wrap">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <div className="flex items-center gap-1 ml-auto">
               <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </div>

          <div className="mt-3 ml-12 pt-3 border-t border-border/50">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs">
                <Skeleton className="w-3.5 h-3.5 rounded-full" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-3 w-1/2 mt-1" />
            </div>
          </div>

          <div className="mt-3 ml-12 flex flex-wrap gap-2">
            <Skeleton className="h-8 w-32 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </Card>
      ))}
    </div>
  );
}
