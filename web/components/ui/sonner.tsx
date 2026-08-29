"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          // Force the description to use the popover's foreground token so it
          // always contrasts with --normal-bg (var(--popover)). Sonner's forced
          // "dark" theme otherwise keeps a light-gray description color, which
          // blends into the toast background when the app is in light mode
          // (e.g. the "$15.97 kept local" check-in confirmation).
          description: "!text-popover-foreground opacity-100",
        },
      }}
      style={
        {
          "--normal-bg": "var(--surface-2)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border-strong)",
          "--border-radius": "6px",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
