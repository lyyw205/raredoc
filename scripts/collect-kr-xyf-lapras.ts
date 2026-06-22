/**
 * card-check 후속 — kr-xyf #006 ラプラス(라프라스) KR 로케일 수집(KR 일반카드 갭).
 *   JP jp-tcg-XYF-006(lc-jp-tcg-XYF-006)에 KR 로케일만 없었음(KR 수집 누락). JP 앵커 LC 에 KR 로케일 부착.
 *   이미지=공식 KR CDN XYF_006.jpg(HTTP200·시각검증=라프라스). kr-xyf-005 포맷을 템플릿으로 복제.
 *   LC.nameKo + CardText(ko) 백필(=#5 패턴, 현재 null). cardCount 16→17. 비동결 xy-decks.
 *   실행: npx tsx scripts/collect-kr-xyf-lapras.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const LC = "lc-jp-tcg-XYF-006";
const KR_ID = "kr-xyf-006";
const NAME_KO = "라프라스";
const IMG = "https://cards.image.pokemonkorea.co.kr/data/wmimages/XY/XYF/XYF_006.jpg";

async function main() {
  const apply = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  assertWritable(["xy-decks"], { allow, dryRun: !apply, tool: "collect-kr-xyf-lapras" });

  const lc = await prisma.card.findUnique({ where: { id: LC }, select: { id: true, nameKo: true } });
  if (!lc) throw new Error(`LC 없음: ${LC}`);
  const tmpl = await prisma.regionCard.findUnique({ where: { id: "kr-xyf-005" },
    select: { language: true, region: true, setId: true, number: true } });
  if (!tmpl) throw new Error("템플릿 kr-xyf-005 없음");
  const exists = await prisma.regionCard.findUnique({ where: { id: KR_ID }, select: { id: true } });

  const num = String(6).padStart(tmpl.number.length, "0"); // tmpl '005' → '006'

  console.log(`${apply ? "[APPLY]" : "[DRY]"} KR ${KR_ID} 생성 — ${NAME_KO} → LC ${LC}`);
  console.log(`  템플릿 kr-xyf-005: lang=${tmpl.language} region=${tmpl.region} setId=${tmpl.setId} number='${tmpl.number}' → 새 number='${num}'`);
  console.log(`  img ${IMG.split("/").pop()} · LC.nameKo ${lc.nameKo ?? "(null)→라프라스 백필"} · RC 존재? ${exists ? "예" : "아니오"}`);

  if (!apply) { console.log("\n(dry-run — --apply 로 적용)"); return; }
  if (exists) { console.log("이미 존재 — 중단"); return; }

  await prisma.$transaction(async (tx) => {
    await tx.regionCard.create({ data: {
      id: KR_ID, cardId: LC, language: tmpl.language, region: tmpl.region,
      setId: tmpl.setId, number: num, numberInt: 6, name: NAME_KO,
      imageSmall: IMG, imageLarge: IMG, rarityId: null, regulationMark: null,
    } });
    if (!lc.nameKo) await tx.card.update({ where: { id: LC }, data: { nameKo: NAME_KO } });
    await tx.cardText.upsert({
      where: { cardId_language: { cardId: LC, language: "ko" } },
      create: { cardId: LC, language: "ko", name: NAME_KO, source: "lc_nameko" },
      update: {},
    });
    await tx.set.update({ where: { id: "kr-xyf" }, data: { cardCount: { increment: 1 } } });
  });

  const after = await prisma.regionCard.findUnique({ where: { id: KR_ID }, select: { id: true, name: true, cardId: true } });
  const cnt = await prisma.regionCard.count({ where: { setId: "kr-xyf" } });
  console.log(`✅ 완료 — ${after?.id} (${after?.name}) → ${after?.cardId} · kr-xyf 로케일 수 ${cnt}`);
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e instanceof Error ? e.message : e); prisma.$disconnect(); process.exit(1); });
