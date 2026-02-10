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
    description: 'Search Remotion library documentation for API details, components, hooks, and animation examples. Use this to look up how to use useCurrentFrame, interpolate, spring, Sequence, AbsoluteFill, and other Remotion APIs.',
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

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
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

    const { message, code, history } = await request.json() as {
      message: string
      code: string
      history: ChatMessage[]
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      tools: tools
    })

    const systemPrompt = `You are an expert Remotion video assistant helping users understand and modify their video composition code.

IMPORTANT: If the user asks you to modify the code or if you're unsure about Remotion API usage, use the search_remotion_docs tool to look up the correct syntax before making changes.

The user's current Remotion code is:

\`\`\`javascript
${code}
\`\`\`

## CRITICAL Rules (violations will break the animation):
1. NEVER place <Sequence> inside <svg> - Sequence renders a <div> which is invalid inside SVG and will crash
2. For timed text/elements in SVG, use conditional rendering: {frame >= 60 && <text>...</text>} NOT <Sequence><text>
3. ONLY use HTML elements (div, span, p, h1-h6) inside <AbsoluteFill>, NEVER inside <svg>
4. Inside <svg>, ONLY use SVG elements: <text>, <rect>, <circle>, <ellipse>, <line>, <path>, <g>, <polygon>, <polyline>, <defs>, <linearGradient>, <radialGradient>, <stop>, <filter>, <clipPath>, <mask>

## Rules

1. **For questions about the code**: Explain briefly and concisely. Do NOT show the full code unless they specifically ask to see it.

2. **For change requests**: Provide the COMPLETE updated code in a single \`\`\`javascript code block. Do not provide partial snippets - always give the full working code.

3. **Code requirements**:
   - Use plain JavaScript (NO TypeScript) - no type annotations like \`: number\`, \`: string\`, etc.
   - Available imports from 'remotion': useCurrentFrame, interpolate, AbsoluteFill, spring, useVideoConfig, Sequence, Easing
   - Keep the same component name and structure unless asked to change it
   - Use SVG-based animations
   - Use a dark space theme (backgroundColor: '#1a1a2e' or similar)
   - Do NOT use any box-drawing characters (│┌┐└┘├┤┬┴┼─) or special formatting characters in your code

4. **Response format**:
   - Be concise and helpful
   - If providing code, put it in a \`\`\`javascript block
   - Explain what you changed briefly after the code

## Previous conversation:
${history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n')}

User's new message: ${message}`

    // Start chat with function calling capability
    const chat = model.startChat({
      history: [],
    })

    let result = await chat.sendMessage(systemPrompt)
    let response = result.response

    // Handle function calling loop
    let iterations = 0
    const maxIterations = 5

    while (response.functionCalls()?.length && iterations < maxIterations) {
      iterations++
      const functionCalls = response.functionCalls()!

      console.log('[video-chat] Function call requested:', functionCalls.map(fc => fc.name))

      const functionResponses = await Promise.all(
        functionCalls.map(async (functionCall) => {
          if (functionCall.name === 'search_remotion_docs') {
            const query = (functionCall.args as { query: string }).query
            console.log('[video-chat] Searching Remotion docs for:', query)
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

    // Extract code from response if present
    const codeBlockMatch = responseText.match(/```(?:javascript|jsx|js)?\n([\s\S]*?)```/)
    let updatedCode: string | undefined

    if (codeBlockMatch) {
      // Sanitize the extracted code
      updatedCode = sanitizeCode(codeBlockMatch[1].trim())
    }

    // Remove code blocks from the response text shown to user
    const cleanResponse = responseText
      .replace(/```(?:javascript|jsx|js)?\n[\s\S]*?```/g, '')
      .trim()

    return NextResponse.json({
      response: cleanResponse || (updatedCode ? 'Code updated!' : responseText),
      updatedCode,
    })
  } catch (error) {
    console.error('Error in video chat:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}
