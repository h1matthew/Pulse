import Image from 'next/image'

interface PulseLogoProps {
  className?: string
}

export function PulseLogo({ className }: PulseLogoProps) {
  return (
    <Image
      src="/pulse-logo.png"
      alt=""
      width={40}
      height={40}
      className={className}
      aria-hidden="true"
    />
  )
}
