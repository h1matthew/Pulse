 GET /api/achievements 200 in 390ms (compile: 3ms, proxy.ts: 131ms, render: 256ms)
Failed to parse Gemini JSON response: [
  {
    "front": "Explain the primary function of the nose cone on a rocket and why its shape is important.",
    "back": "The nose cone's main job is to reduce aerodynamic drag as the rocket moves through the atmosphere. Its pointy shape minimizes air resistance, allowing the rocket to move more efficiently. A more aerodynamic shape reduces the force opposing the rocket's motion.",
    "difficulty": "medium"
  },
  {
    "front": "What role does the body tube play in the overall structure and
Error generating flashcards: Error: Could not extract valid JSON from response
    at parseGeminiJsonArray (lib\gemini.ts:417:9)
    at generateFlashcards (lib\gemini.ts:330:22)
    at async POST (app\api\flashcards\generate\route.ts:48:28)
  415 |   // All strategies failed
  416 |   console.error('Failed to parse Gemini JSON response:', text.substring(0, 500))
> 417 |   throw new Error('Could not extract valid JSON from response')
      |         ^
  418 | }
  419 |
  420 | /**
 POST /api/flashcards/generate 500 in 9.2s (compile: 357ms, proxy.ts: 900ms, render: 8.0s)

 