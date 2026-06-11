"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      // Quick fade on activation — feedback that the panel changed without
      // reading as a page load. Callers passing their own animate-* class
      // override it via tailwind-merge.
      className={cn(
        "flex-1 outline-none data-[state=active]:animate-fade-in data-[state=active]:[animation-duration:250ms]",
        className
      )}
      {...props}
    />
  )
}

/**
 * Editorial underline variant — pass to TabsList / TabsTrigger className to
 * render the tab row as a ruled line under the content header instead of a
 * floating segmented pill. Used by content pages (business detail, deals,
 * missions, settings); keep the default pill style for compact binary
 * switches like the login form.
 */
const underlineTabsListClass =
  "h-auto w-full justify-start gap-7 rounded-none border-b border-border bg-transparent p-0"

const underlineTabsTriggerClass =
  "h-auto flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-1 pb-3 pt-1.5 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none dark:data-[state=active]:border-primary dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-foreground"

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  underlineTabsListClass,
  underlineTabsTriggerClass,
}
