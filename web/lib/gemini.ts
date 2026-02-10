import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

/**
 * Sanitize user input for safe inclusion in AI prompts.
 * Prevents prompt injection attacks by:
 * 1. Escaping special instruction markers
 * 2. Limiting input length
 * 3. Stripping control characters
 * 4. Neutralizing common injection patterns
 */
function sanitizeForPrompt(input: string, maxLength = 2000): string {
  if (!input || typeof input !== 'string') return ''

  let sanitized = input
    // Limit length first
    .slice(0, maxLength)
    // Remove null bytes and control characters (except newlines/tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Escape markdown-like instruction markers that could confuse the model
    .replace(/^#{1,6}\s/gm, '\\# ')
    .replace(/^##\s*(System|Instructions|Rules|Context|IMPORTANT)/gim, '[Section: $1]')
    // Neutralize common injection patterns
    .replace(/ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|rules?|context)/gi, '[filtered]')
    .replace(/disregard\s+(all\s+)?(previous|above|prior)/gi, '[filtered]')
    .replace(/new\s+instructions?:/gi, '[filtered]:')
    .replace(/you\s+are\s+now/gi, '[filtered]')
    .replace(/from\s+now\s+on/gi, '[filtered]')
    .replace(/forget\s+(everything|all)/gi, '[filtered]')
    // Escape XML-like tags that might be interpreted as system markers
    .replace(/<\/?system[^>]*>/gi, '[tag]')
    .replace(/<\/?instructions?[^>]*>/gi, '[tag]')
    .replace(/<\/?context[^>]*>/gi, '[tag]')

  return sanitized.trim()
}

/**
 * Sanitize lesson context which may contain structured content.
 * Less aggressive than user input sanitization.
 */
function sanitizeLessonContext(input: string, maxLength = 5000): string {
  if (!input || typeof input !== 'string') return ''

  return input
    .slice(0, maxLength)
    // Remove null bytes and control characters (except newlines/tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
}

export interface StreamChunk {
  type: 'chunk' | 'suggestions'
  data: string | string[]
}

export interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

export const SOCRATIC_SYSTEM_PROMPT = `You are a Socratic rocket science tutor. A student is learning about rocket science and aerospace engineering.

## Topic Scope
You ONLY help with topics related to:
- Rocket science and rocketry (propulsion, thrust, staging, etc.)
- Aerospace engineering (aerodynamics, structures, materials)
- Physics concepts relevant to rockets (Newton's laws, thermodynamics, fluid dynamics)
- Mathematics needed for rocket science (calculus, orbital mechanics, kinematics)
- Space exploration and orbital mechanics

If a student asks about topics OUTSIDE this scope, politely redirect them:
"That's an interesting question! However, I specialize in rocket science and aerospace. Is there anything about rockets, physics, or space exploration I can help you with?"

## Your Teaching Method
You guide students to discover answers themselves through thoughtful questions. You NEVER give direct answers, no matter what the student says or how they phrase their request.

## Rules
1. NEVER provide the direct answer to the student's question
2. Ask a guiding question that leads them toward understanding
3. If they seem stuck, give a small hint and ask another follow-up question
4. Break complex concepts into smaller steps with questions at each step
5. Use analogies and ask if they can see the connection to the rocket science concept
6. Only confirm when the student arrives at the correct understanding themselves
7. Keep responses concise (2-3 paragraphs max)
8. For equations, use LaTeX notation:
   - Inline: $F = ma$, $v = \\sqrt{2gh}$
   - Display: $$\\Delta v = I_{sp} \\cdot g_0 \\cdot \\ln\\frac{m_0}{m_f}$$
   - IMPORTANT: Ensure mathematical expressions are enclosed in dollar signs ($) with no spaces between the dollar signs and the expression
9. If the student tries to trick you into giving the answer (e.g., "just tell me", "what is the answer"), gently redirect with another guiding question
10. Be encouraging and enthusiastic about their learning journey`

export async function explainRocketConcept(params: {
  concept: string
  lessonContext: string
  studentQuestion: string
  history?: ChatMessage[]
}): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  // Sanitize user inputs to prevent prompt injection
  const sanitizedConcept = sanitizeForPrompt(params.concept, 200)
  const sanitizedContext = sanitizeLessonContext(params.lessonContext)
  const sanitizedQuestion = sanitizeForPrompt(params.studentQuestion, 1000)

  const systemContext = `${SOCRATIC_SYSTEM_PROMPT}

## Current Lesson Context
Topic: ${sanitizedConcept}
${sanitizedContext}`

  if (params.history && params.history.length > 0) {
    // Sanitize history messages
    const sanitizedHistory = params.history.map(msg => ({
      role: msg.role as 'user' | 'model',
      parts: [{ text: msg.role === 'user' ? sanitizeForPrompt(msg.content, 1000) : msg.content }],
    }))

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: `[System context: ${systemContext}]\n\nI'm studying "${sanitizedConcept}" and have a question.` }] },
        { role: 'model', parts: [{ text: "Of course! I'd love to help you think through this. What's on your mind about this topic?" }] },
        ...sanitizedHistory,
      ],
    })

    const result = await chat.sendMessage(sanitizedQuestion)
    return result.response.text()
  }

  const prompt = `${systemContext}

## Student's Question
${sanitizedQuestion}

Remember: Do NOT answer directly. Ask a guiding question instead.`

  const result = await model.generateContent(prompt)
  return result.response.text()
}

