'use client'

import { Instagram } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SocialsProps {
  className?: string
}

export function Socials({ className }: SocialsProps) {
  const socials = [
    {
      name: 'Instagram',
      href: 'https://www.instagram.com/maxapogee.education/',
      icon: <Instagram className="h-5 w-5" />,
    },
  ]

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <p className="mb-4 text-sm text-muted-foreground">Follow us</p>
      <div className="flex items-center gap-3">
        {socials.map((social) => (
          <a
            key={social.name}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border/50 bg-card text-muted-foreground transition-all duration-300 hover:border-primary/30 hover:bg-primary/10 hover:text-primary hover:scale-110"
            aria-label={`Follow us on ${social.name}`}
          >
            {social.icon}
          </a>
        ))}
      </div>
    </div>
  )
}
