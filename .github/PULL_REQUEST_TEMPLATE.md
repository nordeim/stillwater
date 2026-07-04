## Summary

<!-- Brief description of what this PR does and why -->

## Related Issue

<!-- Link to issue, e.g., Closes #123 -->

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactor (no functional changes)

## Architecture Validation Checklist

### Security
- [ ] All new tRPC procedures have correct access level (public/protected/staff/owner)
- [ ] All new inputs validated with Zod schema
- [ ] No secrets introduced in client-side code
- [ ] New API routes have rate limiting if needed

### Data
- [ ] New DB columns have appropriate NOT NULL constraints or defaults
- [ ] New indexes added for any new query patterns
- [ ] Migration is reversible (rollback script provided in comments below)
- [ ] ERD updated in PAD §7 if new entities added

### Performance
- [ ] No N+1 queries introduced
- [ ] New pages follow the Rendering Strategy Map (PAD §12)
- [ ] Images use next/image with explicit dimensions
- [ ] Bundle size budget not exceeded

### Reliability
- [ ] Side effects (email, notifications) moved to background jobs
- [ ] Stripe webhook handlers are idempotent
- [ ] New job tasks have appropriate timeout + retry config

### Accessibility
- [ ] New components have associated accessibility tests
- [ ] Color contrast meets 7:1 ratio for text (WCAG 2.2 AAA)
- [ ] Keyboard navigation tested manually

### Documentation
- [ ] PAD updated if architecture changed
- [ ] ADR added if significant decision was made
- [ ] `.env.example` updated if new env var introduced
- [ ] `MASTER_EXECUTION_PLAN.md` updated with phase completion timestamp

## Migration Rollback Script

<!-- If this PR includes a DB migration, provide the rollback SQL here -->

```sql
-- Rollback: <description>
-- DROP TABLE IF EXISTS ...
-- ALTER TABLE ... DROP COLUMN ...
```

## Screenshots

<!-- If UI changes, add before/after screenshots -->

## Test Evidence

<!-- Paste the raw output of the quality gate commands -->
```bash
pnpm check-types  # exit 0
pnpm lint         # exit 0
pnpm test         # 0 failures
pnpm build        # exit 0
```
