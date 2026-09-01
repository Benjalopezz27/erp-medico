import { Injectable, Logger } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';

export interface ClockSyncResult {
  localTimeIso: string;
  referenceTimeIso: string | null;
  driftSeconds: number | null;
  isSynchronized: boolean;
  status: 'synchronized' | 'drift_exceeded' | 'unreachable';
  referenceSource: string;
  warning?: string;
}

@Injectable()
export class ArcaClockSyncService {
  private readonly logger = new Logger(ArcaClockSyncService.name);
  private static readonly MAX_ALLOWED_DRIFT_SECONDS = 60;

  /**
   * Verifies local system time against a reliable HTTP Date header reference.
   * If remote reference is unreachable or header is missing, flags isSynchronized: false.
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
      let status: ClockSyncResult['status'] = 'synchronized';

      if (!isSynchronized) {
        status = 'drift_exceeded';
        warning = `Clock drift (${driftSeconds}s) exceeds maximum allowed threshold of ${ArcaClockSyncService.MAX_ALLOWED_DRIFT_SECONDS}s. AFIP WSAA requests may be rejected with 'Fecha no válida'.`;
        this.logger.warn(`[ARCA ClockSync] ${warning}`);
      }

      return {
        localTimeIso,
        referenceTimeIso: remoteTime.toISOString(),
        driftSeconds,
        isSynchronized,
        status,
        referenceSource: referenceUrl,
        warning,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `[ARCA ClockSync] Could not reach reference ${referenceUrl} to verify time: ${message}.`,
      );
      return {
        localTimeIso,
        referenceTimeIso: null,
        driftSeconds: null,
        isSynchronized: false,
        status: 'unreachable',
        referenceSource: referenceUrl,
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
          if (!dateHeader) {
            reject(new Error('Remote server did not provide a Date header'));
            return;
          }
          const parsed = new Date(dateHeader);
          if (isNaN(parsed.getTime())) {
            reject(new Error(`Invalid Date header received: "${dateHeader}"`));
            return;
          }
          resolve(parsed);
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
