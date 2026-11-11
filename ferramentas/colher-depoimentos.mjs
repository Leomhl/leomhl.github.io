#!/usr/bin/env node
/**
 * cafezim — colher depoimentos do Firestore
 *
 *     node ferramentas/colher-depoimentos.mjs
 *
 * Um comando, sem opção nenhuma. Ele:
 *
 *   1. lê a coleção de depoimentos no Firestore (aprovados e pendentes);
 *   2. baixa as fotos que vieram em base64, aperta no TinyPNG e grava em
 *      fotos/avaliacoes/;
 *   3. escreve os depoimentos novos no array `avaliacoes` do catalogo.json;
 *   4. roda o gerar.mjs;
 *   5. arquiva no Firestore o que JÁ estava estático antes desta execução;
 *   6. sobe um servidor local e abre o site pra você conferir.
 *
 * Fica rodando até você apertar Ctrl+C. Aprovar é dar commit; rejeitar é
 * desfazer as mudanças em dados/catalogo.json e fotos/avaliacoes/.
 *
 * ---------------------------------------------------------------------------
 * POR QUE A LIMPEZA DO FIRESTORE FICA PRA PRÓXIMA EXECUÇÃO
 *
 * Arquivar apaga o base64 da foto do documento. Se isso acontecesse na mesma
 * execução que trouxe o depoimento, rejeitar as mudanças perderia a foto pra
 * sempre: ela não estaria no repositório nem no banco.
 *
 * Então a conta é: arquiva o que já está no catalogo.json, porque esse já
 * sobreviveu à sua conferência. Na prática —
 *
 *   1ª execução   traz o depoimento novo, não arquiva nada
 *   você confere e commita
 *   2ª execução   vê que ele já está estático e aí sim arquiva
 *
 * Se você tiver rejeitado, a 2ª execução simplesmente traz ele de novo. Nunca
 * existe um instante em que o depoimento não esteja em lugar nenhum.
 *
 * Documento já marcado `arquivado: true` é ignorado de vez: a foto dele não
 * existe mais no banco, e trazer só o texto de volta criaria um depoimento sem
 * a imagem que ele tinha.
 *
 * ---------------------------------------------------------------------------
 * POR QUE A FOTO VEM EM BASE64 DENTRO DO DOCUMENTO
 *
 * Cloud Storage exige plano Blaze e o projeto fica no Spark. Então o formulário
 * manda a foto dentro do próprio documento. Isso é CAIXA DE ENTRADA, não jeito
 * de servir imagem: base64 no banco daria ~400 KB por depoimento lido, e os
 * 10 GiB/mês do Spark acabariam em ~1.250 visitas. A conta fecha porque o site
 * só lê documentos aprovados, e este script é o que move a foto pro CDN do
 * GitHub Pages — que é de graça, cacheia e aceita lazy loading.
 *
 * ---------------------------------------------------------------------------
 * CREDENCIAL (uma vez só)
 *
 * As regras do Firestore — corretamente — não deixam ninguém de fora ler
 * documento não aprovado. Então este script precisa de credencial de
 * administrador, que passa por cima das regras:
 *
 *  1. console.firebase.google.com > Configurações do projeto > Contas de
 *     serviço > "Gerar nova chave privada". Baixa um .json.
 *  2. Salve como ferramentas/.conta-firebase.json
 *     (já está no .gitignore — esse arquivo dá acesso TOTAL ao Firestore,
 *     nunca commitar).
 *
 * Ou aponte outro caminho com a variável CAFEZIM_CONTA.
 *
 * ---------------------------------------------------------------------------
 * TINYPNG (opcional)
 *
 * Se existir TINYPNG_KEY em ferramentas/.chaves.local (ou no ambiente), cada
 * foto passa pelo TinyPNG antes de ser salva — costuma tirar 30-60% do peso
 * sem diferença visível. A chave fica nesta máquina de propósito: a API do
 * TinyPNG não aceita CORS de navegador, e chave em JavaScript de site é chave
 * pública.
 *
 * Conta grátis dá 500 compressões por mês. Estourando, o script avisa e salva
 * a imagem como veio do navegador — que já está comprimida, só menos. Nunca
 * perde a foto por causa do compressor.
 *
 * Sem dependência de npm, de propósito: o projeto não tem package.json nem
 * build. O JWT da conta de serviço é assinado com o `crypto` que vem no Node, e
 * o servidor local é o `http` do Node.
 */

