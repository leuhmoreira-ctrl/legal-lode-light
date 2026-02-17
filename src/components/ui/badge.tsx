import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-lg px-2.5 py-0.5 text-[13px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-[#007AFF]/12 text-[#007AFF] dark:bg-[#0A84FF]/20 dark:text-[#64D2FF] hover:opacity-80",
        secondary:
          "bg-fill-tertiary text-text-secondary hover:bg-fill-secondary",
        destructive:
          "bg-[#FF3B30]/12 text-[#FF3B30] dark:bg-[#FF453A]/20 dark:text-[#FF7A70] hover:opacity-80",
        outline: "text-foreground border border-input",
        success: "bg-[#34C759]/12 text-[#34C759] dark:bg-[#30D158]/20 dark:text-[#30D158] hover:opacity-80",
        warning: "bg-[#FF9500]/12 text-[#FF9500] dark:bg-[#FF9F0A]/20 dark:text-[#FFB340] hover:opacity-80",
        urgent: "bg-[#FF3B30]/12 text-[#FF3B30] dark:bg-[#FF453A]/20 dark:text-[#FF7A70] hover:opacity-80",
        unstyled: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
