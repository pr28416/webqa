import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline:
          "border border-border bg-muted/30 hover:bg-muted/50 text-foreground",
        secondary:
          "bg-muted/50 text-foreground hover:bg-muted/70 border border-border",
        ghost: "hover:bg-muted/60 text-foreground",
        link: "text-foreground underline-offset-4 hover:underline",
        // Ramp-style muted yellow accent button
        accent:
          "bg-accent text-accent-foreground hover:bg-accent/80 font-medium",
      },
      size: {
        default: "h-10 px-5 py-3 has-[>svg]:px-4",
        sm: "h-9 rounded-md gap-1.5 px-4 py-2.5 text-xs has-[>svg]:px-3.5",
        lg: "h-11 rounded-md px-7 py-4 has-[>svg]:px-5",
        icon: "size-10",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
