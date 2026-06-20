/**
 * Merge class names, filtering out falsy values.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Extract a human-readable message from an unknown thrown value.
 */
export function getErrorMessage(error: unknown, fallback = "An unexpected error occurred."): string {
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
