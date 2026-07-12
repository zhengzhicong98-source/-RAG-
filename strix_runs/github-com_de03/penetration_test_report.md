# Security Penetration Test Report

**Generated:** 2026-07-12 10:44:53 UTC

# Executive Summary

A comprehensive white-box security assessment was performed on the legal-assistant application, a Taro/React-based WeChat miniapp with a Supabase backend (PostgreSQL, Edge Functions, Auth, Storage). The assessment identified and remediated five security vulnerabilities:

- **1 High-severity** vulnerability: Missing authorization in an Edge Function that bypasses Row-Level Security, allowing any authenticated user to modify the legal knowledge base.
- **4 Medium-severity** vulnerabilities: Overly permissive Row-Level Security policies allowing anonymous writes to three database tables and anonymous file uploads to the contracts storage bucket.

All vulnerabilities have been remediated through code patches and new database migration policies. The application's security posture has been significantly improved by enforcing proper authorization checks in serverless functions and tightening database access controls.

# Methodology

The assessment followed OWASP Web Security Testing Guide (WSTG) methodology adapted for a white-box engagement with source code access. The approach included:

- **Phase 1 — Static Analysis**: Full repository source code review of 28 database migration files, 12 Supabase Edge Functions, and client-side code. Automated scanning with gitleaks, trufflehog, and semgrep complemented manual code review.
- **Phase 2 — Authorization Review**: Systematic evaluation of all authenticated endpoints and RLS policies across the entire database schema to identify missing authorization checks and overly permissive access controls.
- **Phase 3 — Edge Function Review**: In-depth analysis of all 12 Deno-based Edge Functions for authentication, authorization, SSRF, and input validation issues.
- **Phase 4 — Remediation**: Development and verification of targeted fixes including code patches for Edge Functions and new database migration for RLS policy tightening.

# Technical Analysis

## Findings Summary

### 1. Missing Authorization in embed-document Edge Function (High — CWE-862)

The `embed-document` Edge Function authenticates users via JWT but uses the database service_role key (which bypasses all Row-Level Security) for all operations. The function never verified whether the authenticated user held an admin or moderator role before allowing create, update, or delete operations on the `legal_knowledge` table — the knowledge base that powers the AI legal chat system.

**Root cause**: The function manually verified the JWT token but then created a service_role database client. It never imported or used the `requireAdmin` helper available in `_shared/auth.ts`. The RLS policies in migration 00026 were tightened to require admin/moderator role for legal_knowledge mutations, but the Edge Function bypassed all RLS by using the service_role key.

**Fix**: Replaced manual JWT authentication with the `requireAuth` helper from `_shared/auth.ts`, and added `requireAdmin(user, req)` checks to the DELETE, PATCH, and POST handlers. The GET handler (read-only) remains accessible to any authenticated user.

### 2-5. Overly Permissive RLS Policies (Medium — CWE-862)

Four database tables had INSERT policies that allowed unauthenticated writes:

| Table | Original Policy | Impact |
|---|---|---|
| `quality_scores` | `FOR INSERT WITH CHECK (true)` | Anonymous quality scoring data injection |
| `trace_logs` | `FOR INSERT WITH CHECK (true)` | Anonymous trace log injection |
| `ai_call_logs` | `FOR INSERT WITH CHECK (... OR user_id IS NULL)` | Unlinked log injection |
| `storage.objects (contracts)` | `FOR INSERT WITH CHECK (bucket_id = 'contracts')` | Anonymous file uploads |

**Fix**: Created migration `00029_fix_rls_policies.sql` that tightens all four policies to require authentication (`auth.role() = 'authenticated'`), removes the `user_id IS NULL` fallback for `ai_call_logs`, and restores authenticated-only uploads to the contracts storage bucket.

# Recommendations

## Remediated Issues (All Fixed)

### Immediate
- **Missing authorization in embed-document Edge Function** — Fixed by adding `requireAdmin` checks to all mutation handlers (DELETE, PATCH, POST). The function now properly uses the shared `requireAuth`/`requireAdmin` auth framework.

### Short-term
- **quality_scores anonymous INSERT** — Fixed by migration 00029. Policy now requires `auth.role() = 'authenticated'`.
- **trace_logs anonymous INSERT** — Fixed by migration 00029. Policy now requires `auth.role() = 'authenticated'`.
- **ai_call_logs INSERT via NULL user_id** — Fixed by migration 00029. Removed the `OR user_id IS NULL` fallback.
- **contracts bucket anonymous upload** — Fixed by migration 00029. Reinstated `auth.role() = 'authenticated'` check.

### Retest Guidance
- Verify the embed-document function rejects mutations from non-admin users while allowing reads from any authenticated user.
- Apply migration 00029 to the Supabase database and verify the four tightened policies block unauthenticated writes.
- Run the full test suite (`pnpm test`) to confirm no regressions.
- Consider a broader review of all Edge Functions to ensure consistent use of the `requireAuth`/`requireAdmin` helpers rather than manual JWT verification.

