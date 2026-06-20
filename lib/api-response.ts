/**
 * Standardized JSON error response for API routes.
 */
export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/**
 * Standardized JSON success response for API routes.
 */
export function jsonSuccess<T extends Record<string, unknown>>(data: T): Response {
  return Response.json(data);
}
