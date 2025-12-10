# Admin Role Management Guide

## Overview
The admin panel at `/admin/users` allows admins to manage all user roles, including Microsoft account users.

## ✅ What Was Fixed

### Problem
Previously, admins **couldn't edit Microsoft user roles** because:
- Microsoft users have `pin: null` in the database
- The validation required a PIN for all users
- Editing a Microsoft user would show error: "Please fill in all required fields"

### Solution
Updated validation logic to:
- ✅ Allow null/empty PIN for Microsoft users
- ✅ Only require PIN for new PIN-based users
- ✅ Disable PIN field when editing Microsoft users
- ✅ Show clear indicator: "(Microsoft user - no PIN needed)"

## 🎯 How Admin Panel Works Now

### 1. View All Users
Navigate to `/admin/users` to see:

| User | Email / Login Method | PIN | Role | Status | Actions |
|------|---------------------|-----|------|--------|---------|
| John Microsoft | john@theta-edge.com<br>**Microsoft** | N/A | Employee | Active | **Edit** |
| Jane PIN | N/A<br>**PIN** | 1234 | Inspector | Active | **Edit** |

### 2. Edit Microsoft User Role

**Steps:**
1. Click "Edit" on Microsoft user row
2. Modal opens showing:
   - Name: `John Microsoft`
   - PIN Code: `(Microsoft user - no PIN needed)` - DISABLED FIELD
   - Role: **Dropdown with options**
     - Admin
     - Supervisor
     - Inspector ← Change to this
     - Employee
   - Status: Active/Inactive
3. Change role dropdown from "Employee" to "Inspector"
4. Click "Update User"
5. ✅ Role saved to database immediately!

### 3. Edit PIN User Role

**Steps:**
1. Click "Edit" on PIN user row
2. Modal opens showing:
   - Name: `Jane PIN`
   - PIN Code: `1234` - EDITABLE
   - Role: **Dropdown** ← Can change
   - Status: Active/Inactive
3. Change any fields needed
4. Click "Update User"
5. ✅ Changes saved!

## 🔐 Role Assignment Flow

### For New Microsoft Users (First Login)

```
1. User logs in with Microsoft account
   ↓
2. Check: Is email in ADMIN_EMAIL_WHITELIST?
   ├─ YES → Create user with "admin" role
   └─ NO → Create user with "employee" role (default)
   ↓
3. User saved to database
   ↓
4. Admin can change role via panel at any time
```

### For Existing Microsoft Users (Subsequent Logins)

```
1. User logs in with Microsoft account
   ↓
2. Load role from database (ignores whitelist)
   ↓
3. User role = whatever admin set in panel
```

## 📝 Examples

### Example 1: Promote Employee to Inspector

**Scenario:** `sarah@theta-edge.com` logged in via Microsoft, got "employee" role by default.

**Steps to make her an Inspector:**
1. Admin logs in → Goes to `/admin/users`
2. Finds row for `sarah@theta-edge.com`
3. Clicks "Edit"
4. Changes Role dropdown: `Employee` → `Inspector`
5. Clicks "Update User"
6. ✅ Done! Sarah is now Inspector

**Next time Sarah logs in:** She has Inspector permissions immediately

### Example 2: Demote Admin to Employee

**Scenario:** `bob@theta-edge.com` was in ADMIN_EMAIL_WHITELIST, got admin role on first login. Need to revoke.

**Steps:**
1. Admin goes to `/admin/users`
2. Finds Bob's row
3. Clicks "Edit"
4. Changes Role: `Admin` → `Employee`
5. Clicks "Update User"
6. ✅ Bob is now Employee (even though still in whitelist)

**Important:** Database role overrides whitelist for existing users!

## 🛡️ Admin Whitelist - Bootstrap Only

The `ADMIN_EMAIL_WHITELIST` in `.env.local` is now **only for bootstrap**:

```env
# These emails get admin role on FIRST login only
# After that, manage roles via admin panel
ADMIN_EMAIL_WHITELIST=your.email@theta-edge.com
```

**Use cases:**
- ✅ Give yourself admin access on first login
- ✅ Give initial admin to IT manager
- ❌ Don't use for ongoing role management (use admin panel instead)

## 🎨 UI Improvements

### Microsoft User Edit Modal
```
┌──────────────────────────────────────┐
│ Edit User                       [X]  │
├──────────────────────────────────────┤
│ Name *                               │
│ [John Microsoft              ]       │
│                                      │
│ PIN Code (Microsoft user - no PIN)   │
│ [N/A (Microsoft user)        ] [Generate] │ ← DISABLED
│ ℹ This user logs in with Microsoft  │
│   account - no PIN required          │
│                                      │
│ Role *                               │
│ [Inspector ▼]  ← ADMIN CAN CHANGE   │
│                                      │
│ Status                               │
│ [Active ▼]                           │
│                                      │
│ Permissions                          │
│ ☑ Can Create Inspections             │
│ ☑ Can View Inspections               │
│ ...                                  │
├──────────────────────────────────────┤
│         [Cancel]  [Update User]      │
└──────────────────────────────────────┘
```

### PIN User Edit Modal
```
┌──────────────────────────────────────┐
│ Edit User                       [X]  │
├──────────────────────────────────────┤
│ Name *                               │
│ [Jane PIN                    ]       │
│                                      │
│ PIN Code *                           │
│ [1234                        ] [Generate] │ ← EDITABLE
│                                      │
│ Role *                               │
│ [Admin ▼]  ← ADMIN CAN CHANGE       │
│                                      │
│ ...                                  │
└──────────────────────────────────────┘
```

## 🚀 Testing the Admin Panel

### Test 1: Edit Microsoft User Role

```bash
# 1. Start server
npm run dev

# 2. Login as admin
# 3. Go to http://localhost:3000/admin/users
# 4. Click "Edit" on a Microsoft user
# 5. Change role to "Inspector"
# 6. Click "Update User"
# 7. ✅ Should save without PIN error!
```

### Test 2: Verify Role Persists

```bash
# 1. Change Microsoft user's role to Inspector
# 2. User logs out
# 3. User logs back in with Microsoft
# 4. ✅ User should have Inspector role (not employee!)
```

## 📊 Summary

| Aspect | Old Behavior | New Behavior |
|--------|-------------|--------------|
| Microsoft user role editing | ❌ Blocked by PIN validation | ✅ Works perfectly |
| PIN field for Microsoft users | ❌ Required (confusing) | ✅ Disabled with explanation |
| Role assignment | ❌ Based on job title/whitelist | ✅ Database-first, admin-controlled |
| Admin panel visibility | ❌ Couldn't see emails | ✅ Shows email + login method |
| Role management | ❌ Edit .env files | ✅ Click "Edit" in UI |

## 🎉 Result

**Admins can now:**
- ✅ View all users with their emails and login methods
- ✅ Edit any user's role (Microsoft or PIN-based)
- ✅ Change roles instantly without server restart
- ✅ See clear distinction between Microsoft and PIN users
- ✅ No more config file editing for role management!

**Microsoft users:**
- ✅ Login successfully
- ✅ Get initial role (admin if in whitelist, otherwise employee)
- ✅ Keep their admin-assigned role on subsequent logins
- ✅ Can be promoted/demoted via admin panel anytime