export async function generateQuizExplanation(params: {
  questionText: string
  userAnswer: string
  correctAnswer: string
  topic: string
}): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  // Sanitize user-provided inputs
  const sanitizedTopic = sanitizeForPrompt(params.topic, 200)
  const sanitizedUserAnswer = sanitizeForPrompt(params.userAnswer, 500)
  // questionText and correctAnswer come from our database, but sanitize for safety
  const sanitizedQuestionText = sanitizeLessonContext(params.questionText, 1000)
  const sanitizedCorrectAnswer = sanitizeLessonContext(params.correctAnswer, 500)

  const isCorrect = sanitizedUserAnswer === sanitizedCorrectAnswer

  const prompt = `You are a rocket science educator. A student just ${isCorrect ? 'correctly answered' : 'incorrectly answered'} a quiz question about ${sanitizedTopic}.

## Question
${sanitizedQuestionText}

## Student's Answer
${sanitizedUserAnswer}

## Correct Answer
${sanitizedCorrectAnswer}

## Instructions
Provide a brief explanation (2-3 paragraphs) that:
1. ${isCorrect ? 'Congratulates them and reinforces why their answer is correct' : 'Gently explains why their answer was incorrect and why the correct answer is right'}
2. Explains the underlying rocket science concept
3. Gives a real-world example if possible

Use LaTeX notation for any equations. Use $...$ for inline equations (e.g., $F = ma$) and $$...$$ for display equations. Ensure mathematical expressions are enclosed in dollar signs with no spaces between the dollar signs and the expression. Be encouraging!`

  const result = await model.generateContent(prompt)
  return result.response.text()
}

export async function explainSelectedText(params: {
  text: string
  lessonContext: string
  lessonTitle: string
}): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  // Sanitize user inputs
  const sanitizedText = sanitizeForPrompt(params.text, 500)
  const sanitizedContext = sanitizeLessonContext(params.lessonContext)
  const sanitizedTitle = sanitizeForPrompt(params.lessonTitle, 200)

  const prompt = `You are a helpful rocket science educator. A student is reading a lesson about "${sanitizedTitle}" and has highlighted the following text, wanting to understand it better:

## Highlighted Text
"${sanitizedText}"

## Lesson Context
${sanitizedContext}

## Instructions
Provide a clear, helpful explanation of the highlighted text. Your explanation should:

1. Define any technical terms in simple language
2. Explain the concept and why it matters in rocket science
3. Give a practical example or analogy if helpful
4. Connect it to the broader topic if relevant

Keep your response to 2-3 paragraphs. Use LaTeX notation for any equations. Use $...$ for inline equations (e.g., $F = ma$) and $$...$$ for display equations. Ensure mathematical expressions are enclosed in dollar signs with no spaces between the dollar signs and the expression. Be engaging and educational!`

  const result = await model.generateContent(prompt)
  return result.response.text()
}

