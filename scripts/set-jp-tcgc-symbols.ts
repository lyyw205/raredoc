/**
 * JP 세트 심볼(symbolUrl) 교정 — tcgcollector 코드배지/심볼을 R2 미러링.
 *   배경: 일부 JP 세트의 symbolUrl 이 잘못된 픽토그램(EN-borrow/ptcg)으로 들어가 있어,
 *   사용자가 tcgc 에서 코드/팩 일치 확인한 정식 JP 심볼(코드배지)로 교체. 시각검증 완료(symverify-*.png).
 *   심볼=Set.* FREE 필드(매핑 가드 불필요). gif/webp 원본 그대로 보존(애니 gif 포함).
 * 저장: set-assets/symbol/{setId}.{ext} → Set.symbolUrl.
 * dry:  npx tsx scripts/set-jp-tcgc-symbols.ts
 * 적용: npx tsx scripts/set-jp-tcgc-symbols.ts --apply
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { prisma } from "../src/lib/prisma";
import { uploadBuffer, r2PublicUrl, headExists, contentTypeFor } from "../src/lib/r2";
const exec = promisify(execFile);
const APPLY = process.argv.includes("--apply");

const JOBS: { setId: string; url: string }[] = [
  { setId: "jp-tcg-SM12", url: "https://static.tcgcollector.com/content/images/64/cd/42/64cd42ba3623a0f04977693db77bb8c5a0e0783c62777afe9b2494ae0b54e70c.gif" },
  { setId: "jp-tcg-SM10", url: "https://static.tcgcollector.com/content/images/3e/70/1a/3e701ae00485be3effe03c5615ef0798e5773461ee7147ee9ddbd81463b10f5e.webp" },
  { setId: "jp-tcg-SM9", url: "https://static.tcgcollector.com/content/images/67/f8/17/67f8174c1431927a4ece9f29f291d6f478f246158c87d058a6af9643ea1178fe.webp" },
  { setId: "jp-tcg-SM6", url: "https://static.tcgcollector.com/content/images/4c/f3/7d/4cf37d40132d01a058526a5f4fc4b655ff0b12a2fae8636d77dcf1e3093ca9c3.webp" },
  { setId: "jp-tcg-CP6", url: "https://static.tcgcollector.com/content/images/67/02/64/6702643e40e0a18af14f389561500fa5869b57763aa5c045e0cd3782e15b9ee1.webp" },
  { setId: "jp-tcg-CP5", url: "https://static.tcgcollector.com/content/images/e7/5e/0c/e75e0c451980794068cef2a3282e1dd351dfe784333f268b858d9d1dcb7ebb7f.webp" },
  { setId: "jp-tcg-XY11a", url: "https://static.tcgcollector.com/content/images/b3/88/b9/b388b96846e35498ab61673ca8d96f0b1faa416a3ec6e76f0f9480ad0ef26d44.webp" },
  { setId: "jp-tcg-CP4", url: "https://static.tcgcollector.com/content/images/c4/e0/d7/c4e0d73527660284da51cf4013938df6605b869ae0683fcf8452c79d0f780be9.webp" },
  { setId: "jp-tcg-XY10", url: "https://static.tcgcollector.com/content/images/b5/6e/37/b56e3702d14d37cd06aa2d16cbfbd961c4782af6acf59a5cd490256314e9a6b5.webp" },
  { setId: "jp-tcg-CP3", url: "https://static.tcgcollector.com/content/images/5b/54/1f/5b541f340fb2b4d2ff8badf665a7f412f685a75858a830108b422abbac45a919.webp" },
  { setId: "jp-tcg-XY9", url: "https://static.tcgcollector.com/content/images/c9/57/2d/c9572d33ca61bd03bc0a138d575e208310e67b9a682f7dc233dc35cc3c830632.webp" },
  { setId: "jp-tcg-XY8b", url: "https://static.tcgcollector.com/content/images/bf/36/70/bf367093e4a0a9e603480202a1671889709b724fd0c51ca323bdfb76c06ea034.webp" },
  { setId: "jp-tcg-XY8a", url: "https://static.tcgcollector.com/content/images/49/2b/2a/492b2ac1dfec5753a317cd4cdb549d3ca1884be87ffac1937b9c63f90cd377ae.webp" },
  { setId: "jp-tcg-CP2", url: "https://static.tcgcollector.com/content/images/d5/0b/84/d50b8499a15360caf4f16839725b4a533accbb471b0802b7c99fe24d436e06d0.webp" },
  { setId: "jp-tcg-XY7", url: "https://static.tcgcollector.com/content/images/46/35/60/46356092461b4d09f48e8e7c2fb92e7a5455c9a0996c72ba0237e7b79612c4ae.webp" },
  { setId: "jp-tcg-XY6", url: "https://static.tcgcollector.com/content/images/d2/3a/b3/d23ab33f14f1d14f596f4b61be3b6751356486ccb1c2adbc419ebe86a39df37c.webp" },
  { setId: "jp-tcg-CP1", url: "https://static.tcgcollector.com/content/images/f2/79/e4/f279e4ce6e014ae1dea1eaac465ebef15e422834040d9ecee085cd9372b4d968.webp" },
  { setId: "jp-tcg-XY5a", url: "https://static.tcgcollector.com/content/images/2d/24/7f/2d247fee92995b891c6cc4ce9330058b184a9711b2ac04b714fad3b04b22bebd.webp" },
  { setId: "jp-tcg-XY5", url: "https://static.tcgcollector.com/content/images/47/dd/0e/47dd0e0ad401668e8b9171ed1260cd9b8b57ea8c574b4e8a55458af081e07db1.webp" },
  { setId: "jp-tcg-XY4", url: "https://static.tcgcollector.com/content/images/be/ac/82/beac82d48cb918c3a464c4750c66567d0044ae6f7fa3163e056b393c6ef62dd9.webp" },
  { setId: "jp-tcg-XY3", url: "https://static.tcgcollector.com/content/images/e0/d2/f4/e0d2f48b04b168db34d8c3806c57200393c3917bdc39c16c0aff23efb56fca10.webp" },
  { setId: "jp-tcg-XY2", url: "https://static.tcgcollector.com/content/images/51/9f/03/519f0366d343ead94a7b6c28ff8ba5008eee7efd9a874c179678709062771fa7.webp" },
  { setId: "jp-tcg-XY1a", url: "https://static.tcgcollector.com/content/images/8c/f5/c0/8cf5c03551c6b1818c57b3f23bb1ca5f784acc476ca7c6426d4717f6ae9aa9d8.webp" },
  { setId: "jp-tcg-XY1b", url: "https://static.tcgcollector.com/content/images/70/b6/66/70b6665c3a56dcefa5c62415295d6655d9a27bae15b5180c2910ad06b64b221b.webp" },
  { setId: "jp-tcg-bw4", url: "https://static.tcgcollector.com/content/images/7f/07/2d/7f072d78931e61678db0965ddc81809a0b90d195f8da27ae123cb113a08bf64c.webp" },
  { setId: "jp-tcg-bw2", url: "https://static.tcgcollector.com/content/images/fd/7a/2d/fd7a2d2a69de181a0b7090d3e02a8f6dc962d449b2ae4f877af0513af6cefb9d.webp" },
  { setId: "jp-tcg-BW1B", url: "https://static.tcgcollector.com/content/images/c9/b9/b0/c9b9b000b14312f513b69608bac3904b41a2f9cbde6870ce6868b9a2d79fb8dc.webp" },
  { setId: "jp-tcg-BW1W", url: "https://static.tcgcollector.com/content/images/3d/d6/79/3dd679c7b8ea281c570c6000fc60fcb68ed6f0a81aa205706f176932b7a81cff.webp" },
  { setId: "jp-tcg-PCG10", url: "https://static.tcgcollector.com/content/images/40/0c/f4/400cf4a0efae4e3695bbfecc27c29da741d8dfe26facefef477c1a8418a6ea06.webp" },
  { setId: "jp-tcg-DP2", url: "https://static.tcgcollector.com/content/images/43/01/42/430142c312dc458d52b5f50b7be53c18fc236a0393ce98dbf3810c0820354244.webp" },
];

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "40", "-A", "Mozilla/5.0", url], { encoding: "buffer", maxBuffer: 20 * 1024 * 1024 } as any);
  const b = stdout as unknown as Buffer; if (b.length < 200) throw new Error(`small ${b.length}`); return b;
}

async function main() {
  console.log(`${APPLY ? "APPLY" : "DRY"} set-jp-tcgc-symbols | ${JOBS.length}`);
  const ids = JOBS.map((j) => j.setId);
  const found = await prisma.set.findMany({ where: { id: { in: ids } }, select: { id: true } });
  const missing = ids.filter((id) => !found.some((s) => s.id === id));
  if (missing.length) { console.error(`✗ 없는 세트: ${missing.join(", ")}`); process.exit(1); }
  if (!APPLY) { JOBS.forEach((j) => console.log(`  ${j.setId.padEnd(16)} ← ${j.url.split("/").pop()}`)); console.log("\n--apply 로 실행"); await prisma.$disconnect(); return; }
  let ok = 0;
  for (const j of JOBS) {
    const ext = (j.url.split(".").pop() || "webp").toLowerCase();
    const key = `set-assets/symbol/${j.setId}.${ext}`;
    const buf = await dl(j.url);
    await uploadBuffer(key, buf, contentTypeFor(ext));
    if (!(await headExists(key))) throw new Error(`${j.setId} R2 verify 실패`);
    await prisma.set.update({ where: { id: j.setId }, data: { symbolUrl: r2PublicUrl(key) } });
    console.log(`  ✓ ${j.setId.padEnd(16)} symbolUrl ← ${key} (${buf.length}b)`);
    ok++;
  }
  console.log(`\n완료 ${ok}/${JOBS.length}`);
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error("FAIL:", e); process.exit(1); });
