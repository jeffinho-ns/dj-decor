import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-2xl border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 neo-press",
  {
    variants: {
      variant: {
        default:
          "neo-pink text-white hover:brightness-105 active:brightness-95",
        outline:
          "neo text-foreground hover:text-balloon-pink",
        secondary:
          "neo-sky text-white hover:brightness-105",
        ghost:
          "bg-transparent shadow-none text-muted-foreground hover:text-foreground hover:bg-muted/60",
        destructive:
          "bg-destructive text-white shadow-[6px_6px_14px_rgba(240,67,93,0.3)] hover:brightness-105",
        link: "bg-transparent shadow-none text-balloon-pink underline-offset-4 hover:underline",
        sun: "neo-sun hover:brightness-105",
        mint: "neo-mint hover:brightness-105",
      },
      size: {
        default:
          "min-h-11 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-8 gap-1 rounded-xl px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "min-h-10 gap-1 rounded-xl px-3 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "min-h-12 gap-2 px-5 text-base",
        icon: "size-11 rounded-2xl",
        "icon-xs":
          "size-8 rounded-xl [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-10 rounded-xl",
        "icon-lg": "size-12 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
