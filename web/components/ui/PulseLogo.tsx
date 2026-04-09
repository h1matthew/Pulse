interface PulseLogoProps {
  className?: string
}

export function PulseLogo({ className }: PulseLogoProps) {
  return (
    <svg
      viewBox="0 0 40 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M1 13 L7 13 L9.5 4 L13 23 L16 6 L18.5 13 L22 13"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 13 A8 8 0 0 1 38 13 Q38 22 30 32 Q22 22 22 13"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="30" cy="11" r="2.5" fill="currentColor" />
    </svg>
  )
}
