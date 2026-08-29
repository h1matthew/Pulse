interface PulseLogoProps {
  className?: string
}

export function PulseLogo({ className }: PulseLogoProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <g transform="translate(0, 5)">
        <polygon points="100,25 65,40 100,55" fill="currentColor" opacity="0.92" />
        <polygon points="100,25 135,40 100,55" fill="currentColor" opacity="0.78" />
        <polygon points="65,40 50,75 80,75" fill="currentColor" opacity="0.72" />
        <polygon points="135,40 150,75 120,75" fill="currentColor" opacity="0.58" />
        <polygon points="65,40 80,75 100,55" fill="currentColor" opacity="0.65" />
        <polygon points="135,40 120,75 100,55" fill="currentColor" opacity="0.5" />
        <polygon points="50,75 100,175 80,75" fill="currentColor" opacity="0.7" />
        <polygon points="150,75 100,175 120,75" fill="currentColor" opacity="0.42" />
        <polygon points="80,75 100,175 100,95" fill="currentColor" opacity="0.55" />
        <polygon points="120,75 100,175 100,95" fill="currentColor" opacity="0.35" />
      </g>
    </svg>
  )
}
