export interface Module {
  id: string
  order: number
  title: string
  description: string
  icon: string
  lessons: LessonMeta[]
}

export interface LessonMeta {
  id: string
  order: number
  title: string
  estimatedMinutes: number
  videoCompositionId?: string
  isQuiz?: boolean
}

export interface LessonContent {
  type: 'text' | 'heading' | 'subheading' | 'equation' | 'video' | 'callout' | 'list' | 'image' | 'diagram' | 'worked-example' | 'practice-problem'
  content: string
  items?: string[]
  // For worked-example
  steps?: WorkedExampleStep[]
  // For practice-problem
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  revealMode?: 'click' | 'input' | 'hints'
  answer?: string
  hints?: string[]
  inputPlaceholder?: string
  // For image/diagram
  imageUrl?: string
  imageAlt?: string
}

export interface WorkedExampleStep {
  instruction: string
  hint?: string
  answer: string
}

export interface QuizQuestion {
  id: string
  questionText: string
  type: 'multiple-choice'
  options: string[]
  correctAnswer: string
  explanation: string
  difficulty?: 'recall' | 'understanding' | 'calculation' | 'analysis'
}

export interface LessonData {
  content: LessonContent[]
  quiz?: QuizQuestion[]
}

export interface UserLessonProgress {
  lessonId: string
  moduleId: string
  completed: boolean
  completedAt?: string
  quizScore?: number
  quizTotal?: number
}

export interface CourseProgress {
  lessonsCompleted: number
  modulesWithProgress: number
  totalQuizScore: number
  totalQuizQuestions: number
}
