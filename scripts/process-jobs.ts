// scripts/process-jobs.ts
/**
 * Manual job processor script
 * Run with: npx ts-node scripts/process-jobs.ts
 *
 * This script manually processes pending jobs in the queue.
 * Useful for:
 * - Testing job processing locally
 * - Processing jobs when cron is not set up
 * - Debugging job processing issues
 */

import { processQueue } from '../src/utils/jobProcessor';

async function main() {
  console.log('🚀 Starting job processor...\n');

  try {
    const result = await processQueue(10); // Process up to 10 jobs

    console.log('\n✅ Job processing complete!');
    console.log(`   Processed: ${result.processed}`);
    console.log(`   Successful: ${result.successful}`);
    console.log(`   Failed: ${result.failed}`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error processing jobs:', error);
    process.exit(1);
  }
}

main();
