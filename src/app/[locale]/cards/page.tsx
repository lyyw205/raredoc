import type { Metadata } from "next";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "카드 검색",
  description: "포켓몬 카드 이름, 타입, 희귀도, 확장팩으로 검색하고 시세를 확인하세요.",
};

export default function CardsIndexPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-20">
      <div className="text-6xl mb-6">🔍</div>
      <h2 className="text-xl font-bold text-white mb-2">카드를 검색하세요</h2>
      <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
        왼쪽 사이드바에서 포켓몬 이름, 타입, 희귀도, 확장팩으로 검색하면 시세와 거래 정보를 확인할 수 있습니다.
      </p>
    </div>
  );
}
