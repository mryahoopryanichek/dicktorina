#!/usr/bin/env bash
# Рендер роликов по вопросам: палитра и голос — из поля render вопроса (src/reel/q/<id>.json).
#   bash tools/render.sh clown giraffe   → out/reels/<id>.mp4
#   bash tools/render.sh                 → все вопросы
cd "$(dirname "$0")/.." || exit 1
ids=("$@")
[ ${#ids[@]} -eq 0 ] && ids=($(ls src/reel/q | sed 's/\.json$//'))
mkdir -p out/reels
for id in "${ids[@]}"; do
  read -r palette voice < <(python -X utf8 -c "import json,sys; r=json.load(open('src/reel/q/$id.json',encoding='utf-8')).get('render',{}); print(r.get('palette','night'), r.get('voice','andrew'))")
  npx remotion render src/index.ts Reel "out/reels/$id.mp4" --props="{\"q\":\"$id\",\"palette\":\"$palette\",\"voice\":\"$voice\"}" 2>&1 | tail -1
done
