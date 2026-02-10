'use client'

import { useState, useRef, useCallback } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle, MessageCircle } from 'lucide-react'
import { NavLink } from '@/components/ui/nav-link'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { LessonData } from '@/types/course'
import { ContentBlock } from './ContentBlock'
import { QuizSection } from './QuizSection'
import { AskAIPanel } from './AskAIPanel'
import { ExplainButton } from './ExplainButton'
import { ExplainTooltip } from './ExplainTooltip'
import { useAchievements } from '@/components/providers/AchievementProvider'
import { useTextSelection } from '@/hooks/useTextSelection'
import { useActionGuard } from '@/hooks/useActionGuard'
import type { ExplainContext } from '@/types/chat'

interface LessonViewerProps {
  moduleSlug: string
  moduleTitle: string
  lessonId: string
  lessonSlug: string
  lessonTitle: string
  lessonData: LessonData
  isLoggedIn: boolean
  isCompleted: boolean
  prevLesson: { moduleSlug: string; lessonSlug: string } | null
  nextLesson: { moduleSlug: string; lessonSlug: string } | null
}

export function LessonViewer({
  moduleSlug,
  moduleTitle,
  lessonId,
  lessonSlug,
  lessonTitle,
  lessonData,
  isLoggedIn,
  isCompleted: initialCompleted,
  prevLesson,
  nextLesson,
}: LessonViewerProps) {
  const [isCompleted, setIsCompleted] = useState(initialCompleted)
  const [showAI, setShowAI] = useState(false)
  const [completing, setCompleting] = useState(false)
  const { checkAchievements } = useAchievements()

  // Highlight-to-explain state
  const contentRef = useRef<HTMLDivElement>(null)
  const textSelection = useTextSelection(contentRef)
  const [explainState, setExplainState] = useState<{
    text: string
    position: { x: number; y: number }
    explanation: string | null
    isLoading: boolean
    isStreaming: boolean
    isVisible: boolean
  } | null>(null)

  // Context to pass to AI panel when "Ask follow-up" is clicked
  const [aiPanelContext, setAiPanelContext] = useState<ExplainContext | undefined>(undefined)

  // Handle explain button click with streaming
  const handleExplainClickInner = useCallback(async () => {
    if (!textSelection || !isLoggedIn) return

    const position = {
      x: textSelection.rect.left + textSelection.rect.width / 2,
      y: textSelection.rect.bottom,
    }

    setExplainState({
      text: textSelection.text,
      position,
      explanation: null,
      isLoading: true,
      isStreaming: true,
      isVisible: true,
    })

    // Clear the selection
    window.getSelection()?.removeAllRanges()

    try {
      // Build lesson context from content blocks
      const lessonContext = lessonData.content
        .filter(b => b.type === 'text' || b.type === 'heading')
        .map(b => b.content)
        .join('\n\n')
        .slice(0, 2000)

      const res = await fetch('/api/gemini/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textSelection.text,
          lessonContext,
          lessonTitle,
          stream: true,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to get explanation')
      }

      if (!res.body) {
        throw new Error('No response body')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullExplanation = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.chunk) {
                fullExplanation += parsed.chunk
                setExplainState(prev => prev ? {
                  ...prev,
                  explanation: fullExplanation,
                  isLoading: false,
                } : null)
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      // Mark streaming as complete
      setExplainState(prev => prev ? {
        ...prev,
        isStreaming: false,
      } : null)
    } catch {
      toast.error('Failed to generate explanation')
      setExplainState(null)
    }
  }, [textSelection, isLoggedIn, lessonData.content, lessonTitle])

  const handleExplainClick = useActionGuard(handleExplainClickInner)

  const handleCloseExplain = useCallback(() => {
    setExplainState(null)
  }, [])

  const handleAskFollowUp = useCallback((context: ExplainContext) => {
    setAiPanelContext(context)
    setShowAI(true)
    setExplainState(null)
  }, [])

  const handleCompleteInner = useCallback(async (quizScore?: number, quizTotal?: number) => {
    if (!isLoggedIn) {
      toast.info('Sign in to track your progress')
      return
    }

    setCompleting(true)
    try {
      const res = await fetch('/api/lessons/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          moduleId: moduleSlug,
          completed: true,
          quizScore,
          quizTotal,
        }),
      })

      if (res.ok) {
        setIsCompleted(true)
        toast.success('Lesson completed!')
        checkAchievements()
      } else {
        toast.error('Failed to save progress')
      }
    } catch {
      toast.error('Failed to save progress')
    } finally {
      setCompleting(false)
    }
  }, [isLoggedIn, lessonId, moduleSlug, checkAchievements])

  const handleComplete = useActionGuard(handleCompleteInner)

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <NavLink href="/learn" className="hover:text-foreground transition-colors">Modules</NavLink>
          <span>/</span>
          <NavLink href={`/learn/${moduleSlug}`} className="hover:text-foreground transition-colors">{moduleTitle}</NavLink>
          <span>/</span>
          <span className="text-foreground">{lessonTitle}</span>
        </div>

        {/* Lesson Title */}
        <div className="animate-fade-in-up" suppressHydrationWarning>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {lessonTitle}
          </h1>
          {isCompleted && (
            <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              Completed
            </div>
          )}
        </div>

        {/* Lesson Content */}
        <div
          ref={contentRef}
          className="space-y-4 animate-fade-in-up [animation-delay:0.1s]"
          suppressHydrationWarning
        >
          {lessonData.content.map((block, i) => (
            // Use stable key based on block content hash to prevent unnecessary re-renders
            <ContentBlock
              key={`${block.type}-${i}-${block.content?.slice(0, 30) || ''}`}
              block={block}
            />
          ))}
        </div>

        {/* Highlight-to-Explain Button */}
        {isLoggedIn && textSelection && !explainState && (
          <ExplainButton
            position={{
              x: textSelection.rect.left + textSelection.rect.width / 2,
              y: textSelection.rect.top,
            }}
            onClick={handleExplainClick}
            visible={true}
          />
        )}

        {/* Explain Tooltip */}
        {explainState?.isVisible && (
          <ExplainTooltip
            selectedText={explainState.text}
            explanation={explainState.explanation}
            isLoading={explainState.isLoading}
            isStreaming={explainState.isStreaming}
            position={explainState.position}
            onClose={handleCloseExplain}
            onAskFollowUp={handleAskFollowUp}
          />
        )}

        {/* Quiz Section */}
        {lessonData.quiz && lessonData.quiz.length > 0 && (
          <QuizSection
            questions={lessonData.quiz}
            onComplete={handleComplete}
            isLoggedIn={isLoggedIn}
          />
        )}

        {/* Complete Lesson Button (for non-quiz lessons) */}
        {!lessonData.quiz && !isCompleted && (
          <div className="pt-4">
            <Button
              onClick={() => handleComplete()}
              disabled={completing}
              className="w-full shadow-lg shadow-primary/20"
              size="lg"
            >
              {completing ? 'Saving...' : 'Mark Lesson Complete'}
              <CheckCircle className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-border/50">
          {prevLesson ? (
            <NavLink href={`/learn/${prevLesson.moduleSlug}/${prevLesson.lessonSlug}`} showSpinner>
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
            </NavLink>
          ) : (
            <NavLink href={`/learn/${moduleSlug}`} showSpinner>
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                Module
              </Button>
            </NavLink>
          )}

          {nextLesson ? (
            <NavLink href={`/learn/${nextLesson.moduleSlug}/${nextLesson.lessonSlug}`} showSpinner>
              <Button variant="outline" size="sm" className="gap-1">
                Next Lesson
                <ArrowRight className="h-4 w-4" />
              </Button>
            </NavLink>
          ) : (
            <NavLink href="/learn" showSpinner>
              <Button variant="outline" size="sm" className="gap-1">
                All Modules
                <ArrowRight className="h-4 w-4" />
              </Button>
            </NavLink>
          )}
        </div>
      </main>

      {/* Ask AI Button */}
      {isLoggedIn && (
        <button
          onClick={() => {
            if (!showAI) {
              setAiPanelContext(undefined) // Clear context when opening directly
            }
            setShowAI(!showAI)
          }}
          className="fixed bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all hover:scale-105"
          title="Ask AI a question"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}

      {/* AI Panel */}
      {showAI && (
        <AskAIPanel
          lessonId={lessonId}
          lessonTitle={lessonTitle}
          moduleTitle={moduleTitle}
          moduleId={moduleSlug}
          onClose={() => {
            setShowAI(false)
            setAiPanelContext(undefined)
          }}
          initialContext={aiPanelContext}
        />
      )}

    </div>
  )
}
