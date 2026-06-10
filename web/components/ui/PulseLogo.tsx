import Image from 'next/image'

interface PulseLogoProps {
  className?: string
}

/**
 * Pulse brand mark: dark navy badge with a glowing orb above an open ring,
 * flanked by signal arcs. Self-colored (not currentColor) — size it with
 * h-* / w-* classes via className.
 */
export function PulseLogo({ className }: PulseLogoProps) {
  return (
<<<<<<< HEAD
    <Image
      src="/pulse-logo.png"
      alt=""
      width={40}
      height={40}
      className={className}
      aria-hidden="true"
    />
=======
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <clipPath id="pulse-logo-badge">
          <circle cx="256" cy="256" r="216" />
        </clipPath>
      </defs>

      {/* Badge */}
      <circle cx="256" cy="256" r="216" fill="#0D193C" />
      <circle cx="256" cy="256" r="178" fill="#15224D" />

      <g clipPath="url(#pulse-logo-badge)">
        {/* Flanking signal arcs */}
        <path
          d="M 188 264 A 96 96 0 0 0 215 419"
          stroke="#2F6BE9"
          strokeWidth="20"
          strokeLinecap="round"
        />
        <path
          d="M 324 264 A 96 96 0 0 1 297 419"
          stroke="#2F6BE9"
          strokeWidth="20"
          strokeLinecap="round"
        />

        {/* Open ring (horseshoe), gap facing the orb */}
        <path
          d="M 223 263 A 66 66 0 1 0 289 263"
          stroke="#5FA5F9"
          strokeWidth="22"
          strokeLinecap="round"
        />

        {/* Orb: white core with blue ring */}
        <circle cx="256" cy="232" r="24" stroke="#4D8BF5" strokeWidth="12" />
        <circle cx="256" cy="232" r="11" fill="#FFFFFF" />
      </g>
    </svg>
>>>>>>> 4d042392ffa5a0fcb82e2034bcdd426213bd8050
  )
}