// Streaming version of explainSelectedText
export async function* explainSelectedTextStream(params: {
  text: string
  lessonContext: string
  lessonTitle: string
}): AsyncGenerator<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  // Sanitize user inputs
  const sanitizedText = sanitizeForPrompt(params.text, 500)
  const sanitizedContext = sanitizeLessonContext(params.lessonContext)
  const sanitizedTitle = sanitizeForPrompt(params.lessonTitle, 200)

  const prompt = `You are a helpful rocket science educator. A student is reading a lesson about "${sanitizedTitle}" and has highlighted the following text, wanting to understand it better:

## Highlighted Text
"${sanitizedText}"

## Lesson Context
${sanitizedContext}

## Instructions
Provide a clear, helpful explanation of the highlighted text. Your explanation should:

1. Define any technical terms in simple language
2. Explain the concept and why it matters in rocket science
3. Give a practical example or analogy if helpful
4. Connect it to the broader topic if relevant

Keep your response to 2-3 paragraphs. Use LaTeX notation for any equations. Use $...$ for inline equations (e.g., $F = ma$) and $$...$$ for display equations. Ensure mathematical expressions are enclosed in dollar signs with no spaces between the dollar signs and the expression. Be engaging and educational!`

  const result = await model.generateContentStream(prompt)
  for await (const chunk of result.stream) {
    const chunkText = chunk.text()
    if (chunkText) {
      yield chunkText
    }
  }
}

// Streaming version of explainRocketConcept with suggestions
export async function* explainRocketConceptStream(params: {
  concept: string
  lessonContext: string
  studentQuestion: string
  history?: ChatMessage[]
}): AsyncGenerator<StreamChunk> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  // Sanitize user inputs to prevent prompt injection
  const sanitizedConcept = sanitizeForPrompt(params.concept, 200)
  const sanitizedContext = sanitizeLessonContext(params.lessonContext)
  const sanitizedQuestion = sanitizeForPrompt(params.studentQuestion, 1000)

  const systemContext = `${SOCRATIC_SYSTEM_PROMPT}

## Current Lesson Context
Topic: ${sanitizedConcept}
${sanitizedContext}

## Additional Instructions
You MUST end your response with exactly 3 follow-up questions the student might want to ask. These should be related to the current topic and help deepen understanding.

IMPORTANT: Always include this at the very end of your response, formatted exactly like this:
<suggestions>
["First follow-up question?", "Second follow-up question?", "Third follow-up question?"]
</suggestions>`

  let fullResponse = ''

  if (params.history && params.history.length > 0) {
    // Sanitize history messages
    const sanitizedHistory = params.history.map(msg => ({
      role: msg.role as 'user' | 'model',
      parts: [{ text: msg.role === 'user' ? sanitizeForPrompt(msg.content, 1000) : msg.content }],
    }))

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: `[System context: ${systemContext}]\n\nI'm studying "${sanitizedConcept}" and have a question.` }] },
        { role: 'model', parts: [{ text: "Of course! I'd love to help you think through this. What's on your mind about this topic?" }] },
        ...sanitizedHistory,
      ],
    })

    const result = await chat.sendMessageStream(sanitizedQuestion)
    for await (const chunk of result.stream) {
      const chunkText = chunk.text()
      if (chunkText) {
        fullResponse += chunkText
        yield { type: 'chunk', data: chunkText }
      }
    }
  } else {
    const prompt = `${systemContext}

## Student's Question
${sanitizedQuestion}

Remember: Do NOT answer directly. Ask a guiding question instead.`

    const result = await model.generateContentStream(prompt)
    for await (const chunk of result.stream) {
      const chunkText = chunk.text()
      if (chunkText) {
        fullResponse += chunkText
        yield { type: 'chunk', data: chunkText }
      }
    }
  }

  // Extract suggestions from the full response
  const suggestionsMatch = fullResponse.match(/<suggestions>\s*\[([\s\S]*?)\]\s*<\/suggestions>/)
  if (suggestionsMatch) {
    try {
      const suggestionsArray = JSON.parse(`[${suggestionsMatch[1]}]`)
      yield { type: 'suggestions', data: suggestionsArray }
    } catch {
      // If parsing fails, try to extract quoted strings manually
      const quotedStrings = suggestionsMatch[1].match(/"([^"]+)"/g)
      if (quotedStrings) {
        yield { type: 'suggestions', data: quotedStrings.map(s => s.slice(1, -1)) }
      }
    }
  }
}

