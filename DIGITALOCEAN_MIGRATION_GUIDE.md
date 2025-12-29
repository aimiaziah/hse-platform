# DigitalOcean Migration Guide
## Migrating from Supabase to DigitalOcean

**Prerequisites:**
- DigitalOcean Student Account with credits
- Supabase project with data
- Git repository

---

## 📋 Step-by-Step Migration

### Step 1: Create DigitalOcean Resources

#### 1.1 Create PostgreSQL Database
```bash
# Go to: https://cloud.digitalocean.com/databases/new
# Select:
# - PostgreSQL version 15 or 16
# - Basic plan: $15/month (1GB RAM, 10GB storage)
# - Region: Closest to your users
# - Datacenter: Choose one

# After creation, note these:
# - Connection String (postgres://...)
# - Host, Port, Database name
# - Username, Password
```

#### 1.2 Setup Database Access
```bash
# Add your IP to trusted sources
# Go to: Database > Settings > Trusted Sources
# Add: 0.0.0.0/0 (all IPs - for development)
# For production: Add only your server IPs

# Enable connection pooling
# Go to: Database > Connection Pools
# Create pool:
#   - Name: app-pool
#   - Mode: Transaction
#   - Size: 25
```

### Step 2: Export from Supabase

#### 2.1 Install Tools
```bash
npm install -g supabase
# OR
brew install supabase/tap/supabase  # macOS
```

#### 2.2 Export Schema
```bash
# Get your Supabase connection string
# Format: postgres://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres

# Export schema only
pg_dump "postgres://postgres:YOUR_PASSWORD@YOUR_PROJECT.supabase.co:5432/postgres" \
  --schema-only \
  --no-owner \
  --no-privileges \
  > schema.sql

# Export data only
pg_dump "postgres://postgres:YOUR_PASSWORD@YOUR_PROJECT.supabase.co:5432/postgres" \
  --data-only \
  --no-owner \
  --no-privileges \
  > data.sql
```

#### 2.3 Alternative: Use Supabase Studio
```bash
# Go to: Supabase Dashboard > Database > Migrations
# Download all migration files
# Copy files from supabase/migrations/ folder
```

### Step 3: Import to DigitalOcean

#### 3.1 Connect to DigitalOcean Database
```bash
# Use connection string from DigitalOcean
psql "postgres://username:password@host:25060/defaultdb?sslmode=require"
```

#### 3.2 Import Schema
```bash
# Import schema
psql "$DIGITALOCEAN_DB_URL" < schema.sql

# OR import migration files one by one
psql "$DIGITALOCEAN_DB_URL" < supabase/migrations/001_initial_schema.sql
psql "$DIGITALOCEAN_DB_URL" < supabase/migrations/002_add_users.sql
# ... repeat for all migrations
```

#### 3.3 Import Data
```bash
# Import data
psql "$DIGITALOCEAN_DB_URL" < data.sql
```

#### 3.4 Verify Import
```bash
# Connect and verify
psql "$DIGITALOCEAN_DB_URL"

# Check tables
\dt

# Check row counts
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

# Exit
\q
```

### Step 4: Setup File Storage (Spaces)

#### 4.1 Create DigitalOcean Space
```bash
# Go to: https://cloud.digitalocean.com/spaces
# Create Space:
#   - Name: inspection-app-files
#   - Region: Same as database
#   - Enable CDN
```

#### 4.2 Generate API Keys
```bash
# Go to: Spaces > Settings > API
# Generate Spaces access keys
# Note:
#   - Access Key ID
#   - Secret Access Key
```

#### 4.3 Migrate Files from Supabase Storage
```bash
# Install AWS CLI (Spaces is S3-compatible)
pip install awscli

# Configure for DigitalOcean Spaces
aws configure
# AWS Access Key ID: [Your Spaces Key]
# AWS Secret Access Key: [Your Spaces Secret]
# Default region name: nyc3 (or your region)
# Default output format: json

# Download from Supabase
# (Manual: Download from Supabase Dashboard)

# Upload to Spaces
aws s3 sync ./supabase-files s3://inspection-app-files/ \
  --endpoint-url https://nyc3.digitaloceanspaces.com \
  --acl public-read
```

### Step 5: Update Application Code

#### 5.1 Install DigitalOcean SDK
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
# Already installed in your project!
```

#### 5.2 Update Environment Variables
```bash
# Update .env file
# Remove Supabase vars (keep for backup during migration)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Add DigitalOcean vars
DATABASE_URL=postgres://username:password@host:25060/defaultdb?sslmode=require
DATABASE_POOL_URL=postgres://username:password@host:25060/defaultdb?sslmode=require

# DigitalOcean Spaces (for file storage)
SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
SPACES_REGION=nyc3
SPACES_ACCESS_KEY_ID=your_key
SPACES_SECRET_ACCESS_KEY=your_secret
SPACES_BUCKET=inspection-app-files
SPACES_CDN_URL=https://inspection-app-files.nyc3.cdn.digitaloceanspaces.com
```

#### 5.3 Update Database Client Code

Create new file: `src/lib/database.ts`
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 20, // Maximum connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text, duration, rows: result.rowCount });
  return result;
}

export default pool;
```

