/**
 * Safe ID generation utilities to prevent collisions and PostgREST filter injection vulnerabilities.
 */

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function slugifyId(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
