#!/usr/bin/env bash
# Copia o thumbnail.png da pasta de trabalho de cada produto para site/fotos/<slug>/01.jpg,
# redimensionado e otimizado para a web.
#
#   ./site/ferramentas/sincronizar-fotos.sh            # só preenche o que está faltando
#   ./site/ferramentas/sincronizar-fotos.sh --forcar   # regera tudo, sobrescrevendo
#
# Fotos que você adicionar à mão (02.jpg, 03.jpg...) nunca são tocadas.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SITE="$RAIZ/site"
FORCAR=0
[ "${1:-}" = "--forcar" ] && FORCAR=1

command -v magick >/dev/null || { echo "ImageMagick não encontrado. Instale com: brew install imagemagick"; exit 1; }

novas=0; puladas=0; faltando=0

while IFS=$'\t' read -r slug origem; do
  destino="$SITE/fotos/$slug/01.jpg"
  if [ -f "$destino" ] && [ "$FORCAR" -eq 0 ]; then
    puladas=$((puladas+1)); continue
  fi
  fonte="$RAIZ/$origem/thumbnail.png"
  if [ ! -f "$fonte" ]; then
    echo "  sem thumbnail: $slug  ($origem)"
    faltando=$((faltando+1)); continue
  fi
  mkdir -p "$SITE/fotos/$slug"
  magick "$fonte" -auto-orient -resize '1400x1400>' -strip -quality 84 -interlace Plane "$destino"
  novas=$((novas+1))
done < <(python3 -c '
import json
d = json.load(open("'"$SITE"'/dados/catalogo.json"))
for p in d["produtos"]:
    print(p["slug"] + "\t" + p.get("pastaOrigem", ""))
')

echo "fotos geradas: $novas | já existiam: $puladas | sem thumbnail: $faltando"
