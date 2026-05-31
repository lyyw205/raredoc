/**
 * KR 세트 보강 수집기 (best-effort, 멱등, throw 금지).
 *
 * 실행: npm run sync:setgroups:kr
 *
 * 목적: pokemoncard.co.kr `/card/category/info1` 정적 페이지(curl 접근 가능 확인됨)에서
 *       한국어 정식명·발매일·사이트ID(code) 를 긁어 기존 KR Set(region="KR")의
 *       code(사이트ID)·발매일을 보정한다.
 *
 * 안전장치:
 *   - 네트워크/파싱 실패해도 throw 하지 않는다. seed-set-groups 의 시드값을 그대로 유지.
 *   - KR Set 이 없으면 아무것도 만들지 않는다(이 스크립트는 "보강"만 담당).
 *   - 멱등: 같은 KR Set 의 code/releaseDate 만 갱신.
 *
 * ⚠️ 페이지 DOM 구조는 변동 가능. 매칭은 시드된 한국어 정식명(Set.name) 기준 부분일치로만
 *    수행하고, 확신이 없으면 건너뛴다(할루시네이션 방지).
 *
 * TODO: info1 의 실제 HTML 구조 확정 후 파서 정밀화(현재는 안전한 best-effort 매칭).
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";

const SOURCE_URL = "https://pokemoncard.co.kr/card/category/info1";

type KrEntry = { siteId: string; name: string; releaseDate?: string };

/** info1 HTML 에서 (사이트ID, 한국어명, 발매일?) 후보를 추출. 실패 시 []. */
function parseInfoPage(html: string): KrEntry[] {
  const entries: KrEntry[] = [];
  // 카테고리 링크 패턴: /card/category/<siteId> ... 텍스트(한국어명)
  // DOM 변동에 강하도록 보수적으로 anchor 만 훑는다.
  const anchorRe = /<a[^>]+href=["'][^"']*\/card\/category\/(\d+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html)) !== null) {
    const siteId = m[1];
    const name = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (name) entries.push({ siteId, name });
  }
  return entries;
}

/** 시드된 KR Set.name 과 수집 후보를 부분일치로 매칭(공백 제거 후 양방향 포함). */
function matchEntry(krName: string, entries: KrEntry[]): KrEntry | null {
  const norm = (s: string) => s.replace(/\s+/g, "");
  const target = norm(krName);
  for (const e of entries) {
    const cand = norm(e.name);
    if (cand && (cand.includes(target) || target.includes(cand))) return e;
  }
  return null;
}

async function main() {
  const krSets = await prisma.set.findMany({
    where: { region: "KR" },
    select: { id: true, name: true, code: true },
  });
  console.log(`[sync:kr] 대상 KR Set: ${krSets.length}개`);

  let html = "";
  try {
    const res = await fetch(SOURCE_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (raredoc set-sync)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (e) {
    console.warn(`[sync:kr] 수집 실패 — 시드값 유지. (${(e as Error).message})`);
    await prisma.$disconnect();
    return;
  }

  const entries = parseInfoPage(html);
  console.log(`[sync:kr] 파싱된 후보: ${entries.length}개`);
  if (entries.length === 0) {
    console.warn("[sync:kr] 후보 0개 — DOM 구조 변동 가능. 시드값 유지.");
    await prisma.$disconnect();
    return;
  }

  let updated = 0;
  let unmatched = 0;
  for (const s of krSets) {
    const hit = matchEntry(s.name, entries);
    if (!hit) {
      unmatched++;
      continue;
    }
    // code(사이트ID)만 안전 보정. 발매일은 후보에 신뢰값이 있을 때만(현재 미수집).
    if (s.code !== hit.siteId) {
      await prisma.set.update({ where: { id: s.id }, data: { code: hit.siteId } });
      updated++;
    }
  }

  console.log(`[sync:kr] code 보정: ${updated}개, 미매칭: ${unmatched}개`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.warn(`[sync:kr] 예외 — 시드값 유지. (${(e as Error).message})`);
  await prisma.$disconnect();
});
