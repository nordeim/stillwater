/**
 * V17-8 fix: shared site constants (single source of truth)
 *
 * Centralizes studio address, phone, email, and other contact info so
 * all surfaces (web Footer, JSON-LD, worker emails, future surfaces)
 * use the same value. Previously these were hardcoded in 3 different
 * places with 3 different (sometimes fabricated) values:
 *
 *   - JSON-LD default: '123 SE Division St' (fabricated)
 *   - Worker emails: '123 SE Division Street, Portland, OR 97202' (fabricated)
 *   - Footer (V14-2 corrected): '2847 SE Division Street, Portland, OR 97202'
 *
 * The V14-2 footer value is the mockup-correct one, so it's the canonical
 * value here.
 *
 * Usage:
 *   import { SITE } from '@stillwater/config/site';
 *
 *   // Footer
 *   <p>{SITE.address.full}</p>
 *
 *   // JSON-LD
 *   address: {
 *     streetAddress: SITE.address.street,
 *     addressLocality: SITE.address.city,
 *     ...
 *   }
 *
 *   // Worker email
 *   studioAddress: SITE.address.full,
 *
 * Source: STILLWATER_AUDIT_REPORT.md §7 Finding #9
 */

export interface SiteAddress {
  /** Full one-line address: "2847 SE Division Street, Portland, OR 97202" */
  readonly full: string;
  /** Street only: "2847 SE Division Street" */
  readonly street: string;
  /** City: "Portland" */
  readonly city: string;
  /** Region/state: "OR" */
  readonly region: string;
  /** Postal code: "97202" */
  readonly postalCode: string;
  /** Country: "US" */
  readonly country: string;
}

export interface SiteConstants {
  /** Studio name: "Stillwater Yoga Studio" */
  readonly name: string;
  /** Canonical public app URL (no trailing slash). Used by email templates + OG tags.
   *  V19-8 fix: previously email templates hardcoded 'https://stillwater.studio'
   *  (a domain we don't own). Now they use SITE.url so the URLs point to the
   *  actual deployment (configurable via NEXT_PUBLIC_APP_URL env var). */
  readonly url: string;
  /** Full mailing address */
  readonly address: SiteAddress;
  /** Phone: "(503) 321-4950" */
  readonly phone: string;
  /** Email: "hello@stillwater.studio" */
  readonly email: string;
}

export const SITE: SiteConstants = {
  name: 'Stillwater Yoga Studio',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://stillwater.jesspete.shop',
  address: {
    full: '2847 SE Division Street, Portland, OR 97202',
    street: '2847 SE Division Street',
    city: 'Portland',
    region: 'OR',
    postalCode: '97202',
    country: 'US',
  },
  phone: '(503) 321-4950',
  email: 'hello@stillwater.studio',
};