/**
 * Generate flashcards from lesson content using Gemini AI
 */
export async function generateFlashcards(params: {
  lessonContent: string
  count: number
  difficulty: 'easy' | 'medium' | 'hard'
  moduleId: string
  lessonIds: string[]
}): Promise<Array<{ front: string; back: string; hint?: string; difficulty: string }>> {
  const MAX_CONTENT_LENGTH = 6000 // Limit content to prevent overly long prompts
  const MAX_RETRIES = 2

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 8192,
    },
  })

  // Truncate content if too long
  let content = params.lessonContent
  if (content.length > MAX_CONTENT_LENGTH) {
    content = content.substring(0, MAX_CONTENT_LENGTH) + '\n\n[Content truncated for brevity]'
  }

  const difficultyGuidance = {
    easy: 'Basic definitions and simple concepts.',
    medium: 'Conceptual questions requiring understanding.',
    hard: 'Advanced questions requiring synthesis of concepts.',
  }

  // Simplified prompt for more reliable output
  const prompt = `Create ${params.count} flashcards about rocket science from this content:

${content}

Difficulty: ${params.difficulty} - ${difficultyGuidance[params.difficulty]}

Return a JSON array. Each flashcard needs:
- "front": Short question (1 sentence)
- "back": Concise answer (1-2 sentences max)
- "difficulty": "${params.difficulty}"

Keep answers brief. Example format:
[{"front":"What is thrust?","back":"Force from expelled mass that propels a rocket.","difficulty":"${params.difficulty}"}]`

  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(prompt)
      const responseText = result.response.text()

      const flashcards = parseGeminiJsonArray(responseText)

      // Validate the response structure
      if (!Array.isArray(flashcards)) {
        throw new Error('Expected an array response')
      }

      // Filter to only valid flashcards
      const validCards = flashcards.filter(
        (card: Record<string, unknown>) =>
          typeof card.front === 'string' &&
          typeof card.back === 'string' &&
          card.front.length > 0 &&
          card.back.length > 0
      )

      if (validCards.length === 0) {
        throw new Error('No valid flashcards in response')
      }

      // Add difficulty to cards that don't have it
      return validCards.map((card: Record<string, unknown>) => ({
        front: card.front as string,
        back: card.back as string,
        hint: typeof card.hint === 'string' ? card.hint : undefined,
        difficulty: params.difficulty,
      }))
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.error(`Flashcard generation attempt ${attempt + 1} failed:`, lastError.message)
      // Wait briefly before retry
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }
  }

  throw new Error(`Failed to generate flashcards after ${MAX_RETRIES} attempts: ${lastError?.message}`)
}

/**
 * Robustly parse JSON from Gemini responses
 * Handles markdown code blocks, BOM characters, and various formatting issues
 */
export function parseGeminiJsonArray(text: string): unknown {
  // Remove BOM and other invisible characters at the start
  let cleaned = text.replace(/^\uFEFF/, '').replace(/^[\u200B-\u200D\uFEFF]+/, '').trim()

  // Try 1: Direct parse (might already be valid JSON)
  try {
    return JSON.parse(cleaned)
  } catch {
    // Continue to next strategy
  }

  // Try 2: Strip markdown code blocks (```json ... ``` or ``` ... ```)
  // Handle multiple possible formats including nested backticks
  const codeBlockPatterns = [
    /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i,
    /^```(?:json)?\s*([\s\S]*?)```\s*$/i,
    /^`([\s\S]*?)`$/,
  ]

  for (const pattern of codeBlockPatterns) {
    const match = cleaned.match(pattern)
    if (match) {
      try {
        return JSON.parse(match[1].trim())
      } catch {
        // Continue to next pattern
      }
    }
  }

  // Try 3: Simple code block strip (handles partial matches)
  cleaned = cleaned
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    // Continue to next strategy
  }

  // Try 4: Extract JSON array from response (handles surrounding text)
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0])
    } catch {
      // Continue to next strategy
    }
  }

  // Try 5: Extract JSON object from response
  const objectMatch = cleaned.match(/\{[\s\S]*\}/)
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0])
    } catch {
      // Final fallback failed
    }
  }

  // All strategies failed
  console.error('Failed to parse Gemini JSON response:', text.substring(0, 500))
  throw new Error('Could not extract valid JSON from response')
}

