type AnimationName =
  | 'fade-up'
  | 'rise-up'
  | 'fade-in'
  | 'fade-in-down'
  | 'fade-in-up'
  | 'slide-left'
  | 'slide-right'
  | 'scale-in'
  | 'fade-out-down'
  | 'fade-out-up'
  | 'scale-out'

interface AnimatedSectionProps {
  children: React.ReactNode
  animation?: AnimationName
  delay?: number
  className?: string
  once?: boolean
}

// Kept as a no-op wrapper so call sites keep their layout classes. The
// scroll-reveal it used to run emitted `opacity-0` from the server, so the
// page shipped invisible and needed JS to appear.
export function AnimatedSection({ children, className }: AnimatedSectionProps) {
  return <div className={className}>{children}</div>
}

// Retained for tests that reset the old entrance latch.
export function __resetEntranceLatchForTests() {}
