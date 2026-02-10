import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockGenerateContent, mockSendMessage, mockStartChat, mockGetGenerativeModel } = vi.hoisted(() => {
  const mockGenerateContent = vi.fn()
  const mockSendMessage = vi.fn()
  const mockStartChat = vi.fn(() => ({ sendMessage: mockSendMessage }))
  const mockGetGenerativeModel = vi.fn(() => ({
    generateContent: mockGenerateContent,
    startChat: mockStartChat,
  }))
  return { mockGenerateContent, mockSendMessage, mockStartChat, mockGetGenerativeModel }
})

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel = mockGetGenerativeModel
  },
}))

import { explainRocketConcept, generateQuizExplanation, SOCRATIC_SYSTEM_PROMPT, parseGeminiJsonArray } from '@/lib/gemini'

describe('explainRocketConcept', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'What do you think happens when...' },
    })
    mockSendMessage.mockResolvedValue({
      response: { text: () => 'Great thinking! Now consider...' },
    })
  })

  it('uses gemini-2.0-flash model', async () => {
    await explainRocketConcept({
      concept: 'Thrust',
      lessonContext: 'Module: How Rockets Fly',
      studentQuestion: 'What is thrust?',
    })

    expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-2.0-flash' })
  })

  it('includes Socratic system prompt in the request', async () => {
    await explainRocketConcept({
      concept: 'Thrust',
      lessonContext: 'Module: How Rockets Fly',
      studentQuestion: 'What is thrust?',
    })

    const prompt = mockGenerateContent.mock.calls[0][0]
    expect(prompt).toContain('Socratic')
    expect(prompt).toContain('NEVER give direct answers')
    expect(prompt).toContain('guiding question')
  })

  it('includes lesson context in the prompt', async () => {
    await explainRocketConcept({
      concept: 'Orbital Mechanics',
      lessonContext: 'Module: Orbital Mechanics, Lesson: Gravity',
      studentQuestion: 'How do orbits work?',
    })

    const prompt = mockGenerateContent.mock.calls[0][0]
    expect(prompt).toContain('Orbital Mechanics')
    expect(prompt).toContain('Module: Orbital Mechanics, Lesson: Gravity')
  })

  it('includes the student question in the prompt', async () => {
    await explainRocketConcept({
      concept: 'Thrust',
      lessonContext: '',
      studentQuestion: 'Why does a rocket go up?',
    })

    const prompt = mockGenerateContent.mock.calls[0][0]
    expect(prompt).toContain('Why does a rocket go up?')
  })

  it('instructs not to answer directly', async () => {
    await explainRocketConcept({
      concept: 'Thrust',
      lessonContext: '',
      studentQuestion: 'What is thrust?',
    })

    const prompt = mockGenerateContent.mock.calls[0][0]
    expect(prompt).toContain('Do NOT answer directly')
  })

  it('uses startChat with history when history is provided', async () => {
    const history = [
      { role: 'user' as const, content: 'What is thrust?' },
      { role: 'model' as const, content: 'What do you think pushes a rocket?' },
    ]

    await explainRocketConcept({
      concept: 'Thrust',
      lessonContext: 'Module: How Rockets Fly',
      studentQuestion: 'I think it is the exhaust?',
      history,
    })

    expect(mockStartChat).toHaveBeenCalled()
    expect(mockSendMessage).toHaveBeenCalledWith('I think it is the exhaust?')
    expect(mockGenerateContent).not.toHaveBeenCalled()
  })

  it('uses generateContent without history when history is empty', async () => {
    await explainRocketConcept({
      concept: 'Thrust',
      lessonContext: '',
      studentQuestion: 'What is thrust?',
      history: [],
    })

    expect(mockGenerateContent).toHaveBeenCalled()
    expect(mockStartChat).not.toHaveBeenCalled()
  })

  it('returns the model response text', async () => {
    const result = await explainRocketConcept({
      concept: 'Thrust',
      lessonContext: '',
      studentQuestion: 'What is thrust?',
    })

    expect(result).toBe('What do you think happens when...')
  })
})

