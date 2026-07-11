/**
 * F10-06 — Logger test suite
 *
 * Tests:
 *   - logger.info sends structured JSON to console.info
 *   - Error logs include stack trace
 *   - Log context (userId, requestId) is included
 *
 * Source: MEP Phase 10 F10-06.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { logger } from './logger';

describe('F10-06: Structured logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'info').mockImplementation(() => { /* mock */ });
    vi.spyOn(console, 'error').mockImplementation(() => { /* mock */ });
    vi.spyOn(console, 'warn').mockImplementation(() => { /* mock */ });
    vi.spyOn(console, 'debug').mockImplementation(() => { /* mock */ });
  });

  it('logger.info sends structured JSON to console.info', () => {
    logger.info('Test message', { userId: 'u1' });

    expect(console.info).toHaveBeenCalledTimes(1);
    const json = (console.info as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    const entry = JSON.parse(json);

    expect(entry.level).toBe('info');
    expect(entry.message).toBe('Test message');
    expect(entry.userId).toBe('u1');
    expect(entry.timestamp).toBeDefined();
  });

  it('error logs include stack trace', () => {
    const error = new Error('Test error');
    logger.error('Something failed', { requestId: 'r1' }, error);

    expect(console.error).toHaveBeenCalledTimes(1);
    const json = (console.error as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    const entry = JSON.parse(json);

    expect(entry.level).toBe('error');
    expect(entry.error).toBeDefined();
    expect(entry.error.name).toBe('Error');
    expect(entry.error.message).toBe('Test error');
    expect(entry.error.stack).toBeDefined();
    expect(entry.requestId).toBe('r1');
  });

  it('warn logs go to console.warn', () => {
    logger.warn('Warning message');

    expect(console.warn).toHaveBeenCalledTimes(1);
    const json = (console.warn as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    const entry = JSON.parse(json);

    expect(entry.level).toBe('warn');
    expect(entry.message).toBe('Warning message');
  });

  it('debug logs go to console.debug', () => {
    logger.debug('Debug message', { component: 'test' });

    expect(console.debug).toHaveBeenCalledTimes(1);
    const json = (console.debug as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    const entry = JSON.parse(json);

    expect(entry.level).toBe('debug');
    expect(entry.component).toBe('test');
  });

  it('includes arbitrary context fields', () => {
    logger.info('User action', {
      userId: 'u1',
      sessionId: 's1',
      requestId: 'r1',
      action: 'book_class',
      classId: 'c1',
    });

    const json = (console.info as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    const entry = JSON.parse(json);

    expect(entry.userId).toBe('u1');
    expect(entry.sessionId).toBe('s1');
    expect(entry.requestId).toBe('r1');
    expect(entry.action).toBe('book_class');
    expect(entry.classId).toBe('c1');
  });
});
