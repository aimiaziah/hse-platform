# Microsoft Authentication Setup Guide

This guide will help you set up Microsoft authentication with role-based access control for your inspection app.

## Overview

Your app supports automatic role assignment when users log in with their Microsoft company accounts. Roles are assigned based on:

1. **Email Whitelists** (Priority 1) - Specific email addresses mapped to roles
2. **Job Title/Department** (Priority 2) - Automatic mapping based on Azure AD profile

## Role Assignment System

### Available Roles

- **Admin** - Full system access, user management, analytics
- **Supervisor** - Can review and approve inspections
- **Inspector** - Can create and submit inspections
- **Employee** - Basic access to view assigned inspections

### How Role Assignment Works

When a user logs in with Microsoft, the system:

1. Checks if their email is in the admin whitelist → Assign `admin` role
2. Checks if their email is in the supervisor whitelist → Assign `supervisor` role
3. Checks if their email is in the inspector whitelist → Assign `inspector` role
4. Falls back to job title/department mapping (if no whitelist match)
5. Defaults to `employee` role

**See:** `src/utils/microsoft-auth.ts:135` for the mapping logic.

---

## Step 1: Azure AD App Registration

### 1.1 Create Azure AD Application

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name:** `HSE Inspection Platform`
   - **Supported account types:** `Accounts in this organizational directory only`
   - **Redirect URI:**
     - Type: `Web`
     - URL: `http://localhost:3000/api/auth/microsoft/callback` (for development)
5. Click **Register**

### 1.2 Configure Authentication

1. In your app registration, go to **Authentication**
2. Under **Redirect URIs**, add:
   - Development: `http://localhost:3000/api/auth/microsoft/callback`
   - Production: `https://your-app.ondigitalocean.app/api/auth/microsoft/callback`
3. Under **Implicit grant and hybrid flows**, enable:
   - ✅ **ID tokens** (for implicit and hybrid flows)
4. Click **Save**

### 1.3 Configure API Permissions

1. Go to **API permissions**
2. Click **Add a permission** → **Microsoft Graph** → **Delegated permissions**
3. Add the following permissions:
   - `User.Read` - Read user profile
   - `email` - Read user's email address
   - `openid` - Sign users in
   - `profile` - View users' basic profile
   - `offline_access` - Maintain access to data
4. Click **Add permissions**
5. Click **Grant admin consent** (requires admin privileges)

### 1.4 Get Credentials

1. Go to **Overview** page
2. Copy the following values:
   - **Application (client) ID** - You'll use this as `NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID`
   - **Directory (tenant) ID** - You'll use this as `NEXT_PUBLIC_SHAREPOINT_TENANT_ID`

### 1.5 Create Client Secret (Required for Token Exchange)

1. Go to **Certificates & secrets** in your app registration
2. Click **New client secret**
3. Add a description (e.g., "HSE Platform Auth Secret")
4. Choose an expiration period (recommended: 24 months for production)
5. Click **Add**
6. **Important:** Copy the secret value immediately - it will only be shown once!
   - You'll use this as `SHAREPOINT_CLIENT_SECRET` or `MICROSOFT_CLIENT_SECRET` in your environment variables
   - Store it securely - you cannot retrieve it later

---

## Step 2: Configure Environment Variables

### 2.1 Recommended Approach: Admin-Managed Roles

**For teams with 1-3 special roles + many employees, use admin-managed roles:**

Add these variables to your `.env` file:

```env
# Microsoft Authentication
ENABLE_MICROSOFT_AUTH=true
PREFER_MICROSOFT_AUTH=true

# Azure AD Credentials
NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID=your-client-id-here
NEXT_PUBLIC_SHAREPOINT_TENANT_ID=your-tenant-id-here
SHAREPOINT_CLIENT_SECRET=your-client-secret-here

# Email Domain Restriction (required for security)
ALLOWED_EMAIL_DOMAINS=yourcompany.com

# Only whitelist the initial admin
ADMIN_EMAIL_WHITELIST=admin@yourcompany.com
```

**How it works:**

1. Admin logs in → Gets admin role automatically (from whitelist)
2. Supervisor/Inspector log in → Get employee role initially
3. Admin assigns correct roles through the Admin UI at `/admin/users`
4. 100 employees log in → Get employee role automatically (no action needed)

**Benefits:**

- ✅ Only 1 email in environment variables
- ✅ Change roles without redeploying
- ✅ No app restart needed
- ✅ More flexible and scalable
- ✅ Works great for 1 admin + 1 supervisor + 1 inspector + 100 employees

### 2.2 Alternative: Email Whitelist for All Roles

**For fully automated role assignment (no manual intervention):**