describe('generateQuizExplanation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'Great job! The answer is correct because...' },
    })
  })

  it('uses gemini-2.0-flash model', async () => {
    await generateQuizExplanation({
      questionText: 'What is thrust?',
      userAnswer: 'Force from exhaust',
      correctAnswer: 'Force from exhaust',
      topic: 'Thrust',
    })

    expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-2.0-flash' })
  })

  it('indicates correct answer in prompt when user is correct', async () => {
    await generateQuizExplanation({
      questionText: 'What is thrust?',
      userAnswer: 'A',
      correctAnswer: 'A',
      topic: 'Thrust',
    })

    const prompt = mockGenerateContent.mock.calls[0][0]
    expect(prompt).toContain('correctly answered')
    expect(prompt).toContain('Congratulates')
  })

  it('indicates incorrect answer in prompt when user is wrong', async () => {
    await generateQuizExplanation({
      questionText: 'What is thrust?',
      userAnswer: 'B',
      correctAnswer: 'A',
      topic: 'Thrust',
    })

    const prompt = mockGenerateContent.mock.calls[0][0]
    expect(prompt).toContain('incorrectly answered')
    expect(prompt).toContain('Gently explains')
  })

  it('includes the question text and answers in prompt', async () => {
    await generateQuizExplanation({
      questionText: 'What force propels a rocket?',
      userAnswer: 'Gravity',
      correctAnswer: 'Thrust',
      topic: 'Propulsion',
    })

    const prompt = mockGenerateContent.mock.calls[0][0]
    expect(prompt).toContain('What force propels a rocket?')
    expect(prompt).toContain('Gravity')
    expect(prompt).toContain('Thrust')
  })
})

describe('SOCRATIC_SYSTEM_PROMPT', () => {
  it('is exported and contains key instructions', () => {
    expect(SOCRATIC_SYSTEM_PROMPT).toContain('Socratic')
    expect(SOCRATIC_SYSTEM_PROMPT).toContain('NEVER give direct answers')
    expect(SOCRATIC_SYSTEM_PROMPT).toContain('guiding question')
    expect(SOCRATIC_SYSTEM_PROMPT).toContain('hint')
    expect(SOCRATIC_SYSTEM_PROMPT).toContain('analogies')
  })
})

