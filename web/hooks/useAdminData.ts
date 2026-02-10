import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type {
  DbModule,
  DbLesson,
  DbContentBlock,
  DbQuizQuestion,
  ModuleWithLessons,
  LessonWithContent,
} from '@/types/admin'

const supabase = createClient()

// Query keys for cache management
export const adminKeys = {
  all: ['admin'] as const,
  modules: () => [...adminKeys.all, 'modules'] as const,
  module: (id: string) => [...adminKeys.modules(), id] as const,
  moduleWithLessons: (id: string) => [...adminKeys.modules(), id, 'lessons'] as const,
  lessons: (moduleId: string) => [...adminKeys.all, 'lessons', moduleId] as const,
  lesson: (id: string) => [...adminKeys.all, 'lesson', id] as const,
  lessonWithContent: (id: string) => [...adminKeys.all, 'lesson', id, 'content'] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
}

// Fetch all modules
export function useModules() {
  return useQuery({
    queryKey: adminKeys.modules(),
    queryFn: async (): Promise<DbModule[]> => {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .order('order_index', { ascending: true })

      if (error) throw error
      return data || []
    },
  })
}

// Fetch single module
export function useModule(id: string) {
  return useQuery({
    queryKey: adminKeys.module(id),
    queryFn: async (): Promise<DbModule | null> => {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('id', id)
        .single()

      if (error) return null
      return data
    },
    enabled: !!id,
  })
}

// Fetch module with lessons (parallel queries)
export function useModuleWithLessons(id: string) {
  return useQuery({
    queryKey: adminKeys.moduleWithLessons(id),
    queryFn: async (): Promise<ModuleWithLessons | null> => {
      const [moduleResult, lessonsResult] = await Promise.all([
        supabase.from('modules').select('*').eq('id', id).single(),
        supabase.from('lessons').select('*').eq('module_id', id).order('order_index', { ascending: true }),
      ])

      if (moduleResult.error || !moduleResult.data) return null

      return { ...moduleResult.data, lessons: lessonsResult.data || [] }
    },
    enabled: !!id,
  })
}

// Fetch lesson with content
export function useLessonWithContent(id: string) {
  return useQuery({
    queryKey: adminKeys.lessonWithContent(id),
    queryFn: async (): Promise<LessonWithContent | null> => {
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
    },
    enabled: !!id,
  })
}

// Fetch admin stats using COUNT aggregation (avoids fetching all records)
export function useAdminStats() {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: async () => {
      const [
        modulesTotal, modulesPublished, modulesDraft,
        lessonsTotal, lessonsPublished, lessonsDraft,
        videosTotal, videosPublished, videosDraft,
        usersTotal,
      ] = await Promise.all([
        supabase.from('modules').select('*', { count: 'exact', head: true }),
        supabase.from('modules').select('*', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('modules').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('lessons').select('*', { count: 'exact', head: true }),
        supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('video_compositions').select('*', { count: 'exact', head: true }),
        supabase.from('video_compositions').select('*', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('video_compositions').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
      ])

      return {
        modules: {
          total: modulesTotal.count ?? 0,
          published: modulesPublished.count ?? 0,
          draft: modulesDraft.count ?? 0,
        },
        lessons: {
          total: lessonsTotal.count ?? 0,
          published: lessonsPublished.count ?? 0,
          draft: lessonsDraft.count ?? 0,
        },
        videos: {
          total: videosTotal.count ?? 0,
          published: videosPublished.count ?? 0,
          draft: videosDraft.count ?? 0,
        },
        users: {
          total: usersTotal.count ?? 0,
        },
      }
    },
    staleTime: 60 * 1000,
  })
}

// Mutation to reorder modules
export function useReorderModules() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (items: { id: string; order_index: number }[]) => {
      // Update all items in parallel
      const updates = items.map(item =>
        supabase.from('modules').update({ order_index: item.order_index }).eq('id', item.id)
      )

      const results = await Promise.all(updates)
      const error = results.find(r => r.error)?.error
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.modules() })
    },
  })
}

// Mutation to reorder lessons
export function useReorderLessons(moduleId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (items: { id: string; order_index: number }[]) => {
      const updates = items.map(item =>
        supabase.from('lessons').update({ order_index: item.order_index }).eq('id', item.id)
      )

      const results = await Promise.all(updates)
      const error = results.find(r => r.error)?.error
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.moduleWithLessons(moduleId) })
      queryClient.invalidateQueries({ queryKey: adminKeys.lessons(moduleId) })
    },
  })
}

// Mutation to reorder content blocks
export function useReorderContentBlocks(lessonId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (items: { id: string; order_index: number }[]) => {
      const updates = items.map(item =>
        supabase.from('content_blocks').update({ order_index: item.order_index }).eq('id', item.id)
      )

      const results = await Promise.all(updates)
      const error = results.find(r => r.error)?.error
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.lessonWithContent(lessonId) })
    },
  })
}

// Mutation to reorder quiz questions
export function useReorderQuizQuestions(lessonId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (items: { id: string; order_index: number }[]) => {
      const updates = items.map(item =>
        supabase.from('quiz_questions').update({ order_index: item.order_index }).eq('id', item.id)
      )

      const results = await Promise.all(updates)
      const error = results.find(r => r.error)?.error
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.lessonWithContent(lessonId) })
    },
  })
}

// Mutation to update content block (optimistic update for instant UI)
export function useUpdateContentBlock(lessonId: string) {
  const queryClient = useQueryClient()
  const queryKey = adminKeys.lessonWithContent(lessonId)

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DbContentBlock> }) => {
      const { error } = await supabase.from('content_blocks').update(updates).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, updates }) => {
      // Cancel in-flight fetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey })

      const previous = queryClient.getQueryData<LessonWithContent>(queryKey)

      if (previous) {
        queryClient.setQueryData<LessonWithContent>(queryKey, {
          ...previous,
          content_blocks: previous.content_blocks.map(block =>
            block.id === id ? { ...block, ...updates } : block
          ),
        })
      }

      return { previous }
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency with server
      queryClient.invalidateQueries({ queryKey })
    },
  })
}

// Mutation to add content block
export function useAddContentBlock(lessonId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (block: Omit<DbContentBlock, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('content_blocks')
        .insert(block)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.lessonWithContent(lessonId) })
    },
  })
}

// Mutation to delete content block
export function useDeleteContentBlock(lessonId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('content_blocks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.lessonWithContent(lessonId) })
    },
  })
}
