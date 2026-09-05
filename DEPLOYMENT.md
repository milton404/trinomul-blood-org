# Production Deployment Guide

## Prerequisites

- Node.js 18+ installed
- Git installed and configured
- Vercel account (recommended) or other Node.js hosting
- PostgreSQL (optional, for production database)

## Environment Variables

### Required Variables

```bash
# JWT signing secret (generate with: openssl rand -base64 32)
AUTH_SECRET=your-32-byte-secret-here

# Site URL (for SEO, sitemaps, absolute URLs)
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### Optional Variables

```bash
# AI Providers (for AI-powered features)
DEEPSEEK_API_KEY=your-deepseek-key
ZHIPU_API_KEY=your-zhipu-key

# Cloudinary (for image uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-upload-preset
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Supabase (for database)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# reCAPTCHA (for spam protection)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-site-key
```

## Deployment Steps

### 1. Initialize Git Repository

```bash
# If not already initialized
git init
git add .
git commit -m "Initial commit"

# Add remote (if using GitHub)
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

### 2. Deploy to Vercel (Recommended)

The project includes a `vercel.json` configuration file with optimized settings.

#### Quick Deploy (CLI)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project root
vercel

# Deploy to production
vercel --prod
```

#### Dashboard Deploy

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Configure environment variables in Vercel dashboard
5. Deploy

#### Vercel Configuration (`vercel.json`)

The included `vercel.json` configures:

| Setting | Value | Purpose |
|---------|-------|---------|
| Framework | `nextjs` | Next.js 16 with App Router |
| Region | `sin1` (Singapore) | Closest to Bangladesh for low latency |
| Output | `standalone` | Optimized production build |
| Cron | `/api/health` every 5 min | Keep functions warm + health monitoring |
| Security Headers | Global | HSTS, X-Frame-Options, CSP, etc. |
| Function Limits | Per-route | AI routes get 60s, voice chat gets 300s |

#### Function Duration Limits

| Route | Max Duration | Reason |
|-------|-------------|--------|
| `/api/health` | 10s | Quick health check |
| `/api/auth/*` | 30s | Login/register with bcrypt |
| `/api/blood-requests` | 30s | Form submission + DB write |
| `/api/ai/insights` | 60s | AI provider call |
| `/api/ai/forecast` | 60s | AI forecasting |
| `/api/ai/anomaly` | 60s | Anomaly detection |
| `/api/voice-chat` | 300s | Streaming TTS (5 min max) |

> **Note:** Function durations >60s require Vercel Pro plan.

#### Environment Variables in Vercel

Set these in Vercel Dashboard → Settings → Environment Variables:

```env
# Required
AUTH_SECRET=<generate with: openssl rand -base64 32>
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app

# Database (Production - Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_TYPE=postgresql

# Redis (Vercel KV or Upstash Redis)
REDIS_URL=redis://your-redis-url
KV_REST_API_URL=your-upstash-url
KV_REST_API_TOKEN=your-upstash-token

# AI Providers
DEEPSEEK_API_KEY=your-deepseek-key
ZHIPU_API_KEY=your-zhipu-key

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-upload-preset
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# reCAPTCHA
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-site-key

# Migrations
RUN_MIGRATIONS_ON_STARTUP=true
```

#### Vercel KV (Redis) Setup

1. Go to Vercel Dashboard → Storage → Create KV
2. Copy the `REDIS_URL` environment variable
3. Add it to your project's environment variables

#### Custom Domain

1. Go to Vercel Dashboard → Settings → Domains
2. Add your domain (e.g., `trinomulbloodbank.org`)
3. Configure DNS records as instructed
4. Update `NEXT_PUBLIC_SITE_URL` to your custom domain

#### Vercel Analytics (Optional)

```bash
npm i @vercel/analytics @vercel/speed-insights
```

Add to `app/layout.tsx`:

```tsx
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

// In <body>
<Analytics />
<SpeedInsights />
```

### 3. Deploy to Other Platforms

#### Docker (Generic)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

#### Railway / Render / Fly.io

Follow platform-specific guides for Next.js deployment.

### 3. Deploy with Docker

```bash
# Build the image
docker build -t trinomul-blood-bank .

# Run the container
docker run -p 3000:3000 --env-file .env trinomul-blood-bank

# Or use docker-compose
docker-compose up -d
```

### 4. GitHub Actions CI/CD

The project includes a CI/CD workflow at `.github/workflows/ci-cd.yml` that:

1. Runs tests and linting on every push/PR
2. Builds and pushes Docker images to Docker Hub and GitHub Container Registry
3. Deploys to Vercel on main branch pushes
4. Deploys Docker images to your server via SSH

**Required GitHub Secrets:**
- `DOCKER_USERNAME` / `DOCKER_PASSWORD` - Docker Hub credentials
- `VERCEL_TOKEN` - Vercel API token
- `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` - Vercel project IDs
- `SERVER_HOST` / `SERVER_USERNAME` / `SERVER_SSH_KEY` - SSH credentials for server deployment

## Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] `AUTH_SECRET` set in production (32+ bytes)
- [ ] Database migrations run
- [ ] SSL/HTTPS enabled
- [ ] Custom domain configured
- [ ] Backup strategy in place
- [ ] Error tracking configured (Sentry)
- [ ] Analytics configured

## Post-Deployment

### 1. Verify Health Check

```bash
curl https://your-domain.com/api/health
```

Expected response: `{"status":"healthy",...}`

### 2. Test Key Functionality

- User registration and login
- Blood request submission
- Donor search
- Admin panel access

### 3. Monitor Performance

- Check Vercel Analytics
- Monitor Core Web Vitals
- Set up error tracking alerts

## Security Checklist for Production

1. **Environment Variables**
   - [ ] `AUTH_SECRET` is set and is 32+ bytes
   - [ ] No secrets in client-side code (no `NEXT_PUBLIC_` prefix for secrets)
   - [ ] `.env` file is gitignored

2. **Authentication**
   - [ ] HTTPS enabled
   - [ ] Cookies set with `Secure` flag in production
   - [ ] Session expiration configured (24h default)

3. **API Security**
   - [ ] Rate limiting enabled
   - [ ] CSRF protection active
   - [ ] Input validation on all endpoints

4. **Database**
   - [ ] WAL mode enabled (default in this app)
   - [ ] Regular backups configured
   - [ ] Connection pooling (if using PostgreSQL)

5. **Headers**
   - [ ] CSP configured
   - [ ] HSTS enabled
   - [ ] X-Frame-Options: DENY

## Monitoring & Maintenance

### Error Tracking (Sentry)

Add to `next.config.ts`:
```typescript
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig = {
  // ... your config
};

export default withSentryConfig(nextConfig, {
  org: 'your-org',
  project: 'your-project',
});
```

### Analytics

- Vercel Analytics: Built-in
- Google Analytics: Add to `layout.tsx`
- Custom events: Use `lib/logging/logger.ts`

### Performance Monitoring

```typescript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout() {
  return (
    <html>
      <body>
        {/* ... */}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

