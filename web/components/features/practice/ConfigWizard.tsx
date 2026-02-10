'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Sparkles, BookOpen, Zap } from 'lucide-react'
import type { FlashcardSourceConfig, StudyMode } from '@/types/flashcards'

interface ConfigWizardProps {
  onComplete: (config: FlashcardSourceConfig, mode: StudyMode) => void
  onBack?: () => void
  availableModules: Array<{
    id: string
    title: string
    lessonCount: number
    lessons: Array<{ id: string; title: string }>
  }>
}

type WizardStep = 'source' | 'existing-config' | 'generate-config' | 'mode'

export function ConfigWizard({ onComplete, onBack, availableModules }: ConfigWizardProps) {
  const [step, setStep] = useState<WizardStep>('source')
  const [sourceMode, setSourceMode] = useState<'existing' | 'generate' | 'mixed'>('existing')

  // Existing cards config
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([])
  const [cardCount, setCardCount] = useState<number>(20)
  const [excludeKnown, setExcludeKnown] = useState(true)

  // AI generation config
  const [genModuleId, setGenModuleId] = useState('')
  const [genLessonIds, setGenLessonIds] = useState<string[]>([])
  const [genCount, setGenCount] = useState(10)
  const [genDifficulty, setGenDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')

  // Study mode
  const [studyMode, setStudyMode] = useState<StudyMode>('learn')

  const handleSourceNext = () => {
    if (sourceMode === 'existing') {
      setStep('existing-config')
    } else if (sourceMode === 'generate') {
      setStep('generate-config')
    } else {
      // Mixed mode - show existing config first
      setStep('existing-config')
    }
  }

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
              count: genCount,
              difficulty: genDifficulty,
            }
          : undefined,
    }

    onComplete(config, studyMode)
  }

  const canProceedExisting = selectedModuleIds.length > 0
  const canProceedGenerate = genModuleId && genLessonIds.length > 0 && genCount > 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Step 1: Source Selection */}
      {step === 'source' && (
        <Card>
          <CardHeader>
            <CardTitle>Choose Flashcard Source</CardTitle>
            <CardDescription>Select how you want to create your study session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup value={sourceMode} onValueChange={(v) => setSourceMode(v as 'existing' | 'generate' | 'mixed')}>
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer">
                <RadioGroupItem value="existing" id="existing" />
                <div className="flex-1">
                  <Label htmlFor="existing" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span className="font-medium">Use Existing Flashcards</span>
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

            <div className="flex justify-between pt-4">
              {onBack && (
                <Button variant="outline" onClick={onBack}>
                  Back
                </Button>
              )}
              <Button onClick={handleSourceNext} className="ml-auto">
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2a: Existing Cards Config */}
      {step === 'existing-config' && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Study Session</CardTitle>
            <CardDescription>Select modules and customize your flashcard selection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Module Selection */}
            <div className="space-y-3">
              <Label>Select Modules</Label>
              <div className="grid gap-2">
                {availableModules.map((module) => (
                  <div
                    key={module.id}
                    className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50"
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
                      className="rounded border-gray-300"
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

            {/* Card Count */}
            <div className="space-y-3">
              <Label>Number of Cards: {cardCount === -1 ? 'All' : cardCount}</Label>
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

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep('source')}>
                Back
              </Button>
              <Button
                onClick={() => {
                  if (sourceMode === 'mixed') {
                    setStep('generate-config')
                  } else {
                    setStep('mode')
                  }
                }}
                disabled={!canProceedExisting}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2b: AI Generation Config */}
      {step === 'generate-config' && (
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Generate AI Flashcards
              </div>
            </CardTitle>
            <CardDescription>Customize your AI-generated flashcard set</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Module Selection (Single) */}
            <div className="space-y-3">
              <Label>Select Module</Label>
              <select
                value={genModuleId}
                onChange={(e) => {
                  setGenModuleId(e.target.value)
                  setGenLessonIds([]) // Reset lesson selection
                }}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Choose a module...</option>
                {availableModules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Lesson Selection (if module selected) */}
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
                        className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-accent/50"
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
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={`lesson-${lesson.id}`} className="cursor-pointer flex-1">
                          {lesson.title}
                        </Label>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Question Count */}
            <div className="space-y-3">
              <Label>Number of Questions: {genCount}</Label>
              <Slider
                value={[genCount]}
                onValueChange={([value]) => setGenCount(value)}
                min={5}
                max={30}
                step={5}
              />
            </div>

            {/* Difficulty */}
            <div className="space-y-3">
              <Label>Difficulty Level</Label>
              <RadioGroup value={genDifficulty} onValueChange={(v) => setGenDifficulty(v as 'easy' | 'medium' | 'hard')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="easy" id="easy" />
                  <Label htmlFor="easy" className="cursor-pointer">
                    Easy - Basic definitions and concepts
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="medium" />
                  <Label htmlFor="medium" className="cursor-pointer">
                    Medium - Calculations and applications
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hard" id="hard" />
                  <Label htmlFor="hard" className="cursor-pointer">
                    Hard - Advanced synthesis and problem-solving
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (sourceMode === 'mixed') {
                    setStep('existing-config')
                  } else {
                    setStep('source')
                  }
                }}
              >
                Back
              </Button>
              <Button onClick={() => setStep('mode')} disabled={!canProceedGenerate}>
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Study Mode Selection */}
      {step === 'mode' && (
        <Card>
          <CardHeader>
            <CardTitle>Choose Study Mode</CardTitle>
            <CardDescription>Select how you want to study these flashcards</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup value={studyMode} onValueChange={(v) => setStudyMode(v as StudyMode)}>
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer">
                <RadioGroupItem value="learn" id="learn" />
                <div className="flex-1">
                  <Label htmlFor="learn" className="cursor-pointer">
                    <span className="font-medium">Learn Mode</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      Flip cards at your own pace with spaced repetition
                    </p>
                  </Label>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer">
                <RadioGroupItem value="match" id="match" />
                <div className="flex-1">
                  <Label htmlFor="match" className="cursor-pointer">
                    <span className="font-medium">Match Mode</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      Match questions with answers as fast as possible
                    </p>
                  </Label>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer">
                <RadioGroupItem value="test" id="test" />
                <div className="flex-1">
                  <Label htmlFor="test" className="cursor-pointer">
                    <span className="font-medium">Test Mode</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      Multiple choice quiz with instant feedback
                    </p>
                  </Label>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer">
                <RadioGroupItem value="write" id="write" />
                <div className="flex-1">
                  <Label htmlFor="write" className="cursor-pointer">
                    <span className="font-medium">Write Mode</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      Type your answers and get AI-powered grading
                    </p>
                  </Label>
                </div>
              </div>
            </RadioGroup>

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (sourceMode === 'existing') {
                    setStep('existing-config')
                  } else {
                    setStep('generate-config')
                  }
                }}
              >
                Back
              </Button>
              <Button onClick={handleComplete}>
                <Sparkles className="mr-2 h-4 w-4" />
                Start Studying
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
