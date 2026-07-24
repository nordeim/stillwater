/**
 * V17-8 fix: shared site constants (single source of truth)
 *
 * VERIFIES that the studio address is centralized in @stillwater/config/site
 * and used consistently across:
 *   - apps/web Footer (FOOTER_ADDRESS in copy.ts)
 *   - apps/web JSON-LD schema (lib/seo/schemas.ts)
 *   - services/workers email templates (class-reminder-24h.ts)
 *
 * V17-8 fix: Previously there were 3 different studio addresses:
 *   - JSON-LD: '123 SE Division St' (fabricated)
 *   - Worker emails: '123 SE Division Street, Portland, OR 97202' (fabricated)
 *   - Footer (V14-2 corrected): '2847 SE Division Street, Portland, OR 97202' (mockup-correct)
 *
 * The fix: centralize in @stillwater/config/site.ts and import everywhere.
 *
 * Source: STILLWATER_AUDIT_REPORT.md §7 Finding #9
 */

import { describe, it, expect } from 'vitest';

import { SITE } from './site';

describe('V17-8: shared site constants (single source of truth)', () => {
  it('exports a SITE constant with address + phone + email', () => {
    expect(SITE).toBeDefined();
    expect(SITE.address).toBeDefined();
    expect(SITE.phone).toBeDefined();
    expect(SITE.email).toBeDefined();
  });

  it('address.full is the V14-2 corrected value (2847 SE Division Street)', () => {
    expect(SITE.address.full).toBe('2847 SE Division Street, Portland, OR 97202');
  });

  it('address.street is just the street part', () => {
    expect(SITE.address.street).toBe('2847 SE Division Street');
  });

  it('address.city is Portland', () => {
    expect(SITE.address.city).toBe('Portland');
  });

  it('address.region is OR', () => {
    expect(SITE.address.region).toBe('OR');
  });

  it('address.postalCode is 97202', () => {
    expect(SITE.address.postalCode).toBe('97202');
  });

  it('address.country is US', () => {
    expect(SITE.address.country).toBe('US');
  });

  it('phone is the V14-2 footer value', () => {
    expect(SITE.phone).toBe('(503) 321-4950');
  });

  it('email is the V14-2 footer value', () => {
    expect(SITE.email).toBe('hello@stillwater.studio');
  });

  // V19-8: SITE.url added for email templates (was hardcoded 'https://stillwater.studio')
  it('exports a url field for email templates (V19-8)', () => {
    expect(SITE.url).toBeDefined();
    expect(typeof SITE.url).toBe('string');
    expect(SITE.url.startsWith('http')).toBe(true);
  });
});
