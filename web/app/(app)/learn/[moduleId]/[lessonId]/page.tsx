import { notFound } from 'next/navigation'
import { LessonViewer } from '@/components/features/lesson/LessonViewer'
import { createClient } from '@/lib/supabase/server'
import type { LessonData, LessonContent, QuizQuestion } from '@/types/course'
import type { DbContentBlock, DbQuizQuestion } from '@/types/admin'

// Convert database content block to LessonContent format
function convertContentBlock(block: DbContentBlock): LessonContent {
  const base: LessonContent = {
    type: block.type as LessonContent['type'],
    content: block.content,
  }

  if (block.items) {
    base.items = block.items
  }

  if (block.steps) {
    base.steps = block.steps
  }

  if (block.difficulty) {
    base.difficulty = block.difficulty
  }

  if (block.reveal_mode) {
    base.revealMode = block.reveal_mode
  }

  if (block.answer) {
    base.answer = block.answer
  }

  if (block.hints) {
    base.hints = block.hints
  }

  if (block.input_placeholder) {
    base.inputPlaceholder = block.input_placeholder
  }

  if (block.image_url) {
    base.imageUrl = block.image_url
  }

  if (block.image_alt) {
    base.imageAlt = block.image_alt
  }

  return base
}

// Convert database quiz question to QuizQuestion format
function convertQuizQuestion(q: DbQuizQuestion): QuizQuestion {
  return {
    id: q.id,
    questionText: q.question_text,
    type: 'multiple-choice', // Default for now
    options: q.options || [],
    correctAnswer: q.correct_answer,
    explanation: q.explanation || '',
    difficulty: q.difficulty || undefined,
  }
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ moduleId: string; lessonId: string }>
}) {
  const { moduleId, lessonId } = await params
  const supabase = await createClient()

  // OPTIMIZED: Single query with joins to fetch module, lesson, content blocks, and quiz questions
  // This replaces 4 separate queries with 1 query using Supabase's nested select
  const { data: lessonWithContent } = await supabase
    .from('lessons')
    .select(`
      *,
      modules!inner (
        id,
        slug,
        title,
        description,
        icon,
        order_index,
        status
      ),
      content_blocks (
        id,
        type,
        content,
        items,
        steps,
        difficulty,
        reveal_mode,
        answer,
        hints,
        input_placeholder,
        video_composition_id,
        image_url,
        image_alt,
        order_index
      ),
      quiz_questions (
        id,
        question_text,
        question_type,
        options,
        correct_answer,
        explanation,
        hint,
        difficulty,
        topic_tags,
        is_auto_graded,
        order_index
      )
    `)
    .eq('slug', lessonId)
    .eq('status', 'published')
    .eq('modules.slug', moduleId)
    .eq('modules.status', 'published')
    .single()

  if (!lessonWithContent) notFound()

  // Extract the nested data
  const mod = lessonWithContent.modules as {
    id: string
    slug: string
    title: string
    description: string | null
    icon: string | null
    order_index: number
    status: string
  }
  const lesson = lessonWithContent
  const contentBlocks = (lessonWithContent.content_blocks as DbContentBlock[] || [])
    .sort((a, b) => a.order_index - b.order_index)
  const quizQuestions = (lessonWithContent.quiz_questions as DbQuizQuestion[] || [])
    .sort((a, b) => a.order_index - b.order_index)

  // Convert to LessonData format
  const lessonData: LessonData = {
    content: contentBlocks.map(convertContentBlock),
    quiz: quizQuestions.length > 0
      ? quizQuestions.map(convertQuizQuestion)
      : undefined,
  }

  // OPTIMIZED: Run user auth, progress check, and navigation queries in parallel
  // This replaces sequential queries with Promise.all for better performance
  const [
    { data: { user } },
    { data: moduleLessons },
    { data: allModulesWithLessons }
  ] = await Promise.all([
    // Get current user
    supabase.auth.getUser(),

    // Fetch all lessons in this module for navigation
    supabase
      .from('lessons')
      .select('id, slug, order_index')
      .eq('module_id', mod.id)
      .eq('status', 'published')
      .order('order_index', { ascending: true }),

    // OPTIMIZED: Fetch all modules with their first/last lessons in one query
    // This avoids conditional queries for cross-module navigation
    supabase
      .from('modules')
      .select(`
        id,
        slug,
        order_index,
        lessons!inner (
          slug,
          order_index
        )
      `)
      .eq('status', 'published')
      .eq('lessons.status', 'published')
      .order('order_index', { ascending: true })
  ])

  // Check user progress (only if logged in) - separate query as it's conditional
  let isCompleted = false
  if (user) {
    const { data } = await supabase
      .from('user_lesson_progress')
      .select('completed')
      .eq('user_id', user.id)
      .eq('lesson_id', lesson.id)
      .single()

    isCompleted = data?.completed ?? false
  }

  // Compute prev/next navigation
  const lessons = moduleLessons || []
  const modules = (allModulesWithLessons || []).map(m => ({
    ...m,
    lessons: ((m.lessons as { slug: string; order_index: number }[]) || [])
      .sort((a, b) => a.order_index - b.order_index)
  }))
  const lessonIndex = lessons.findIndex(l => l.id === lesson.id)
  const moduleIndex = modules.findIndex(m => m.id === mod.id)

  let prevLesson: { moduleSlug: string; lessonSlug: string } | null = null
  let nextLesson: { moduleSlug: string; lessonSlug: string } | null = null

  // Previous lesson - no additional queries needed, data is already fetched
  if (lessonIndex > 0) {
    prevLesson = { moduleSlug: mod.slug, lessonSlug: lessons[lessonIndex - 1].slug }
  } else if (moduleIndex > 0) {
    const prevModule = modules[moduleIndex - 1]
    const lastLesson = prevModule.lessons[prevModule.lessons.length - 1]
    if (lastLesson) {
      prevLesson = { moduleSlug: prevModule.slug, lessonSlug: lastLesson.slug }
    }
  }

  // Next lesson - no additional queries needed, data is already fetched
  if (lessonIndex < lessons.length - 1) {
    nextLesson = { moduleSlug: mod.slug, lessonSlug: lessons[lessonIndex + 1].slug }
  } else if (moduleIndex < modules.length - 1) {
    const nextModule = modules[moduleIndex + 1]
    const firstLesson = nextModule.lessons[0]
    if (firstLesson) {
      nextLesson = { moduleSlug: nextModule.slug, lessonSlug: firstLesson.slug }
    }
  }

  return (
    <LessonViewer
      moduleSlug={mod.slug}
      moduleTitle={mod.title}
      lessonId={lesson.id}
      lessonSlug={lesson.slug}
      lessonTitle={lesson.title}
      lessonData={lessonData}
      isLoggedIn={!!user}
      isCompleted={isCompleted}
      prevLesson={prevLesson}
      nextLesson={nextLesson}
    />
  )
}