import { createSign } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const PASTA_FOTOS = path.join(RAIZ, 'fotos', 'avaliacoes');
const CAMINHO_CATALOGO = path.join(RAIZ, 'dados', 'catalogo.json');
const CAMINHO_GERADOR = path.join(import.meta.dirname, 'gerar.mjs');
const CAMINHO_CONTA =
  process.env.CAFEZIM_CONTA || path.join(import.meta.dirname, '.conta-firebase.json');
const CAMINHO_CHAVES = path.join(import.meta.dirname, '.chaves.local');
const PORTA_INICIAL = 8777;
const MARCA = '/__cafezim';

/* ========================================================================== */
/* Credenciais                                                                */
/* ========================================================================== */

// Formato de .env simples: CHAVE=valor, com # de comentário. Não vale uma
// dependência.
export async function lerChavesLocais() {
  if (!existsSync(CAMINHO_CHAVES)) return {};
  const texto = await readFile(CAMINHO_CHAVES, 'utf8');
  const fora = {};
  for (const linha of texto.split('\n')) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith('#')) continue;
    const i = limpa.indexOf('=');
    if (i < 1) continue;
    fora[limpa.slice(0, i).trim()] = limpa.slice(i + 1).trim();
  }
  return fora;
}

function base64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Fluxo de conta de serviço do Google: monta um JWT assinado com a chave
// privada e troca por um access token. É o que uma biblioteca faria; são 20
// linhas, e evita arrastar o firebase-admin (dezenas de MB) pra um projeto que
// não tem nem package.json.
async function pegarToken(conta) {
  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const corpo = base64url(
    JSON.stringify({
      iss: conta.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      iat: agora,
      exp: agora + 3600,
    })
  );
  let assinatura;
  try {
    assinatura = createSign('RSA-SHA256').update(`${cabecalho}.${corpo}`).sign(conta.private_key);
  } catch (e) {
    // Erro do OpenSSL aqui é indecifrável ("DECODER routines::unsupported"), e
    // a causa é quase sempre a mesma: arquivo trocado, truncado, ou editado a
    // ponto de estragar o PEM.
    throw new Error(
      `Não consegui usar a chave privada de ${path.relative(RAIZ, CAMINHO_CONTA)}.\n` +
        'Confira se é o JSON que o Firebase baixou, inteiro e sem edição ' +
        '(o campo private_key começa com "-----BEGIN PRIVATE KEY-----").\n' +
        `Detalhe do OpenSSL: ${e.message}`
    );
  }

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${cabecalho}.${corpo}.${base64url(assinatura)}`,
    }),
  });
  if (!r.ok) throw new Error(`OAuth falhou (HTTP ${r.status}): ${(await r.text()).slice(0, 300)}`);
  return (await r.json()).access_token;
}

/* ========================================================================== */
/* Firestore                                                                  */
/* ========================================================================== */

const valor = (v) => {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(valor);
  return null;
};

function criarCliente(projeto, token) {
  const base = `https://firestore.googleapis.com/v1/projects/${projeto}/databases/(default)/documents`;
  const cabecalhos = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  return {
    // Lista a coleção inteira, aprovados e pendentes. Sem filtro de propósito:
    // o aprovado também precisa virar estático, senão ele existe só no Firebase
    // e desaparece do site se o Firebase cair.
    async todos(colecao) {
      const fora = [];
      let pageToken = '';
      do {
        const url = `${base}/${colecao}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
        const r = await fetch(url, { headers: cabecalhos });
        if (!r.ok)
          throw new Error(`Leitura falhou (HTTP ${r.status}): ${(await r.text()).slice(0, 300)}`);
        const pagina = await r.json();
        for (const d of pagina.documents || []) {
          const f = d.fields || {};
          fora.push({
            id: d.name.split('/').pop(),
            nome: String(valor(f.nome) || '').trim(),
            cidade: String(valor(f.cidade) || '').trim(),
            texto: String(valor(f.texto) || '').trim(),
            fotos: (valor(f.fotos) || []).filter(Boolean),
            aprovado: valor(f.aprovado) === true,
            destaque: valor(f.destaque) === true,
            arquivado: valor(f.arquivado) === true,
            criadoEm: valor(f.criadoEm) || d.createTime,
          });
        }
        pageToken = pagina.nextPageToken || '';
      } while (pageToken);
      return fora;
    },

    // Marca como arquivado e zera as fotos no mesmo PATCH. O updateMask é o que
    // faz o Firestore mexer só nesses dois campos em vez de substituir o
    // documento inteiro — sem ele, o texto desapareceria.
    async arquivar(colecao, id) {
      const mascara = 'updateMask.fieldPaths=arquivado&updateMask.fieldPaths=fotos';
      const r = await fetch(`${base}/${colecao}/${id}?${mascara}`, {
        method: 'PATCH',
        headers: cabecalhos,
        body: JSON.stringify({
          fields: { arquivado: { booleanValue: true }, fotos: { arrayValue: { values: [] } } },
        }),
      });
      if (!r.ok) throw new Error(`Arquivar ${id} falhou (HTTP ${r.status})`);
    },
  };
}

/* ========================================================================== */
/* Imagens                                                                    */
/* ========================================================================== */

// Assinatura dos primeiros bytes. O cabeçalho do data URI é só texto: quem
// escreve no banco diz "image/jpeg" e manda o que quiser. Sem esta checagem o
// script grava lixo com extensão .jpg, e o site serve imagem quebrada —
// aconteceu de verdade com um documento de teste que tinha base64 falso.
const ASSINATURAS = [
  { tipo: 'image/jpeg', ext: 'jpg', casa: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    tipo: 'image/png',
    ext: 'png',
    casa: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    tipo: 'image/webp',
    ext: 'webp',
    casa: (b) =>
      b.subarray(0, 4).toString('latin1') === 'RIFF' &&
      b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
];

// Devolve null pra qualquer coisa que não seja imagem de verdade. O `tipo` que
// sai é o da assinatura, não o declarado no data URI — é ele que decide a
// extensão do arquivo.
export function decodificar(dataUri) {
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(String(dataUri).trim());
  if (!m) return null;
  const bytes = Buffer.from(m[2], 'base64');
  if (bytes.length < 16) return null;
  const achado = ASSINATURAS.find((a) => a.casa(bytes));
  if (!achado) return null;
  return { tipo: achado.tipo, ext: achado.ext, bytes };
}

// TinyPNG em duas etapas: o POST devolve a URL do resultado, e um GET nela traz
// os bytes. Devolve os bytes originais em qualquer problema — perder a foto
// porque a cota do mês acabou seria absurdo.
export async function tinypng(bytes, chave) {
  const auth = 'Basic ' + Buffer.from(`api:${chave}`).toString('base64');
  const r = await fetch('https://api.tinify.com/shrink', {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/octet-stream' },
    body: bytes,
  });
  if (r.status === 429) return { bytes, aviso: 'cota mensal do TinyPNG esgotada' };
  if (r.status === 401) return { bytes, aviso: 'chave do TinyPNG recusada' };
  if (!r.ok) return { bytes, aviso: `TinyPNG respondeu HTTP ${r.status}` };

  const destino = r.headers.get('location');
  if (!destino) return { bytes, aviso: 'TinyPNG não devolveu a URL do resultado' };
  const r2 = await fetch(destino, { headers: { Authorization: auth } });
  if (!r2.ok) return { bytes, aviso: `download do TinyPNG falhou (HTTP ${r2.status})` };

  return { bytes: Buffer.from(await r2.arrayBuffer()) };
}

const kb = (n) => `${Math.round(n / 1024)} KB`;

const semAcento = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

// Nome de arquivo a partir do nome da pessoa: minúsculo, sem acento, sem nada
// que precise de escape em URL. É também o que impede "../" de escapar da pasta.
export const apelido = (nome) =>
  semAcento(nome || 'cliente')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 28) || 'cliente';

// Não sobrescreve foto que já está no site: se `marina-01.jpg` existe, o
// próximo vira `marina-02.jpg`. Duas pessoas de mesmo nome não se atropelam.
export async function proximoLivre(base, ext, usados) {
  for (let i = 1; i < 100; i++) {
    const nome = `${base}-${String(i).padStart(2, '0')}.${ext}`;
    if (!usados.has(nome)) {
      usados.add(nome);
      return nome;
    }
  }
  throw new Error(`Não achei nome livre pra ${base}`);
}

/* ========================================================================== */
/* Identidade — tem que ser o MESMO critério do site                          */
/* ========================================================================== */

// Espelha o `identidadeAvaliacao` de assets/app.js. Se divergir, o site mostra
// em duplicata o depoimento que este script considerou único, ou o contrário.
export const identidade = (a) =>
  semAcento(a.nome).toLowerCase() + '|' + semAcento(a.texto).toLowerCase().slice(0, 60);

/* ========================================================================== */
/* Servidor local                                                             */
/* ========================================================================== */

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

function servir(porta) {
  const servidor = createServer((req, res) => {
    let alvo;
    try {
      alvo = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    } catch {
      res.writeHead(400).end('400');
      return;
    }
    // Marca pra saber que quem respondeu foi este servidor, e não outro
    // processo que já estava na porta — ver subirServidor().
    if (alvo === MARCA) {
      res.writeHead(200, { 'Content-Type': 'text/plain' }).end(MARCA);
      return;
    }
    if (alvo.endsWith('/')) alvo += 'index.html';
    const arquivo = path.join(RAIZ, alvo);

    // Caminho que escapa da raiz do site é 403, não 404: é tentativa de
    // travessia, não arquivo faltando.
    if (arquivo !== RAIZ && !arquivo.startsWith(RAIZ + path.sep)) {
      res.writeHead(403).end('403');
      return;
    }
    if (!existsSync(arquivo)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404');
      return;
    }
    // no-store é o ponto de o servidor ser nosso: durante a conferência, JS e
    // CSS velhos de cache fariam você olhar a versão anterior e concluir que o
    // script não funcionou.
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(arquivo).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store, must-revalidate',
    });
    res.end(readFileSync(arquivo));
  });

  return new Promise((resolve, reject) => {
    servidor.once('error', (e) => (e.code === 'EADDRINUSE' ? resolve(null) : reject(e)));
    servidor.listen(porta, '127.0.0.1', () => resolve(servidor));
  });
}

// Devolve o servidor junto com a porta pra quem chama poder fechá-lo — é o que
// permite testar o servidor sem deixar processo pendurado.
//
// O `listen` dar certo não garante que é a gente quem responde naquela porta:
// um processo que tenha bindado 0.0.0.0 e nós 127.0.0.1 convivem no macOS, e
// aí o navegador abre o conteúdo do outro. Já aconteceu, com um `python -m
// http.server` esquecido servindo versão velha do JS. Então confirma com um
// pedido de verdade antes de anunciar a porta.
export async function subirServidor() {
  for (let porta = PORTA_INICIAL; porta < PORTA_INICIAL + 20; porta++) {
    const servidor = await servir(porta);
    if (!servidor) continue;
    let nosso = false;
    try {
      const r = await fetch(`http://127.0.0.1:${porta}${MARCA}`);
      nosso = r.ok && (await r.text()) === MARCA;
    } catch {
      nosso = false;
    }
    if (nosso) return { porta, servidor };
    servidor.close();
  }
  throw new Error(
    `Nenhuma porta nossa entre ${PORTA_INICIAL} e ${PORTA_INICIAL + 19}. ` +
      'Tem outro servidor ocupando essa faixa?'
  );
}

const rodarGerador = (silencioso = false) =>
  spawnSync(process.execPath, [CAMINHO_GERADOR], {
    stdio: silencioso ? 'ignore' : 'inherit',
    cwd: RAIZ,
  }).status;

/* ========================================================================== */

async function principal() {
  if (!existsSync(CAMINHO_CONTA) && !process.env.CAFEZIM_DOCS) {
    console.error(
      `\nFalta a credencial: ${path.relative(RAIZ, CAMINHO_CONTA)}\n\n` +
        'Baixe em console.firebase.google.com > Configurações do projeto >\n' +
        'Contas de serviço > "Gerar nova chave privada" e salve nesse caminho.\n' +
        'Ele já está no .gitignore. Detalhes no topo deste arquivo.\n'
    );
    process.exit(1);
  }

  const conta = existsSync(CAMINHO_CONTA) ? JSON.parse(await readFile(CAMINHO_CONTA, 'utf8')) : {};
  const catalogo = JSON.parse(await readFile(CAMINHO_CATALOGO, 'utf8'));
  const cfg = catalogo.loja.feedback?.firebase || {};
  const colecao = cfg.colecao || 'avaliacoes';
  const projeto = cfg.projeto || conta.project_id;

  const chaves = { ...(await lerChavesLocais()), ...process.env };
  const chaveTiny = chaves.TINYPNG_KEY || null;

  console.log(`\nprojeto ${projeto}, coleção ${colecao}`);
  console.log(`TinyPNG: ${chaveTiny ? 'ligado' : 'desligado (sem TINYPNG_KEY)'}\n`);

  // Costura de teste, não opção de uso: com CAFEZIM_DOCS apontando pra um JSON
  // local, lê de lá em vez do Firestore. Serve pra exercitar a gravação no
  // catálogo, a ordenação, o dedupe e o rollback sem depender de rede nem de
  // credencial. Em uso normal a variável não existe e o caminho é o de cima.
  const falso = process.env.CAFEZIM_DOCS;
  const cliente = falso
    ? { todos: async () => JSON.parse(await readFile(falso, 'utf8')), arquivar: async () => {} }
    : criarCliente(projeto, await pegarToken(conta));
  if (falso) console.log(`lendo de ${falso} (CAFEZIM_DOCS), sem tocar no Firestore\n`);
  const documentos = await cliente.todos(colecao);

  catalogo.avaliacoes = catalogo.avaliacoes || [];
  const jaEstaticos = new Set(catalogo.avaliacoes.map(identidade));

  const novos = [];
  const paraArquivar = [];
  let ignorados = 0;

  for (const d of documentos) {
    // Arquivado é decisão tomada: a foto já saiu do banco, trazer só o texto
    // criaria um depoimento sem a imagem que ele tinha.
    if (d.arquivado) {
      ignorados++;
      continue;
    }
    if (!d.nome || !d.texto) {
      console.log(`  ⚠ ${d.id}: sem nome ou sem texto, ignorado`);
      ignorados++;
      continue;
    }
    // Já está estático: sobreviveu à conferência, pode limpar do Firestore.
    if (jaEstaticos.has(identidade(d))) paraArquivar.push(d);
    else novos.push(d);
  }

  console.log(
    `${documentos.length} documento(s) no Firestore — ` +
      `${novos.length} novo(s), ${paraArquivar.length} já estático(s), ${ignorados} ignorado(s)\n`
  );

  /* --- fotos e inserção no catálogo ------------------------------------- */

  if (novos.length) {
    await mkdir(PASTA_FOTOS, { recursive: true });
    const usados = new Set(await readdir(PASTA_FOTOS).catch(() => []));

    for (const d of novos) {
      const caminhos = [];
      for (const [i, dataUri] of d.fotos.entries()) {
        const bruto = decodificar(dataUri);
        if (!bruto) {
          console.log(`  ⚠ ${d.nome}: foto ${i + 1} não é JPEG/PNG/WebP de verdade, ignorada`);
          continue;
        }
        let bytes = bruto.bytes;
        const antes = bytes.length;
        if (chaveTiny) {
          const r = await tinypng(bytes, chaveTiny);
          bytes = r.bytes;
          if (r.aviso) console.log(`  ⚠ ${r.aviso} — foto ${i + 1} salva sem passar por ele`);
        }
        const nome = await proximoLivre(apelido(d.nome), bruto.ext, usados);
        await writeFile(path.join(PASTA_FOTOS, nome), bytes);
        caminhos.push(`fotos/avaliacoes/${nome}`);
        console.log(
          `  ✓ fotos/avaliacoes/${nome} — ${kb(bytes.length)}` +
            (antes === bytes.length ? '' : ` (era ${kb(antes)})`)
        );
      }

      const a = { nome: d.nome, texto: d.texto };
      if (d.cidade) a.cidade = d.cidade;
      if (d.criadoEm) a.data = String(d.criadoEm).slice(0, 10);
      // Documento antigo pode ter campo `produto`: ele é ignorado de propósito.
      // Depoimento não é mais amarrado a peça, e o gerador recusa a chave.
      if (d.destaque) a.destaque = true;
      if (caminhos.length) a.fotos = caminhos;

      catalogo.avaliacoes.push(a);
      console.log(
        `  ✓ ${d.nome}${d.cidade ? ` (${d.cidade})` : ''}${d.aprovado ? '' : ' [estava pendente]'}\n`
      );
    }

    // Crescente por data, que é a convenção que o site espera: quem mostra os
    // recentes usa `.reverse()`.
    catalogo.avaliacoes.sort((x, y) => String(x.data || '').localeCompare(String(y.data || '')));

    // Guarda o original antes de escrever: se o gerador reprovar o resultado, o
    // catálogo volta como estava em vez de ficar num meio quebrado.
    const original = await readFile(CAMINHO_CATALOGO, 'utf8');
    await writeFile(CAMINHO_CATALOGO, JSON.stringify(catalogo, null, 2));

    console.log('─'.repeat(70));
    if (rodarGerador() !== 0) {
      writeFileSync(CAMINHO_CATALOGO, original);
      rodarGerador(true);
      console.error(
        '\nO gerador reprovou o catálogo. Desfiz a alteração em dados/catalogo.json.\n' +
          'As fotos baixadas ficaram em fotos/avaliacoes/ — apague se não for usar.\n'
      );
      process.exit(1);
    }
    console.log('─'.repeat(70));
  }

  /* --- limpeza do que já estava estático -------------------------------- */

  if (paraArquivar.length) {
    const comFoto = paraArquivar.filter((d) => d.fotos.length).length;
    for (const d of paraArquivar) await cliente.arquivar(colecao, d.id);
    console.log(
      `\n${paraArquivar.length} documento(s) arquivado(s) no Firestore` +
        (comFoto ? `, liberando o base64 de ${comFoto}` : '') +
        ' — já estavam no catalogo.json.'
    );
  }

  /* --- servidor pra conferir -------------------------------------------- */

  const { porta } = await subirServidor();
  const url = `http://localhost:${porta}/#/`;

  console.log('\n' + '='.repeat(70));
  if (novos.length) {
    console.log(`${novos.length} depoimento(s) novo(s) no site. Confira:\n`);
    console.log(`  ${url}`);
    console.log('\n  aprovar:  git add -A && git commit -m "depoimentos novos"');
    console.log('  rejeitar: git checkout dados/catalogo.json dados/catalogo.js index.html');
    console.log('            git clean -f fotos/avaliacoes/ && node ferramentas/gerar.mjs');
  } else {
    console.log('Nada novo pra trazer. O site está no ar pra conferir:\n');
    console.log(`  ${url}`);
  }
  console.log('\nCtrl+C encerra o servidor.');
  console.log('='.repeat(70) + '\n');

  // Servidor manda no-store, então não precisa de recarga forçada no navegador.
  if (process.platform === 'darwin')
    spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
}

// Só executa quando chamado direto. Importar o arquivo (pra testar as peças de
// imagem sem Firestore, por exemplo) não dispara a colheita.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  principal().catch((e) => {
    console.error('\n' + e.message + '\n');
    process.exit(1);
  });
}
