/**
 * F10-16 — React error boundary that reports to Sentry
 *
 * Client component wrapping page sections. Captures errors via
 * Sentry.captureException, shows fallback UI with "Try again" button,
 * and logs to the structured logger (Axiom-compatible).
 *
 * Source: MEP Phase 10 F10-16, PAD §18.1, §28 (Error Handling).
 */

'use client';

import { Component, type ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Report to Sentry
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });

    // Log to structured logger (Axiom via console.error)
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'React error boundary caught error',
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        componentStack: errorInfo.componentStack,
      }),
    );
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6 px-6">
          <div className="text-center">
            <p
              className="text-xs uppercase tracking-[0.2em] text-stone-500"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Something went wrong
            </p>
            <h1
              className="mt-2 font-display text-3xl font-light text-stone-900"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              We hit an unexpected error
            </h1>
            <p className="mt-2 text-sm text-stone-500">
              The error has been reported. Please try again.
            </p>
          </div>
          <Button onClick={this.handleReset} variant="outline">
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
