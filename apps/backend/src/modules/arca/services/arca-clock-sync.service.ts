import { Injectable, Logger } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';

export interface ClockSyncResult {
  localTimeIso: string;
  referenceTimeIso: string | null;
  driftSeconds: number;
  isSynchronized: boolean;
  referenceSource: string;
  warning?: string;
}

@Injectable()
export class ArcaClockSyncService {
  private readonly logger = new Logger(ArcaClockSyncService.name);
  private static readonly MAX_ALLOWED_DRIFT_SECONDS = 60;

  /**
   * Verifies local system time against a reliable HTTP Date header reference.
   * Tolerates up to 60 seconds drift before flagging as out of sync for WSAA.
   */
  async verifyClockSync(
    referenceUrl = 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
  ): Promise<ClockSyncResult> {
    const localTime = new Date();
    const localTimeIso = localTime.toISOString();

    try {
      const remoteTime = await this.fetchRemoteHttpDate(referenceUrl);
      const driftMs = Math.abs(localTime.getTime() - remoteTime.getTime());
      const driftSeconds = Math.round(driftMs / 1000);
      const isSynchronized =
        driftSeconds <= ArcaClockSyncService.MAX_ALLOWED_DRIFT_SECONDS;

      let warning: string | undefined;
      if (!isSynchronized) {
        warning = `Clock drift (${driftSeconds}s) exceeds maximum allowed threshold of ${ArcaClockSyncService.MAX_ALLOWED_DRIFT_SECONDS}s. AFIP WSAA requests may be rejected with 'Fecha no válida'.`;
        this.logger.warn(`[ARCA ClockSync] ${warning}`);
      }

      return {
        localTimeIso,
        referenceTimeIso: remoteTime.toISOString(),
        driftSeconds,
        isSynchronized,
        referenceSource: referenceUrl,
        warning,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `[ARCA ClockSync] Could not reach reference ${referenceUrl} to verify time: ${message}. Assuming local clock.`,
      );
      return {
        localTimeIso,
        referenceTimeIso: null,
        driftSeconds: 0,
        isSynchronized: true,
        referenceSource: 'local_fallback',
        warning: `Could not reach time reference: ${message}`,
      };
    }
  }

  private fetchRemoteHttpDate(urlStr: string): Promise<Date> {
    return new Promise((resolve, reject) => {
      const url = new URL(urlStr);
      const client = url.protocol === 'https:' ? https : http;

      const req = client.request(
        urlStr,
        { method: 'HEAD', timeout: 5000 },
        (res) => {
          const dateHeader = res.headers['date'];
          if (dateHeader) {
            const parsed = new Date(dateHeader);
            if (!isNaN(parsed.getTime())) {
              resolve(parsed);
              return;
            }
          }
          resolve(new Date());
        },
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Connection timed out'));
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.end();
    });
  }
}
