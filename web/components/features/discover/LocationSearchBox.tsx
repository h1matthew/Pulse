'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Loader2, MapPin, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  getLocationSuggestions,
  resolveLocationByPlaceId,
  geocodeZipCode,
  type LocationSuggestion,
} from '@/lib/location'
import type { LatLng } from '@/types/business'

interface LocationSearchBoxProps {
  /** Called once a typed city/zip resolves to coordinates. */
  onSelect: (result: { location: LatLng; label: string }) => void
  placeholder?: string
  autoFocus?: boolean
  disabled?: boolean
  className?: string
}

const ZIP_PATTERN = /^\d{5}(-\d{4})?$/

/**
 * City-or-zip search input with debounced Google autocomplete suggestions.
 *
 * - Typing ≥ 2 chars fetches US city/town/zip suggestions (via /api/geo/autocomplete).
 * - Picking a suggestion (click, Enter, or arrow keys) resolves it to coordinates.
 * - Pressing Enter on a bare 5-digit zip with no highlighted suggestion geocodes
 *   the zip directly, so the box still works if autocomplete is unavailable.
 *
 * Accessible as a combobox: aria-expanded/-controls/-activedescendant on the
 * input, role="listbox"/"option" on the popover.
 */
export function LocationSearchBox({
  onSelect,
  placeholder = 'Search city or zip code',
  autoFocus,
  disabled,
  className,
}: LocationSearchBoxProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [isResolving, setIsResolving] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()
  // Guards against an in-flight resolve being clobbered by a stale debounce.
  const requestSeq = useRef(0)

  // Debounced suggestion fetch.
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setSuggestions([])
      return
    }

    const seq = ++requestSeq.current
    const timer = setTimeout(async () => {
      const results = await getLocationSuggestions(trimmed)
      if (seq !== requestSeq.current) return // a newer keystroke won
      setSuggestions(results)
      setActiveIndex(-1)
      setOpen(results.length > 0)
    }, 250)

    return () => clearTimeout(timer)
  }, [query])

  // Close the popover when clicking outside.
  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function commit(result: { location: LatLng; label: string } | null) {
    if (!result) return
    setOpen(false)
    setSuggestions([])
    setQuery(result.label)
    onSelect(result)
  }

  async function selectSuggestion(suggestion: LocationSuggestion) {
    setIsResolving(true)
    try {
      const resolved = await resolveLocationByPlaceId(suggestion.id)
      if (resolved) {
        // Prefer the autocomplete label (e.g. "San Antonio, TX, USA") for display.
        await commit({ location: resolved.location, label: suggestion.label || resolved.label })
      }
    } finally {
      setIsResolving(false)
    }
  }

  async function submitRaw() {
    const trimmed = query.trim()
    if (ZIP_PATTERN.test(trimmed)) {
      setIsResolving(true)
      try {
        const location = await geocodeZipCode(trimmed)
        if (location) await commit({ location, label: trimmed })
      } finally {
        setIsResolving(false)
      }
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (suggestions.length === 0) return
      setOpen(true)
      setActiveIndex((i) => (i + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (suggestions.length === 0) return
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (open && activeIndex >= 0 && suggestions[activeIndex]) {
        void selectSuggestion(suggestions[activeIndex])
      } else if (suggestions.length > 0) {
        void selectSuggestion(suggestions[0])
      } else {
        void submitRaw()
      }
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          disabled={disabled || isResolving}
          autoFocus={autoFocus}
          maxLength={100}
          className="pl-10"
          aria-label="Search by city or zip code"
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {isResolving && (
          <Loader2
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-md"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm',
                index === activeIndex ? 'bg-accent text-accent-foreground' : 'text-foreground'
              )}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(e) => {
                // mousedown (not click) so it fires before the input blur closes the list
                e.preventDefault()
                void selectSuggestion(suggestion)
              }}
            >
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate">{suggestion.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
