import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI, SchemaType, type Tool } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { sanitizeCode } from '@/lib/utils'
import { searchRemotonDocs } from '@/lib/remotion-docs'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Define the Remotion docs search tool for Gemini
const tools: Tool[] = [{
  functionDeclarations: [{
    name: 'search_remotion_docs',
    description: 'Search Remotion library documentation for API details, components, hooks, and animation examples. Use this to look up how to use useCurrentFrame, interpolate, spring, Sequence, AbsoluteFill, and other Remotion APIs. Always call this before generating Remotion code to ensure you use the correct API.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: 'Search query for Remotion docs (e.g., "interpolate options", "spring animation config", "Sequence component")'
        } as const
      },
      required: ['query']
    }
  }]
}]

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

    const { prompt } = await request.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      tools: tools
    })

    const systemPrompt = `You are an expert Remotion video composition developer. Generate a complete, working Remotion component based on the user's description.

IMPORTANT: Before generating code, use the search_remotion_docs tool to look up the correct API usage for any Remotion functions you plan to use. This ensures your code uses the correct syntax and options.

## CRITICAL Rules (violations will break the animation):
1. NEVER place <Sequence> inside <svg> - Sequence renders a <div> which is invalid inside SVG and will crash
2. For timed text/elements in SVG, use conditional rendering: {frame >= 60 && <text>...</text>} NOT <Sequence><text>
3. ONLY use HTML elements (div, span, p, h1-h6) inside <AbsoluteFill>, NEVER inside <svg>
4. Inside <svg>, ONLY use SVG elements: <text>, <rect>, <circle>, <ellipse>, <line>, <path>, <g>, <polygon>, <polyline>, <defs>, <linearGradient>, <radialGradient>, <stop>, <filter>, <clipPath>, <mask>
5. Only import from 'remotion': useCurrentFrame, interpolate, AbsoluteFill, spring, Sequence, Easing, useVideoConfig
6. Do NOT invent or guess imports - if you're unsure, don't import it

## Requirements
- Use plain JavaScript (NOT TypeScript) - no type annotations like colon number, colon string, etc.
- Do NOT include TypeScript syntax like interface, type declarations, or generic type parameters
- Create SVG-based animations (no external images unless absolutely necessary)
- Use clean, educational animations suitable for rocket science education
- Make animations smooth using interpolate() and spring()
- Use a dark space theme (backgroundColor: '#1a1a2e' or similar)
- Add educational labels and annotations where appropriate
- Target 1280x720 resolution
- Duration should be appropriate for the content (usually 300-600 frames at 30fps)
- Do NOT use any box-drawing characters (│┌┐└┘├┤┬┴┼─) or special formatting characters in your code

## Output Format
Return ONLY the following JSON (no markdown, no explanation):
{
  "code": "// The complete Remotion component code here",
  "name": "Suggested name for the composition",
  "description": "Brief description of what the animation shows",
  "durationFrames": 300
}

## Example Component Structure
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';

export function VideoComposition() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a2e' }}>
      <svg width="1280" height="720" viewBox="0 0 1280 720">
        {/* For timed elements, use conditional rendering based on frame, NOT Sequence */}
        {frame >= 30 && (
          <text x="640" y="360" fill="white" fontSize="48" textAnchor="middle">
            Hello World
          </text>
        )}
      </svg>
    </AbsoluteFill>
  );
}

User's request: ${prompt}`

    // Start chat with function calling capability
    const chat = model.startChat({
      history: [],
    })

    let result = await chat.sendMessage(systemPrompt)
    let response = result.response

    // Handle function calling loop - Gemini may call our tool multiple times
    let iterations = 0
    const maxIterations = 5 // Prevent infinite loops

    while (response.functionCalls()?.length && iterations < maxIterations) {
      iterations++
      const functionCalls = response.functionCalls()!

      console.log('[generate-video] Function call requested:', functionCalls.map(fc => fc.name))

      const functionResponses = await Promise.all(
        functionCalls.map(async (functionCall) => {
          if (functionCall.name === 'search_remotion_docs') {
            const query = (functionCall.args as { query: string }).query
            console.log('[generate-video] Searching Remotion docs for:', query)
            const docs = await searchRemotonDocs(query)
            return {
              functionResponse: {
                name: 'search_remotion_docs',
                response: { documentation: docs }
              }
            }
          }
          return {
            functionResponse: {
              name: functionCall.name,
              response: { error: 'Unknown function' }
            }
          }
        })
      )

      // Send function responses back to Gemini
      result = await chat.sendMessage(functionResponses)
      response = result.response
    }

    const responseText = response.text()

    // Parse the JSON response
    let parsed: { code: string; name: string; description: string; durationFrames: number }

    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch {
      // If parsing fails, return the raw code if it looks like code
      if (responseText.includes('useCurrentFrame') || responseText.includes('AbsoluteFill')) {
        parsed = {
          code: responseText,
          name: 'Generated Video',
          description: 'AI-generated Remotion composition',
          durationFrames: 300,
        }
      } else {
        return NextResponse.json(
          { error: 'Failed to generate valid video code' },
          { status: 500 }
        )
      }
    }

    // Sanitize the code to remove any box-drawing or special characters
    parsed.code = sanitizeCode(parsed.code)

    return NextResponse.json({
      code: parsed.code,
      name: parsed.name,
      description: parsed.description,
      durationFrames: parsed.durationFrames,
    })
  } catch (error) {
    console.error('Error generating video:', error)
    return NextResponse.json(
      { error: 'Failed to generate video code' },
      { status: 500 }
    )
  }
}
