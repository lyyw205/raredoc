-- B-3 CONTRACT: Price 옛 와이드 finish 컬럼 물리 삭제 (amount 로 통합 완료).
--
-- ★★실행 시점 = 코드(amount 이관)가 master 에 배포된 後에만!★★ (expand-contract)
--   배포 전에 실행하면 라이브(구 클라이언트)가 이 컬럼들을 SELECT 하다 500.
--   순서: ①코드 amount 이관(완료) → ②master 배포 → ③이 DDL 적용.
--
-- 적용 예: npx tsx 일회성 스크립트에서 prisma.$executeRawUnsafe(<이 파일 내용>)
--          또는 supabase apply_migration (read-only 해제 시).

ALTER TABLE "Price"
  DROP COLUMN IF EXISTS "normal",
  DROP COLUMN IF EXISTS "holofoil",
  DROP COLUMN IF EXISTS "reverseHolo",
  DROP COLUMN IF EXISTS "firstEdition",
  DROP COLUMN IF EXISTS "marketPrice";
