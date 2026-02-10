import { Rocket, Globe, Layers, Flame, Package } from 'lucide-react'
import { NavLink } from '@/components/ui/nav-link'

export default function SimulatePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
          Rocket Simulators
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Apply what you&apos;ve learned with interactive physics simulations. Adjust parameters and see how they affect rocket performance.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Vertical Flight Simulator */}
        <NavLink
          href="/simulate/flight"
          className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 animate-tilt-in"
          style={{ animationDelay: '0s' }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 group-hover:bg-primary/15 transition-colors">
            <Rocket className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
            Vertical Flight Simulator
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Launch a rocket straight up! Adjust thrust, mass, and drag to see how high your rocket can fly.
          </p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Adjustable thrust, mass, and fuel</li>
            <li>• Real-time altitude and velocity graphs</li>
            <li>• Weather and wind simulation</li>
          </ul>
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', backgroundSize: '200% 100%', animation: 'shimmer 2s linear infinite' }} />
        </NavLink>

        {/* Orbital Mechanics Simulator */}
        <NavLink
          href="/simulate/orbit"
          className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-chart-2/30 hover:shadow-xl hover:shadow-chart-2/10 hover:-translate-y-1 animate-tilt-in"
          style={{ animationDelay: '0.08s' }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-2/10 text-chart-2 mb-4 group-hover:bg-chart-2/15 transition-colors">
            <Globe className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2 group-hover:text-chart-2 transition-colors">
            Orbital Mechanics Simulator
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Plan orbital maneuvers! Calculate delta-v requirements and visualize Hohmann transfers.
          </p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Hohmann transfer calculator</li>
            <li>• Orbital velocity visualization</li>
            <li>• Delta-v budget planning</li>
          </ul>
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', backgroundSize: '200% 100%', animation: 'shimmer 2s linear infinite' }} />
        </NavLink>

        {/* Multi-Stage Rocket Simulator */}
        <NavLink
          href="/simulate/multi-stage"
          className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 animate-tilt-in"
          style={{ animationDelay: '0.16s' }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 group-hover:bg-primary/15 transition-colors">
            <Layers className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
            Multi-Stage Rocket Simulator
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Design multi-stage rockets with the Tsiolkovsky equation. Watch staging events unfold.
          </p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Up to 4 configurable stages</li>
            <li>• Real-time delta-V calculations</li>
            <li>• Staging event timeline</li>
          </ul>
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', backgroundSize: '200% 100%', animation: 'shimmer 2s linear infinite' }} />
        </NavLink>

        {/* Atmospheric Re-entry Simulator */}
        <NavLink
          href="/simulate/reentry"
          className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-chart-3/30 hover:shadow-xl hover:shadow-chart-3/10 hover:-translate-y-1 animate-tilt-in"
          style={{ animationDelay: '0.24s' }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-3/10 text-chart-3 mb-4 group-hover:bg-chart-3/15 transition-colors">
            <Flame className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2 group-hover:text-chart-3 transition-colors">
            Atmospheric Re-entry Simulator
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Experience spacecraft re-entry with heat flux, G-forces, and communications blackout.
          </p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Heat shield ablation modeling</li>
            <li>• G-force and crew tolerance</li>
            <li>• Entry corridor analysis</li>
          </ul>
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', backgroundSize: '200% 100%', animation: 'shimmer 2s linear infinite' }} />
        </NavLink>

        {/* Payload Optimization */}
        <NavLink
          href="/simulate/payload"
          className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-chart-2/30 hover:shadow-xl hover:shadow-chart-2/10 hover:-translate-y-1 animate-tilt-in"
          style={{ animationDelay: '0.32s' }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-2/10 text-chart-2 mb-4 group-hover:bg-chart-2/15 transition-colors">
            <Package className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2 group-hover:text-chart-2 transition-colors">
            Payload Optimization
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Compare rocket configurations for your mission. Find the optimal payload-to-cost ratio.
          </p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Multiple orbit targets (LEO to escape)</li>
            <li>• Pareto frontier analysis</li>
            <li>• Cost-per-kilogram comparison</li>
          </ul>
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', backgroundSize: '200% 100%', animation: 'shimmer 2s linear infinite' }} />
        </NavLink>
      </div>
    </main>
  )
}
