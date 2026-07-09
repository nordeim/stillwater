/**
 * F8-29 — send.ts tests (EMAIL-004, EMAIL-005)
 *
 * Verifies the dual-path email sending helper:
 * - sendEmail(): local JSX render (for Next.js Server Components)
 * - sendEmailNative(): Resend Native Templates (for Trigger.dev workers)
 *
 * Per ADR-010 (Accepted 2026-07-09):
 * - Workers use sendEmailNative() to avoid 1.8MB React Email v6 bundle
 * - Server Components use sendEmail() (no strict CPU budget)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Resend SDK
const mockEmailsSend = vi.fn();
vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = { send: mockEmailsSend };
  },
}));

// Mock react-email's render function
const mockRender = vi.fn();
vi.mock('react-email', () => ({
  render: (...args: unknown[]) => mockRender(...args),
}));

describe('sendEmail (local JSX render — Server Components)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.EMAIL_FROM = 'hello@stillwater.studio';
  });

  it('renders template to HTML and sends via Resend', async () => {
    const { sendEmail } = await import('./send');
    mockRender.mockReturnValue('<html>Rendered email</html>');
    mockEmailsSend.mockResolvedValue({ id: 'email_123' });

    const MockTemplate = (props: { name: string }) => <div>Hi {props.name}</div>;

    await sendEmail(MockTemplate, { name: 'Jane' }, {
      to: 'jane@example.com',
      subject: 'Test Subject',
    });

    // Template was rendered with props
    expect(mockRender).toHaveBeenCalledTimes(1);
    // Resend was called with HTML output
    expect(mockEmailsSend).toHaveBeenCalledWith({
      from: 'hello@stillwater.studio',
      to: 'jane@example.com',
      subject: 'Test Subject',
      html: '<html>Rendered email</html>',
    });
  });

  it('returns null when RESEND_API_KEY is not set (null fallback)', async () => {
    delete process.env.RESEND_API_KEY;
    const { sendEmail } = await import('./send');
    const MockTemplate = () => <div>Test</div>;

    const result = await sendEmail(MockTemplate, {}, {
      to: 'test@example.com',
      subject: 'Test',
    });

    expect(result).toBeNull();
    expect(mockEmailsSend).not.toHaveBeenCalled();
  });
});

describe('sendEmailNative (Resend Native Templates — Trigger.dev workers)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.EMAIL_FROM = 'hello@stillwater.studio';
  });

  it('sends templateId + variables via Resend Native Templates API', async () => {
    const { sendEmailNative } = await import('./send');
    mockEmailsSend.mockResolvedValue({ id: 'email_456' });

    await sendEmailNative(
      'booking-confirmation',
      { memberName: 'Jane', className: 'Vinyasa', sessionDate: '2026-07-10' },
      { to: 'jane@example.com', subject: "You're booked: Vinyasa on 2026-07-10" },
    );

    // Should NOT call render — zero bundle bloat
    expect(mockRender).not.toHaveBeenCalled();
    // Should send template object with id + variables to Resend (Native Templates API)
    expect(mockEmailsSend).toHaveBeenCalledWith({
      from: 'hello@stillwater.studio',
      to: 'jane@example.com',
      subject: "You're booked: Vinyasa on 2026-07-10",
      template: { id: 'booking-confirmation', variables: { memberName: 'Jane', className: 'Vinyasa', sessionDate: '2026-07-10' } },
    });
  });

  it('returns null when RESEND_API_KEY is not set (null fallback)', async () => {
    delete process.env.RESEND_API_KEY;
    const { sendEmailNative } = await import('./send');

    const result = await sendEmailNative(
      'welcome-member',
      { name: 'Jane' },
      { to: 'jane@example.com', subject: 'Welcome' },
    );

    expect(result).toBeNull();
    expect(mockEmailsSend).not.toHaveBeenCalled();
  });
});
