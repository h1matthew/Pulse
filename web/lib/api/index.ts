/**
 * API helper utilities
 * Re-exports common functions for API route handlers
 */

export { requireAuth, getAuth, type AuthResult } from './withAuth'
export { requireAdmin, type AdminAuthResult } from './withAdmin'
export {
  createSSEEncoder,
  encodeSSEMessage,
  encodeSSEDone,
  getSSEHeaders,
  createSSEResponse,
  processStreamToSSE,
  type StreamChunk,
} from './streaming'
