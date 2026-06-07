import preview from "@/data/opensource-preview.json";
import { OpensourcePreviewView } from "./OpensourcePreviewView";

// 오픈소스 자료 5종 미리보기 (개발용 도구).
// 샘플 데이터는 scripts/build-opensource-preview.ts 로 생성된 정적 JSON.
export const metadata = { title: "오픈소스 자료 미리보기" };

export default async function OpensourcePreviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params; // locale 미사용(개발 도구), 시그니처만 맞춤
  return <OpensourcePreviewView data={preview as PreviewData} />;
}

export type PreviewData = typeof preview;
