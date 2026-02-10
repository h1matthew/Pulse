'use client'

import { Handshake, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NavLink } from '@/components/ui/nav-link'

interface PartnerLogosProps {
  className?: string
}

export function PartnerLogos({ className }: PartnerLogosProps) {
  return (
    <div className={cn('', className)}>
      <div className="rounded-xl border-2 border-dashed border-border/50 bg-card/30 p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Handshake className="h-8 w-8 text-primary" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-foreground">
          Become Our First Partner
        </h3>
        <p className="mx-auto mb-6 max-w-md text-muted-foreground">
          We're looking for organizations that share our passion for aerospace education.
          Partner with us to inspire the next generation of rocket scientists.
        </p>
        <NavLink
          href="/contact?topic=partnership"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
        >
          Get in Touch
          <ArrowRight className="h-4 w-4" />
        </NavLink>
      </div>
    </div>
  )
}