#### 5.4 Update Supabase Calls to Direct SQL

**Before (Supabase):**
```typescript
const { data, error } = await supabase
  .from('inspections')
  .select('*')
  .eq('inspector_id', userId);
```

**After (DigitalOcean/pg):**
```typescript
import { query } from '@/lib/database';

const result = await query(
  'SELECT * FROM inspections WHERE inspector_id = $1',
  [userId]
);
const data = result.rows;
```

### Step 6: Deploy to DigitalOcean App Platform

#### 6.1 Connect GitHub Repository
```bash
# Go to: https://cloud.digitalocean.com/apps/new
# Select source: GitHub
# Choose repository: inspection-app/pwa-inspection
# Branch: main
```

#### 6.2 Configure Build Settings
```yaml
# App Platform will auto-detect Next.js
# Verify settings:
Name: pwa-inspection
Environment: Production
Region: Same as database
Plan: Basic ($5/month)

# Build Command:
npm run build

# Run Command:
npm start

# HTTP Port: 8080
```

#### 6.3 Add Environment Variables
```bash
# In App Settings > Environment Variables
# Add all variables from .env:
DATABASE_URL=...
SPACES_ENDPOINT=...
SHAREPOINT_CLIENT_ID=...
# etc.
```

#### 6.4 Deploy
```bash
# Click "Create Resources"
# Wait 5-10 minutes for first deployment

# After deployment:
# Your app URL: https://your-app-name.ondigitalocean.app
```

### Step 7: Setup Custom Domain (Optional)

#### 7.1 Add Domain
```bash
# Go to: App > Settings > Domains
# Add domain: inspection.yourdomain.com
```

#### 7.2 Update DNS
```bash
# Add CNAME record in your DNS provider:
# Type: CNAME
# Name: inspection
# Value: your-app-name.ondigitalocean.app
```

### Step 8: Setup Monitoring

#### 8.1 Enable Database Metrics
```bash
# Go to: Database > Insights
# Monitor:
# - Connection count
# - Query performance
# - Disk usage
```

#### 8.2 Setup Alerts
```bash
# Go to: Database > Settings > Alerts
# Create alerts for:
# - High CPU usage (> 80%)
# - High memory usage (> 90%)
# - High disk usage (> 80%)
```

### Step 9: Post-Migration Cleanup

#### 9.1 Test Everything
```bash
# Test checklist:
✓ User login/logout
✓ Form submission
✓ File uploads
✓ SharePoint export
✓ Notifications
✓ Analytics dashboard
```

#### 9.2 Monitor for 1 Week
```bash
# Watch for:
- Error logs
- Performance issues
- Database connections
- Storage usage
```

#### 9.3 Cancel Supabase (After Verification)
```bash
# Once stable for 1 week:
# Go to: Supabase Dashboard > Settings > General
# Pause project (keeps data for 7 days)
# After verification, delete project
```

---

## 💰 Cost Breakdown

### Monthly Costs:
```
DigitalOcean Managed PostgreSQL: $15/month
DigitalOcean App Platform:       $5/month
DigitalOcean Spaces:             $5/month
Optional Redis:                  $15/month (or use Upstash free)
----------------------------------------
Total:                           $25-40/month

With $200 student credits:       5-8 months FREE
```

### vs Supabase Pro:
```
Supabase Pro: $25/month
- Limited to 8GB storage
- Shared resources
- 200 connections max

DigitalOcean: $25/month
- 10GB storage (expandable)
- Dedicated resources
- Better performance
- More control
```

---

## 🔄 Rollback Plan (If Something Goes Wrong)

### Quick Rollback to Supabase:
```bash
# 1. Keep Supabase project active during migration
# 2. Revert .env changes
# 3. Redeploy with Supabase vars
# 4. DNS switch back (if using custom domain)

# Time to rollback: ~5 minutes
```

---

## 📞 Support

### DigitalOcean Support:
- Community: https://www.digitalocean.com/community
- Docs: https://docs.digitalocean.com
- Support: https://cloud.digitalocean.com/support

### Common Issues:
1. **Connection refused**: Check trusted sources/firewall
2. **SSL errors**: Add `?sslmode=require` to connection string
3. **Slow queries**: Run ANALYZE; on database
4. **Out of connections**: Increase pool size or use connection pooling

---

## ✅ Migration Checklist

- [ ] Create DigitalOcean account / verify student credits
- [ ] Create PostgreSQL database
- [ ] Export Supabase schema
- [ ] Export Supabase data
- [ ] Import to DigitalOcean
- [ ] Verify data imported correctly
- [ ] Create Spaces for file storage
- [ ] Migrate files to Spaces
- [ ] Update environment variables
- [ ] Update database client code
- [ ] Deploy to App Platform
- [ ] Test all features
- [ ] Setup monitoring/alerts
- [ ] Monitor for 1 week
- [ ] Update DNS (if custom domain)
- [ ] Cancel Supabase subscription

---

## 🎯 Ready to Migrate?

**I can help with:**
1. Creating database migration scripts
2. Writing Spaces upload scripts
3. Updating your codebase to use pg instead of Supabase client
4. Testing locally before deployment

Let me know which parts you need help with!

