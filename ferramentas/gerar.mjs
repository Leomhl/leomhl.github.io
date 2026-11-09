#!/usr/bin/env node
// Lê dados/catalogo.json (a fonte da verdade, que você edita) e grava dados/catalogo.js,
// que o site carrega de forma bloqueante no <head> — por isso a vitrine abre sem delay,
// já com os produtos na tela, sem esperar nenhuma requisição.
//
//   node site/ferramentas/gerar.mjs
//
// Campos internos (pastaOrigem, revisarFoto, observacoes) são removidos do arquivo publicado.

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dados = join(raiz, 'dados');
const CAMPOS_INTERNOS = ['pastaOrigem', 'revisarFoto', 'observacoes', 'videoObservacao'];
const SITE = 'https://www.cafezim.store';

const bruto = readFileSync(join(dados, 'catalogo.json'), 'utf8');
const catalogo = JSON.parse(bruto);

const erros = [];
const slugs = new Set();
const categorias = new Set(catalogo.categorias.map((c) => c.slug));

for (const c of catalogo.categorias) {
  if (!c.slug || !c.nome) erros.push(`Categoria sem slug ou nome: ${JSON.stringify(c)}`);
}

for (const p of catalogo.produtos) {
  if (!p.slug) erros.push(`Produto sem slug: ${p.nome || '(sem nome)'}`);
  if (slugs.has(p.slug)) erros.push(`Slug repetido: ${p.slug}`);
  slugs.add(p.slug);
  if (!categorias.has(p.categoria)) erros.push(`${p.slug}: categoria desconhecida "${p.categoria}"`);
  if (p.preco != null && typeof p.preco !== 'number') erros.push(`${p.slug}: preço precisa ser número`);

  // Um valor de opção pode ser só o texto, ou { valor, preco } quando aquela
  // escolha muda o preço. Aqui tudo vira { valor, preco } — o site lê um formato só.
  let gruposComPreco = 0;
  for (const grupo of p.opcoes || []) {
    if (!grupo.titulo) erros.push(`${p.slug}: grupo de opção sem título`);
    grupo.valores = (grupo.valores || []).map((v) => (typeof v === 'string' ? { valor: v } : { ...v }));
    if (!grupo.valores.length) erros.push(`${p.slug}: grupo "${grupo.titulo}" sem valores`);
    for (const v of grupo.valores) {
      if (!v.valor) erros.push(`${p.slug}: valor de opção sem o campo "valor"`);
      if (v.preco != null && typeof v.preco !== 'number')
        erros.push(`${p.slug}: preço da opção "${v.valor}" precisa ser número`);
    }
    if (grupo.valores.some((v) => v.preco != null)) gruposComPreco++;
  }
  if (gruposComPreco > 1) erros.push(`${p.slug}: só um grupo de opções pode definir preço`);
  if (p.preco == null && gruposComPreco === 0 && p.opcoes?.length === 0) {
    // produto sem preço nenhum é válido: a vitrine mostra "Consultar".
  }
  if (p.preVenda && p.dataVenda && Number.isNaN(Date.parse(p.dataVenda)))
    erros.push(`${p.slug}: dataVenda "${p.dataVenda}" não é uma data válida (use AAAA-MM-DD)`);
  for (const campo of CAMPOS_INTERNOS) delete p[campo];
}

if (erros.length) {
  console.error('Catálogo com problema:\n  ' + erros.join('\n  '));
  process.exit(1);
}

catalogo.versao = createHash('sha1').update(bruto).digest('hex').slice(0, 12);

const saida = 'window.CATALOGO = ' + JSON.stringify(catalogo) + ';\n';
writeFileSync(join(dados, 'catalogo.js'), saida);

/* ---------- Páginas de compartilhamento (p/<slug>/index.html) --------------
   O site é uma SPA com rotas em #/, e o que vem depois do # nunca chega ao
   servidor: o WhatsApp e o Google pedem só "/" e recebem o index genérico.
   Resultado, antes disto: todo link de produto compartilhado virava o mesmo
   cartão "cafezim — peças para o seu cantinho do café", sem nome, foto nem
   preço do produto.

   Então cada produto ganha uma página real em /p/<slug>/, com as meta tags
   dele. Quem abre é mandado pra rota hash no mesmo instante; quem só lê o
   HTML (crawler de preview, que não roda JS) encontra título, descrição,
   foto e preço certos. O conteúdo visível também fica no HTML — serve de
   fallback se o JS não rodar e dá ao Google algo que indexar por produto. */

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Produto com opções que mudam o preço não tem preço único: vale o menor,
// que é o que a vitrine mostra como ponto de partida.
function precoDe(p) {
  const precos = [];
  if (p.preco != null) precos.push(p.preco);
  for (const grupo of p.opcoes || [])
    for (const v of grupo.valores || []) if (v.preco != null) precos.push(v.preco);
  return precos.length ? Math.min(...precos) : null;
}

