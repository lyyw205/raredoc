/**
 * PMCG1~6 카드 이미지를 Bulbapedia 에서 다운로드 → Supabase Storage 업로드
 * → DB의 imageSmall/imageLarge 를 Supabase public URL 로 갱신.
 *
 * - 핫링킹 차단 회피: curl 기본 헤더(Accept any) 로 GET → 200 OK 받음
 * - 업로드: PUT /storage/v1/object/{bucket}/{path}  (upsert=true)
 * - 공개 URL: {SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}
 *
 * 출처 정보(bulbapedia 매핑)는 ExternalIdMapping 에 그대로 남아있음.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const execFileP = promisify(execFile);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "card-images";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const SETS = ["PMCG1", "PMCG2", "PMCG3", "PMCG4", "PMCG5", "PMCG6"];

async function downloadToFile(url: string, dest: string): Promise<boolean> {
  try {
    await execFileP("curl", ["-sSL", "--max-time", "30", "-o", dest, url], { maxBuffer: 16 * 1024 * 1024 });
    const buf = await readFile(dest);
    if (buf.length < 1024) {
      // 너무 작음 = 에러 페이지 가능성
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function uploadToSupabase(localPath: string, remotePath: string, contentType: string): Promise<string | null> {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${remotePath}`;
  try {
    const { stdout, stderr } = await execFileP(
      "curl",
      [
        "-sS",
        "-X", "POST",
        "-H", `Authorization: Bearer ${SERVICE_KEY}`,
        "-H", `apikey: ${SERVICE_KEY}`,
        "-H", `Content-Type: ${contentType}`,
        "-H", "x-upsert: true",
        "--data-binary", `@${localPath}`,
        "--max-time", "60",
        url,
      ],
      { maxBuffer: 16 * 1024 * 1024 }
    );
    // 성공 응답: {"Id":"...","Key":"card-images/..."}
    if (stdout.includes("Key")) {
      return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${remotePath}`;
    }
    console.error(`  upload err: ${stdout.slice(0, 200)} ${stderr.slice(0, 200)}`);
    return null;
  } catch (e) {
    console.error(`  upload exc: ${(e as Error).message}`);
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const arg = process.argv.find((a) => a.startsWith("--set="));
  const setsToRun = arg ? [arg.slice("--set=".length).toUpperCase()] : SETS;
  const tmpRoot = join(tmpdir(), `raredoc-img-${Date.now()}`);
  await mkdir(tmpRoot, { recursive: true });

  let totalOk = 0, totalSkip = 0, totalFail = 0;
  for (const setId of setsToRun) {
    const cards = await prisma.cardLocale.findMany({
      where: {
        id: { startsWith: `jp-tcg-${setId}-` },
        imageSmall: { startsWith: "https://archives.bulbagarden.net/" },
      },
      select: { id: true, name: true, imageSmall: true },
      orderBy: { id: "asc" },
    });
    console.log(`\n─── ${setId}: ${cards.length} 장 처리 ───`);

    for (const card of cards) {
      const ext = card.imageSmall!.toLowerCase().endsWith(".png") ? "png" : "jpg";
      const remotePath = `${card.id}.${ext}`;
      const localPath = join(tmpRoot, remotePath);
      const contentType = ext === "png" ? "image/png" : "image/jpeg";

      const dlOk = await downloadToFile(card.imageSmall!, localPath);
      if (!dlOk) {
        console.log(`  [${card.id}] ${card.name.slice(0,15).padEnd(15)} → ✗ download fail`);
        totalFail++;
        continue;
      }
      const publicUrl = await uploadToSupabase(localPath, remotePath, contentType);
      if (!publicUrl) {
        console.log(`  [${card.id}] ${card.name.slice(0,15).padEnd(15)} → ✗ upload fail`);
        totalFail++;
        await unlink(localPath).catch(() => {});
        continue;
      }
      await prisma.cardLocale.update({
        where: { id: card.id },
        data: { imageSmall: publicUrl, imageLarge: publicUrl },
      });
      await unlink(localPath).catch(() => {});
      console.log(`  [${card.id}] ${card.name.slice(0,15).padEnd(15)} → ✓ ${remotePath}`);
      totalOk++;
      await sleep(50);
    }
  }

  console.log(`\n══════ 결과 ══════`);
  console.log(`  성공: ${totalOk}`);
  console.log(`  실패: ${totalFail}`);
  console.log(`  스킵: ${totalSkip}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
