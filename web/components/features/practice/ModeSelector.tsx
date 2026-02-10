'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookOpen, Shuffle, ClipboardCheck, PenLine } from 'lucide-react'
import type { StudyMode } from '@/types/flashcards'

interface ModeSelectorProps {
  mode: StudyMode
  onModeChange: (mode: StudyMode) => void
}

export function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  return (
    <Tabs value={mode} onValueChange={(value) => onModeChange(value as StudyMode)}>
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="learn" className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          <span className="hidden sm:inline">Learn</span>
        </TabsTrigger>
        <TabsTrigger value="match" className="flex items-center gap-2">
          <Shuffle className="h-4 w-4" />
          <span className="hidden sm:inline">Match</span>
        </TabsTrigger>
        <TabsTrigger value="test" className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" />
          <span className="hidden sm:inline">Test</span>
        </TabsTrigger>
        <TabsTrigger value="write" className="flex items-center gap-2">
          <PenLine className="h-4 w-4" />
          <span className="hidden sm:inline">Write</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
