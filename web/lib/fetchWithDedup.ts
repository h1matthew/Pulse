/**
 * Request deduplication utility
 *
 * Prevents duplicate concurrent requests to the same endpoint by returning
 * the same Promise for identical in-flight requests. This is particularly
 * useful when React Strict Mode causes double-mounting of components.
 */

const pendingRequests = new Map<string, Promise<Response>>()

/**
 * Fetch wrapper that deduplicates identical concurrent GET requests.
 * If a request to the same URL is already in flight, returns a cloned
 * response from the pending request instead of making a new one.
 *
 * @param url - The URL to fetch
 * @param options - Fetch options (method defaults to GET)
 * @returns Promise<Response> - The fetch response
 */
export async function fetchWithDedup(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const method = options?.method?.toUpperCase() || 'GET'

  // Only deduplicate GET requests - mutations should always execute
  if (method !== 'GET') {
    return fetch(url, options)
  }

  const key = `${method}:${url}`

  // If there's already a pending request, return a cloned response
  const pending = pendingRequests.get(key)
  if (pending) {
    const response = await pending
    // Clone the response so multiple consumers can read the body
    return response.clone()
  }

  // Create the fetch promise and store it
  const fetchPromise = fetch(url, options).then(async (response) => {
    // We need to clone and buffer the response so multiple consumers can read it
    const cloned = response.clone()
    // Read the body to ensure it's buffered
    await cloned.text()
    return response
  })

  pendingRequests.set(key, fetchPromise)

  try {
    const response = await fetchPromise
    return response.clone()
  } finally {
    // Clean up after request completes
    pendingRequests.delete(key)
  }
}
