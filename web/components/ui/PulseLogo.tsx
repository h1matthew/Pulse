import Image from 'next/image'

interface PulseLogoProps {
  className?: string
}

/**
 * Pulse brand mark — navy badge with a glowing orb above an open ring,
 * flanked by signal arcs. Rendered from the brand PNG; size it with
 * h-* / w-* classes via className.
 */
export function PulseLogo({ className }: PulseLogoProps) {
  return (
    <Image
      src="/pulse-logo.png"
      alt=""
      width={40}
      height={40}
      className={className}
      aria-hidden="true"
      // Always above the fold in the header — eager-load so Next.js doesn't
      // warn about a lazy LCP image.
      priority
    />
  )
}
