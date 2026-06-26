/**
 * 25th ANNIVERSARY GOLDEN BOX (jp-tcg-S8a-G, og-s8a-g) JP 이미지 전체(16장) 누락 채우기.
 *
 * 배경: JP RegionCard 16장 모두 imageLarge/Small=NULL(수집 당시 누락). KR(kr-s8a-g) 동일번호는 보유.
 * 출처: pokemon-card.com 공식 (pg=860=S8a-G). 공식 리스트 순서·cardID순이 콜렉션 번호와 불일치 +
 *   동명 2쌍(ピカチュウV #1/#5, モンスターボール #2/#7)이라, KR(권위 매핑)과 고해상 이미지 대조로
 *   16장 전수 확정: #1=골드V, #5=25th풀아트V / #2=풀골드볼(시크릿), #7=일반아이템볼. md5로 4장 상이 확인.
 *
 * 동작: 공식 .jpg 다운 → webp large(q90)+245 small(q80) → R2 og-s8a-g/ja/{size}/jp-tcg-S8a-G/{num}.webp
 *   → 기존 RegionCard(setId=jp-tcg-S8a-G, number, region=JP) imageLarge/Small 만 UPDATE.
 *   ★이미지 전용: 정체성·번호·KR 공유 LC 연결 불변.
 *
 * dry: npx tsx scripts/fill-s8ag-images.ts
 * 적용: npx tsx scripts/fill-s8ag-images.ts --apply
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const exec = promisify(execFile);
const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-S8a-G", PACK = "og-s8a-g";
const BASE = "https://www.pokemon-card.com/assets/images/card_images/large/S8a-G/";

// numberInt → 공식 large 파일명 (KR 대조로 검증 확정)
const MAP: Record<number, string> = {
  1: "041664_P_PIKACHIXYUUV.jpg",       // 풀골드 V (KR#1)
  2: "041665_T_MONSUTABORU.jpg",        // 풀골드 몬스터볼 시크릿 (KR#2)
  3: "041666_P_PIKACHIXYUU.jpg",
  4: "041667_P_RAICHIXYUU.jpg",
  5: "041668_P_PIKACHIXYUUV.jpg",       // 25th 풀아트 V (KR#5)
  6: "041669_P_PIKACHIXYUUVMAX.jpg",
  7: "041674_T_MONSUTABORU.jpg",        // 일반 아이템 몬스터볼 (KR#7)
  8: "041670_T_KIZUGUSURI.jpg",
  9: "041671_T_SUPABORU.jpg",
  10: "041672_T_POKEMONIREKAE.jpg",
  11: "041673_T_POKEMONKIXYATCHIXYA.jpg",
  12: "041675_T_HAKASENOKENKIXYUUMAGUNORIAHAKASE.jpg",
  13: "041676_T_BITO.jpg",
  14: "041677_T_POKEMONGOKKO.jpg",
  15: "041678_T_HOPPU.jpg",
  16: "041679_E_KIHONKAMINARIENERUGI.jpg",
};

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "40", "-A", "Mozilla/5.0", url], { maxBuffer: 25 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer; if (b.length < 5000) throw new Error(`small ${b.length}`); return b;
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-s8ag-images" });
  const rows = await prisma.regionCard.findMany({ where: { setId: SET, region: "JP" }, select: { id: true, number: true, numberInt: true, name: true, imageLarge: true }, orderBy: { numberInt: "asc" } });
  console.log(`${APPLY ? "APPLY" : "DRY"} fill-s8ag-images | ${rows.length}장 (이미지 필 전용)`);
  let ok = 0;
  for (const rc of rows) {
    const file = MAP[rc.numberInt!];
    if (!file) { console.log(`  #${rc.number} ${rc.name} ✗ 맵 없음 — 스킵`); continue; }
    const largeKey = r2KeyFor(PACK, "ja", "large", SET, rc.number, "webp");
    const smallKey = r2KeyFor(PACK, "ja", "small", SET, rc.number, "webp");
    console.log(`  #${rc.number} ${rc.name} | 현재=${rc.imageLarge ?? "NULL"} → ${largeKey} (${file})`);
    if (!APPLY) continue;
    const buf = await dl(BASE + file);
    const largeBuf = await sharp(buf).webp({ quality: 90 }).toBuffer();
    const smallBuf = await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    await uploadBuffer(largeKey, largeBuf, "image/webp");
    await uploadBuffer(smallKey, smallBuf, "image/webp");
    if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error(`#${rc.number} R2 verify 실패`);
    await prisma.regionCard.update({ where: { id: rc.id }, data: { imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) } });
    console.log(`    ✓ updated ${rc.id}`);
    ok++;
  }
  if (APPLY) console.log(`\n완료: ${ok}/${rows.length} 이미지 채움`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