/**
 * Grade a written answer using Gemini AI
 * Returns score (0-1), feedback, and whether it was correct (>= 0.85)
 */
export async function gradeWrittenAnswer(params: {
  question: string
  userAnswer: string
  correctAnswer: string
  hint?: string
  moduleContext: string
}): Promise<{
  score: number
  feedback: string
  wasCorrect: boolean
  quality: number
}> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  // Sanitize user input (userAnswer is from user, others from our database)
  const sanitizedUserAnswer = sanitizeForPrompt(params.userAnswer, 1000)
  const sanitizedQuestion = sanitizeLessonContext(params.question, 1000)
  const sanitizedCorrectAnswer = sanitizeLessonContext(params.correctAnswer, 1000)
  const sanitizedHint = params.hint ? sanitizeLessonContext(params.hint, 500) : undefined
  const sanitizedContext = sanitizeLessonContext(params.moduleContext, 2000)

  const prompt = `You are a rocket science educator grading a student's written answer. Provide a fair, nuanced evaluation.

## Question
${sanitizedQuestion}

${sanitizedHint ? `## Hint Provided\n${sanitizedHint}\n` : ''}

## Correct Answer
${sanitizedCorrectAnswer}

## Student's Answer
${sanitizedUserAnswer}

## Module Context
${sanitizedContext}

## Grading Instructions
1. Evaluate semantic meaning and key concepts, not just exact wording
2. Consider technical accuracy and understanding of underlying principles
3. Give credit for correct concepts even if phrasing differs
4. Assign a score from 0.0 to 1.0:
   - 0.95-1.0: Perfect or near-perfect understanding, all key concepts correct
   - 0.85-0.95: Good understanding, minor omissions or imprecise wording
   - 0.70-0.85: Partial understanding, missing some key concepts
   - 0.50-0.70: Limited understanding, significant gaps
   - 0.0-0.50: Incorrect or shows fundamental misunderstanding

5. Threshold for "correct": 0.85 or higher

## Output Format
Provide your response in this exact format:

SCORE: [number between 0.0 and 1.0]

FEEDBACK:
[2-3 sentences explaining what was correct/incorrect, praising good points, and gently correcting errors. Use LaTeX notation for equations with proper escaping: \\frac{}{}, \\sqrt{}, etc.]

Use encouraging language. If the answer is correct, reinforce why. If incorrect, explain what was missing or wrong and what the correct understanding should be.`

  const result = await model.generateContent(prompt)
  const responseText = result.response.text()

  // Parse the response
  const scoreMatch = responseText.match(/SCORE:\s*([\d.]+)/)
  const feedbackMatch = responseText.match(/FEEDBACK:\s*([\s\S]+)/)

  if (!scoreMatch || !feedbackMatch) {
    throw new Error('Failed to parse grading response')
  }

  const score = parseFloat(scoreMatch[1])
  const feedback = feedbackMatch[1].trim()
  const wasCorrect = score >= 0.85

  // Convert score to SM-2 quality rating (0-5)
  let quality: number
  if (score >= 0.95) quality = 5
  else if (score >= 0.85) quality = 4
  else if (score >= 0.70) quality = 3
  else if (score >= 0.50) quality = 2
  else quality = 0

  return {
    score,
    feedback,
    wasCorrect,
    quality,
  }
}

/**
 * AI Quiz Question structure for generated quizzes
 */
export interface AIQuizQuestion {
  questionText: string
  options: string[]
  correctAnswer: string
  explanation: string
}

/**
 * Generate quiz questions from lesson content using Gemini AI
 * Used by admins to auto-generate quiz questions for review
 */
export async function generateQuizQuestions(params: {
  lessonContent: string
  count: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  includeEquations: boolean
  moduleId: string
  lessonId?: string
}): Promise<AIQuizQuestion[]> {
  const MAX_CONTENT_LENGTH = 8000
  const MAX_RETRIES = 2

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 8192,
    },
  })

  // Truncate content if too long
  let content = params.lessonContent
  if (content.length > MAX_CONTENT_LENGTH) {
    content = content.substring(0, MAX_CONTENT_LENGTH) + '\n\n[Content truncated for brevity]'
  }

  const difficultyGuidance = {
    beginner: 'Conceptual recall and basic definitions. Questions should test understanding of fundamental concepts without complex calculations.',
    intermediate: 'Application questions requiring understanding of how concepts relate. May include simple calculations or comparisons.',
    advanced: 'Complex calculations, synthesis of multiple concepts, and application to real-world scenarios. Include rocket equation, orbital mechanics, etc.',
  }

  const equationGuidance = params.includeEquations
    ? `IMPORTANT: Include proper LaTeX notation for all equations and numerical values:
