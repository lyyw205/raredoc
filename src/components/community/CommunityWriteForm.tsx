"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createPost } from "@/lib/actions/community";
import { Button, Chip, TextField } from "@/components/toss";
import { PhotoUploader } from "./PhotoUploader";

// 게시판 글 유형 (거래 제외)
const BOARD_CATS = ["자유", "공략", "메타분석", "자랑", "질문", "정보", "거래후기"] as const;

export function CommunityWriteForm({ locale }: { locale: string }) {
  const router = useRouter();

  const [category, setCategory] = useState<(typeof BOARD_CATS)[number]>("자유");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const listHref = `/${locale}/cardgame/community`;

  function handleSubmit() {
    setError(null);
    startSubmit(async () => {
      const res = await createPost({
        collectibleCategory: "포켓몬 TCG",
        category,
        title: title.trim(),
        body: content.trim(),
        images,
      });
      if (!res.ok) {
        setError(res.error ?? "작성에 실패했습니다.");
        return;
      }
      router.push(`/${locale}/community/${res.postId}`);
    });
  }

  return (
    <div className="overflow-hidden rounded-toss-lg border border-toss-border bg-toss-bg-base">
      {/* 헤더 바 */}
      <header className="flex items-center gap-3 border-b border-toss-divider px-6 py-4">
        <button
          onClick={() => router.push(listHref)}
          className="flex h-8 w-8 items-center justify-center rounded-toss-md text-toss-text-primary transition-colors hover:bg-toss-hover"
          aria-label="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-toss-title-1 font-bold text-toss-text-primary">커뮤니티 글 작성</h1>
      </header>

      {/* 본문 */}
      <div className="space-y-7 px-8 py-6">
        {/* 글 유형 */}
        <section>
          <p className="mb-2.5 text-toss-label font-semibold text-toss-text-primary">글 유형</p>
          <div className="flex flex-wrap gap-2">
            {BOARD_CATS.map((c) => (
              <Chip key={c} variant="filter" size="sm" selected={category === c} onClick={() => setCategory(c)}>
                {c}
              </Chip>
            ))}
          </div>
        </section>

        {/* 제목 */}
        <section>
          <p className="mb-2.5 text-toss-label font-semibold text-toss-text-primary">제목</p>
          <TextField
            type="text"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            size="md"
          />
        </section>

        {/* 사진 첨부 */}
        <section>
          <p className="mb-2.5 text-toss-label font-semibold text-toss-text-primary">
            사진 첨부 <span className="font-normal text-toss-text-quaternary">({images.length}/5)</span>
          </p>
          <PhotoUploader
            images={images}
            onChange={setImages}
            onUploadingChange={setUploading}
            onNotice={setError}
            hideLabel
          />
        </section>

        {/* 본문 */}
        <section>
          <p className="mb-2.5 text-toss-label font-semibold text-toss-text-primary">본문</p>
          <textarea
            placeholder={"내용을 입력하세요.\n카드 시세 · 덱 구성 · 수집 자랑 등 자유롭게 작성해 주세요."}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            className="min-h-[240px] w-full resize-none rounded-toss-md bg-toss-input-bg px-4 py-3 text-toss-body text-toss-text-primary transition-shadow placeholder:text-toss-text-quaternary focus:outline-none focus:ring-1 focus:ring-toss-brand"
          />
        </section>

        <p className="text-toss-micro text-toss-text-quaternary">
          ※ 욕설 · 비방 · 도배 등 커뮤니티 규칙에 어긋나는 글은 제재 대상입니다.
        </p>
        {error && <p className="text-toss-caption text-toss-negative">{error}</p>}
      </div>

      {/* 푸터 */}
      <footer className="flex justify-end gap-2 border-t border-toss-divider px-8 py-4">
        <Button variant="ghost" size="md" onClick={() => router.push(listHref)}>
          취소
        </Button>
        <Button
          variant="primary"
          size="md"
          disabled={!title.trim() || !content.trim() || submitting || uploading}
          onClick={handleSubmit}
        >
          {submitting ? "작성 중…" : "작성 완료"}
        </Button>
      </footer>
    </div>
  );
}
