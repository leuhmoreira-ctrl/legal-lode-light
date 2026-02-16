import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface CommentInputProps {
  users: UserProfile[];
  onSubmit: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CommentInput({ users, onSubmit, placeholder = "Escrever comentário...", disabled }: CommentInputProps) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPos, setCursorPos] = useState(0);

  const filteredUsers = useMemo(() => {
    if (!query) return [];
    return users.filter(u =>
      u.full_name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5); // Limit to 5 suggestions
  }, [users, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelectUser = (user: UserProfile) => {
    // Find the last @ before cursor
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastAt = textBeforeCursor.lastIndexOf("@");
    const textAfterCursor = text.slice(cursorPos);

    // Construct new text
    // We replace everything from @ to cursor with the mention
    const newText = textBeforeCursor.slice(0, lastAt) + `@${user.full_name} ` + textAfterCursor;

    setText(newText);
    setOpen(false);
    setQuery("");

    // Set cursor position after the inserted name + space
    const newCursorPos = lastAt + user.full_name.length + 2;

    // We need to wait for render to update text value before setting selection
    setTimeout(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (open && filteredUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredUsers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filteredUsers[selectedIndex]) {
            handleSelectUser(filteredUsers[selectedIndex]);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) {
        onSubmit(text);
        setText("");
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const newPos = e.target.selectionStart;
    setText(newVal);
    setCursorPos(newPos);

    const textBeforeCursor = newVal.slice(0, newPos);
    const lastAt = textBeforeCursor.lastIndexOf("@");

    if (lastAt !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAt + 1);
      // Logic to decide if we are typing a mention
      // 1. No newlines allowed in the query
      // 2. Length check (e.g. max 20 chars for name search)
      // 3. Usually we stop at space, but full names have spaces.
      //    We can allow spaces if we assume the user keeps typing the name.
      //    But typical implementation stops at space unless quoted.
      //    Let's allow spaces for now but simplistic check.

      const isValidMention = !textAfterAt.includes("\n") && textAfterAt.length < 30;

      if (isValidMention) {
         setQuery(textAfterAt);
         setOpen(true);
         return;
      }
    }
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="relative w-full">
      <Popover open={open && filteredUsers.length > 0} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="absolute top-0 left-0 w-full h-0 pointer-events-none" />
        </PopoverTrigger>
        <PopoverContent
            className="p-1 w-[250px] overflow-hidden"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
        >
            <div className="flex flex-col gap-0.5">
                {filteredUsers.map((user, index) => (
                    <div
                        key={user.id}
                        className={cn(
                            "flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                            index === selectedIndex && "bg-accent text-accent-foreground"
                        )}
                        onClick={() => handleSelectUser(user)}
                    >
                         <UserAvatar
                            name={user.full_name}
                            avatarUrl={user.avatar_url}
                            size="sm"
                            className="w-5 h-5"
                        />
                        <span className="truncate">{user.full_name}</span>
                    </div>
                ))}
            </div>
        </PopoverContent>
      </Popover>

      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[40px] max-h-[120px] text-sm resize-none py-2 flex-1"
          disabled={disabled}
        />
        <Button
            size="sm"
            onClick={() => {
                if(text.trim()) {
                    onSubmit(text);
                    setText("");
                }
            }}
            disabled={!text.trim() || disabled}
            className="mb-0.5"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
