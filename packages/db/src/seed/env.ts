/**
 * Seed environment loader
 *
 * Loads .env.local from the monorepo root so that the seed script and any
 * other script that imports '@stillwater/db' gets DATABASE_URL.
 *
 * Must be imported before any module that reads process.env, especially
 * before '@stillwater/db'.
 */

import { config } from 'dotenv';
import { resolve } from 'node:path';

if (!process.env['DATABASE_URL']) {
  config({ path: resolve(import.meta.dirname, '../../../../.env.local') });
}