```env
ENABLE_MICROSOFT_AUTH=true
PREFER_MICROSOFT_AUTH=true
NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID=abc123-def456-ghi789
NEXT_PUBLIC_SHAREPOINT_TENANT_ID=xyz987-uvw654-rst321
SHAREPOINT_CLIENT_SECRET=your-client-secret-here
ALLOWED_EMAIL_DOMAINS=yourcompany.com

# Whitelist all special roles
ADMIN_EMAIL_WHITELIST=admin@yourcompany.com
SUPERVISOR_EMAIL_WHITELIST=supervisor@yourcompany.com
INSPECTOR_EMAIL_WHITELIST=inspector@yourcompany.com

# All other users (100 employees) will automatically get 'employee' role
```

**Trade-offs:**

- ✅ Fully automated - no admin intervention needed
- ❌ Must update environment variables to change roles
- ❌ Requires app restart/redeployment
- ❌ Less flexible for growing teams

### 2.3 Production Environment

In DigitalOcean App Platform:

1. Go to **Settings** → **App-Level Environment Variables**
2. Add all the variables above
3. Mark sensitive values as **Encrypted**

---

## Step 3: Database Migration

Run the Microsoft authentication migration to add required database columns:

```bash
# Apply the migration
psql -h your-supabase-host -U postgres -d postgres -f supabase/migrations/add_microsoft_auth.sql
```

Or in Supabase Dashboard:

1. Go to **SQL Editor**
2. Copy contents of `supabase/migrations/add_microsoft_auth.sql`
3. Execute the migration

**What this migration does:**

- Adds `email`, `microsoft_id`, `microsoft_access_token` columns to users table
- Creates indexes for performance
- Adds validation constraints

**See:** `supabase/migrations/add_microsoft_auth.sql`

---

## Step 4: Testing Authentication

### 4.1 Local Testing

1. Start your development server:

```bash
npm run dev
```

2. Navigate to `http://localhost:3000`
3. Click **Sign in with Microsoft**
4. Log in with your company Microsoft account
5. Verify you're assigned the correct role

### 4.2 Verify Role Assignment

Check the role assignment in the database:

```sql
SELECT
  id,
  name,
  email,
  role,
  microsoft_id,
  created_at
FROM users
WHERE email = 'your-test-email@yourcompany.com';
```

### 4.3 Test All Roles

Test with different accounts to verify:

- ✅ Admin email gets `admin` role
- ✅ Supervisor email gets `supervisor` role
- ✅ Inspector email gets `inspector` role
- ✅ Other employees get `employee` role

---

## Step 5: Managing User Roles Through Admin UI (Recommended)

### Using the Admin Dashboard

After users log in with Microsoft for the first time, you can manage their roles through the admin interface:

**Access User Management:**

1. Log in as admin
2. Go to **Admin Dashboard** → **Users Management** (at `/admin/users`)
3. You'll see all users who have logged in

**Change User Role:**

1. Find the user in the list
2. Click **Edit** button
3. Select new role from dropdown:
   - `admin` - Full system access
   - `supervisor` - Can review and approve inspections
   - `inspector` - Can create inspections
   - `employee` - Basic access
4. Click **Save**
5. Changes take effect immediately (no app restart needed)

**Workflow Example:**

```
Day 1:
- john.admin@company.com logs in → Auto-assigned "admin" role (from whitelist)

Day 2:
- jane.supervisor@company.com logs in → Gets "employee" role
- Admin edits Jane's account → Changes role to "supervisor"

- bob.inspector@company.com logs in → Gets "employee" role
- Admin edits Bob's account → Changes role to "inspector"

Day 3-30:
- 100 employees log in → All get "employee" role automatically
- No admin action needed unless someone needs a different role
```

**See:** Admin UI implementation at `src/pages/admin/users.tsx:55-95`

---

## Step 6: Alternative - Managing Roles with Environment Variables

### Option 1: Email Whitelists (Recommended)

**Pros:**

- Explicit control over who gets which role
- Easy to manage in environment variables
- No database changes needed

**Cons:**

- Need to update environment variables when roles change
- Requires app restart/redeployment

**How to update:**

1. Update `.env` file (development) or DigitalOcean environment variables (production)
2. Restart the app
3. Users will get new roles on next login

### Option 2: Database Role Management

**Pros:**

- Can update roles without app restart
- More flexible for frequent changes

**Cons:**

- Requires database access
- Need to build admin UI for role management

**How to update roles in database:**

```sql
-- Change user role
UPDATE users
SET role = 'supervisor'
WHERE email = 'user@yourcompany.com';

-- Verify the change
SELECT name, email, role FROM users WHERE email = 'user@yourcompany.com';
```

### Option 3: Hybrid Approach

Use email whitelists for initial assignment, then allow admins to override in the database:

