#!/usr/bin/env bash
# S12 패러다임 트리거 한국판 카드 전수 수집
# pokemoncard.co.kr AJAX 방식

set -euo pipefail

OUTPUT="/home/lyyw205/repos/raredoc/data/kr-official/kr-official-s12.json"
TMPDIR_BASE="/tmp/kr-s12-collect"
mkdir -p "$TMPDIR_BASE"

CARDS_JSON="$TMPDIR_BASE/all_cards.json"
echo "[]" > "$CARDS_JSON"

# 1) 목록 페이지 수집 (limit=0부터 30씩)
echo "[1/3] 목록 수집 시작..."
offset=0
declare -a all_items=()
page=0

while true; do
  RESP_FILE="$TMPDIR_BASE/list_${offset}.json"
  
  curl -s -X POST "https://pokemoncard.co.kr/v2/ajax2_dev2" \
    -H "X-Requested-With: XMLHttpRequest" \
    -H "Referer: https://pokemoncard.co.kr/cards" \
    -H "Origin: https://pokemoncard.co.kr" \
    -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" \
    -F "action=search_text_cards" \
    -F "search_text=패러다임" \
    -F "search_params=all" \
    -F "limit=${offset}" \
    -o "$RESP_FILE" 2>/dev/null
  
  COUNT=$(python3 -c "
import json, sys
try:
    d = json.load(open('$RESP_FILE'))
    result = d.get('result', {})
    if isinstance(result, dict):
        items = list(result.values())
    elif isinstance(result, list):
        items = result
    else:
        items = []
    # S12만 필터 (S12a 제외)
    filtered = [x for x in items if isinstance(x, dict) and '/S/S12/' in x.get('feature_image','')]
    print(len(items), len(filtered))
except Exception as e:
    print(0, 0)
" 2>/dev/null)
  
  TOTAL_IN_PAGE=$(echo $COUNT | cut -d' ' -f1)
  FILTERED=$(echo $COUNT | cut -d' ' -f2)
  echo "  offset=$offset: 페이지내 $TOTAL_IN_PAGE건, S12 필터 $FILTERED건"
  
  if [ "$TOTAL_IN_PAGE" -eq 0 ]; then
    echo "  페이지 응답 0건 - 종료"
    break
  fi
  
  offset=$((offset + 30))
  page=$((page + 1))
  
  # 30건 미만이면 마지막 페이지
  if [ "$TOTAL_IN_PAGE" -lt 30 ]; then
    echo "  마지막 페이지 도달"
    break
  fi
  
  sleep 0.15
done

echo "[2/3] S12 카드 추출 및 상세 수집..."

# Python으로 전체 처리
python3 << 'PYEOF'
import json, os, time, re
import urllib.request
import urllib.parse

TMPDIR = "/tmp/kr-s12-collect"
OUTPUT = "/home/lyyw205/repos/raredoc/data/kr-official/kr-official-s12.json"

# 목록 파일 모두 읽기
all_items = []
for fname in sorted(os.listdir(TMPDIR)):
    if not fname.startswith("list_"):
        continue
    fpath = os.path.join(TMPDIR, fname)
    try:
        d = json.load(open(fpath))
        result = d.get("result", {})
        if isinstance(result, dict):
            items = list(result.values())
        elif isinstance(result, list):
            items = result
        else:
            items = []
        # S12만 (S12a 제외) - feature_image에 /S/S12/ 포함
        for item in items:
            if isinstance(item, dict):
                fi = item.get("feature_image", "")
                if "/S/S12/" in fi and "/S/S12a/" not in fi:
                    all_items.append(item)
    except Exception as e:
        print(f"  경고: {fname} 파싱 실패: {e}")

# 중복 제거 (CardNum 기준)
seen_ids = set()
unique_items = []
for item in all_items:
    cid = item.get("CardNum") or item.get("card_num") or item.get("id")
    if cid and cid not in seen_ids:
        seen_ids.add(cid)
        unique_items.append(item)

print(f"S12 목록 카드 수 (중복제거): {len(unique_items)}건")

# 번호 추출 함수 (feature_image에서)
def extract_number(item):
    fi = item.get("feature_image", "")
    # 패턴: S12_001.png
    m = re.search(r'S12_(\d+)', fi)
    if m:
        return m.group(1).zfill(3)
    return None

# 정렬 (번호순)
def sort_key(item):
    n = extract_number(item)
    return int(n) if n else 9999

unique_items.sort(key=sort_key)

# 상세 페이지 수집
def get_detail(card_num):
    url = f"https://pokemoncard.co.kr/cards/detail/{card_num}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Referer": "https://pokemoncard.co.kr/cards",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9",
    }
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except Exception as e:
        print(f"  상세 오류 {card_num}: {e}")
        return None

