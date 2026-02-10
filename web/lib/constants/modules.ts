import { Module } from '@/types/course'

// Modules are now fetched from the database
// This file is kept for backward compatibility during migration
export const COURSE_MODULES: Module[] = []

export function getModule(moduleId: string): Module | undefined {
  return COURSE_MODULES.find(m => m.id === moduleId)
}

export function getLesson(moduleId: string, lessonId: string) {
  const mod = getModule(moduleId)
  if (!mod) return undefined
  return mod.lessons.find(l => l.id === lessonId)
}

export function getNextLesson(moduleId: string, lessonId: string): { moduleId: string; lessonId: string } | null {
  const mod = getModule(moduleId)
  if (!mod) return null

  const lessonIndex = mod.lessons.findIndex(l => l.id === lessonId)
  if (lessonIndex < mod.lessons.length - 1) {
    return { moduleId, lessonId: mod.lessons[lessonIndex + 1].id }
  }

  // Move to next module
  const moduleIndex = COURSE_MODULES.findIndex(m => m.id === moduleId)
  if (moduleIndex < COURSE_MODULES.length - 1) {
    const nextModule = COURSE_MODULES[moduleIndex + 1]
    return { moduleId: nextModule.id, lessonId: nextModule.lessons[0].id }
  }

  return null
}

export function getPrevLesson(moduleId: string, lessonId: string): { moduleId: string; lessonId: string } | null {
  const mod = getModule(moduleId)
  if (!mod) return null

  const lessonIndex = mod.lessons.findIndex(l => l.id === lessonId)
  if (lessonIndex > 0) {
    return { moduleId, lessonId: mod.lessons[lessonIndex - 1].id }
  }

  // Move to previous module
  const moduleIndex = COURSE_MODULES.findIndex(m => m.id === moduleId)
  if (moduleIndex > 0) {
    const prevModule = COURSE_MODULES[moduleIndex - 1]
    return { moduleId: prevModule.id, lessonId: prevModule.lessons[prevModule.lessons.length - 1].id }
  }

  return null
}
