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
      const structuredPrompt = `You are an expert rocket science educator creating lesson content for an educational platform called Max Apogee.

## Your Task
Create structured lesson content based on the user's topic description. Return ONLY valid JSON.

## Output Format
Return a JSON object with a "blocks" array. Each block has a "type" and content fields:

{
  "blocks": [
    { "type": "heading", "content": "Section Title" },
    { "type": "text", "content": "Paragraph text explaining the concept..." },
    { "type": "equation", "latex": "F = ma" },
    { "type": "callout", "content": "Important note...", "calloutType": "info" },
    { "type": "video", "description": "Animation showing rocket thrust forces" },
    { "type": "list", "items": ["Item 1", "Item 2", "Item 3"] },
    { "type": "subheading", "content": "Subsection Title" }
  ]
}

## Block Types
- heading: Main section title (use for major topics)
- subheading: Subsection title
- text: Regular paragraph
- equation: LaTeX math (use proper LaTeX syntax like \\frac{}{}, \\sqrt{})
- callout: Important notes (calloutType: info, warning, tip, important)
- video: Animation placeholder (describe what animation is needed)
- list: Bullet points (array of strings)

## Guidelines
1. Start with an engaging introduction paragraph
2. Break complex concepts into sections with headings
3. Include real-world examples and analogies
4. Add equations where relevant with proper LaTeX
5. Include callouts for key takeaways
6. Add video placeholders for concepts that benefit from animation
7. Use appropriate difficulty level

## Important
- Return ONLY the JSON object, no markdown code blocks
- Use proper LaTeX escaping (double backslashes for special commands)
- Keep paragraphs focused and educational

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
    const systemPrompt = `You are an expert rocket science educator creating lesson content for an educational platform called Max Apogee.

## Your Task
Create structured lesson content based on the user's topic description.

## Content Format
Generate the content in a structured format that can be easily parsed:
- Use ## for main headings
- Use ### for subheadings
- Use regular paragraphs for text
- Use **bold** for key terms
- Use LaTeX notation for equations: $inline$ or $$display$$
- Use bullet points for lists
- Include [CALLOUT: text] for important notes
- Include [DIAGRAM: description] placeholders for visual content

## Guidelines
1. Start with an engaging introduction
2. Break complex concepts into digestible sections
3. Include real-world examples and analogies
4. Add practice problems or thought questions
5. Use appropriate difficulty level based on context
6. Make it suitable for visual and auditory learners
7. Include equations where relevant with proper LaTeX

## Example Output Structure:
## Introduction
[Opening paragraph explaining the topic]

### Key Concept 1
[Explanation with examples]

[CALLOUT: Important point to remember]

### The Math Behind It
The fundamental equation is:
$$F = ma$$
Where $F$ is force, $m$ is mass, and $a$ is acceleration.

### Real-World Example
[Practical application]

[DIAGRAM: Force diagram showing thrust and weight vectors on a rocket]

### Practice
Try this: [thought question or problem]

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
