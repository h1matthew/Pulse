import { cn } from '@/lib/utils'

interface AppBackgroundProps {
  className?: string
}

/** AppBackground - flat page ground behind every route. */
export function AppBackground({ className }: AppBackgroundProps) {
  return <div className={cn('fixed inset-0 -z-10 bg-background', className)} aria-hidden />
}
