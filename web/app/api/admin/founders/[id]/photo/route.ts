import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Upload a founder's photo (admin only)
 * POST /api/admin/founders/[id]/photo
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('photo') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No photo file provided' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, or WebP.' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum 5MB.' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'png'
    const filePath = `${id}.${ext}`

    // Upload to Supabase Storage (upsert overwrites existing)
    const { error: uploadError } = await supabase.storage
      .from('founder-photos')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      console.error('Error uploading photo:', uploadError)
      return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 })
    }

    const { data: publicUrlData } = supabase.storage
      .from('founder-photos')
      .getPublicUrl(filePath)

    // Append cache-bust to avoid stale images
    const imageUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

    const { error: updateError } = await supabase
      .from('founders')
      .update({ image_url: imageUrl })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating founder image_url:', updateError)
      return NextResponse.json({ error: 'Photo uploaded but failed to update record' }, { status: 500 })
    }

    return NextResponse.json({ image_url: imageUrl })
  } catch (error) {
    console.error('Error in upload founder photo endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Remove a founder's photo (admin only)
 * DELETE /api/admin/founders/[id]/photo
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Try to delete from storage (may not exist, that's ok)
    const { data: files } = await supabase.storage
      .from('founder-photos')
      .list()

    const fileToDelete = files?.find(f => f.name.startsWith(id))
    if (fileToDelete) {
      const { error: deleteError } = await supabase.storage
        .from('founder-photos')
        .remove([fileToDelete.name])

      if (deleteError) {
        console.error('Error deleting photo from storage:', deleteError)
        // Continue anyway to clear the database record
      }
    }

    // Clear the image_url in the database
    const { error: updateError } = await supabase
      .from('founders')
      .update({ image_url: null })
      .eq('id', id)

    if (updateError) {
      console.error('Error clearing founder image_url:', updateError)
      return NextResponse.json({ error: 'Failed to clear photo from database' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete founder photo endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
