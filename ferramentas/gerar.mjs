#!/usr/bin/env node
// Lê dados/catalogo.json (a fonte da verdade, que você edita) e grava dados/catalogo.js,
// que o site carrega de forma bloqueante no <head> — por isso a vitrine abre sem delay,
// já com os produtos na tela, sem esperar nenhuma requisição.
//
//   node site/ferramentas/gerar.mjs
//
// Campos internos (pastaOrigem, revisarFoto, observacoes) são removidos do arquivo publicado.

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dados = join(dirname(fileURLToPath(import.meta.url)), '..', 'dados');
const CAMPOS_INTERNOS = ['pastaOrigem', 'revisarFoto', 'observacoes', 'videoObservacao'];

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

const semFoto = catalogo.produtos.filter((p) => !p.fotos?.length).map((p) => p.slug);
const preVenda = catalogo.produtos.filter((p) => p.preVenda).length;
console.log(
  `catalogo.js gerado — ${catalogo.produtos.length} produtos, ${catalogo.categorias.length} categorias, ` +
    `${preVenda} em pré-venda, versão ${catalogo.versao}`
);
if (semFoto.length) console.log(`sem foto: ${semFoto.join(', ')}`);