1. User logs in → Gets role from whitelist
2. Admin can manually change role in database
3. Database role takes precedence over whitelist

To implement this, modify `src/utils/microsoft-auth.ts:135` to check database role first.

---

## Role Permissions

Each role has specific permissions defined in the `user_permissions` table:

### Admin Permissions

```sql
- can_manage_users: true
- can_manage_forms: true
- can_create_inspections: true
- can_view_inspections: true
- can_review_inspections: true
- can_approve_inspections: true
- can_reject_inspections: true
- can_view_pending_inspections: true
- can_view_analytics: true
```

### Supervisor Permissions

```sql
- can_create_inspections: false
- can_view_inspections: true
- can_review_inspections: true
- can_approve_inspections: true
- can_reject_inspections: true
- can_view_pending_inspections: true
- can_view_analytics: true
```

### Inspector Permissions

```sql
- can_create_inspections: true
- can_view_inspections: true (own inspections only)
- can_review_inspections: false
```

### Employee Permissions

```sql
- can_view_inspections: true (assigned inspections only)
```

**See:** `supabase/migrations/001_complete_setup.sql` for permission definitions.

---

## Troubleshooting

### Users not getting correct roles

1. **Check email whitelist format:**

   ```env
   # ❌ Wrong - has spaces
   ADMIN_EMAIL_WHITELIST=admin@company.com, manager@company.com

   # ✅ Correct - no spaces
   ADMIN_EMAIL_WHITELIST=admin@company.com,manager@company.com
   ```

2. **Check email case sensitivity:**

   - Email matching is case-insensitive
   - `Admin@Company.com` will match `admin@company.com`

3. **Verify environment variables are loaded:**
   ```typescript
   // Check in browser console or API route
   console.log(process.env.ADMIN_EMAIL_WHITELIST);
   ```

### Microsoft login fails

1. **Check redirect URI:** Must match exactly in Azure AD
2. **Check tenant ID:** Verify you're using the correct tenant
3. **Check API permissions:** Ensure admin consent is granted
4. **Check CORS:** Verify your app's domain is allowed
5. **Check client secret:** If you see error "AADSTS7000218: The request body must contain the following parameter: 'client_assertion' or 'client_secret'":
   - Ensure `SHAREPOINT_CLIENT_SECRET` or `MICROSOFT_CLIENT_SECRET` is set in your environment variables
   - Verify the client secret hasn't expired (check in Azure AD → Certificates & secrets)
   - Make sure the secret value is correct (no extra spaces or quotes)
   - Restart your application after adding the secret

### Token expiration issues

Tokens are automatically refreshed using the `refresh_token`. If refresh fails:

1. Check `microsoft_token_expires_at` in database
2. User may need to log in again
3. Verify `offline_access` permission is granted in Azure AD

---

## Security Best Practices

### 1. Email Domain Restriction

Always set `ALLOWED_EMAIL_DOMAINS` to restrict logins to your company:

```env
ALLOWED_EMAIL_DOMAINS=yourcompany.com
```

This prevents external users from logging in even if they have a Microsoft account.

### 2. Rate Limiting

Authentication has built-in rate limiting:

- 5 login attempts per 15 minutes (default)
- Configure via `AUTH_RATE_LIMIT_MAX_REQUESTS` and `AUTH_RATE_LIMIT_WINDOW_MS`

### 3. Secure Environment Variables

- Never commit `.env` to version control
- Use encrypted environment variables in production
- Rotate credentials regularly

### 4. Audit Logging

Monitor authentication events:

```sql
-- Check recent logins
SELECT name, email, role, last_login
FROM users
ORDER BY last_login DESC
LIMIT 20;
```

---

## Quick Reference

### Email Whitelist Environment Variables

| Variable                     | Purpose                | Example                  |
| ---------------------------- | ---------------------- | ------------------------ |
| `ADMIN_EMAIL_WHITELIST`      | Admin role emails      | `admin@company.com`      |
| `SUPERVISOR_EMAIL_WHITELIST` | Supervisor role emails | `supervisor@company.com` |
| `INSPECTOR_EMAIL_WHITELIST`  | Inspector role emails  | `inspector@company.com`  |

### Key Files

| File                                         | Purpose                   | Line Reference |
| -------------------------------------------- | ------------------------- | -------------- |
| `src/utils/microsoft-auth.ts`                | Role mapping logic        | Line 135       |
| `src/lib/auth-config.ts`                     | Email whitelist functions | Line 40-62     |
| `supabase/migrations/add_microsoft_auth.sql` | Database schema           | -              |

### Support

For issues or questions:

1. Check logs in DigitalOcean dashboard
2. Review Azure AD app registration
3. Verify database migration is applied
4. Check environment variables are set correctly

---

**Last Updated:** December 2024
**Status:** Ready for Production
