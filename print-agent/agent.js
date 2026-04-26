require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// --- Configuration ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const printerName = process.env.PRINTER_NAME || 'POS-80';
const agentTarget = process.env.AGENT_TARGET || 'main'; // 'main', 'kitchen', 'bar', etc.
const pollingIntervalMs = parseInt(process.env.POLLING_INTERVAL_MS || '30000', 10);

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n=========================================');
console.log('   🚀 GM App Print Agent - Robust V2');
console.log('=========================================');
console.log(`📡 URL:     ${supabaseUrl}`);
console.log(`🖨️ Printer: ${printerName}`);
console.log(`🎯 Target:  ${agentTarget}`);
console.log(`⏱️ Polling: every ${pollingIntervalMs / 1000}s`);
console.log('=========================================\n');

// --- State ---
let isProcessing = false;
let realtimeChannel = null;

/**
 * Main Entry Point
 */
async function main() {
  console.log('[System] Starting Print Agent...');
  
  // 1. Initial check for pending jobs
  await checkForPendingJobs();

  // 2. Subscribe to Realtime changes
  subscribeToRealtime();

  // 3. Polling fallback (The Safety Net)
  // Ensures that even if WebSocket drops, we still process jobs
  setInterval(async () => {
    if (!isProcessing) {
      console.log(`[Safety Polling] Checking for '${agentTarget}' jobs...`);
      await checkForPendingJobs();
    }
  }, pollingIntervalMs);
}

/**
 * Sets up the Realtime subscription with auto-reconnection logic
 */
function subscribeToRealtime() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel(`print_jobs_${agentTarget}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'print_jobs',
        filter: `target=eq.${agentTarget}`,
      },
      async (payload) => {
        console.log(`[Realtime] New job detected: ${payload.new.id}`);
        // We don't await here to avoid blocking the channel, 
        // but processJob handles its own errors
        processJob(payload.new);
      }
    )
    .subscribe((status) => {
      console.log(`[Realtime Status] ${status}`);
      
      if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
        console.warn(`[Realtime Warning] Channel ${status}. Retrying in 5 seconds...`);
        setTimeout(subscribeToRealtime, 5000);
      }
    });
}

/**
 * Scans the database for jobs in 'pending' status for this target
 */
async function checkForPendingJobs() {
  if (isProcessing) return;
  isProcessing = true;
  try {
    console.log(`[Check] Scanning for 'pending' jobs with target '${agentTarget}'...`);

    const { data: jobs, error } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('status', 'pending')
      .eq('target', agentTarget)
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (jobs && jobs.length > 0) {
      console.log(`[Check] Found ${jobs.length} pending jobs for ${agentTarget}.`);
      for (const job of jobs) {
        await processJob(job);
      }
    }
  } catch (err) {
    console.error('[Check Error]', err.message);
  } finally {
    isProcessing = false;
  }
}

/**
 * Handles the full lifecycle of a print job
 */
async function processJob(job) {
  // Re-verify status (in case of double triggers)
  if (job.status !== 'pending') return;

  console.log(`[Job ${job.id}] Processing order #${job.order_id || '?'}`);

  try {
    // 1. Update status to 'printing' immediately
    // This provides visual feedback to the waiter/admin in the web UI
    await updateJobStatus(job.id, 'printing');

    // 2. Perform the actual printing
    await performPrint(job);

    // 3. Mark as 'printed'
    await updateJobStatus(job.id, 'printed');
    console.log(`[Job ${job.id}] Successfully printed.`);
  } catch (err) {
    console.error(`[Job ${job.id}] Failed:`, err.message);
    await updateJobStatus(job.id, 'failed', err.message);
  }
}

/**
 * Writes the content to a temp file and sends it to the printer N times
 */
async function performPrint(job) {
  const tempFile = path.join(__dirname, `ticket_${job.id}.txt`);
  
  // ENCODING FIX: Use 'latin1' (ISO-8859-1) for writing the file.
  // This ensures that 'ñ', 'á', 'é', etc. are interpreted correctly 
  // by most Windows thermal printer drivers when using Out-Printer.
  fs.writeFileSync(tempFile, job.raw_content, 'latin1');

  const copies = job.copies || 1;
  
  // Construct a PowerShell command that prints the file N times
  // Using -Raw ensures the content is read exactly as written
  const command = `powershell -Command "for ($i=0; $i -lt ${copies}; $i++) { Get-Content '${tempFile}' -Raw | Out-Printer -Name '${printerName}' }"`;

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      // Clean up temp file regardless of result
      try { 
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); 
      } catch (e) {
        console.error(`[Job ${job.id}] Error cleaning up temp file:`, e.message);
      }
      
      if (error) {
        return reject(new Error(`Exec error: ${error.message} | Stderr: ${stderr}`));
      }
      resolve();
    });
  });
}

/**
 * Helper to update job status and metadata in Supabase
 */
async function updateJobStatus(id, status, errorMsg = null) {
  const updateData = { 
    status, 
    printed_at: status === 'printed' ? new Date().toISOString() : null 
  };
  
  if (errorMsg) updateData.error_message = errorMsg;

  const { error } = await supabase
    .from('print_jobs')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error(`[Status Update Error ${id}]`, error.message);
  }
}

// Start the agent
main().catch(err => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[System] Shutting down Print Agent...');
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  process.exit();
});

