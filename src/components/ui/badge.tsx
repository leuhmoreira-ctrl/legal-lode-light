import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-lg px-2.5 py-0.5 text-[13px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "badge-blue-light dark:badge-blue-dark hover:opacity-80",
        secondary:
          "bg-fill-tertiary text-text-secondary hover:bg-fill-secondary",
        destructive:
          "badge-red-light dark:badge-red-dark hover:opacity-80",
        outline: "text-foreground border border-input",
        success: "badge-green-light dark:badge-green-dark hover:opacity-80",
        warning: "badge-orange-light dark:badge-orange-dark hover:opacity-80",
        urgent: "badge-red-light dark:badge-red-dark hover:opacity-80",
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
