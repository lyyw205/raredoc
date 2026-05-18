import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Post } from "@/components/community/CommunityBoard";

// 목업 데이터 (추후 API/DB로 교체)
const ALL_POSTS: Post[] = [
  { id: "p1",  collectibleCategory: "포켓몬 TCG", category: "공지",    title: "레어독 커뮤니티 오픈 안내 및 이용 규칙", preview: "안녕하세요, 레어독 운영팀입니다. 커뮤니티 게시판이 정식 오픈되었습니다.", author: "Raredoc", authorInitial: "R", ago: "2일 전", replies: 23, views: 1840, likes: 87, hot: false, pinned: true },
  { id: "p2",  collectibleCategory: "포켓몬 TCG", category: "직거래",  title: "피카츄 ex SAR (sv3pt5-215) NM 판매합니다 — 25만원", preview: "PSA 미감정 NM급, 직접 확인 후 구매 가능. 서울 강남 직거래 or 안전결제", author: "raymond_tcg", authorInitial: "레", ago: "8분 전", replies: 7, views: 312, likes: 3, hot: true },
  { id: "p3",  collectibleCategory: "포켓몬 TCG", category: "메타분석", title: "151 SAR 피카츄 가격 폭등 원인 심층 분석 — 공급 감소 vs 수요 급증", preview: "최근 3개월간 번개장터·Pokémarket 데이터를 토대로 분석했습니다.", author: "meta_kang", authorInitial: "강", ago: "1시간 전", replies: 47, views: 2103, likes: 134, hot: true },
  { id: "p4",  collectibleCategory: "포켓몬 TCG", category: "자랑",    title: "드디어 PSA 10 리자몽 ex SAR 받았어요 🎉 8개월 만에..", preview: "작년 10월에 감정 맡긴게 드디어 왔네요. 기다린 보람 있습니다", author: "chaeyeon", authorInitial: "채", ago: "2시간 전", replies: 89, views: 2841, likes: 201, hot: true },
  { id: "p5",  collectibleCategory: "포켓몬 TCG", category: "질문",    title: "LP 카드랑 NM 카드 가격 차이 실제로 얼마나 나요?", preview: "고가 SAR 카드 기준으로 LP면 얼마나 낮게 봐야 하는지 궁금합니다", author: "newcollector_j", authorInitial: "신", ago: "3시간 전", replies: 31, views: 678, likes: 12, hot: false },
  { id: "p6",  collectibleCategory: "포켓몬 TCG", category: "공략",    title: "현재 메타 리자몽덱 최강 빌드 공유 — 지방대회 3연속 우승 레시피", preview: "리자몽 ex + 마자용 + 불비달마 조합으로 안정성과 폭발력 모두 잡은 빌드입니다", author: "deckmaster_oh", authorInitial: "오", ago: "4시간 전", replies: 63, views: 3102, likes: 178, hot: true },
  { id: "p7",  collectibleCategory: "포켓몬 TCG", category: "거래후기", title: "레어독 통해서 뮤츠 ex SAR 직거래 완료 후기", preview: "처음 직거래였는데 상대분이 친절하게 대응해 주셔서 감사했습니다", author: "sora_cards", authorInitial: "소", ago: "5시간 전", replies: 12, views: 334, likes: 28, hot: false },
  { id: "p8",  collectibleCategory: "포켓몬 TCG", category: "정보",    title: "번개장터 사기 계정 주의 — 스크린샷 모음 (업데이트 중)", preview: "최근 위조 PSA 케이스 사기 사례가 늘고 있습니다. 주의하세요.", author: "guard_info", authorInitial: "경", ago: "6시간 전", replies: 104, views: 5621, likes: 312, hot: true },
  { id: "p9",  collectibleCategory: "포켓몬 TCG", category: "자유",    title: "포켓몬 카드 수집 몇 년째 하고 계세요?", preview: "저는 5년째인데 주변에 같은 취미 가진 분들이 없어서 외롭네요 ㅎㅎ", author: "jihun99", authorInitial: "지", ago: "7시간 전", replies: 56, views: 1203, likes: 67, hot: false },
  { id: "p10", collectibleCategory: "포켓몬 TCG", category: "직거래",  title: "파라다이스 드래고나 풀박스 판매 — 60만원 (미개봉)", preview: "발매일 구매 후 보관만 했습니다. 직거래 or 등기 발송 가능", author: "boxseller_k", authorInitial: "박", ago: "8시간 전", replies: 4, views: 287, likes: 2, hot: false },
  { id: "p11", collectibleCategory: "포켓몬 TCG", category: "공략",    title: "뮤덱 입문 가이드 — 저예산으로 시작하는 방법", preview: "고가 SAR 없이도 충분히 경쟁 가능한 뮤덱 빌드를 소개합니다", author: "budget_trainer", authorInitial: "저", ago: "어제", replies: 38, views: 1876, likes: 94, hot: false },
  { id: "p12", collectibleCategory: "포켓몬 TCG", category: "메타분석", title: "파라다이스 드래고나 발매 1개월 — SAR 전 종목 시세 정리", preview: "리자몽/가이오가/아마루르가 등 주요 SAR 1개월 추이 정리", author: "pricewatch", authorInitial: "시", ago: "어제", replies: 31, views: 2210, likes: 108, hot: false },
  { id: "p13", collectibleCategory: "포켓몬 TCG", category: "질문",    title: "PSA 9 vs BGS 9.5 — 어떤 게 더 가치 있나요?", preview: "감정사마다 기준이 다르다고 들었는데 실제 시장 반응이 어떤지 궁금합니다", author: "grade_curious", authorInitial: "궁", ago: "어제", replies: 29, views: 891, likes: 19, hot: false },
  { id: "p14", collectibleCategory: "포켓몬 TCG", category: "자랑",    title: "151 세트 SAR 풀셋 완성! 총 18종 모두 수집 완료", preview: "2년 동안 조금씩 모았는데 드디어 완성입니다. 총 비용 약 650만원..", author: "nari_collect", authorInitial: "나", ago: "2일 전", replies: 72, views: 3450, likes: 243, hot: true },
  { id: "p15", collectibleCategory: "포켓몬 TCG", category: "정보",    title: "포켓몬 TCG 공식 한국어판 vs 일본어판 가격 비교 분석", preview: "같은 카드인데 언어판에 따라 가격이 다른 이유와 수집 전략 공유", author: "intl_collector", authorInitial: "국", ago: "3일 전", replies: 44, views: 1567, likes: 88, hot: false },
  { id: "p16", collectibleCategory: "유희왕",     category: "메타분석", title: "파이어킹 덱 현 메타 정리 — 일본 대회 Top8 기반 분석", preview: "최근 일본 CS 결과를 보면 파이어킹의 비율이 압도적입니다.", author: "yugipro_k", authorInitial: "유", ago: "30분 전", replies: 38, views: 1820, likes: 92, hot: true },
  { id: "p17", collectibleCategory: "유희왕",     category: "직거래",  title: "유희왕 프리즈마틱 레어 판매 — 블루아이즈 화이트 드래곤 1st", preview: "상태 NM, PSA 감정 예정이었으나 급매합니다. 35만원 협의 가능", author: "duel_seller", authorInitial: "듀", ago: "2시간 전", replies: 5, views: 443, likes: 4, hot: false },
  { id: "p18", collectibleCategory: "유희왕",     category: "자랑",    title: "드래그마 풀 아트 3종 PSA 10 풀셋 완성했습니다", preview: "국내에 PSA 10 드래그마 3종 풀셋은 저만 있을 것 같아요 ㅎㅎ", author: "drgma_collector", authorInitial: "드", ago: "1일 전", replies: 61, views: 2340, likes: 187, hot: true },
  { id: "p19", collectibleCategory: "스니커즈",   category: "정보",    title: "나이키 X 사카이 콜라보 2026 발매 일정 정리", preview: "글로벌 / 한국 발매 일정과 응모 방법 정리했습니다. SNKRS 앱 기준", author: "sneaker_jin", authorInitial: "진", ago: "1시간 전", replies: 29, views: 3102, likes: 145, hot: true },
  { id: "p20", collectibleCategory: "스니커즈",   category: "자랑",    title: "Jordan 1 Retro High OG 'Chicago' DS 박스채 보관 자랑", preview: "2015년 발매분 미착용 DS 상태입니다. 요즘 시세 얼마나 하나요?", author: "aj1_collector", authorInitial: "조", ago: "3시간 전", replies: 44, views: 1987, likes: 113, hot: false },
  { id: "p21", collectibleCategory: "스니커즈",   category: "직거래",  title: "Nike Dunk Low 'Panda' 265mm 팝니다 — 12만원", preview: "1회 착용, 케어 완료. 박스 있음. 직거래 합정역 가능", author: "pandadunk", authorInitial: "팬", ago: "5시간 전", replies: 8, views: 521, likes: 3, hot: false },
  { id: "p22", collectibleCategory: "피규어",     category: "자랑",    title: "굿스마일 피카츄 넨도로이드 한정판 개봉기", preview: "원더페스티벌 한정판 드디어 받았습니다. 포장부터 완성도까지 공유해요", author: "fig_yoona", authorInitial: "피", ago: "4시간 전", replies: 33, views: 1243, likes: 88, hot: false },
  { id: "p23", collectibleCategory: "피규어",     category: "질문",    title: "1/6 피규어 디스플레이 케이스 추천 받습니다", preview: "먼지 차단 + 조명 내장 제품으로 국내 구매 가능한 것 있을까요?", author: "fig_display", authorInitial: "케", ago: "6시간 전", replies: 19, views: 678, likes: 22, hot: false },
  { id: "p24", collectibleCategory: "포켓몬 TCG", category: "구함", allowInquiry: true, title: "피카츄 ex SAR (sv3pt5) NM 구합니다 — 24만원 이하", preview: "PSA 미감정 NM급 이상 구합니다. 강남/서초 직거래 선호. 가격 협의 가능해요.", author: "jihun99", authorInitial: "지", ago: "2시간 전", replies: 12, views: 430, likes: 8, hot: false },
  { id: "p25", collectibleCategory: "포켓몬 TCG", category: "구함", allowInquiry: true, title: "초승달의 섬 잠만보 ex SAR 구합니다", preview: "등급 불문, 가격 맞으면 구매 의사 있습니다. DM 주세요.", author: "newcollector_j", authorInitial: "신", ago: "5시간 전", replies: 4, views: 187, likes: 2, hot: false },
  { id: "p26", collectibleCategory: "스니커즈",   category: "구함", allowInquiry: true, title: "Jordan 1 Chicago 2015 270mm 구합니다", preview: "DS 또는 VNDS 상태. 박스 있으면 우대. 시세 맞게 드릴게요.", author: "aj1_collector", authorInitial: "조", ago: "1일 전", replies: 7, views: 312, likes: 5, hot: false },
];

