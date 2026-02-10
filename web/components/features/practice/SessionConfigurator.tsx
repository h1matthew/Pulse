'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Sparkles, BookOpen, Zap, ArrowLeft } from 'lucide-react'
import type { FlashcardSourceConfig, StudyMode } from '@/types/flashcards'

interface SessionConfiguratorProps {
  selectedMode: StudyMode
  onComplete: (config: FlashcardSourceConfig) => void
  onBack: () => void
  availableModules: Array<{
    id: string
    title: string
    lessonCount: number
    lessons: Array<{ id: string; title: string }>
  }>
}

/**
 * Step 2: Session Configuration
 * Simplified single form that accepts selectedMode from Step 1
 * Smart defaults based on study mode
 */
export function SessionConfigurator({
  selectedMode,
  onComplete,
  onBack,
  availableModules,
}: SessionConfiguratorProps) {
  // Content source mode
  const [sourceMode, setSourceMode] = useState<'existing' | 'generate' | 'mixed'>('existing')

  // Existing cards config
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([])
  const [excludeKnown, setExcludeKnown] = useState(true)

  // AI generation config
  const [genModuleId, setGenModuleId] = useState('')
  const [genLessonIds, setGenLessonIds] = useState<string[]>([])
  const [genDifficulty, setGenDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')

  // Smart defaults for card count based on mode
  const getDefaultCardCount = (mode: StudyMode): number => {
    switch (mode) {
      case 'learn':
        return 20 // Good for review
      case 'match':
        return 12 // 2 batches of 6
      case 'test':
        return 10 // Quick quiz
      case 'write':
        return 10 // Intensive
      default:
        return 15
    }
  }

  const [cardCount, setCardCount] = useState<number>(getDefaultCardCount(selectedMode))

  // Update card count when mode changes
  useEffect(() => {
    setCardCount(getDefaultCardCount(selectedMode))
  }, [selectedMode])

  const handleComplete = () => {
    const config: FlashcardSourceConfig = {
      mode: sourceMode,
      moduleIds: sourceMode !== 'generate' ? selectedModuleIds : undefined,
      cardCount: sourceMode !== 'generate' ? (cardCount === -1 ? undefined : cardCount) : undefined,
      excludeKnown: sourceMode !== 'generate' ? excludeKnown : undefined,
      generationRequest:
        sourceMode !== 'existing'
          ? {
              moduleId: genModuleId,
              lessonIds: genLessonIds,
              count: sourceMode === 'generate' ? cardCount : Math.floor(cardCount / 2), // For mixed mode, generate half
              difficulty: genDifficulty,
            }
          : undefined,
    }

    onComplete(config)
  }

  const canProceedExisting = selectedModuleIds.length > 0
  const canProceedGenerate = genModuleId && genLessonIds.length > 0
  const canProceed =
    sourceMode === 'existing'
      ? canProceedExisting
      : sourceMode === 'generate'
      ? canProceedGenerate
      : canProceedExisting && canProceedGenerate

  const showExistingFields = sourceMode === 'existing' || sourceMode === 'mixed'
  const showGenerateFields = sourceMode === 'generate' || sourceMode === 'mixed'

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">Step 2 of 2</p>
        <h2 className="text-xl font-semibold text-foreground">Configure Your Session</h2>
        <p className="text-sm text-muted-foreground">
          Choose your content source and customize settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session Settings</CardTitle>
          <CardDescription>
            Studying with <span className="font-medium text-foreground capitalize">{selectedMode}</span> mode
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Content Source Selection */}
          <div className="space-y-3">
            <Label>Content Source</Label>
            <RadioGroup value={sourceMode} onValueChange={(v) => setSourceMode(v as 'existing' | 'generate' | 'mixed')}>
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer">
                <RadioGroupItem value="existing" id="existing" />
                <div className="flex-1">
                  <Label htmlFor="existing" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span className="font-medium">Use Existing Cards</span>
                      <span className="text-xs text-muted-foreground">(Recommended)</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Study from our curated collection of rocket science flashcards
                    </p>
                  </Label>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer">
                <RadioGroupItem value="generate" id="generate" />
                <div className="flex-1">
                  <Label htmlFor="generate" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="font-medium">Generate New with AI</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create custom flashcards from specific lessons using Gemini AI
                    </p>
                  </Label>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer">
                <RadioGroupItem value="mixed" id="mixed" />
                <div className="flex-1">
                  <Label htmlFor="mixed" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-chart-2" />
                      <span className="font-medium">Mix Both</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Combine existing flashcards with AI-generated ones
                    </p>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Existing Cards Configuration */}
          {showExistingFields && (
            <div className="space-y-4 border-t pt-6">
              <h3 className="font-medium text-sm">Existing Cards</h3>

              {/* Module Selection */}
              <div className="space-y-3">
                <Label>Select Modules</Label>
                <div className="grid gap-2 max-h-60 overflow-y-auto">
                  {availableModules.map((module) => (
                    <div
                      key={module.id}
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/50 min-h-[44px] touch-manipulation"
                    >
                      <input
                        type="checkbox"
                        id={`module-${module.id}`}
                        checked={selectedModuleIds.includes(module.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedModuleIds([...selectedModuleIds, module.id])
                          } else {
                            setSelectedModuleIds(selectedModuleIds.filter((id) => id !== module.id))
                          }
                        }}
                        className="rounded border-gray-300 h-4 w-4"
                      />
                      <Label htmlFor={`module-${module.id}`} className="flex-1 cursor-pointer">
                        <span className="font-medium">{module.title}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({module.lessonCount} lessons)
                        </span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AI Generation Configuration */}
          {showGenerateFields && (
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-medium text-sm">AI Generation</h3>
              </div>

              {/* Module Selection (Single) */}
              <div className="space-y-3">
                <Label>Select Module</Label>
                <select
                  value={genModuleId}
                  onChange={(e) => {
                    setGenModuleId(e.target.value)
                    setGenLessonIds([]) // Reset lesson selection
                  }}
                  className="w-full p-2 border rounded-lg bg-background"
                >
                  <option value="">Choose a module...</option>
                  {availableModules.map((module) => (
                    <option key={module.id} value={module.id}>
                      {module.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lesson Selection */}
              {genModuleId && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Select Lessons</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const selectedMod = availableModules.find((m) => m.id === genModuleId)
                        setGenLessonIds(selectedMod?.lessons.map((l) => l.id) || [])
                      }}
                    >
                      Select All
                    </Button>
                  </div>
                  <div className="grid gap-2 max-h-48 overflow-y-auto">
                    {availableModules
                      .find((m) => m.id === genModuleId)
                      ?.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/50 min-h-[44px] touch-manipulation"
                        >
                          <input
                            type="checkbox"
                            id={`lesson-${lesson.id}`}
                            checked={genLessonIds.includes(lesson.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setGenLessonIds([...genLessonIds, lesson.id])
                              } else {
                                setGenLessonIds(genLessonIds.filter((id) => id !== lesson.id))
                              }
                            }}
                            className="rounded border-gray-300 h-4 w-4"
                          />
                          <Label htmlFor={`lesson-${lesson.id}`} className="cursor-pointer flex-1">
                            {lesson.title}
                          </Label>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Difficulty */}
              <div className="space-y-3">
                <Label>Difficulty Level</Label>
                <RadioGroup value={genDifficulty} onValueChange={(v) => setGenDifficulty(v as 'easy' | 'medium' | 'hard')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="easy" id="easy" />
                    <Label htmlFor="easy" className="cursor-pointer text-sm">
                      Easy - Basic definitions and concepts
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="medium" />
                    <Label htmlFor="medium" className="cursor-pointer text-sm">
                      Medium - Calculations and applications
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hard" id="hard" />
                    <Label htmlFor="hard" className="cursor-pointer text-sm">
                      Hard - Advanced synthesis and problem-solving
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Study Settings */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="font-medium text-sm">Study Settings</h3>

            {/* Card Count */}
            <div className="space-y-3">
              <Label>
                Number of Cards: {cardCount === -1 ? 'All' : cardCount}
                {sourceMode === 'mixed' && cardCount !== -1 && (
                  <span className="text-xs text-muted-foreground ml-2">
                    ({Math.floor(cardCount / 2)} existing + {Math.ceil(cardCount / 2)} AI-generated)
                  </span>
                )}
              </Label>
              <Slider
                value={[cardCount]}
                onValueChange={([value]) => setCardCount(value)}
                min={5}
                max={50}
                step={5}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCardCount(-1)}
                className="w-full"
              >
                Select All Available
              </Button>
            </div>

            {/* Exclude Known Toggle */}
            {showExistingFields && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="exclude-known">Exclude cards I&apos;ve marked as known</Label>
                  <p className="text-sm text-muted-foreground">
                    Filter out cards you already know well
                  </p>
                </div>
                <Switch
                  id="exclude-known"
                  checked={excludeKnown}
                  onCheckedChange={setExcludeKnown}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={onBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleComplete} disabled={!canProceed} size="lg">
              Start Practicing
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
