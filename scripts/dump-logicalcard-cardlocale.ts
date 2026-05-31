/**
 * LogicalCard + CardLocale 전체 JSON 백업 스크립트
 * 출력: prisma/backups/logicalcard-cardlocale-{yyyymmdd}.json.bak
 * READ-ONLY — DB 수정 없음
 */
import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

async function main() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const outPath = path.resolve(
    __dirname,
    "../prisma/backups",
    `logicalcard-cardlocale-${date}.json.bak`
  );

  console.log("백업 시작...");

  // LogicalCard 전체 (관계 없이 순수 필드만)
  const logicalCards = await prisma.logicalCard.findMany({
    select: {
      id: true,
      setGroupId: true,
      primarySetId: true,
      primaryNumber: true,
      primaryNumberInt: true,
      pokedexNumbers: true,
      supertype: true,
      subtypes: true,
      types: true,
      hp: true,
      retreatCost: true,
      weakness: true,
      resistance: true,
      regulationMark: true,
      illustrator: true,
      evolvesFrom: true,
      evolvesTo: true,
      abilities: true,
      attacks: true,
      legalities: true,
      rules: true,
      flavorText: true,
      rarityId: true,
      nameKo: true,
      attacksKo: true,
      abilitiesKo: true,
      rulesKo: true,
      flavorTextKo: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  console.log(`LogicalCard 로드: ${logicalCards.length}행`);

  // CardLocale 전체
  const cardLocales = await prisma.cardLocale.findMany({
    select: {
      id: true,
      logicalCardId: true,
      language: true,
      region: true,
      setId: true,
      number: true,
      numberInt: true,
      name: true,
      flavorText: true,
      imageSmall: true,
      imageLarge: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  console.log(`CardLocale 로드: ${cardLocales.length}행`);

  const backup = {
    exportedAt: new Date().toISOString(),
    counts: {
      logicalCards: logicalCards.length,
      cardLocales: cardLocales.length,
    },
    logicalCards,
    cardLocales,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(backup, null, 2), "utf-8");

  const stat = fs.statSync(outPath);
  const sizeMb = (stat.size / 1024 / 1024).toFixed(1);
  console.log(`백업 완료: ${outPath}`);
  console.log(`파일 크기: ${sizeMb} MB`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