def parse_detail(html):
    """상세 페이지에서 한글명·일러스트레이터·번호/레어도 추출"""
    result = {"koName": None, "illustrator": None, "numberFull": None, "rarity": None}
    
    # 한글명: <span class="card-hp title">NAME</span>
    m = re.search(r'<span[^>]*class=["\']card-hp title["\'][^>]*>(.*?)</span>', html, re.DOTALL)
    if m:
        result["koName"] = re.sub(r'<[^>]+>', '', m.group(1)).strip()
    
    # 일러스트레이터: <p class="illustrator">일러스트<br/>NAME</p>
    m = re.search(r'<p[^>]*class=["\']illustrator["\'][^>]*>.*?<br\s*/?>(.*?)</p>', html, re.DOTALL)
    if m:
        illus = re.sub(r'<[^>]+>', '', m.group(1)).strip()
        result["illustrator"] = illus if illus else None
    
    # 번호/레어도: <span class="p_num">...</span>
    m = re.search(r'<span[^>]*class=["\']p_num["\'][^>]*>(.*?)</span>', html, re.DOTALL)
    if m:
        text = re.sub(r'<[^>]+>', '', m.group(1)).strip()
        # 예: "001/098 C" 또는 "001/098"
        tokens = text.split()
        if tokens:
            result["numberFull"] = tokens[0]
            result["rarity"] = tokens[-1] if len(tokens) > 1 else None
    
    return result

results = []
errors = []

for i, item in enumerate(unique_items):
    card_num = item.get("CardNum") or item.get("card_num") or item.get("id")
    fi = item.get("feature_image", "")
    
    # 이미지 URL 구성 (쿼리스트링 제거)
    fi_clean = fi.split("?")[0]
    image_url = f"https://cards.image.pokemonkorea.co.kr/data/{fi_clean}" if fi_clean else None
    
    # 번호 추출
    number = extract_number(item)
    
    print(f"  [{i+1}/{len(unique_items)}] CardNum={card_num} number={number}", end="", flush=True)
    
    # 상세 수집
    detail = {"koName": None, "illustrator": None, "numberFull": None, "rarity": None}
    if card_num:
        html = get_detail(card_num)
        if html:
            detail = parse_detail(html)
    
    print(f" → {detail['koName']} / {detail['rarity']}")
    
    card = {
        "setCode": "S12",
        "number": number,
        "koName": detail["koName"],
        "illustrator": detail["illustrator"],
        "image": image_url,
        "detailId": str(card_num) if card_num else None,
        "numberFull": detail["numberFull"],
        "rarity": detail["rarity"],
    }
    results.append(card)
    
    # ~120ms sleep
    time.sleep(0.12)

# 결과 저장
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
with open(OUTPUT, "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"\n[완료] 총 {len(results)}건 저장: {OUTPUT}")

# 검증 보고
print("\n=== 검증 보고 ===")
print(f"총 카드 수: {len(results)}")

numbers = [r["number"] for r in results if r["number"]]
print(f"번호 범위: {min(numbers) if numbers else '없음'} ~ {max(numbers) if numbers else '없음'}")

# 중복 번호
from collections import Counter
dup = {n: c for n, c in Counter(numbers).items() if c > 1}
if dup:
    print(f"중복 번호: {dup}")
else:
    print("중복 번호: 없음")

null_koName = sum(1 for r in results if not r["koName"])
null_illus = sum(1 for r in results if r["illustrator"] is None)
null_rarity = sum(1 for r in results if r["rarity"] is None)

print(f"koName: {len(results)-null_koName}/{len(results)} 보유 (null {null_koName}건)")
print(f"illustrator: {len(results)-null_illus}/{len(results)} 보유 (null {null_illus}건)")
print(f"rarity: {len(results)-null_rarity}/{len(results)} 보유 (null {null_rarity}건)")

# 레어도 분포
rarity_dist = Counter(r["rarity"] for r in results)
print(f"레어도 분포: {dict(sorted(rarity_dist.items(), key=lambda x: (x[0] is None, x[0])))}")
PYEOF

echo "[3/3] 완료"