## Backup Strategy

### Database Backups

#### SQLite (Current Setup)
```bash
# Daily backup script
cp /path/to/data/bloodbank.db /path/to/backup/bloodbank-$(date +%Y%m%d).db
```

#### Supabase/PostgreSQL (Production)
1. Create a Supabase project at https://supabase.com
2. Enable Point-in-Time Recovery (PITR) for continuous backups
3. Set up replication for high availability
4. Export schema regularly:
```bash
pg_dump -h $SUPABASE_HOST -U postgres -d postgres --schema-only > schema.sql
```

### Required Supabase Tables

Run these SQL scripts in the Supabase SQL Editor:

```sql
-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name_en TEXT,
  full_name_bn TEXT,
  phone TEXT,
  blood_group TEXT,
  role TEXT DEFAULT 'donor' CHECK(role IN ('donor', 'patient', 'hospital', 'admin', 'super_admin')),
  avatar_url TEXT,
  district TEXT,
  upazila TEXT,
  address TEXT,
  date_of_birth TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blood requests table
CREATE TABLE IF NOT EXISTS blood_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name TEXT NOT NULL,
  blood_group TEXT NOT NULL,
  hospital_name TEXT NOT NULL,
  hospital_address TEXT,
  district TEXT NOT NULL,
  upazila TEXT NOT NULL,
  urgency_level TEXT DEFAULT 'normal',
  when_needed TEXT DEFAULT 'now',
  needed_date DATE,
  needed_time TIME,
  units_needed INTEGER DEFAULT 1,
  reason TEXT,
  phone TEXT,
  contact_number TEXT,
  alternative_number TEXT,
  whatsapp_number TEXT,
  lat FLOAT,
  lng FLOAT,
  tracking_code TEXT UNIQUE,
  status TEXT DEFAULT 'active',
  current_status TEXT DEFAULT 'submitted',
  is_last_chance BOOLEAN DEFAULT FALSE,
  show_fulfilled_badge BOOLEAN DEFAULT TRUE,
  admin_notice TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_requests ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_profiles_blood_group ON profiles(blood_group);
CREATE INDEX idx_profiles_district ON profiles(district);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_blood_requests_status ON blood_requests(status);
CREATE INDEX idx_blood_requests_blood_group ON blood_requests(blood_group);
CREATE INDEX idx_blood_requests_district ON blood_requests(district);
```

### File Backups

- Cloudinary: Automatic (cloud storage)
- User uploads: Cloudinary handles

## Scaling Considerations

### Vertical Scaling (Vercel)
- Pro plan: 2x CPU, 2GB RAM
- Enterprise: Custom resources

### Horizontal Scaling
- Use Redis for distributed rate limiting
- Use PostgreSQL for multi-instance database
- Consider edge functions for global performance

## Troubleshooting

### Build Errors

```bash
# Clear cache
rm -rf .next
npm run build
```

### Database Issues

```bash
# Check database file
ls -la data/

# Verify WAL mode
sqlite3 data/bloodbank.db "PRAGMA journal_mode;"
```

### Environment Variable Issues

```bash
# Verify in production
node -e "console.log(process.env.NEXT_PUBLIC_SITE_URL)"
```

## Support

- Documentation: [docs.trinomul.org](https://docs.trinomul.org)
- Issues: [GitHub Issues](https://github.com/yourusername/your-repo/issues)
- Email: support@trinomul.org