describe('parseGeminiJsonArray', () => {
  describe('valid JSON parsing', () => {
    it('parses a plain JSON array', () => {
      const input = '[{"front": "Q1", "back": "A1"}]'
      const result = parseGeminiJsonArray(input)
      expect(result).toEqual([{ front: 'Q1', back: 'A1' }])
    })

    it('parses a JSON object', () => {
      const input = '{"key": "value"}'
      const result = parseGeminiJsonArray(input)
      expect(result).toEqual({ key: 'value' })
    })

    it('parses JSON with whitespace', () => {
      const input = '  [{"front": "Q1", "back": "A1"}]  '
      const result = parseGeminiJsonArray(input)
      expect(result).toEqual([{ front: 'Q1', back: 'A1' }])
    })
  })

  describe('markdown code block handling', () => {
    it('parses JSON wrapped in ```json``` code block', () => {
      const input = '```json\n[{"front": "Q1", "back": "A1"}]\n```'
      const result = parseGeminiJsonArray(input)
      expect(result).toEqual([{ front: 'Q1', back: 'A1' }])
    })

    it('parses JSON wrapped in ``` code block (no language)', () => {
      const input = '```\n[{"front": "Q1", "back": "A1"}]\n```'
      const result = parseGeminiJsonArray(input)
      expect(result).toEqual([{ front: 'Q1', back: 'A1' }])
    })

    it('parses JSON with code block on same line', () => {
      const input = '```json[{"front": "Q1", "back": "A1"}]```'
      const result = parseGeminiJsonArray(input)
      expect(result).toEqual([{ front: 'Q1', back: 'A1' }])
    })

    it('handles uppercase JSON language tag', () => {
      const input = '```JSON\n[{"front": "Q1", "back": "A1"}]\n```'
      const result = parseGeminiJsonArray(input)
      expect(result).toEqual([{ front: 'Q1', back: 'A1' }])
    })
  })

  describe('invisible character handling', () => {
    it('handles BOM character at start', () => {
      const input = '\uFEFF[{"front": "Q1", "back": "A1"}]'
      const result = parseGeminiJsonArray(input)
      expect(result).toEqual([{ front: 'Q1', back: 'A1' }])
    })

    it('handles zero-width space at start', () => {
      const input = '\u200B[{"front": "Q1", "back": "A1"}]'
      const result = parseGeminiJsonArray(input)
      expect(result).toEqual([{ front: 'Q1', back: 'A1' }])
    })

    it('handles zero-width joiner at start', () => {
      const input = '\u200D[{"front": "Q1", "back": "A1"}]'
      const result = parseGeminiJsonArray(input)
      expect(result).toEqual([{ front: 'Q1', back: 'A1' }])
    })
  })

  describe('embedded JSON extraction', () => {
    it('extracts JSON array from surrounding text', () => {
      const input = 'Here are your flashcards:\n[{"front": "Q1", "back": "A1"}]\nEnjoy!'
      const result = parseGeminiJsonArray(input)
      expect(result).toEqual([{ front: 'Q1', back: 'A1' }])
    })

    it('extracts JSON object from surrounding text', () => {
      const input = 'Result: {"success": true}'
      const result = parseGeminiJsonArray(input)
      expect(result).toEqual({ success: true })
    })
  })

  describe('complex flashcard structures', () => {
    it('parses flashcards with hints', () => {
      const input = `[
        {
          "front": "What is thrust?",
          "back": "Force from expelled mass",
          "hint": "Think Newton's 3rd law",
          "difficulty": "easy"
        }
      ]`
      const result = parseGeminiJsonArray(input) as Array<Record<string, unknown>>
      expect(result).toHaveLength(1)
      expect(result[0].front).toBe('What is thrust?')
      expect(result[0].hint).toBe("Think Newton's 3rd law")
    })

    it('parses multiple flashcards', () => {
      const input = `[
        {"front": "Q1", "back": "A1", "difficulty": "easy"},
        {"front": "Q2", "back": "A2", "difficulty": "medium"},
        {"front": "Q3", "back": "A3", "difficulty": "hard"}
      ]`
      const result = parseGeminiJsonArray(input) as Array<Record<string, unknown>>
      expect(result).toHaveLength(3)
    })

    it('handles LaTeX in flashcard content', () => {
      const input = `[{
        "front": "What is the thrust equation?",
        "back": "F_{thrust} = \\\\dot{m} \\\\times v_{exhaust}"
      }]`
      const result = parseGeminiJsonArray(input) as Array<Record<string, unknown>>
      expect(result[0].back).toContain('\\dot{m}')
    })
  })

  describe('error handling', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleSpy.mockRestore()
    })

    it('throws on completely invalid input', () => {
      const input = 'This is not JSON at all'
      expect(() => parseGeminiJsonArray(input)).toThrow('Could not extract valid JSON')
    })

    it('throws on malformed JSON', () => {
      const input = '[{"front": "Q1", back: "A1"}]' // missing quotes on key
      expect(() => parseGeminiJsonArray(input)).toThrow('Could not extract valid JSON')
    })

    it('throws on empty input', () => {
      const input = ''
      expect(() => parseGeminiJsonArray(input)).toThrow('Could not extract valid JSON')
    })

    it('throws on truncated JSON with no valid structure', () => {
      const input = '[{"front": "Q1", "ba'
      expect(() => parseGeminiJsonArray(input)).toThrow('Could not extract valid JSON')
    })
  })
})
