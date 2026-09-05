# Security Checklist — Trinomul Blood Bank Rangpur

## Frontend Security

### 1. Content Security Policy (CSP)
- [x] Implement strict CSP headers
- [x] Restrict `script-src` to self + nonce
- [x] Restrict `style-src` to self + inline (Tailwind requires)
- [x] Restrict `img-src` to self + cloudinary + data:
- [x] Restrict `connect-src` to self + API endpoints
- [x] Set `frame-ancestors 'none'` (clickjacking prevention)
- [x] Set `base-uri 'self'`
- [x] Set `form-action 'self'`

### 2. Security Headers
- [x] `X-Frame-Options: DENY` (clickjacking)
- [x] `X-Content-Type-Options: nosniff` (MIME sniffing)
- [x] `Strict-Transport-Security` (HSTS) — max-age=63072000; includeSubDomains; preload
- [x] `Referrer-Policy: strict-origin-when-cross-origin`
- [x] `Permissions-Policy` — restrict camera, microphone, geolocation
- [x] `X-DNS-Prefetch-Control: off`
- [x] `X-Permitted-Cross-Domain-Policies: none`

### 3. API Key / Secret Leak Prevention
- [x] Never expose server secrets with `NEXT_PUBLIC_` prefix
- [x] `.env` file is gitignored (verify in `.gitignore`)
- [x] Cloudinary uploads use signed server-side signatures
- [x] AI API keys (DeepSeek, Zhipu) only used server-side
- [x] Supabase service role key never sent to client
- [x] AUTH_SECRET required in production
- [x] No hardcoded secrets in source code

### 4. XSS Prevention
- [x] React escapes all rendered content by default
- [x] Input sanitization utility for user-generated content
- [x] No use of `dangerouslySetInnerHTML` without sanitization
- [x] Content Security Policy blocks inline scripts
- [x] All API responses validated before rendering

### 5. CSRF Protection
- [x] SameSite cookie attribute set to "lax"
- [x] Origin/Referer header validation on mutations
- [x] Session-based CSRF tokens for sensitive operations

### 6. Authentication & Session Security
- [x] JWT tokens signed with HS256
- [x] HTTP-only cookies (not accessible via JS)
- [x] Secure flag in production (HTTPS only)
- [x] SameSite attribute to prevent CSRF
- [x] Session expiration (24h default, 30d with remember)
- [x] Rate limiting on auth endpoints
- [x] Server-side route protection in middleware
- [x] Role-based access control (admin/super_admin)

### 7. Rate Limiting
- [x] API endpoints have per-IP rate limits
- [x] Auth endpoints have attempt lockout
- [x] Voice chat: 20 requests / 10 minutes
- [x] Cloudinary sign: 30 requests / 10 minutes
- [x] Failed auth attempts trigger lockout

### 8. Input Validation
- [x] All API inputs validated (type, length, format)
- [x] File upload size limits enforced
- [x] Content type allowlists for uploads
- [x] SQL injection prevention via parameterized queries
- [x] Phone number / email format validation

### 9. Data Protection
- [x] Passwords hashed with bcrypt
- [x] No sensitive data in URL parameters
- [x] No sensitive data in error messages
- [x] Server-side data access controls
- [x] PII handling minimized

### 10. Infrastructure Security
- [x] HTTPS enforced in production
- [x] Standalone output for deployment
- [x] No debug information in production
- [x] Dependency vulnerabilities monitored

## Implementation Files
- `lib/security/headers.ts` — Security header utilities
- `lib/security/sanitize.ts` — Input sanitization utilities
- `lib/security/csrf.ts` — CSRF protection
- `middleware.ts` — Security headers + route protection

## Critical Findings (Fixed)
1. **No security headers** → Added comprehensive headers in middleware
2. **No CSP** → Added strict Content Security Policy
3. **No CSRF protection** → Added origin validation
4. **No input sanitization utility** → Created sanitize module

## Remaining Recommendations
1. Rotate all API keys after this commit (DeepSeek, Zhipu, Cloudinary)
2. Set a strong `AUTH_SECRET` in production (32+ bytes)
3. Enable Vercel DDoS protection
4. Set up Sentry/monitoring for security events
5. Run `npm audit` regularly
6. Consider adding a Web Application Firewall (WAF)