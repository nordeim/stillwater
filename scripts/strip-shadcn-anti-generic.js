#!/usr/bin/env node
/**
 * Strip anti-generic violations from shadcn components — SAFER version.
 * Only touches content inside double-quoted string literals (className values).
 * Does NOT touch import statements or JSX structure.
 *
 * Per SKILL §1.3 + §5.5:
 *   - Remove shadow-sm, shadow-md, shadow-lg, shadow-xl (no drop shadows on cards)
 *   - Replace rounded-lg, rounded-md, rounded-xl, rounded-2xl with rounded-none (--radius: 0)
 *   - Keep rounded-full (avatars, status dots) and rounded-sm (tab indicators)
 */
const fs = require('fs');
const path = require('path');

const uiDir = path.join(__dirname, '..', 'apps', 'web', 'src', 'components', 'ui');
const files = fs.readdirSync(uiDir).filter(f => f.endsWith('.tsx'));

let totalPatches = 0;

// Regex: match double-quoted strings, then patch their contents
// This avoids touching import statements (which use quotes but aren't className strings)
// We process string-by-string to be safe.
function patchClassString(str) {
  let patched = str;
  let count = 0;
  // Remove shadow-* (except shadow-xs which is sometimes used for subtle elevation)
  patched = patched.replace(/\bshadow-sm\b/g, () => { count++; return ''; });
  patched = patched.replace(/\bshadow-md\b/g, () => { count++; return ''; });
  patched = patched.replace(/\bshadow-lg\b/g, () => { count++; return ''; });
  patched = patched.replace(/\bshadow-xl\b/g, () => { count++; return ''; });
  patched = patched.replace(/\bshadow-2xl\b/g, () => { count++; return ''; });
  // Replace rounded-* (except rounded-full and rounded-sm) with rounded-none
  patched = patched.replace(/\brounded-lg\b/g, () => { count++; return 'rounded-none'; });
  patched = patched.replace(/\brounded-md\b/g, () => { count++; return 'rounded-none'; });
  patched = patched.replace(/\brounded-xl\b/g, () => { count++; return 'rounded-none'; });
  patched = patched.replace(/\brounded-2xl\b/g, () => { count++; return 'rounded-none'; });
  // Clean up double spaces within the string (from removals)
  patched = patched.replace(/  +/g, ' ').trim();
  return { patched, count };
}

for (const file of files) {
  const filePath = path.join(uiDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  let filePatches = 0;

  // Find all double-quoted strings and patch those that look like className values
  // (contain at least one class-like token: word-dash-word pattern)
  content = content.replace(/"([^"]*)"/g, (fullMatch, inner) => {
    // Only patch strings that look like class names (contain spaces or class patterns)
    if (!inner.includes(' ') && !/\b(rounded|shadow|bg-|text-|border|p-|m-|flex|grid)/.test(inner)) {
      return fullMatch;
    }
    const { patched, count } = patchClassString(inner);
    filePatches += count;
    return `"${patched}"`;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`  ✓ ${file}: ${filePatches} patch(es)`);
    totalPatches += filePatches;
  } else {
    console.log(`  - ${file}: no changes needed`);
  }
}

console.log(`\nTotal: ${totalPatches} patches across ${files.length} files`);
