import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("expansions");
  return {
    title: t("title"),
    description: "포켓몬 카드 모든 확장팩 시리즈. 시세와 카드 정보를 확인하세요.",
  };
}

export default async function ExpansionsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-20">
      <div className="text-6xl mb-6">🃏</div>
      <h2 className="text-xl font-bold text-white mb-2">확장팩을 선택하세요</h2>
      <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
        왼쪽 목록에서 확장팩을 클릭하면 카드 목록과 시세 정보를 확인할 수 있습니다.
      </p>
    </div>
  );
}
