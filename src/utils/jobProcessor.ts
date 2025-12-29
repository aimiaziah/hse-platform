// src/utils/jobProcessor.ts
import { getServiceSupabase } from '@/lib/supabase';
import { generateInspectionExcel } from '@/utils/inspectionExcelExporter';
import { uploadInspectionToSharePoint, formatStatusForSharePoint } from '@/utils/powerAutomate';

export interface Job {
  id: string;
  job_type: string;
  job_data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  max_retries: number;
  retry_count: number;
  error_message?: string;
  error_details?: any;
  scheduled_at: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface JobResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Process a single job from the queue
 */
export async function processJob(job: Job): Promise<JobResult> {
  console.log(`[JobProcessor] Processing job ${job.id} (${job.job_type})`);

  try {
    let result: JobResult;

    switch (job.job_type) {
      case 'sharepoint_export':
        result = await processSharePointExport(job);
        break;
      default:
        result = {
          success: false,
          error: `Unknown job type: ${job.job_type}`,
        };
    }

    return result;
  } catch (error: any) {
    console.error(`[JobProcessor] Error processing job ${job.id}:`, error);
    return {
      success: false,
      error: error?.message || 'Unknown error',
    };
  }
}

/**
 * Process SharePoint export job
 */
async function processSharePointExport(job: Job): Promise<JobResult> {
  const { inspectionId, formType, formData, metadata, userId } = job.job_data;

  try {
    const supabase = getServiceSupabase();

    // Get inspection details
    const { data: inspection, error: inspectionError } = await (supabase as any)
      .from('inspections')
      .select('*')
      .eq('id', inspectionId)
      .single();

    if (inspectionError || !inspection) {
      throw new Error(`Inspection not found: ${inspectionId}`);
    }

    // Try user-delegated upload first (if user has Microsoft token)
    if (userId) {
      try {
        const { uploadToSharePointWithUserToken } = await import('@/utils/sharepoint-delegated');

        console.log(`[SharePoint] Attempting upload with user's delegated token...`);

        // Generate Excel
        const excelBlob = await generateInspectionExcel(formType as any, formData, {
          inspectionNumber: metadata?.inspectionNumber || inspection.inspection_number || 'DRAFT',
          inspectorName: metadata?.inspectorName || inspection.inspected_by,
          inspectionDate: metadata?.inspectionDate || inspection.inspection_date,
          status: formatStatusForSharePoint(inspection.status, inspection.inspected_by),
        });

        // Determine folder path
        const baseFolder = process.env.SHAREPOINT_BASE_FOLDER || 'HSE/New Document';
        const date = new Date(inspection.inspection_date);
        const monthNames = [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
        ];
        const folderPath = `${baseFolder}/${formType}/${date.getFullYear()}/${
          monthNames[date.getMonth()]
        }`;

        // Generate filename
        const monthYear = `${monthNames[date.getMonth()]}_${date.getFullYear()}`;
        const fileName = `${formType}_${monthYear}_${
          inspection.inspection_number || inspectionId
        }.xlsx`;

        // Upload using user's delegated token
        const result = await uploadToSharePointWithUserToken(
          userId,
          excelBlob,
          fileName,
          folderPath,
        );

        // Update inspection with SharePoint metadata
        await (supabase as any)
          .from('inspections')
          .update({
            sharepoint_file_id: result.fileId,
            sharepoint_file_url: result.fileUrl,
            sharepoint_exported_at: new Date().toISOString(),
            sharepoint_sync_status: 'synced',
          })
          .eq('id', inspectionId);

        // Log success
        await (supabase as any).from('sharepoint_sync_log').insert({
          inspection_id: inspectionId,
          sync_type: 'create',
          status: 'success',
          metadata: { fileId: result.fileId, fileUrl: result.fileUrl, method: 'delegated' },
        });

        console.log(`✅ [SharePoint] Delegated upload complete: ${result.fileUrl}`);

        return {
          success: true,
          data: {
            fileId: result.fileId,
            fileUrl: result.fileUrl,
            method: 'delegated',
          },
        };
      } catch (delegatedError: any) {
        console.warn(
          `⚠️ [SharePoint] Delegated upload failed, falling back to app-only: ${delegatedError.message}`,
        );
        // Fall through to app-only upload
      }
    }

    console.log(`[SharePoint] Generating Excel for ${formType}...`);

    // Generate Excel
    const excelBlob = await generateInspectionExcel(formType as any, formData, {
      inspectionNumber: metadata?.inspectionNumber || inspection.inspection_number || 'DRAFT',
      inspectorName: metadata?.inspectorName || inspection.inspected_by,
      inspectionDate: metadata?.inspectionDate || inspection.inspection_date,
      status: formatStatusForSharePoint(inspection.status, inspection.inspected_by),
    });

    console.log(`[SharePoint] Excel generated (${excelBlob.size} bytes), uploading...`);

    // Upload to SharePoint
    const sharePointResult = await uploadInspectionToSharePoint(inspection, excelBlob);

    console.log(`[SharePoint] Upload successful, updating database...`);

    // Update inspection with SharePoint metadata
    await (supabase as any)
      .from('inspections')
      .update({
        sharepoint_file_id: sharePointResult.fileId,
        sharepoint_file_url: sharePointResult.fileUrl,
        sharepoint_exported_at: new Date().toISOString(),
        sharepoint_sync_status: 'synced',
      })
      .eq('id', inspectionId);

    // Log success
    await (supabase as any).from('sharepoint_sync_log').insert({
      inspection_id: inspectionId,
      sync_type: 'create',
      status: 'success',
      metadata: { fileId: sharePointResult.fileId, fileUrl: sharePointResult.fileUrl },
    });

    console.log(`✅ [SharePoint] Export complete: ${sharePointResult.fileUrl}`);

    return {
      success: true,
      data: {
        fileId: sharePointResult.fileId,
        fileUrl: sharePointResult.fileUrl,
      },
    };
  } catch (error: any) {
    console.error(`❌ [SharePoint] Export failed:`, error);

    // Update inspection sync status
    const supabase = getServiceSupabase();
    const { error: updateError } = await (supabase as any)
      .from('inspections')
      .update({ sharepoint_sync_status: 'failed' })
      .eq('id', inspectionId);

    if (updateError) {
      console.error('[SharePoint] Failed to update sync status:', updateError);
    }

    // Log failure
    const { error: logError } = await (supabase as any).from('sharepoint_sync_log').insert({
      inspection_id: inspectionId,
      sync_type: 'create',
      status: 'failure',
      error_message: error?.message || 'Unknown error',
      metadata: {
        error: error?.message,
        stack: error?.stack?.substring(0, 500),
      },
    });

    if (logError) {
      console.error('[SharePoint] Failed to log error:', logError);
    }

    return {
      success: false,
      error: error?.message || 'SharePoint export failed',
    };
  }
}

/**
 * Get next pending job from the queue
 */
export async function getNextJob(): Promise<Job | null> {
  const supabase = getServiceSupabase();

  // Get next job (highest priority, oldest first)
  // Get pending jobs first
  let { data: jobs, error } = await (supabase as any)
    .from('job_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('priority', { ascending: false })
    .order('scheduled_at', { ascending: true })
    .limit(1);

  if (error) {
    console.error('[JobProcessor] Error fetching jobs:', error);
    return null;
  }

  // If no pending jobs, try failed jobs with retries remaining
  if (!jobs || jobs.length === 0) {
    const result = await (supabase as any).rpc('get_retryable_job');

    if (result.error) {
      console.error('[JobProcessor] Error fetching retryable jobs:', result.error);
      // Fallback: manually query failed jobs with retries
      const { data: failedJobs, error: failedError } = await (supabase as any)
        .from('job_queue')
        .select('*')
        .eq('status', 'failed')
        .filter('retry_count', 'lt', 'max_retries')
        .lte('scheduled_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('scheduled_at', { ascending: true })
        .limit(1);

      if (failedError) {
        console.error('[JobProcessor] Error fetching failed jobs:', failedError);
        return null;
      }

      jobs = failedJobs;
    } else {
      jobs = result.data ? [result.data] : [];
    }
  }

  if (!jobs || jobs.length === 0) {
    return null;
  }

  return jobs[0] as Job;
}

/**
 * Mark job as processing
 */
export async function markJobAsProcessing(jobId: string): Promise<boolean> {
  const supabase = getServiceSupabase();

  const { error } = await (supabase as any)
    .from('job_queue')
    .update({
      status: 'processing',
      started_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    console.error('[JobProcessor] Error marking job as processing:', error);
    return false;
  }

  return true;
}

/**
 * Mark job as completed
 */
export async function markJobAsCompleted(jobId: string, result?: any): Promise<boolean> {
  const supabase = getServiceSupabase();

  const { error } = await (supabase as any)
    .from('job_queue')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      error_message: null,
      error_details: null,
    })
    .eq('id', jobId);

  if (error) {
    console.error('[JobProcessor] Error marking job as completed:', error);
    return false;
  }

  return true;
}

/**
 * Mark job as failed
 */
export async function markJobAsFailed(
  jobId: string,
  errorMessage: string,
  errorDetails?: any,
): Promise<boolean> {
  const supabase = getServiceSupabase();

  // Increment retry count
  const { data: job } = await (supabase as any)
    .from('job_queue')
    .select('retry_count, max_retries')
    .eq('id', jobId)
    .single();

  const retryCount = (job?.retry_count || 0) + 1;
  const maxRetries = job?.max_retries || 3;

  const { error } = await (supabase as any)
    .from('job_queue')
    .update({
      status: 'failed',
      retry_count: retryCount,
      error_message: errorMessage,
      error_details: errorDetails,
      completed_at: retryCount >= maxRetries ? new Date().toISOString() : null,
    })
    .eq('id', jobId);

  if (error) {
    console.error('[JobProcessor] Error marking job as failed:', error);
    return false;
  }

  return true;
}

/**
 * Process all pending jobs in the queue
 */
export async function processQueue(maxJobs: number = 10): Promise<{
  processed: number;
  successful: number;
  failed: number;
}> {
  console.log(`[JobProcessor] Starting queue processing (max: ${maxJobs} jobs)...`);

  let processed = 0;
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < maxJobs; i++) {
    const job = await getNextJob();

    if (!job) {
      console.log(`[JobProcessor] No more jobs to process`);
      break;
    }

    // Mark as processing
    const marked = await markJobAsProcessing(job.id);
    if (!marked) {
      console.error(`[JobProcessor] Failed to mark job ${job.id} as processing, skipping...`);
      continue;
    }

    // Process job
    const result = await processJob(job);
    processed++;

    if (result.success) {
      await markJobAsCompleted(job.id, result.data);
      successful++;
      console.log(`✅ [JobProcessor] Job ${job.id} completed successfully`);
    } else {
      await markJobAsFailed(job.id, result.error || 'Unknown error', result);
      failed++;
      console.error(`❌ [JobProcessor] Job ${job.id} failed: ${result.error}`);
    }
  }

  console.log(
    `[JobProcessor] Queue processing complete: ${processed} processed, ${successful} successful, ${failed} failed`,
  );

  return { processed, successful, failed };
}

/**
 * Enqueue a new job
 */
export async function enqueueJob(
  jobType: string,
  jobData: any,
  options?: {
    priority?: number;
    maxRetries?: number;
    scheduledAt?: Date;
  },
): Promise<string | null> {
  const supabase = getServiceSupabase();

  const { data, error } = await (supabase as any)
    .from('job_queue')
    .insert({
      job_type: jobType,
      job_data: jobData,
      priority: options?.priority || 0,
      max_retries: options?.maxRetries || 3,
      scheduled_at: options?.scheduledAt?.toISOString() || new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[JobProcessor] Error enqueueing job:', error);
    return null;
  }

  console.log(`[JobProcessor] Job enqueued: ${data.id} (${jobType})`);
  return data.id;
}
