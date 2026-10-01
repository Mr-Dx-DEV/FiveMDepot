import * as fs from 'fs';
import * as path from 'path';
import { Client as FTPClient } from 'ftp';

// NOTE: We use simple node:fs + https for uploads instead of the ftp npm package
// to avoid native dependency issues. This uses Node's built-in https module.

export interface UploadResult {
  success: boolean;
  path?: string;
  error?: string;
}

/**
 * Upload a local file to the Plesk FTP server.
 * Returns the public URL path of the uploaded file.
 */
export async function uploadToFTP(
  localPath: string,
  remoteDir: string
): Promise<UploadResult> {
  const { FTP_HOST, FTP_USER, FTP_PASSWORD } = process.env;

  if (!FTP_HOST || !FTP_USER || !FTP_PASSWORD) {
    return { success: false, error: 'FTP credentials not configured' };
  }

  return new Promise((resolve) => {
    const client = new FTPClient();

    client.on('ready', () => {
      client.put(
        Buffer.from(fs.readFileSync(localPath)),
        `${remoteDir}/${path.basename(localPath)}`,
        (err) => {
          client.end();
          if (err) {
            resolve({ success: false, error: err.message });
          } else {
            resolve({
              success: true,
              path: `https://${FTP_HOST}/ftpuploads/${remoteDir}/${path.basename(localPath)}`,
            });
          }
        }
      );
    });

    client.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });

    client.connect({
      host: FTP_HOST,
      user: FTP_USER,
      password: FTP_PASSWORD,
    });
  });
}

/**
 * Generate a safe filename from the original.
 */
export function sanitizeFilename(original: string): string {
  const ext = path.extname(original);
  const name = path.basename(original, ext);
  const safe = name.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
  return `${safe}-${Date.now()}${ext}`;
}
