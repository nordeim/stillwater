/**
 * F10-06 — Structured logger (Axiom-compatible)
 *
 * Sends structured JSON logs to console (and optionally Axiom via HTTP).
 * All log entries include: timestamp, level, message, and optional context.
 *
 * Source: MEP Phase 10 F10-06, PAD §18.1 (structured logs via Axiom).
 */

import 'server-only';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

function formatLog(level: LogLevel, message: string, ctx?: LogContext, error?: Error): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...ctx,
  };

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return entry;
}

function output(level: LogLevel, entry: LogEntry): void {
  const json = JSON.stringify(entry);

  switch (level) {
    case 'debug':
      console.debug(json);
      break;
    case 'info':
      console.info(json);
      break;
    case 'warn':
      console.warn(json);
      break;
    case 'error':
      console.error(json);
      break;
  }
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => {
    output('debug', formatLog('debug', msg, ctx));
  },

  info: (msg: string, ctx?: LogContext) => {
    output('info', formatLog('info', msg, ctx));
  },

  warn: (msg: string, ctx?: LogContext) => {
    output('warn', formatLog('warn', msg, ctx));
  },

  error: (msg: string, ctx?: LogContext, error?: Error) => {
    output('error', formatLog('error', msg, ctx, error));
  },
};
