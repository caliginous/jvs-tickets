/**
 * Migrate Event.coverImage assets to Vercel Blob and update DB URLs.
 *
 * Usage:
 *   DRY_RUN=1 npx ts-node scripts/migrate-event-images.ts
 *   npx ts-node scripts/migrate-event-images.ts --limit 500 --concurrency 5
 *
 * ENV (required):
 *   DATABASE_URL=postgres://...
 *   BLOB_READ_WRITE_TOKEN=...         // from Vercel → Storage → Tokens
 *
 * Optional ENV:
 *   BLOB_PREFIX=events/cover-images   // folder/prefix in blob storage (default)
 *   BLOB_PUBLIC_BASE=https://<your-bucket>.public.blob.vercel-storage.com // used to detect already-migrated URLs
 */

import 'dotenv/config';
import crypto from 'node:crypto';
import * as path from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { fileTypeFromBuffer } from 'file-type';
import prisma from '../src/lib/prisma';
import { put } from '@vercel/blob';

const DRY_RUN = !!process.env.DRY_RUN || process.argv.includes('--dry-run');
const LIMIT = Number((getArg('--limit') ?? process.env.LIMIT) || 0) || undefined;
const CONCURRENCY = Number((getArg('--concurrency') ?? process.env.CONCURRENCY) || 6);
const BLOB_PREFIX = (process.env.BLOB_PREFIX || 'events/cover-images').replace(/^\/+|\/+$/g, '');
const BLOB_PUBLIC_BASE = (process.env.BLOB_PUBLIC_BASE || '').replace(/\/+$/,''); // optional
const MAX_RETRIES = 3;

type EventRow = { id: number; title: string; coverImage: string | null };

function getArg(flag: string) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i+1] : undefined;
}

function isAlreadyOnBlob(url: string | null | undefined): boolean {
  if (!url) return false;
  if (BLOB_PUBLIC_BASE && url.startsWith(BLOB_PUBLIC_BASE)) return true;
  // Generic detection for Vercel Blob public hostnames if base not provided
  return /vercel-storage\.com\/?/.test(url);
}

function hashBuf(buf: Buffer) {
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
}

function safeSlug(s: string, max = 60) {
  const slug = (s || '')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max);
  return slug || 'untitled';
}

async function fetchWithRetries(url: string, attempt = 1): Promise<ArrayBuffer> {
  const res = await fetch(url, { redirect: 'follow' }).catch(() => null as any);
  if (!res || !res.ok) {
    if (attempt >= MAX_RETRIES) {
      throw new Error(`Fetch failed ${res?.status ?? 'NORES'} for ${url}`);
    }
    await wait(250 * attempt);
    return fetchWithRetries(url, attempt + 1);
  }
  return res.arrayBuffer();
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('Missing BLOB_READ_WRITE_TOKEN');
    process.exit(1);
  }

  const where = { NOT: [{ coverImage: null as any }, { coverImage: '' as any }] };
  const total = await prisma.event.count({ where });
  const toProcess = LIMIT ? Math.min(total, LIMIT) : total;

  console.log(`Found ${total} events with coverImage; processing ${toProcess} (concurrency=${CONCURRENCY})`);
  let processed = 0, skipped = 0, uploaded = 0, updated = 0, failed = 0, already = 0;

  const cursorBatchSize = 200;
  let cursor: number | undefined;

  // Simple pool for concurrency
  const queue: Promise<void>[] = [];

  const run = async (ev: EventRow) => {
    try {
      processed++;

      if (!ev.coverImage) { skipped++; return; }
      if (isAlreadyOnBlob(ev.coverImage)) {
        already++;
        return; // already migrated
      }

      // Download
      const ab = await fetchWithRetries(ev.coverImage);
      const buf = Buffer.from(ab);

      // Detect mime/ext
      const ft = await fileTypeFromBuffer(buf).catch(() => null as any);
      const contentType = ft?.mime || guessMimeFromUrl(ev.coverImage) || 'application/octet-stream';
      const ext = ft?.ext || guessExtFromUrl(ev.coverImage) || 'bin';

      // Build stable filename: <id>-<slug>-<hash>.<ext>
      const name = `${ev.id}-${safeSlug(ev.title)}-${hashBuf(buf)}.${ext}`;
      const key = `${BLOB_PREFIX}/${name}`;

      let newUrl: string | null = null;
      if (!DRY_RUN) {
        const putRes = await put(key, buf, {
          access: 'public',
          contentType,
          addRandomSuffix: false,
        });
        newUrl = putRes.url;
        uploaded++;
      } else {
        newUrl = `${BLOB_PUBLIC_BASE || 'https://<blob-host>'}/${key}`;
      }

      // Update DB if URL changed
      if (!DRY_RUN && newUrl && newUrl !== ev.coverImage) {
        await prisma.event.update({
          where: { id: ev.id },
          data: { coverImage: newUrl },
        });
        updated++;
      }

      logEvery(25, () => {
        console.log(`Processed=${processed}/${toProcess} uploaded=${uploaded} updated=${updated} skipped=${skipped} already=${already} failed=${failed}`);
      });

    } catch (err: any) {
      failed++;
      console.warn(`Failed for event ${ev.id} "${ev.title}": ${err?.message || err}`);
    }
  };

  while (true) {
    const batch = await prisma.event.findMany({
      where,
      select: { id: true, title: true, coverImage: true },
      take: Math.min(cursorBatchSize, (toProcess - processed)),
      ...(cursor ? { skip: cursor > 0 ? 1 : 0, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
    });

    if (!batch.length) break;

    for (const ev of batch) {
      // track last id as cursor
      cursor = ev.id;

      // throttle queue
      const p = run(ev);
      queue.push(p);
      if (queue.length >= CONCURRENCY) {
        await Promise.race(queue).catch(() => {});
        // remove settled
        for (let i = queue.length - 1; i >= 0; i--) {
          if (isSettled(queue[i])) queue.splice(i, 1);
        }
      }
      if (processed >= toProcess) break;
    }
    if (processed >= toProcess) break;
  }

  // drain
  await Promise.allSettled(queue);

  console.log('--- SUMMARY ---');
  console.log(JSON.stringify({ total, processed, uploaded, updated, already, skipped, failed, dryRun: DRY_RUN, prefix: BLOB_PREFIX }, null, 2));

  await prisma.$disconnect();
}

function guessMimeFromUrl(u: string): string | null {
  const ext = guessExtFromUrl(u);
  if (!ext) return null;
  switch (ext.toLowerCase()) {
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    default: return null;
  }
}
function guessExtFromUrl(u: string): string | null {
  try {
    const p = new URL(u);
    const ext = path.extname(p.pathname).replace('.', '');
    return ext || null;
  } catch { return null; }
}

function logEvery(n: number, fn: () => void) {
  (logEvery as any)._i = ((logEvery as any)._i || 0) + 1;
  if ((logEvery as any)._i % n === 0) fn();
}

function isSettled<T>(p: Promise<T>): boolean {
  // In Node there's no direct way; we remove after race. This helper is symbolic here.
  return false;
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
