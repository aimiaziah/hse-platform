// src/utils/templateLoader.ts - Load templates from local or Supabase with caching
import { supabase } from '@/lib/supabase';
import { getTemplateWithCache } from './templateCache';

/**
 * Template name mappings
 * Maps original Supabase names to local file names
 */
const TEMPLATE_MAPPINGS: Record<string, string[]> = {
  'fire extinguisher form.xlsx': ['fire-extinguisher-template.xlsx', 'fire extinguisher form.xlsx'],
  'first aid form.xlsx': ['first-aid-template.xlsx', 'first aid form.xlsx'],
  'hse inspection form.xlsx': ['hse-inspection-template.xlsx', 'hse inspection form.xlsx'],
  'monthly manhours.xlsx': ['manhours-template.xlsx', 'monthly manhours.xlsx'],
  'observation form.xlsx': ['observation-template.xlsx', 'observation form.xlsx'],
};

/**
 * Check if running on server-side (Node.js)
 */
function isServerSide(): boolean {
  return typeof window === 'undefined';
}

/**
 * Get local template URL
 */
function getLocalTemplateUrl(templateName: string): string | null {
  const possibleNames = TEMPLATE_MAPPINGS[templateName] || [templateName];

  // Return first possible name (we'll try them in order)
  return `/templates/${possibleNames[0]}`;
}

/**
 * Download template from local filesystem (server-side)
 */
async function downloadFromLocalServer(templateName: string): Promise<ArrayBuffer | null> {
  // Dynamic import to avoid bundling fs in client-side code
  const fs = await import('fs');
  const path = await import('path');

  const possibleNames = TEMPLATE_MAPPINGS[templateName] || [templateName];

  for (const name of possibleNames) {
    try {
      // In server context, read from public/templates directory
      const templatePath = path.join(process.cwd(), 'public', 'templates', name);
      console.log(`[TemplateLoader] Trying local server: ${templatePath}`);

      if (fs.existsSync(templatePath)) {
        const buffer = fs.readFileSync(templatePath);
        console.log(`[TemplateLoader] ✅ Local server template found: ${name}`);
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
      }
    } catch (error) {
      console.log(`[TemplateLoader] Error reading ${name}:`, error);
      // Try next name
      continue;
    }
  }

  console.log(`[TemplateLoader] ❌ Local server template not found: ${templateName}`);
  return null;
}

/**
 * Download template from local filesystem (client-side)
 */
async function downloadFromLocalClient(templateName: string): Promise<ArrayBuffer | null> {
  const possibleNames = TEMPLATE_MAPPINGS[templateName] || [templateName];

  for (const name of possibleNames) {
    try {
      const url = `/templates/${name}`;
      console.log(`[TemplateLoader] Trying local client: ${url}`);

      const response = await fetch(url);

      if (response.ok) {
        console.log(`[TemplateLoader] ✅ Local client template found: ${name}`);
        return await response.arrayBuffer();
      }
    } catch (error) {
      // Try next name
      continue;
    }
  }

  console.log(`[TemplateLoader] ❌ Local client template not found: ${templateName}`);
  return null;
}

/**
 * Download template from local filesystem (auto-detect server/client)
 */
async function downloadFromLocal(templateName: string): Promise<ArrayBuffer | null> {
  if (isServerSide()) {
    return await downloadFromLocalServer(templateName);
  } else {
    return await downloadFromLocalClient(templateName);
  }
}

/**
 * Download template from Supabase Storage
 */
async function downloadFromSupabase(
  bucketName: string,
  templateName: string,
): Promise<ArrayBuffer> {
  console.log(`[TemplateLoader] 📥 Downloading from Supabase: ${templateName}`);

  const { data, error } = await supabase.storage.from(bucketName).download(templateName);

  if (error) {
    throw new Error(`Failed to fetch template from Supabase: ${error.message}`);
  }

  if (!data) {
    throw new Error('Template file not found in Supabase');
  }

  console.log(`[TemplateLoader] ✅ Downloaded from Supabase: ${templateName}`);
  return await data.arrayBuffer();
}

/**
 * Load template with the following priority:
 * 1. Browser cache (if available)
 * 2. Local filesystem (/public/templates)
 * 3. Supabase Storage (fallback)
 */
export async function loadTemplate(
  bucketName: string = 'templates',
  templateName: string,
): Promise<ArrayBuffer> {
  try {
    // Use cache wrapper which will:
    // 1. Check cache first
    // 2. If not cached, download using our function
    // 3. Cache the result
    return await getTemplateWithCache(templateName, async () => {
      // Try local first
      const localTemplate = await downloadFromLocal(templateName);
      if (localTemplate) {
        return localTemplate;
      }

      // Fallback to Supabase
      console.log('[TemplateLoader] 🔄 Falling back to Supabase...');
      return await downloadFromSupabase(bucketName, templateName);
    });
  } catch (error) {
    console.error('[TemplateLoader] ❌ Failed to load template:', error);
    throw error;
  }
}

/**
 * Check if template is available locally
 */
export async function isTemplateLocal(templateName: string): Promise<boolean> {
  const possibleNames = TEMPLATE_MAPPINGS[templateName] || [templateName];

  for (const name of possibleNames) {
    try {
      const response = await fetch(`/templates/${name}`, { method: 'HEAD' });
      if (response.ok) {
        return true;
      }
    } catch (error) {
      continue;
    }
  }

  return false;
}

/**
 * Get template source info (for diagnostics)
 */
export async function getTemplateSource(templateName: string): Promise<{
  source: 'cache' | 'local' | 'supabase' | 'unknown';
  cached: boolean;
  local: boolean;
}> {
  const { isTemplateCached } = await import('./templateCache');
  const cached = isTemplateCached(templateName);
  const local = await isTemplateLocal(templateName);

  let source: 'cache' | 'local' | 'supabase' | 'unknown' = 'unknown';

  if (cached) {
    source = 'cache';
  } else if (local) {
    source = 'local';
  } else {
    source = 'supabase';
  }

  return { source, cached, local };
}