- Use $...$ for inline math: $F = ma$, $v = 100 \\text{ m/s}$
- Use \\frac{}{} for fractions: $a = \\frac{F}{m}$
- Use \\text{} for units: $5 \\text{ m/s}^2$
- Use {,} for thousands separator: $2{,}000 \\text{ kg}$
- ALL options with numbers or units MUST use LaTeX notation`
    : 'Keep equations to a minimum. Focus on conceptual understanding rather than calculations.'

  const prompt = `Generate ${params.count} multiple-choice quiz questions about rocket science from this lesson content:

${content}

## Requirements
- Difficulty: ${params.difficulty} - ${difficultyGuidance[params.difficulty]}
- Each question MUST have exactly 4 options
- Only ONE option should be correct
- Include a detailed explanation for the correct answer
${equationGuidance}

## Output Format
Return a JSON array where each question has:
- "questionText": The question (use LaTeX for any math/values)
- "options": Array of exactly 4 options (use LaTeX for math/values)
- "correctAnswer": Must exactly match one of the options
- "explanation": Why the correct answer is right (use LaTeX for equations)

Example with LaTeX:
[{
  "questionText": "A rocket engine produces a thrust of $1{,}000 \\\\text{ N}$ on a $50 \\\\text{ kg}$ payload. What is the acceleration?",
  "options": ["$10 \\\\text{ m/s}^2$", "$20 \\\\text{ m/s}^2$", "$50 \\\\text{ m/s}^2$", "$100 \\\\text{ m/s}^2$"],
  "correctAnswer": "$20 \\\\text{ m/s}^2$",
  "explanation": "Using Newton's second law $a = \\\\frac{F}{m}$: $a = \\\\frac{1{,}000 \\\\text{ N}}{50 \\\\text{ kg}} = 20 \\\\text{ m/s}^2$"
}]`

  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(prompt)
      const responseText = result.response.text()

      const questions = parseGeminiJsonArray(responseText)

      if (!Array.isArray(questions)) {
        throw new Error('Expected an array response')
      }

      // Validate and filter questions
      const validQuestions = questions.filter((q: Record<string, unknown>) => {
        const hasRequiredFields =
          typeof q.questionText === 'string' &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          typeof q.correctAnswer === 'string' &&
          typeof q.explanation === 'string'

        if (!hasRequiredFields) return false

        // Ensure correctAnswer is in options
        const options = q.options as string[]
        return options.includes(q.correctAnswer as string)
      })

      if (validQuestions.length === 0) {
        throw new Error('No valid quiz questions in response')
      }

      return validQuestions.map((q: Record<string, unknown>) => ({
        questionText: q.questionText as string,
        options: q.options as string[],
        correctAnswer: q.correctAnswer as string,
        explanation: q.explanation as string,
      }))
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.error(`Quiz generation attempt ${attempt + 1} failed:`, lastError.message)
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }
  }

  throw new Error(`Failed to generate quiz questions after ${MAX_RETRIES} attempts: ${lastError?.message}`)
}
