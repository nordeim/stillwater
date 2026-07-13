import * as React from "react"

import { cn } from "@/lib/utils"

// React 19: ref is a regular prop (no forwardRef needed)
// WCAG 2.2 AAA §2.5.5: h-11 = 44px minimum target size (was h-9 = 36px)
function Input({ className, type, ref, ...props }: React.ComponentProps<"input"> & { ref?: React.Ref<HTMLInputElement> }) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-none border border-stone-300 bg-transparent px-3 py-1 text-sm shadow-none transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-water-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
}
Input.displayName = "Input"

export { Input }
