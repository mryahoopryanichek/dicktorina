#!/usr/bin/env bash
# Рендер роликов строго по одному: палитра, голос и блок «как играть» (explain, по умолчанию да) —
# из поля render вопроса в questions.json (корень репо).
#   bash tools/render.sh clown giraffe   → out/reels/<id>.mp4
#   bash tools/render.sh                 → все вопросы
# --concurrency 4: по умолчанию Remotion открывает вкладку Chrome на каждые 2 ядра — несколько рендеров
# сразу съели 32 ГБ и положили машину (2026-11-08).
cd "$(dirname "$0")/.." || exit 1
ids=("$@")
[ ${#ids[@]} -eq 0 ] && ids=($(python -X utf8 -c "import json; print(' '.join(json.load(open('questions.json',encoding='utf-8'))))"))
mkdir -p out/reels
for id in "${ids[@]}"; do
  read -r palette voice explain < <(python -X utf8 -c "import json; r=json.load(open('questions.json',encoding='utf-8'))['$id'].get('render',{}); print(r.get('palette','night'), r.get('voice','andrew'), 'true' if r.get('explain', True) else 'false')")
  echo "== $id ($palette, $voice)"
  npx remotion render src/index.ts Reel "out/reels/$id.mp4" --concurrency 4 --props="{\"q\":\"$id\",\"palette\":\"$palette\",\"voice\":\"$voice\",\"explain\":$explain}" 2>&1 | tail -1
done
