/**
 * Check-in API — POST/GET /api/businesses/[id]/checkin
 *
 * Check-ins require PROOF: the user scans their purchase receipt, Gemini
 * vision verifies it belongs to this business and is recent, and only then
 * is the check-in recorded (with the receipt stored privately for audit).
 * Verified check-ins advance the user's started visit-based missions.
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyReceiptImage } from '@/lib/missions/verify-receipt'
import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit } from '@/lib/security/rateLimitHelper'

const MAX_RECEIPT_BYTES = 8 * 1024 * 1024

interface MissionUpdate {
  missionId: string
  title: string
  currentCount: number
  targetCount: number
  completed: boolean
}

/**
 * Advance the user's started, incomplete visit-based missions
 * (category_explore and visit_count) that match this business's category.
 * "Visit 3 different shops" means distinct businesses, so repeat visits to
 * the same business don't double-count.
 */
async function advanceVisitMissions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  business: { id: string; category_id: string | null },
  hasPriorCheckInHere: boolean
): Promise<MissionUpdate[]> {
  if (hasPriorCheckInHere) return []

  const { data: progressRows } = await supabase
    .from('user_mission_progress')
    .select('id, current_count, mission:boost_missions(id, title, mission_type, target_count, target_category_id, is_active)')
    .eq('user_id', userId)
    .eq('is_completed', false)

  const updates: MissionUpdate[] = []
  for (const row of progressRows ?? []) {
    // Supabase typing for to-one joins comes back loose; normalize.
    const mission = Array.isArray(row.mission) ? row.mission[0] : row.mission
    if (!mission || !mission.is_active) continue
    if (
      mission.mission_type !== 'category_explore' &&
      mission.mission_type !== 'visit_count'
    ) {
      continue
    }
    if (
      mission.target_category_id &&
      mission.target_category_id !== business.category_id
    ) {
      continue
    }

    const nextCount = (row.current_count ?? 0) + 1
    const completed = nextCount >= mission.target_count
    const { error } = await supabase
      .from('user_mission_progress')
      .update({
        current_count: nextCount,
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq('id', row.id)

    if (!error) {
      updates.push({
        missionId: mission.id,
        title: mission.title,
        currentCount: nextCount,
        targetCount: mission.target_count,
        completed,
      })
    }
  }
  return updates
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: businessId } = await params
  const supabase = await createClient()

  try {
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResponse = await enforceRateLimit(request, 'progress')
    if (rateLimitResponse) return rateLimitResponse

    // Proof of purchase is required to check in
    const formData = await request.formData().catch(() => null)
    const receipt = formData?.get('receipt')
    if (!receipt || !(receipt instanceof Blob)) {
      return NextResponse.json(
        { error: 'A receipt photo is required to check in.' },
        { status: 400 }
      )
    }
    if (!receipt.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'The receipt must be an image.' },
        { status: 400 }
      )
    }
    if (receipt.size === 0) {
      return NextResponse.json(
        { error: 'The receipt image is empty.' },
        { status: 400 }
      )
    }
    if (receipt.size > MAX_RECEIPT_BYTES) {
      return NextResponse.json(
        { error: 'Receipt image is too large (8MB max).' },
        { status: 400 }
      )
    }

    // Get business details
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, category_id')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Check if user already checked in today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: existingCheckIn } = await supabase
      .from('business_check_ins')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .gte('check_in_at', today.toISOString())
      .single()

    if (existingCheckIn) {
      return NextResponse.json(
        { error: 'Already checked in today' },
        { status: 409 }
      )
    }

    // Verify the receipt against this business. Verification-service
    // failures (expired key, quota, outage) must not read as a rejected
    // receipt or a mystery 500 — tell the user verification is down.
    const imageBuffer = Buffer.from(await receipt.arrayBuffer())
    let verification
    try {
      verification = await verifyReceiptImage({
        imageBase64: imageBuffer.toString('base64'),
        mimeType: receipt.type,
        businessName: business.name,
      })
    } catch (verificationError) {
      console.error('Receipt verification service error:', verificationError)
      return NextResponse.json(
        {
          error: 'Receipt verification is temporarily unavailable',
          reason:
            'We could not verify receipts right now — please try again soon.',
        },
        { status: 503 }
      )
    }

    if (!verification.verified) {
      return NextResponse.json(
        {
          error: 'Receipt verification failed',
          reason: verification.reason ?? 'The receipt could not be verified.',
        },
        { status: 422 }
      )
    }

    // Store the proof privately for audit (admin client: bucket is private).
    // Fail closed: a check-in without its stored receipt is a check-in
    // without evidence, so storage failure aborts the whole check-in.
    const admin = createAdminClient()
    const extension = receipt.type === 'image/png' ? 'png' : 'jpg'
    const receiptPath = `${user.id}/${businessId}-${Date.now()}.${extension}`
    const { error: uploadError } = await admin.storage
      .from('receipts')
      .upload(receiptPath, imageBuffer, { contentType: receipt.type })
    if (uploadError) {
      console.error('Receipt upload failed:', uploadError)
      return NextResponse.json(
        {
          error: 'Receipt storage is temporarily unavailable',
          reason:
            'Your receipt verified, but we could not store it — please try again soon.',
        },
        { status: 503 }
      )
    }

    // Was there a prior (pre-today) check-in at this business? Used for
    // mission distinctness.
    const { data: priorCheckIn } = await supabase
      .from('business_check_ins')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    // Create the verified check-in
    const { data: checkIn, error } = await supabase
      .from('business_check_ins')
      .insert({
        business_id: businessId,
        user_id: user.id,
        check_in_at: new Date().toISOString(),
        spend_amount: verification.total,
        receipt_url: receiptPath,
        verified_by_receipt: true,
        receipt_merchant: verification.merchantName,
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to create check-in' },
        { status: 500 }
      )
    }

    // Verified visit advances matching missions
    const missionUpdates = await advanceVisitMissions(
      supabase,
      user.id,
      business,
      !!priorCheckIn
    )

    // Update user impact metrics
    await supabase.rpc('update_user_impact', { p_user_id: user.id })

    return NextResponse.json(
      {
        message: 'Receipt verified — checked in!',
        checkIn,
        verification: {
          merchant: verification.merchantName,
          total: verification.total,
        },
        missionUpdates,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating check-in:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: businessId } = await params
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's check-ins for this business
    const { data: checkIns, error } = await supabase
      .from('business_check_ins')
      .select('*')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .order('check_in_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch check-ins' },
        { status: 500 }
      )
    }

    // Check if checked in today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkedInToday = checkIns?.some(
      ci => new Date(ci.check_in_at) >= today
    ) || false

    return NextResponse.json({
      checkIns: checkIns || [],
      checkedInToday,
      totalCheckIns: checkIns?.length || 0
    })

  } catch (error) {
    console.error('Error fetching check-ins:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
