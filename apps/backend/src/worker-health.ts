import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const HEARTBEAT_PATH =
  process.env.WORKER_HEARTBEAT_PATH ||
  path.join(os.tmpdir(), 'erp-worker-heartbeat.json');

const MAX_HEARTBEAT_AGE_MS = 25000; // 25 seconds

try {
  if (!fs.existsSync(HEARTBEAT_PATH)) {
    console.error(
      `[Worker Healthcheck FAIL] Heartbeat file does not exist: ${HEARTBEAT_PATH}`,
    );
    process.exit(1);
  }

  const content = fs.readFileSync(HEARTBEAT_PATH, 'utf8');
  const data = JSON.parse(content);
  const heartbeatTime = new Date(data.timestamp).getTime();
  const now = Date.now();
  const ageMs = now - heartbeatTime;

  if (isNaN(heartbeatTime) || ageMs > MAX_HEARTBEAT_AGE_MS) {
    console.error(
      `[Worker Healthcheck FAIL] Heartbeat is stale (age: ${ageMs}ms > ${MAX_HEARTBEAT_AGE_MS}ms)`,
    );
    process.exit(1);
  }

  console.log(
    `[Worker Healthcheck OK] Worker PID ${data.pid} is healthy (age: ${ageMs}ms)`,
  );
  process.exit(0);
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[Worker Healthcheck FAIL] ${message}`);
  process.exit(1);
}
