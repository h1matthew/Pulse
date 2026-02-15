import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Structured block types for lesson content
interface ContentBlock {
  type: 'heading' | 'subheading' | 'text' | 'equation' | 'video' | 'callout' | 'list'
  content?: string
  latex?: string
  description?: string
  items?: string[]
  calloutType?: 'info' | 'warning' | 'tip' | 'important'
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { prompt, type, returnStructured } = await request.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    // If structured output is requested, use JSON format
    if (returnStructured) {
      const structuredPrompt = `You are an expert local business advocate creating content for Pulse — a platform that helps people discover and support local businesses.

## Your Task
Create structured content about local businesses and community impact. Return ONLY valid JSON.

## Output Format
Return a JSON object with a "blocks" array. Each block has a "type" and content fields:

{
  "blocks": [
    { "type": "heading", "content": "Section Title" },
    { "type": "text", "content": "Paragraph text..." },
    { "type": "callout", "content": "Important note...", "calloutType": "info" },
    { "type": "list", "items": ["Item 1", "Item 2", "Item 3"] },
    { "type": "subheading", "content": "Subsection Title" }
  ]
}

## Block Types
- heading: Main section title (use for major topics)
- subheading: Subsection title
- text: Regular paragraph
- callout: Important notes (calloutType: info, warning, tip, important)
- list: Bullet points (array of strings)

## Guidelines
1. Start with an engaging introduction paragraph
2. Break content into sections with headings
3. Include real-world examples and local business spotlights
4. Highlight the economic impact of supporting local
5. Include callouts for key takeaways
6. Use encouraging, community-focused tone

## Important
- Return ONLY the JSON object, no markdown code blocks
- Focus on local business discovery and community impact
- Keep paragraphs focused and engaging

Now generate structured content for: ${prompt}`

      const result = await model.generateContent(structuredPrompt)
      let content = result.response.text()

      // Clean up the response - remove markdown code blocks if present
      content = content.trim()
      if (content.startsWith('```json')) {
        content = content.slice(7)
      } else if (content.startsWith('```')) {
        content = content.slice(3)
      }
      if (content.endsWith('```')) {
        content = content.slice(0, -3)
      }
      content = content.trim()

      try {
        const parsed = JSON.parse(content)
        return NextResponse.json(parsed)
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError)
        // Return as plain content if parsing fails
        return NextResponse.json({ content: result.response.text() })
      }
    }

    // Legacy markdown format
    const systemPrompt = `You are an expert local business advocate creating content for Pulse — a platform that helps people discover and support local businesses.

## Your Task
Create structured content about local businesses and community impact based on the user's topic description.

## Content Format
Generate the content in a structured format that can be easily parsed:
- Use ## for main headings
- Use ### for subheadings
- Use regular paragraphs for text
- Use **bold** for key terms
- Use bullet points for lists
- Include [CALLOUT: text] for important notes
- Include [HIGHLIGHT: description] for business spotlights

## Guidelines
1. Start with an engaging introduction
2. Break content into sections with clear headings
3. Include real-world examples of local business impact
4. Highlight economic benefits of supporting local
5. Use encouraging, community-focused tone
6. Make it relatable for community members
7. Include practical tips people can act on

## Example Output Structure:
## Introduction
[Opening paragraph about the importance of local business]

### Why Local Matters
[Explanation with community examples]

[CALLOUT: Every dollar spent locally circulates 2-3 times in the community]

### The Impact of Your Choices
When you choose local, you are:
- Supporting local jobs
- Keeping money in your community
- Building unique neighborhood character

[HIGHLIGHT: Spotlight on a local success story]

### How to Get Started
Try this: [practical action step]

---

Now generate content for: ${prompt}`

    const result = await model.generateContent(systemPrompt)
    const content = result.response.text()

    return NextResponse.json({ content })
  } catch (error) {
    console.error('Error generating content:', error)
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    )
  }
}