function paginaProduto(p) {
  const preco = precoDe(p);
  const url = `${SITE}/p/${p.slug}/`;
  const foto = p.fotos?.length ? `${SITE}/${p.fotos[0]}` : `${SITE}/marca/logo-horizontal-2400.png`;
  const titulo = `${p.nome} — ${catalogo.loja.nome}`;
  const precoTexto = preco != null ? moeda.format(preco) : 'Consultar';
  const descricao = [p.resumo, preco != null ? `Por ${precoTexto}.` : null]
    .filter(Boolean)
    .join(' ');

  // JSON-LD: é o que faz o Google mostrar preço e disponibilidade no resultado.
  const dadosEstruturados = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.nome,
    description: p.resumo || p.descricao || '',
    image: (p.fotos || []).map((f) => `${SITE}/${f}`),
    brand: { '@type': 'Brand', name: catalogo.loja.nome },
    ...(preco != null && {
      offers: {
        '@type': 'Offer',
        price: preco.toFixed(2),
        priceCurrency: 'BRL',
        availability: 'https://schema.org/InStock',
        url,
      },
    }),
  };

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
<meta name="theme-color" content="#2B1810">

<link rel="canonical" href="${esc(url)}">

<meta property="og:type" content="product">
<meta property="og:site_name" content="${esc(catalogo.loja.nome)}">
<meta property="og:title" content="${esc(p.nome)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:image" content="${esc(foto)}">
<meta property="og:url" content="${esc(url)}">
${preco != null ? `<meta property="product:price:amount" content="${preco.toFixed(2)}">
<meta property="product:price:currency" content="BRL">` : ''}
<meta name="twitter:card" content="summary_large_image">

<link rel="icon" href="${SITE}/marca/favicon.svg" type="image/svg+xml">

<script type="application/ld+json">${JSON.stringify(dadosEstruturados)}</script>

<!-- Leitor humano vai direto pra vitrine; o replace evita entupir o histórico
     do navegador com esta página de passagem. -->
<script>location.replace('${SITE}/#/p/${p.slug}');</script>
</head>
<body>
<h1>${esc(p.nome)}</h1>
<p>${esc(p.resumo || '')}</p>
<p>${esc(precoTexto)}</p>
${p.fotos?.length ? `<img src="${esc(foto)}" alt="${esc(p.nome)}" width="600">` : ''}
<p><a href="${SITE}/#/p/${p.slug}">Ver na loja</a></p>
</body>
</html>
`;
}

// Apaga e refaz: produto que saiu do catálogo não pode deixar página órfã no ar.
const pastaProdutos = join(raiz, 'p');
rmSync(pastaProdutos, { recursive: true, force: true });
for (const p of catalogo.produtos) {
  const destino = join(pastaProdutos, p.slug);
  mkdirSync(destino, { recursive: true });
  writeFileSync(join(destino, 'index.html'), paginaProduto(p));
}

// sitemap.xml: sem ele o Google não descobre as páginas novas, porque nada no
// site aponta pra elas (a navegação toda é por #/).
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  `  <url><loc>${SITE}/</loc><priority>1.0</priority></url>\n` +
  catalogo.produtos
    .map((p) => `  <url><loc>${SITE}/p/${p.slug}/</loc><priority>0.8</priority></url>\n`)
    .join('') +
  `</urlset>\n`;
writeFileSync(join(raiz, 'sitemap.xml'), sitemap);

writeFileSync(
  join(raiz, 'robots.txt'),
  `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`
);

const semFoto = catalogo.produtos.filter((p) => !p.fotos?.length).map((p) => p.slug);
const preVenda = catalogo.produtos.filter((p) => p.preVenda).length;
console.log(
  `catalogo.js gerado — ${catalogo.produtos.length} produtos, ${catalogo.categorias.length} categorias, ` +
    `${preVenda} em pré-venda, versão ${catalogo.versao}`
);
console.log(`páginas de compartilhamento: ${catalogo.produtos.length} em p/ + sitemap.xml + robots.txt`);
if (semFoto.length) console.log(`sem foto: ${semFoto.join(', ')}`);
