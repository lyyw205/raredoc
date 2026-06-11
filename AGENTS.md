<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 동결(freeze) 카드팩 — EN/KR 연결 변경 금지

아래 setGroup 들은 EN/KR 연결이 전수 검증 완료되어 **동결**됨. 이 팩들의 EN/KR 매칭(RegionCard 연결, 트레이너 이름 사전 대응 등)을 바꾸는 작업은 **사용자에게 먼저 확인받기 전까지 절대 수행하지 않는다.**

- `mega-munikisuzero` (니힐제로) · `mega-dream-ex` (메가드림 ex) · `mega-infernox` (인페르노X) · `mega-brave-symphonia` (메가브레이브) · `mega-symphonia` (메가심포니아)
- `sv-black-bolt-white-flare` (블랙볼트 Black Bolt) · `sv-white-flare` (화이트플레어 White Flare) · `mega-ninja-spinner` (닌자스피너 Ninja Spinner)

규칙:
- 단일 출처는 `scripts/lib/protected-groups.ts`의 `PROTECTED_GROUPS`. 목록 추가/해제는 거기만 고친다(이 문서·메모리는 그걸 가리킬 뿐).
- DB 를 바꾸는 스크립트는 영향 cardPackId 들로 `assertWritable()` 를 호출해 기본 차단해야 한다. `merge-en-identity.ts` 는 적용됨(크로스그룹 EN 탈취까지 차단). `audit-kr-trainers.ts`(스킬, 수리 시)·`group-kr-merge.ts` 등 다른 뮤테이터도 수리/수정 시 동일 가드를 추가한다.
- 의도적 수정일 때만 `--allow-protected` 플래그로 해제(= 사용자 확인 체크포인트). 즉석 prisma 수정·raw SQL 로 우회하지 않는다 — 그 경우에도 먼저 사용자에게 확인한다.
