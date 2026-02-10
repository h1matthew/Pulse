export const dynamic = 'force-static'
export const revalidate = 3600 // Revalidate every hour

import { createClient } from '@/lib/supabase/server'
import { AboutContent } from '@/components/features/about/AboutContent'
import type { Founder } from '@/components/features/about/FounderCard'

const FALLBACK_FOUNDERS: Founder[] = [
  {
    id: 'henry',
    name: 'Henry Dai',
    role: 'Cofounder',
    bio: 'Henry Dai is an experienced competitive rocketeer specializing in precision build and remote-controlled events. He has been selected by the National Association of Rocketry to represent the USA National Team and has earned multiple medals at World Space Modeling Championships. With this experience, Henry brings proven leadership and technical expertise to guide teams toward high-level competition such as the American Rocketry Challenge.',
    image_url: null,
    image_offset_x: 50,
    image_offset_y: 50,
    image_zoom: 1,
    display_order: 0,
  },
  {
    id: 'matthew',
    name: 'Matthew Heng',
    role: 'Cofounder',
    bio: 'Matthew Heng is driven by a deep interest in physics and the mechanics of flight. He is a Gold Medalist at the Calico Hackathon (a top-35 finisher out of ~500 participants) and is currently authoring a research paper on AI. Matthew leverages these computer science skills to build the technical foundation of Max Apogee. He combines this expertise with his teaching experience to break down complex concepts, ensuring students turn their curiosity into practical engineering skills.',
    image_url: null,
    image_offset_x: 50,
    image_offset_y: 50,
    image_zoom: 1,
    display_order: 1,
  },
  {
    id: 'brady',
    name: 'Brady Chen',
    role: 'Cofounder',
    bio: 'Brady Chen is an accomplished competitive programmer and student developer focused on high-impact problem solving. He is a 1st Place winner of the Congressional App Challenge, a Silver Division competitor in the USA Computing Olympiad (USACO), and a top-35 finisher out of 500 participants in the Calico Competition. With this competitive background, Brady brings strong technical skill and focus to help teams succeed.',
    image_url: null,
    image_offset_x: 50,
    image_offset_y: 50,
    image_zoom: 1,
    display_order: 2,
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
