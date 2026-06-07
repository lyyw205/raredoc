"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { uploadCommunityImages } from "@/lib/actions/community";
import { Spinner } from "@/components/toss";

/**
 * 글 작성 공용 사진 업로더 (Vercel Blob).
 * 제어 컴포넌트: images/onChange 로 상태를 부모가 보유.
 */
export function PhotoUploader({
  images,
  onChange,
  max = 5,
  onUploadingChange,
  onNotice,
  hideLabel = false,
}: {
  images: string[];
  onChange: (next: string[]) => void;
  max?: number;
  onUploadingChange?: (uploading: boolean) => void;
  onNotice?: (message: string | null) => void;
  hideLabel?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  function setBusy(b: boolean) {
    setUploading(b);
    onUploadingChange?.(b);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const room = max - images.length;
    if (room <= 0) return;
    onNotice?.(null);
    setBusy(true);
    try {
      const fd = new FormData();
      Array.from(files).slice(0, room).forEach((f) => fd.append("file", f));
      const res = await uploadCommunityImages(fd);
      if (!res.ok) {
        onNotice?.(res.error ?? "이미지 업로드에 실패했습니다.");
      } else if (res.urls.length === 0) {
        onNotice?.("이미지 저장소가 설정되지 않아 사진 없이 등록됩니다.");
      } else {
        onChange([...images, ...res.urls].slice(0, max));
      }
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      {!hideLabel && (
        <p className="text-toss-caption font-semibold text-toss-text-tertiary mb-1.5">
          사진 <span className="font-normal text-toss-text-quaternary">({images.length}/{max})</span>
        </p>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <div className="flex flex-wrap gap-2">
        {images.map((url, i) => (
          <div key={url} className="relative h-24 w-24 overflow-hidden rounded-toss-md bg-toss-bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="absolute left-1 top-1 rounded-toss-sm bg-toss-brand px-1.5 py-0.5 text-[10px] font-bold text-white">대표</span>
            )}
            <button
              type="button"
              onClick={() => onChange(images.filter((_, idx) => idx !== i))}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
              aria-label="삭제"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {images.length < max && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex h-24 w-24 flex-col items-center justify-center rounded-toss-md border border-dashed border-toss-border text-toss-text-quaternary transition-colors hover:border-toss-border-strong hover:text-toss-text-tertiary disabled:opacity-50"
          >
            {uploading ? (
              <Spinner size={20} />
            ) : (
              <>
                <ImagePlus size={20} />
                <span className="mt-1 text-[10px]">사진 추가</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
