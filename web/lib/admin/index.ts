// Admin data fetching utilities
import { createClient } from '@/lib/supabase/server'
import type {
  DbModule,
  DbLesson,
  DbContentBlock,
  DbQuizQuestion,
  DbVideoComposition,
  DbContentVersion,
  ModuleWithLessons,
  LessonWithContent,
  CourseStructure,
} from '@/types/admin'

// Check if user is admin
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  return profile?.is_admin === true
}

// Get current admin user
export async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return null

  return { user, profile }
}

// ============================================================================
// MODULES
// ============================================================================

export async function getModules(): Promise<DbModule[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .order('order_index', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getModule(id: string): Promise<DbModule | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function getModuleBySlug(slug: string): Promise<DbModule | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) return null
  return data
}

export async function getModuleWithLessons(id: string): Promise<ModuleWithLessons | null> {
  const supabase = await createClient()

  // Parallel queries instead of sequential
  const [moduleResult, lessonsResult] = await Promise.all([
    supabase.from('modules').select('*').eq('id', id).single(),
    supabase.from('lessons').select('*').eq('module_id', id).order('order_index', { ascending: true }),
  ])

  if (moduleResult.error || !moduleResult.data) return null

  return { ...moduleResult.data, lessons: lessonsResult.data || [] }
}

// ============================================================================
// LESSONS
// ============================================================================

export async function getLessons(moduleId: string): Promise<DbLesson[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('module_id', moduleId)
    .order('order_index', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getLesson(id: string): Promise<DbLesson | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function getLessonWithContent(id: string): Promise<LessonWithContent | null> {
  const supabase = await createClient()

  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', id)
    .single()

  if (lessonError || !lesson) return null

  const [contentResult, quizResult] = await Promise.all([
    supabase
      .from('content_blocks')
      .select('*')
      .eq('lesson_id', id)
      .order('order_index', { ascending: true }),
    supabase
      .from('quiz_questions')
      .select('*')
      .eq('lesson_id', id)
      .order('order_index', { ascending: true }),
  ])

  return {
    ...lesson,
    content_blocks: contentResult.data || [],
    quiz_questions: quizResult.data || [],
  }
}

// ============================================================================
// CONTENT BLOCKS
// ============================================================================

export async function getContentBlocks(lessonId: string): Promise<DbContentBlock[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('content_blocks')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('order_index', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getContentBlock(id: string): Promise<DbContentBlock | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('content_blocks')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

// ============================================================================
// QUIZ QUESTIONS
// ============================================================================

export async function getQuizQuestions(lessonId: string): Promise<DbQuizQuestion[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('order_index', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getQuizQuestion(id: string): Promise<DbQuizQuestion | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

// ============================================================================
// VIDEO COMPOSITIONS
// ============================================================================

export async function getVideoCompositions(): Promise<DbVideoComposition[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('video_compositions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export interface VideoWithUsage extends DbVideoComposition {
  usedIn: Array<{
    lessonId: string
    lessonTitle: string
    moduleId: string
    moduleTitle: string
  }>
}

export async function getVideoCompositionsWithUsage(): Promise<VideoWithUsage[]> {
  const supabase = await createClient()

  // Optimized: Use parallel queries instead of sequential
  // Also use nested selects to get lesson and module data in fewer queries
  const [videosResult, contentBlocksResult] = await Promise.all([
    // Get all videos
    supabase
      .from('video_compositions')
      .select('*')
      .order('created_at', { ascending: false }),
    // Get content blocks with nested lesson and module data in one query
    supabase
      .from('content_blocks')
      .select(`
        video_composition_id,
        lesson_id,
        lessons!inner (
          id,
          title,
          module_id,
          modules!inner (
            id,
            title
          )
        )
      `)
      .eq('type', 'video')
      .not('video_composition_id', 'is', null),
  ])

  if (videosResult.error) throw videosResult.error

  const videos = videosResult.data || []
  const contentBlocks = contentBlocksResult.data || []

  // Build usage map from the joined data
  const usageMap = new Map<string, VideoWithUsage['usedIn']>()
  for (const block of contentBlocks) {
    if (block.video_composition_id && block.lessons) {
      const lesson = block.lessons as unknown as {
        id: string
        title: string
        module_id: string
        modules: { id: string; title: string }
      }

      const usedIn = usageMap.get(block.video_composition_id) || []
      // Avoid duplicates
      if (!usedIn.some(u => u.lessonId === lesson.id)) {
        usedIn.push({
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          moduleId: lesson.module_id,
          moduleTitle: lesson.modules?.title || 'Unknown Module',
        })
      }
      usageMap.set(block.video_composition_id, usedIn)
    }
  }

  // Combine videos with usage
  return videos.map(video => ({
    ...video,
    usedIn: usageMap.get(video.id) || [],
  }))
}

export async function getVideoComposition(id: string): Promise<DbVideoComposition | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('video_compositions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

// ============================================================================
// CONTENT VERSIONS
// ============================================================================

export async function getContentVersions(
  entityType: string,
  entityId: string
): Promise<DbContentVersion[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('content_versions')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('version_number', { ascending: false })

  if (error) throw error
  return data || []
}

// ============================================================================
// COURSE STRUCTURE
// ============================================================================

export async function getCourseStructure(includeDrafts = false): Promise<CourseStructure[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_course_structure', {
    p_include_drafts: includeDrafts,
  })

  if (error) throw error
  return data || []
}

// ============================================================================
// STATS
// ============================================================================

export async function getAdminStats() {
  const supabase = await createClient()

  // Use COUNT() aggregates instead of fetching all records
  // This is much more efficient for large datasets
  const [
    modulesTotalResult,
    modulesPublishedResult,
    modulesDraftResult,
    lessonsTotalResult,
    lessonsPublishedResult,
    lessonsDraftResult,
    videosTotalResult,
    videosPublishedResult,
    videosDraftResult,
    usersTotalResult,
  ] = await Promise.all([
    // Module counts
    supabase.from('modules').select('*', { count: 'exact', head: true }),
    supabase.from('modules').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('modules').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    // Lesson counts
    supabase.from('lessons').select('*', { count: 'exact', head: true }),
    supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    // Video counts
    supabase.from('video_compositions').select('*', { count: 'exact', head: true }),
    supabase.from('video_compositions').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('video_compositions').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    // User count
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  return {
    modules: {
      total: modulesTotalResult.count ?? 0,
      published: modulesPublishedResult.count ?? 0,
      draft: modulesDraftResult.count ?? 0,
    },
    lessons: {
      total: lessonsTotalResult.count ?? 0,
      published: lessonsPublishedResult.count ?? 0,
      draft: lessonsDraftResult.count ?? 0,
    },
    videos: {
      total: videosTotalResult.count ?? 0,
      published: videosPublishedResult.count ?? 0,
      draft: videosDraftResult.count ?? 0,
    },
    users: {
      total: usersTotalResult.count ?? 0,
    },
  }
}
