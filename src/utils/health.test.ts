import { describe, it, expect } from 'vitest';
import { interpretHealth } from './health';

describe('interpretHealth', () => {
  it('returns healthy for 200 OK', () => {
    expect(interpretHealth(200)).toBe('healthy');
  });

  it('returns healthy for 401 and 403 protected routes', () => {
    expect(interpretHealth(401)).toBe('healthy');
    expect(interpretHealth(403)).toBe('healthy');
  });

  it('returns failed for 404 Not Found', () => {
    expect(interpretHealth(404)).toBe('failed');
  });

  it('returns failed for 500 Server Error', () => {
    expect(interpretHealth(500)).toBe('failed');
  });

  it('returns healthy for undefined response code', () => {
    expect(interpretHealth(undefined)).toBe('healthy');
  });
});
