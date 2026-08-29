"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

interface BaanihaliPuzzleCaptchaProps {
  onVerify: (token: string) => void
  onCancel?: () => void
}

type CaptchaData = {
  id: string
  background: string
  puzzle: string
  expectedOffset: number
}

const PUZZLE_TOP = 74
const PUZZLE_SIZE = 50
const PUZZLE_STAGE_WIDTH = 300
const SLIDER_MAX = 250
const VERIFY_TOLERANCE = 12

function makeDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function createLocalPuzzleCaptcha(): CaptchaData {
  const expectedOffset = Math.floor(Math.random() * 201) + 20
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

  const backgroundSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1f2937"/>
          <stop offset="100%" stop-color="#0f766e"/>
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="url(#g)" />
      <circle cx="34" cy="32" r="16" fill="rgba(255,255,255,0.2)" />
      <circle cx="260" cy="42" r="22" fill="rgba(255,255,255,0.12)" />
      <rect x="50" y="132" width="70" height="40" rx="8" fill="rgba(255,255,255,0.12)" />
      <rect x="198" y="122" width="52" height="52" rx="8" fill="rgba(255,255,255,0.14)" />
      <rect
        x="${expectedOffset}"
        y="${PUZZLE_TOP}"
        width="${PUZZLE_SIZE}"
        height="${PUZZLE_SIZE}"
        rx="8"
        fill="rgba(255,255,255,0.15)"
        stroke="rgba(255,255,255,0.8)"
        stroke-width="2"
        stroke-dasharray="4 3"
      />
    </svg>
  `

  const puzzleSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${PUZZLE_SIZE}" height="${PUZZLE_SIZE}" viewBox="0 0 ${PUZZLE_SIZE} ${PUZZLE_SIZE}">
      <rect x="1" y="1" width="${PUZZLE_SIZE - 2}" height="${PUZZLE_SIZE - 2}" rx="8" fill="rgba(255,255,255,0.85)" />
      <rect x="5" y="5" width="${PUZZLE_SIZE - 10}" height="${PUZZLE_SIZE - 10}" rx="6" fill="rgba(15,118,110,0.35)" />
    </svg>
  `

  return {
    id,
    expectedOffset,
    background: makeDataUri(backgroundSvg),
    puzzle: makeDataUri(puzzleSvg),
  }
}

// Local implementation inspired by murtazabaanihali/captcha's sliding puzzle UX.
export function BaanihaliPuzzleCaptcha({ onVerify, onCancel }: BaanihaliPuzzleCaptchaProps) {
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null)
  const [sliderValue, setSliderValue] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [stageWidth, setStageWidth] = useState(PUZZLE_STAGE_WIDTH)

  function refreshCaptcha() {
    setLoading(true)
    setSliderValue(0)
    setError(null)
    setCaptcha(createLocalPuzzleCaptcha())
    setLoading(false)
  }

  function verifyCaptcha() {
    if (!captcha) return

    const distance = Math.abs(sliderValue - captcha.expectedOffset)
    if (distance <= VERIFY_TOLERANCE) {
      onVerify(`baanihali-local-${captcha.id}`)
      return
    }

    setError("Try aligning the piece with the highlighted slot and verify again.")
  }

  useEffect(() => {
    refreshCaptcha()
  }, [])

  useEffect(() => {
    if (!stageRef.current) return

    const updateWidth = () => {
      const width = stageRef.current?.getBoundingClientRect().width
      if (width && width > 0) {
        setStageWidth(width)
      }
    }

    updateWidth()

    if (typeof ResizeObserver === "undefined") {
      return
    }

    const observer = new ResizeObserver(updateWidth)
    observer.observe(stageRef.current)

    return () => observer.disconnect()
  }, [])

  const scale = stageWidth / PUZZLE_STAGE_WIDTH

  return (
    <div className="space-y-3" data-testid="baanihali-captcha">
      {captcha && (
        <div className="rounded-md border border-border overflow-hidden">
          <div ref={stageRef} className="relative mx-auto w-full max-w-[300px]">
            <img
              src={captcha.background}
              width={PUZZLE_STAGE_WIDTH}
              height={200}
              alt="Captcha background"
              className="block w-full h-auto"
            />
            <img
              src={captcha.puzzle}
              width={Math.round(PUZZLE_SIZE * scale)}
              height={Math.round(PUZZLE_SIZE * scale)}
              alt="Captcha puzzle piece"
              className="absolute left-0 border border-white/70"
              style={{
                top: `${Math.round(PUZZLE_TOP * scale)}px`,
                transform: `translateX(${Math.round(sliderValue * scale)}px)`,
              }}
            />
          </div>
        </div>
      )}

      <input
        type="range"
        min={0}
        max={SLIDER_MAX}
        value={sliderValue}
        onChange={(e) => setSliderValue(Number(e.target.value))}
        className="w-full"
        aria-label="Captcha slider"
      />

      <p className={`text-sm ${error ? "text-destructive" : "text-muted-foreground"}`}>
        {error || "Slide the puzzle piece into the highlighted target slot."}
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:flex-1 sm:basis-0"
          onClick={refreshCaptcha}
          disabled={loading}
        >
          Refresh
        </Button>
        <Button
          type="button"
          className="w-full sm:flex-1 sm:basis-0"
          onClick={verifyCaptcha}
          disabled={loading || !captcha}
        >
          Verify
        </Button>
      </div>

      {onCancel && (
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={onCancel}
        >
          Cancel
        </Button>
      )}
    </div>
  )
}
