import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CopyProcessNumberProps {
  numero: string;
  className?: string;
  size?: "sm" | "icon";
}

export function CopyProcessNumber({ numero, className, size = "icon" }: CopyProcessNumberProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(numero);
      setCopied(true);
      toast({ title: "📋 Número copiado!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  return (
    <Button
      variant="ghost"
      size={size}
      className={cn("h-7 w-7 shrink-0", className)}
      onClick={handleCopy}
      title="Copiar número do processo"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-success" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
      )}
    </Button>
  );
}
