import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RecipientInputProps {
  label: string;
  recipients: string[];
  onChange: (recipients: string[]) => void;
  placeholder?: string;
  error?: boolean;
}

export function RecipientInput({ label, recipients, onChange, placeholder, error }: RecipientInputProps) {
  const [inputValue, setInputValue] = useState("");

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const addRecipient = () => {
    const trimmed = inputValue.trim();
    if (trimmed && isValidEmail(trimmed) && !recipients.includes(trimmed)) {
      onChange([...recipients, trimmed]);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", "Tab", ","].includes(e.key)) {
      e.preventDefault();
      addRecipient();
    }
    if (e.key === "Backspace" && !inputValue && recipients.length > 0) {
      onChange(recipients.slice(0, -1));
    }
  };

  const removeRecipient = (index: number) => {
    onChange(recipients.filter((_, i) => i !== index));
  };

  return (
    <div className="flex gap-2 items-start">
      <Label className="mt-3 w-12 text-right text-muted-foreground">{label}</Label>
      <div className={cn(
        "flex-1 flex flex-wrap gap-2 p-2 border rounded-md bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all",
        error ? "border-destructive focus-within:ring-destructive" : "border-input"
      )}>
        {recipients.map((email, i) => (
          <Badge key={i} variant="secondary" className="gap-1 pl-2 pr-1 font-normal">
            {email}
            <button
              onClick={() => removeRecipient(i)}
              className="hover:bg-destructive/20 hover:text-destructive rounded-full p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <input
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm h-7"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addRecipient}
          placeholder={recipients.length === 0 ? placeholder : ""}
        />
      </div>
    </div>
  );
}
