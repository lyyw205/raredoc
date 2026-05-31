/**
 * Cloudflare R2 client utilities
 *
 * - getR2Client()      S3Client with forcePathStyle: true (required for R2)
 * - r2KeyFor(...)      canonical key builder with collision-hash fallback
 * - headExists(key)    HeadObject existence check
 * - uploadBuffer(...)  Upload using @aws-sdk/lib-storage
 * - r2PublicUrl(key)   public CDN URL from R2_PUBLIC_BASE_URL
 */
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------
let _client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (_client) return _client;
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) throw new Error("R2_ACCOUNT_ID not set");
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
    forcePathStyle: true, // required for R2 — without this SSL handshake fails
  });
  return _client;
}

// ---------------------------------------------------------------------------
// Key construction
// ---------------------------------------------------------------------------
/**
 * Build R2 object key.
 *
 * Normal:    {setGroupId}/{language}/{size}/{setId}/{number}.{ext}
 * Collision: {setGroupId}/{language}/{size}/{setId}/{number}__{hash8}.{ext}
 *
 * Collision occurs when (setId, number) is shared across multiple CardLocale
 * rows (e.g. parallel packs SV2D/SV2P both stored under the same logical set).
 * In that case pass cardLocaleId; hash = SHA-1(cardLocaleId)[0..7].
 */
export function r2KeyFor(
  setGroupId: string,
  language: string,
  size: "small" | "large",
  setId: string,
  number: string,
  ext: string,
  cardLocaleId?: string // supply only when collision handling is needed
): string {
  const safeGroup = setGroupId.replace(/[^a-zA-Z0-9_\-]/g, "_");
  const safeSet = setId.replace(/[^a-zA-Z0-9_\-]/g, "_");
  const safeLang = language.toLowerCase();
  const safeNum = number.replace(/[^a-zA-Z0-9_\-]/g, "_");
  const safeExt = ext.replace(/^\./, "").toLowerCase();

  const numberPart = cardLocaleId
    ? `${safeNum}__${sha1Prefix8(cardLocaleId)}`
    : safeNum;

  return `${safeGroup}/${safeLang}/${size}/${safeSet}/${numberPart}.${safeExt}`;
}

function sha1Prefix8(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 8);
}

// ---------------------------------------------------------------------------
// R2 operations
// ---------------------------------------------------------------------------
const BUCKET = () => {
  const b = process.env.R2_BUCKET;
  if (!b) throw new Error("R2_BUCKET not set");
  return b;
};

/** Returns true if object already exists in R2. */
export async function headExists(key: string): Promise<boolean> {
  const client = getR2Client();
  try {
    await client.send(new HeadObjectCommand({ Bucket: BUCKET(), Key: key }));
    return true;
  } catch (err: unknown) {
    const code = (err as { name?: string; $metadata?: { httpStatusCode?: number } });
    if (
      code.name === "NotFound" ||
      code.name === "NoSuchKey" ||
      code.$metadata?.httpStatusCode === 404
    ) {
      return false;
    }
    throw err;
  }
}

/** Upload a Buffer to R2. */
export async function uploadBuffer(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  const client = getR2Client();
  const upload = new Upload({
    client,
    params: {
      Bucket: BUCKET(),
      Key: key,
      Body: body,
      ContentType: contentType,
    },
  });
  await upload.done();
}

/** Derive content-type from extension. */
export function contentTypeFor(ext: string): string {
  switch (ext.toLowerCase()) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

/** Build public CDN URL for a given R2 key. */
export function r2PublicUrl(key: string): string {
  const base = (process.env.R2_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  return `${base}/${key}`;
}

/** Extract file extension from a URL (without leading dot, lowercase). */
export function extFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const last = pathname.split(".").pop() ?? "jpg";
    return last.toLowerCase();
  } catch {
    return "jpg";
  }
}

/** Return true if URL already points to R2 (already migrated). */
export function isR2Url(url: string): boolean {
  const base = process.env.R2_PUBLIC_BASE_URL ?? "";
  return base.length > 0 && url.startsWith(base);
}
