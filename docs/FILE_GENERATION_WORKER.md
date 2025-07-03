# File Generation Worker

The browser no longer runs the file generation queue. Instead a dedicated worker
process polls `file_generation_queue` and generates output files. The worker code
lives in `src/workers/fileGenerationWorker.ts` and can be executed as a simple
Node script:

```bash
node dist/workers/fileGenerationWorker.js
```

When compiled this script will continuously poll the queue every 15 seconds. It
can also be deployed as a Supabase Edge Function or any cron based task runner.

To keep the system running in production schedule this script with your
preferred cron service or trigger it via Supabase Edge Function on an interval.
