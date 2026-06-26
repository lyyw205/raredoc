/**
 * Pokémon GO (jp-tcg-S10b, og-s10b) 이미지 수정 2건:
 *   (A) #13 ドンメル(Numel): 현재 JP 이미지가 어둡고 저화질(.jpg 40KB, 밝기119) → 공식 클린본(370KB, 밝기160)으로 교체.
 *       새 webp 키로 업로드(.jpg→.webp 키변경=CDN 캐시 자연 우회) → DB 갱신 → 기존 .jpg 객체 삭제.
 *   (B) #94-101 기본에너지 8종(基本草~鋼, GO테마): imageLarge/Small 이 NULL → 공식에서 채움.
 *       tcgdex/Limitless 가 이 기본에너지를 빠뜨려 수집 당시 누락됐던 것. KR(kr-s10b) 동일번호는 보유.
 *
 * 출처: pokemon-card.com 공식 (pg=861=S10b). #13=cardID 41694, 에너지=41753~41760(草炎水雷超闘悪鋼, DB #94-101 과 1:1).
 *   비교/몽타주 시각검증 완료(#13 동일카드·더밝음, 에너지 8종 워터마크없음).
 *
 * ★이미지 전용: Card/RegionCard 정체성·번호·KR 공유 LC 연결 전부 불변. og-s10b 는 동결팩이라 --allow-protected 필요.
 *
 * dry: npx tsx scripts/fix-s10b-images.ts
 * 적용: npx tsx scripts/fix-s10b-images.ts --apply --allow-protected
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists, getR2Client } from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const exec = promisify(execFile);
const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-S10b", PACK = "og-s10b";
const BASE = "https://www.pokemon-card.com/assets/images/card_images/large/S10b/";

// (A) #13 교체 + (B) #94-101 필. file = 공식 large jpg 파일명.
const REPLACE = [{ number: "13", name: "ドンメル", file: "041694_P_DONMERU.jpg" }];
const FILL = [
  { number: "94", name: "基本草エネルギー", file: "041753_E_KIHONKUSAENERUGI.jpg" },
  { number: "95", name: "基本炎エネルギー", file: "041754_E_KIHONHONOOENERUGI.jpg" },
  { number: "96", name: "基本水エネルギー", file: "041755_E_KIHONMIZUENERUGI.jpg" },
  { number: "97", name: "基本雷エネルギー", file: "041756_E_KIHONKAMINARIENERUGI.jpg" },
  { number: "98", name: "基本超エネルギー", file: "041757_E_KIHONCHIXYOUENERUGI.jpg" },
  { number: "99", name: "基本闘エネルギー", file: "041758_E_KIHONTOUENERUGI.jpg" },
  { number: "100", name: "基本悪エネルギー", file: "041759_E_KIHONAKUENERUGI.jpg" },
  { number: "101", name: "基本鋼エネルギー", file: "041760_E_KIHONHAGANEENERUGI.jpg" },
];

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer; if (b.length < 5000) throw new Error(`small ${b.length}`); return b;
}
function keyFromUrl(url: string | null): string | null { if (!url || !url.includes("r2.dev/")) return null; return url.split("r2.dev/")[1]; }
async function deleteKey(key: string) { try { await getR2Client().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key })); return true; } catch { return false; } }

async function processCard(c: { number: string; name: string; file: string }, mode: "replace" | "fill") {
  const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: c.number, region: "JP" }, select: { id: true, name: true, imageLarge: true, imageSmall: true } });
  if (!rc) { console.log(`  #${c.number} ✗ RegionCard 없음 — 스킵`); return false; }
  const largeKey = r2KeyFor(PACK, "ja", "large", SET, c.number, "webp");
  const smallKey = r2KeyFor(PACK, "ja", "small", SET, c.number, "webp");
  console.log(`  [${mode}] #${c.number} ${rc.name} | 현재large=${rc.imageLarge ?? "NULL"} → ${largeKey}`);
  if (!APPLY) return true;
  const buf = await dl(BASE + c.file);
  const largeBuf = await sharp(buf).webp({ quality: 90 }).toBuffer();
  const smallBuf = await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  await uploadBuffer(largeKey, largeBuf, "image/webp");
  await uploadBuffer(smallKey, smallBuf, "image/webp");
  if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error(`#${c.number} R2 verify 실패`);
  // 옛 키(교체 시 .jpg)들을 삭제 — 단, 새 키와 다를 때만
  const oldKeys = mode === "replace" ? [keyFromUrl(rc.imageLarge), keyFromUrl(rc.imageSmall)].filter((k): k is string => !!k && k !== largeKey && k !== smallKey) : [];
  await prisma.regionCard.update({ where: { id: rc.id }, data: { imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) } });
  for (const k of oldKeys) { const ok = await deleteKey(k); console.log(`    옛 객체 삭제 ${ok ? "✓" : "실패"}: ${k}`); }
  console.log(`    ✓ updated ${rc.id}`);
  return true;
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-s10b-images" });
  console.log(`${APPLY ? "APPLY" : "DRY"} fix-s10b-images | 교체 ${REPLACE.length} + 필 ${FILL.length} (이미지 전용)`);
  for (const c of REPLACE) await processCard(c, "replace");
  for (const c of FILL) await processCard(c, "fill");
  console.log("\n완료.");
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
