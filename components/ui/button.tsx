import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-70 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] shadow-sm hover:shadow-md",
  {
    variants: {
      variant: {
        default: 'bg-[#0C346B] text-white hover:bg-[#0a2a56] active:scale-95',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 active:scale-95',
        outline:
          'border border-[#0C346B] bg-background text-[#0C346B] shadow-xs hover:bg-[#0C346B] hover:text-white active:scale-95',
        secondary:
          'bg-[#0C346B] text-white hover:bg-[#0a2a56] active:scale-95',
        ghost:
          'hover:bg-gray-100 hover:text-[#0C346B] active:scale-95',
        link: 'text-[#0C346B] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md gap-1.5 px-3',
        lg: 'h-10 rounded-md px-6',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
