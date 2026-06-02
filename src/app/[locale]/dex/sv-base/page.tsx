import { GroupCards } from "@/components/dex/GroupCards";

// 스칼렛&바이올렛(sv-base) 그룹핑 직접 보기 페이지. (도감 /dex 의 해당 팩 선택과 동일 UI)
export const metadata = { title: "스칼렛 & 바이올렛 — 카드 도감" };

export default async function SvBaseDexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 16px 72px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 14px" }}>스칼렛 ex + 바이올렛 ex</h1>
      <GroupCards groupId="sv-base" />
    </div>
  );
}
