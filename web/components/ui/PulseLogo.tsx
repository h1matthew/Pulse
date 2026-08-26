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
        <polygon points="100,25 65,40 100,55" fill="#BFDBFE" />
        <polygon points="100,25 135,40 100,55" fill="#93C5FD" />
        <polygon points="65,40 50,75 80,75" fill="#93C5FD" />
        <polygon points="135,40 150,75 120,75" fill="#3B82F6" />
        <polygon points="65,40 80,75 100,55" fill="#60A5FA" />
        <polygon points="135,40 120,75 100,55" fill="#2563EB" />
        <polygon points="50,75 100,175 80,75" fill="#4F75FF" />
        <polygon points="150,75 100,175 120,75" fill="#1E3A8A" />
        <polygon points="80,75 100,175 100,95" fill="#2563EB" />
        <polygon points="120,75 100,175 100,95" fill="#172554" />
      </g>
    </svg>
  )
}
