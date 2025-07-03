// @ts-nocheck
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { VariantProps, cva } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const sidebarVariants = cva(
  "fixed z-50 flex h-screen w-[15rem] flex-col border-r bg-popover text-popover-foreground shadow-xl transition-all duration-300 ease-in-out",
  {
    variants: {
      variant: {
        default: "border-border",
        secondary:
          "bg-secondary text-secondary-foreground border-secondary",
      },
      open: {
        true: "translate-x-0",
        false: "-translate-x-full",
      },
    },
    defaultVariants: {
      variant: "default",
      open: false,
    },
  }
)

interface SidebarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sidebarVariants> {
  children?: React.ReactNode
  closeButton?: React.ReactNode
  apiButton?: React.ReactNode
  logo?: React.ReactNode
  search?: React.ReactNode
  sheet?: boolean
  open?: boolean
  setOpen?: (open: boolean) => void
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  (
    {
      className,
      variant,
      children,
      closeButton,
      apiButton,
      logo,
      search,
      sheet = false,
      open = false,
      setOpen,
      ...props
    },
    ref
  ) => {
    const content = (
      <div className="flex flex-col gap-2.5 p-6">
        <div className="flex items-center justify-between">
          {logo}
          {closeButton}
        </div>
        {search}
        <Separator />
        <div className="flex-1">{children}</div>
        <Separator />
        {apiButton}
      </div>
    )

    return sheet ? (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0">
          {content}
        </SheetContent>
      </Sheet>
    ) : (
      <div
        ref={ref}
        className={cn(sidebarVariants({ variant, open, className }))}
        {...props}
      >
        {content}
      </div>
    )
  }
)
Sidebar.displayName = "Sidebar"

const SidebarClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="sm"
      className={cn(
        "absolute right-4 top-4 md:hidden hover:bg-secondary",
        className
      )}
      {...props}
    />
  )
})
SidebarClose.displayName = "SidebarClose"

const SidebarLogo = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("flex items-center space-x-2", className)} {...props}>
      <Skeleton className="h-8 w-8" />
      <Skeleton className="h-6 w-[5rem]" />
    </div>
  )
})
SidebarLogo.displayName = "SidebarLogo"

const SidebarSearch = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div className="relative">
      <Input
        ref={ref}
        type="search"
        placeholder="Search..."
        className={cn("bg-background shadow-sm", className)}
        {...props}
      />
    </div>
  )
})
SidebarSearch.displayName = "SidebarSearch"

const SidebarNav = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => {
  return (
    <ul
      ref={ref}
      className={cn(
        "mt-2 space-y-1 px-2 text-sm font-medium",
        className
      )}
      {...props}
    />
  )
})
SidebarNav.displayName = "SidebarNav"

const SidebarNavItem = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement>
>(({ className, children, ...props }, ref) => {
  return (
    <li>
      <a
        ref={ref}
        className={cn(
          "group relative flex w-full items-center rounded-md border border-transparent px-2 py-1.5 text-sm font-medium hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </a>
    </li>
  )
})
SidebarNavItem.displayName = "SidebarNavItem"

const SidebarBottom = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("mt-auto hidden p-6 md:block", className)} {...props}>
      {props.children}
    </div>
  )
})
SidebarBottom.displayName = "SidebarBottom"

const SidebarApi = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <TooltipProvider>
      <div className="px-6">
        <Tooltip delayDuration={50}>
          <TooltipTrigger asChild>
            <Button ref={ref} variant="secondary" className={cn("w-full", className)} {...props} />
          </TooltipTrigger>
          <TooltipContent side="top" align="center">
            You can add your api key here.
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
})
SidebarApi.displayName = "SidebarApi"

export {
  Sidebar,
  SidebarNav,
  SidebarItem as SidebarNavItem,
  SidebarBottom,
  SidebarApi,
  SidebarLogo,
  SidebarSearch,
  SidebarClose,
}

// Alias to prevent naming collisions.
const SidebarItem = SidebarNavItem