const CAT_STYLE: Record<string, string> = {
  공지: "bg-red-900/50 text-red-400",
  자유: "bg-gray-700/60 text-gray-300",
  직거래: "bg-green-900/50 text-green-400",
  공략: "bg-blue-900/50 text-blue-400",
  메타분석: "bg-purple-900/50 text-purple-400",
  자랑: "bg-yellow-900/50 text-yellow-400",
  질문: "bg-orange-900/50 text-orange-400",
  정보: "bg-sky-900/50 text-sky-400",
  거래후기: "bg-teal-900/50 text-teal-400",
};

// 목업 본문 생성
function generateBody(post: Post): string {
  return `${post.preview}\n\n이 게시글은 레어독 커뮤니티에 작성된 내용입니다. 관련 문의는 댓글로 남겨주세요.\n\n궁금한 점이 있으시면 언제든지 댓글 달아주세요. 직거래 문의는 DM으로 연락 주셔도 됩니다.`;
}

// 목업 댓글
const MOCK_COMMENTS = [
  { id: "c1", author: "trainer_a", initial: "트", body: "좋은 정보 감사합니다!", ago: "30분 전", likes: 5 },
  { id: "c2", author: "collector_b", initial: "콜", body: "저도 궁금했던 내용이었는데 도움이 많이 됐어요.", ago: "1시간 전", likes: 3 },
  { id: "c3", author: "poke_fan", initial: "포", body: "혹시 추가 정보도 공유해 주실 수 있나요?", ago: "2시간 전", likes: 1 },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = ALL_POSTS.find((p) => p.id === id);
  return { title: post ? post.title : "게시글" };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const post = ALL_POSTS.find((p) => p.id === id);
  if (!post) notFound();

  const body = generateBody(post);
  const related = ALL_POSTS.filter((p) => p.id !== id && p.category === post.category).slice(0, 3);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 뒤로 */}
      <Link
        href={`/${locale}/community`}
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 mb-6 transition-colors"
      >
        ← 커뮤니티로 돌아가기
      </Link>

      <div className="max-w-2xl space-y-5">
          {/* 게시글 헤더 */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${CAT_STYLE[post.category] ?? "bg-gray-800 text-gray-400"}`}>
                {post.category}
              </span>
              {post.hot && <span className="text-[11px] font-bold text-red-400">🔥 HOT</span>}
              {post.pinned && <span className="text-[11px] text-gray-500">📌 공지</span>}
            </div>

            <h1 className="text-lg font-bold text-white leading-snug mb-4">{post.title}</h1>

            {/* 작성자 정보 */}
            <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
              <Link href={`/${locale}/profile/${post.author}`}>
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-300 shrink-0 hover:ring-2 hover:ring-gray-500 transition-all">
                  {post.authorInitial}
                </div>
              </Link>
              <div>
                <Link href={`/${locale}/profile/${post.author}`} className="text-sm font-medium text-gray-200 hover:text-white transition-colors">
                  {post.author}
                </Link>
                <p className="text-xs text-gray-600">{post.ago}</p>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span className="flex items-center gap-1"><span>👁</span>{post.views.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><span>💬</span>{post.replies}</span>
                </div>
                {post.allowInquiry && (
                  <Link
                    href={`/${locale}/messages/c1`}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      post.category === "구함"
                        ? "bg-pink-500/15 text-pink-400 border border-pink-500/30 hover:bg-pink-500/25"
                        : "bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25"
                    }`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    {post.category === "구함" ? "이 카드 있어요 →" : "판매자에게 문의"}
                  </Link>
                )}
              </div>
            </div>

            {/* 본문 */}
            <div className="pt-5 text-sm text-gray-300 leading-relaxed whitespace-pre-line">
              {body}
            </div>

            {/* 좋아요 */}
            <div className="mt-6 flex justify-center">
              <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-gray-700 text-sm text-gray-400 hover:text-white hover:border-gray-500 transition-colors">
                <span>❤️</span> 좋아요 {post.likes}
              </button>
            </div>
          </div>

          {/* 댓글 */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-800">
              <h2 className="text-sm font-bold text-white">댓글 {MOCK_COMMENTS.length}</h2>
            </div>

            <div className="divide-y divide-gray-800/60">
              {MOCK_COMMENTS.map((c) => (
                <div key={c.id} className="px-5 py-4 flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-[11px] font-bold text-gray-300 shrink-0 mt-0.5">
                    {c.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-300">{c.author}</span>
                      <span className="text-[11px] text-gray-600">{c.ago}</span>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">{c.body}</p>
                    <button className="mt-1.5 text-[11px] text-gray-600 hover:text-gray-400 transition-colors">
                      ❤️ {c.likes}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 댓글 입력 */}
            <div className="px-5 py-4 border-t border-gray-800 flex gap-3">
              <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-[11px] font-bold text-gray-300 shrink-0 mt-1">
                유
              </div>
              <div className="flex-1">
                <textarea
                  placeholder="댓글을 입력하세요"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors resize-none"
                />
                <div className="flex justify-end mt-2">
                  <button className="px-4 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-xs font-bold text-black transition-colors">
                    등록
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 같은 카테고리 관련 글 */}
          {related.length > 0 && (
            <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
              <h3 className="text-xs font-bold text-gray-500 mb-3">{post.category} 관련 글</h3>
              <div className="divide-y divide-gray-800/60">
                {related.map((p) => (
                  <Link
                    key={p.id}
                    href={`/${locale}/community/${p.id}`}
                    className="flex items-start justify-between gap-3 py-2.5 group"
                  >
                    <p className="text-xs text-gray-400 group-hover:text-white transition-colors line-clamp-1 leading-relaxed flex-1">
                      {p.title}
                    </p>
                    <span className="text-[11px] text-gray-600 shrink-0">{p.ago}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
