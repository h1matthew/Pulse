export const revalidate = 3600 // Revalidate every hour

import { createClient } from '@/lib/supabase/server'
import { AboutContent } from '@/components/features/about/AboutContent'
import type { Founder } from '@/components/features/about/FounderCard'

const FALLBACK_FOUNDERS: Founder[] = [
  {
    id: 'matthew',
    name: 'Matthew Heng',
    role: 'Co-founder',
    bio: '',
    image_url: null,
    image_offset_x: 50,
    image_offset_y: 50,
    image_zoom: 1,
    display_order: 0,
  },
  {
    id: 'felix',
    name: 'Felix Yin',
    role: 'Co-founder',
    bio: '',
    image_url: null,
    image_offset_x: 50,
    image_offset_y: 50,
    image_zoom: 1,
    display_order: 1,
  },
  {
    id: 'brady',
    name: 'Brady Chen',
    role: 'Co-founder',
    bio: '',
    image_url: null,
    image_offset_x: 50,
    image_offset_y: 50,
    image_zoom: 1,
    display_order: 2,
  },
  {
    id: 'oscar',
    name: 'Oscar Gao',
    role: 'Co-founder',
    bio: '',
    image_url: null,
    image_offset_x: 50,
    image_offset_y: 50,
    image_zoom: 1,
    display_order: 3,
  },
]

export default async function AboutPage() {
  const supabase = await createClient()

  // Fetch founders from database (falls back to hardcoded data)
  const { data: founders } = await supabase
    .from('founders')
    .select('*')
    .order('display_order')

  // Check if current user is admin (no redirect, just detect)
  let isAdmin = false
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      isAdmin = !!profile?.is_admin
    }
  } catch {
    // Not logged in, that's fine
  }

  return (
    <AboutContent
      founders={(founders as Founder[]) || FALLBACK_FOUNDERS}
      isAdmin={isAdmin}
    />
  )
}
