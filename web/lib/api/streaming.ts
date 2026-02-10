/**
 * SSE (Server-Sent Events) streaming helpers for AI responses.
 * Consolidates duplicate streaming patterns across conversation and gemini routes.
 */

/**
 * Create a TextEncoder instance for SSE streaming
 */
export function createSSEEncoder(): TextEncoder {
  return new TextEncoder()
}

/**
 * Encode an SSE data message
 */
export function encodeSSEMessage(encoder: TextEncoder, data: object | string): Uint8Array {
  const payload = typeof data === 'string' ? data : JSON.stringify(data)
  return encoder.encode(`data: ${payload}\n\n`)
}

/**
 * Encode the SSE done message
 */
export function encodeSSEDone(encoder: TextEncoder): Uint8Array {
  return encoder.encode('data: [DONE]\n\n')
}

/**
 * Create standard SSE response headers
 */
export function getSSEHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  }
}

/**
 * Create an SSE Response with proper headers
 */
export function createSSEResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: getSSEHeaders(),
  })
}

/**
 * Helper type for stream chunk data
 */
export interface StreamChunk {
  type: 'chunk' | 'suggestions' | 'done' | 'error'
  data?: string | string[] | object
}

/**
 * Process a generator and send chunks via SSE
 * Returns the accumulated full response
 */
export async function processStreamToSSE(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  generator: AsyncGenerator<{ type: string; data: unknown }>,
  options?: {
    onChunk?: (chunk: string) => void
    onSuggestions?: (suggestions: string[]) => void
    onDone?: (fullResponse: string) => void
  }
): Promise<string> {
  let fullResponse = ''

  try {
    for await (const chunk of generator) {
      if (chunk.type === 'chunk') {
        const text = chunk.data as string
        fullResponse += text
        controller.enqueue(encodeSSEMessage(encoder, { chunk: text }))
        options?.onChunk?.(text)
      } else if (chunk.type === 'suggestions') {
        const suggestions = chunk.data as string[]
        controller.enqueue(encodeSSEMessage(encoder, { suggestions }))
        options?.onSuggestions?.(suggestions)
      }
    }

    options?.onDone?.(fullResponse)
    return fullResponse
  } catch (error) {
    controller.enqueue(encodeSSEMessage(encoder, { error: 'Stream error' }))
    throw error
  }
}
