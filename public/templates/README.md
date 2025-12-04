# Excel Templates Directory

This folder contains Excel templates used for generating inspection reports.

## Templates Needed

Place the following templates in this directory:

1. **fire-extinguisher-template.xlsx** (or 'fire extinguisher form.xlsx')
   - Fire extinguisher inspection form template

2. **first-aid-template.xlsx** (or 'first aid form.xlsx')
   - First aid kit inspection form template

3. **hse-inspection-template.xlsx** (or 'hse inspection form.xlsx')
   - HSE inspection checklist template

4. **manhours-template.xlsx** (or 'monthly manhours.xlsx')
   - Monthly manhours report template ✅ (Already present)

## How to Add Templates

### Option 1: Download from Supabase (If you have access)

1. Go to your Supabase dashboard
2. Navigate to Storage → templates bucket
3. Download the templates
4. Place them in this folder with the names above

### Option 2: Copy from your existing setup

If you have these templates locally, simply copy them here.

### Option 3: Use existing templates

The app will fallback to Supabase if templates are not found locally, but having them here will:
- **Reduce Supabase egress by ~90%**
- **Speed up template loading**
- **Enable offline template generation**

## File Naming

The templates can have either name format:
- Modern format: `fire-extinguisher-template.xlsx`
- Original format: `fire extinguisher form.xlsx`

The app will check for both and use whichever is available.

## Benefits of Local Templates

✅ **Zero egress cost** - No downloads from Supabase
✅ **Faster loading** - Served from local filesystem
✅ **Offline capable** - Works without internet
✅ **Cache friendly** - Browser caches templates automatically

## Next Steps

1. Add the 3 missing templates to this folder
2. Restart your dev server
3. Templates will be served locally (free!)
4. Supabase only used as fallback

---

**Current Status:**
- ✅ manhours-template.xlsx
- ⚠️ fire-extinguisher-template.xlsx (download from Supabase)
- ⚠️ first-aid-template.xlsx (download from Supabase)
- ⚠️ hse-inspection-template.xlsx (download from Supabase)
