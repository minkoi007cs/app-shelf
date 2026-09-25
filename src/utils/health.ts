/**
 * Utility function to interpret HTTP status code for health checks.
 */

export function interpretHealth(httpCode: number | undefined): 'healthy' | 'failed' {
  if (httpCode === undefined) return 'healthy';
  if (httpCode >= 200 && httpCode < 400) return 'healthy';
  if (httpCode === 401 || httpCode === 403) return 'healthy';
  return 'failed';
}
