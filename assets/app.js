/* ==========================================================================
   cafezim — vitrine
   Sem framework, sem build, sem dependência externa.
   O catálogo já chegou em window.CATALOGO antes desta linha rodar: o
   <script> de dados/catalogo.js é bloqueante no <head>. Por isso a primeira
   tela pinta com os produtos dentro, sem spinner e sem salto de layout.
   ========================================================================== */
(() => {
  'use strict';

  const CAMPOS_INTERNOS = ['pastaOrigem', 'revisarFoto', 'observacoes', 'videoObservacao'];

  let catalogo = window.CATALOGO || null;
  const main = document.getElementById('conteudo');
  const campoBusca = document.getElementById('busca-campo');

  /* ---------- Utilidades ------------------------------------------------ */

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  // Escapa o texto e transforma URLs soltas em links clicáveis.
  const escLink = (s) =>
    esc(s).replace(
      /(https?:\/\/[^\s<]+)/g,
      (url) => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`
    );

  const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const dataLonga = (iso) => {
    if (!iso) return '';
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso + 'T12:00:00' : iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  // Normaliza para busca: minúsculo e sem acento.
  const chave = (s) =>
    String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const porSlug = (lista, slug) => lista.find((x) => x.slug === slug);

  const categoriaDe = (p) => porSlug(catalogo.categorias, p.categoria);

  const produtosDa = (slugCategoria) =>
    catalogo.produtos.filter((p) => p.categoria === slugCategoria);

  /* ---------- Analytics --------------------------------------------------- */

  // Usa os nomes de evento que o GA4 já reconhece (view_item, add_to_cart,
  // begin_checkout, search) em vez de nomes próprios: assim os relatórios de
  // monetização se preenchem sozinhos, sem configurar métrica personalizada.
  //
  // Guarda o window.gtag porque o site tem que funcionar com a tag bloqueada
  // por adblock, ou aberto por file:// — nesses casos o evento só não acontece.
  function medir(nome, parametros) {
    if (typeof window.gtag !== 'function') return;
    try {
      window.gtag('event', nome, parametros || {});
    } catch {}
  }

  // O item no formato que o GA4 espera. Preço é o de agora: numa peça com
  // opção que muda preço, o que importa é o valor que a pessoa está vendo.
  function itemMedido(p, quantidade = 1) {
    const preco = precoAtual(p);
    return {
      item_id: p.slug,
      item_name: p.nome,
      item_category: categoriaDe(p)?.nome || p.categoria,
      ...(preco != null && { price: preco }),
      quantity: quantidade,
    };
  }

  /* ---------- WhatsApp -------------------------------------------------- */

  const SVG_ZAP =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M.06 24l1.69-6.16a11.87 11.87 0 01-1.6-5.95C.16 5.33 5.5 0 12.06 0a11.8 11.8 0 018.4 3.49 11.78 11.78 0 013.48 8.4c0 6.55-5.34 11.89-11.9 11.89a11.9 11.9 0 01-5.68-1.45L.06 24zm6.6-3.8c1.64.97 3.2 1.55 5.27 1.55 5.45 0 9.89-4.43 9.9-9.88a9.88 9.88 0 00-16.86-7 9.82 9.82 0 00-2.9 7 9.85 9.85 0 001.51 5.26l-.99 3.6 3.7-.97zm11.1-5.66c-.07-.12-.27-.2-.57-.35-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07a8.1 8.1 0 01-2.38-1.47 9 9 0 01-1.65-2.05c-.17-.3-.02-.46.13-.6.14-.14.3-.36.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.62-.93-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.5.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.42.25-.69.25-1.28.18-1.4z"/></svg>';

  /* ---------- Ícones da faixa de garantias ------------------------------- */

  // Um ícone por argumento, na ordem em que os argumentos estão no catálogo
  // (medida, cor, fabricação própria, preço). São desenhos de traço, no mesmo
  // peso do resto da interface: a faixa precisa ser varrida de relance, e um
  // ícone resolve em meio segundo o que o título leva uma linha pra dizer.
  const ICONES_PROVA = [
    '<svg viewBox="0 0 24 24"><path d="M3 8h18v8H3zM7 8v3M11 8v4M15 8v3M19 8v4"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 100 18h1.5a2 2 0 001.6-3.2 2 2 0 011.6-3.2H20a1 1 0 001-1A9 9 0 0012 3z"/><circle cx="7.5" cy="11.5" r="1.1"/><circle cx="11" cy="7.5" r="1.1"/><circle cx="15.5" cy="9.5" r="1.1"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M4 20V9.5l5-3 5 3V20M14 20V12h6v8M3 20h18M7.5 12.5h2M7.5 16h2M17 16h0"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M3.8 12.6l7.6-7.6a2 2 0 011.4-.6h5a1.8 1.8 0 011.8 1.8v5a2 2 0 01-.6 1.4l-7.6 7.6a1.8 1.8 0 01-2.6 0l-5-5a1.8 1.8 0 010-2.6z"/><circle cx="16" cy="8" r="1.3"/></svg>',
  ];

  // O que a pessoa escolheu na página do produto. Zera a cada troca de produto.
  let escolha = { slug: null, cor: null, opcoes: {}, quantidade: 1 };

  function zerarEscolha(p) {
    const partes = partesCoresDe(p);
    const cores = coresDe(p);
    escolha = {
      slug: p.slug,
      cor: partes.length ? null : cores.length ? cores[0].nome : null,
      cores: Object.fromEntries(partes.map((parte) => [parte.titulo, parte.cores[0]?.nome ?? null])),
      opcoes: Object.fromEntries((p.opcoes || []).map((o) => [o.titulo, (o.valores || [])[0]?.valor ?? null])),
      quantidade: 1,
    };
  }

  // O resumo do pedido que vai digitado no WhatsApp.
  function textoPedido(p) {
    const linhas = [`• ${p.nome}`];
    if (escolha.slug === p.slug) {
      linhas.push(`• Quantidade: ${escolha.quantidade}`);
      if (escolha.cor) linhas.push(`• Cor: ${escolha.cor}`);
      for (const [parte, valor] of Object.entries(escolha.cores || {})) {
        if (valor) linhas.push(`• Cor (${parte}): ${valor}`);
      }
      for (const [titulo, valor] of Object.entries(escolha.opcoes)) {
        if (valor) linhas.push(`• ${titulo}: ${valor}`);
      }
    }
    const preco = precoAtual(p);
    if (preco != null) {
      const q = escolha.slug === p.slug ? escolha.quantidade : 1;
      linhas.push(
        q > 1
          ? `• Valor: ${moeda.format(preco)} cada — total ${moeda.format(preco * q)}`
          : `• Valor: ${moeda.format(preco)}`
      );
    }
    return linhas.join('\n');
  }

  function linkZap(produto) {
    const loja = catalogo.loja;
    const numero = String(loja.whatsapp || '').replace(/\D/g, '');
    let texto;
    if (!produto) {
      texto = loja.mensagemGeral || 'Olá! Vim pelo site.';
    } else {
      const modelo = loja.mensagemPadrao;
      texto = String(modelo || 'Olá! Quero pedir:\n{pedido}\n{link}')
        .replaceAll('{pedido}', textoPedido(produto))
        .replaceAll('{produto}', produto.nome)
        .replaceAll('{link}', location.href.split('#')[0] + '#/p/' + produto.slug);
      if (!modelo.includes('{link}')) texto += '\n' + location.href.split('#')[0] + '#/p/' + produto.slug;
    }
    return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texto);
  }

  /* ---------- Carrinho ---------------------------------------------------- */

  // Carrinho fica salvo no navegador da pessoa: some só se ela limpar os dados do site.
  const CHAVE_CARRINHO = 'cafezim-carrinho';

  function carregarCarrinho() {
    try {
      const dados = JSON.parse(localStorage.getItem(CHAVE_CARRINHO) || '[]');
      return Array.isArray(dados) ? dados : [];
    } catch {
      return [];
    }
  }

  let carrinho = carregarCarrinho();

  function salvarCarrinho() {
    try {
      localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(carrinho));
    } catch {}
    atualizarBadgeCarrinho();
  }

  // Mesmo produto com a mesma cor e as mesmas opções soma quantidade em vez de duplicar linha.
  function chaveItem(it) {
    return JSON.stringify([it.slug, it.cor, it.cores, it.opcoes]);
  }

  function adicionarAoCarrinho(p) {
    const item = {
      slug: p.slug,
      nome: p.nome,
      cor: escolha.slug === p.slug ? escolha.cor : null,
      cores: escolha.slug === p.slug ? { ...escolha.cores } : {},
      opcoes: escolha.slug === p.slug ? { ...escolha.opcoes } : {},
      quantidade: escolha.slug === p.slug ? escolha.quantidade : 1,
      preco: precoAtual(p),
    };
    const existente = carrinho.find((x) => chaveItem(x) === chaveItem(item));
    if (existente) existente.quantidade += item.quantidade;
    else carrinho.push(item);
    salvarCarrinho();
  }

  function removerDoCarrinho(i) {
    carrinho.splice(i, 1);
    salvarCarrinho();
  }

  function definirQuantidadeCarrinho(i, n) {
    const item = carrinho[i];
    if (!item) return;
    item.quantidade = Math.min(99, Math.max(1, n));
    salvarCarrinho();
  }

  function quantidadeCarrinho() {
    return carrinho.reduce((soma, it) => soma + it.quantidade, 0);
  }

  function totalCarrinho() {
    return carrinho.reduce((soma, it) => soma + (it.preco != null ? it.preco * it.quantidade : 0), 0);
  }

  function atualizarBadgeCarrinho() {
    const contagem = document.getElementById('carrinho-contagem');
    if (!contagem) return;
    const n = quantidadeCarrinho();
    contagem.textContent = n > 99 ? '99+' : String(n);
    contagem.hidden = n === 0;
  }

  function textoItemCarrinho(it) {
    const linhas = [`• ${it.nome}`, `• Quantidade: ${it.quantidade}`];
    if (it.cor) linhas.push(`• Cor: ${it.cor}`);
    for (const [parte, valor] of Object.entries(it.cores || {})) {
      if (valor) linhas.push(`• Cor (${parte}): ${valor}`);
    }
    for (const [titulo, valor] of Object.entries(it.opcoes || {})) {
      if (valor) linhas.push(`• ${titulo}: ${valor}`);
    }
    if (it.preco != null) {
      linhas.push(
        it.quantidade > 1
          ? `• Valor: ${moeda.format(it.preco)} cada — total ${moeda.format(it.preco * it.quantidade)}`
          : `• Valor: ${moeda.format(it.preco)}`
      );
    }
    return linhas.join('\n');
  }

  // Total com o frete escolhido, quando há um. Quem lê a mensagem no WhatsApp
  // (os dois lados) precisa ver um número que fecha: antes a linha do frete
  // aparecia e logo abaixo um "Total do pedido" que não a incluía.
  function totalComFrete() {
    return totalCarrinho() + (freteEscolhido?.preco || 0);
  }

  function textoPedidoCarrinho() {
    const linhas = carrinho.map(textoItemCarrinho).join('\n\n');
    const frete = textoFrete();
    if (!frete) return `${linhas}\n\n• Total do pedido: ${moeda.format(totalCarrinho())}`;
    return [
      linhas,
      '',
      `• Subtotal das peças: ${moeda.format(totalCarrinho())}`,
      frete,
      `• Total com frete: ${moeda.format(totalComFrete())}`,
    ].join('\n');
  }

  function linkZapCarrinho() {
    const loja = catalogo.loja;
    const numero = String(loja.whatsapp || '').replace(/\D/g, '');
    const modelo = loja.mensagemPadrao;
    const linkCarrinho = location.href.split('#')[0] + '#/carrinho';
    let texto = String(modelo || 'Olá! Quero pedir:\n{pedido}\n{link}')
      .replaceAll('{pedido}', textoPedidoCarrinho())
      .replaceAll('{produto}', 'meu pedido')
      .replaceAll('{link}', linkCarrinho);
    if (!modelo.includes('{link}')) texto += '\n' + linkCarrinho;
    return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texto);
  }

  /* ---------- Recomendação ------------------------------------------------ */

  // Ordem de preferência: o que você escolheu à mão no campo `combinaCom`,
  // depois a mesma categoria, e por último o resto do catálogo mais próximo
  // em preço. A terceira camada existe porque Luminárias só tem 6 peças — sem
  // ela a seção apareceria com dois cartões numa página de luminária.
  const ALVO_RELACIONADOS = 4;

  function relacionados(p) {
    const escolhidos = [];
    const jaTem = new Set([p.slug]);

    const juntar = (lista) => {
      for (const x of lista) {
        if (escolhidos.length >= ALVO_RELACIONADOS) return;
        if (!x || jaTem.has(x.slug)) continue;
        jaTem.add(x.slug);
        escolhidos.push(x);
      }
    };

    // 1. curadoria manual: `"combinaCom": ["knock-box", "dosador-cafe"]`
    juntar((p.combinaCom || []).map((slug) => porSlug(catalogo.produtos, slug)));

    // 2. mesma categoria, destaque primeiro — é a peça que você já sabe que sai
    const irmaos = produtosDa(p.categoria).filter((x) => x.slug !== p.slug);
    juntar([...irmaos].sort((a, b) => Number(Boolean(b.destaque)) - Number(Boolean(a.destaque))));

    // 3. completa com o preço mais parecido: quem olha peça de R$ 30 não se
    //    interessa pela de R$ 110 só porque sobrou espaço na grade.
    const preco = precoAtual(p);
    if (preco != null) {
      const resto = catalogo.produtos
        .filter((x) => !jaTem.has(x.slug) && precoAtual(x) != null)
        .sort((a, b) => Math.abs(precoAtual(a) - preco) - Math.abs(precoAtual(b) - preco));
      juntar(resto);
    }

    return escolhidos;
  }

  function secaoRelacionados(p) {
    const lista = relacionados(p);
    if (!lista.length) return '';
    const c = categoriaDe(p);
    return `<section class="secao">
      <div class="secao-topo">
        <h2>Você também pode gostar</h2>
        ${c ? `<a class="ver-tudo" href="#/c/${esc(c.slug)}">Ver ${esc(c.nome)} →</a>` : ''}
      </div>
      ${grade(lista)}
    </section>`;
  }

  /* ---------- Firestore (depoimentos) ------------------------------------- */

  // Por que REST e não o SDK do Firebase: o SDK são ~100 KB de JavaScript de
  // terceiro pra fazer dois pedidos HTTP. A premissa deste site é abrir com o
  // catálogo embutido e zero dependência externa — um SDK aqui trocaria isso
  // por conveniência de sintaxe. A API REST faz o mesmo com `fetch`, e as
  // regras de segurança valem igual: pedido com chave de API e sem login conta
  // como anônimo (`request.auth == null` nas regras).
  //
  // A chave de API do Firebase é pública por desenho — ela identifica o
  // projeto, não autoriza nada. Quem protege os dados são as regras em
  // ferramentas/firestore.rules: leitura só do que está aprovado, escrita só
  // de documento novo no formato certo, alterar e apagar nunca.
  //
  // Sem Storage e sem Cloud Functions (ambos exigem plano Blaze, e o projeto
  // fica no Spark de propósito) este é o teto: texto sim, foto não. Foto de
  // cliente continua chegando pelo WhatsApp e entra à mão no catalogo.json.

  const ESPERA_FIRESTORE = 8000;

  // O site NÃO lê o Firestore. Depoimento só aparece depois de passar pelo
  // ferramentas/colher-depoimentos.mjs, que baixa texto e fotos e grava no
  // catalogo.json — então o que está no ar passou pela sua conferência, e a
  // página não depende do Firebase estar de pé pra mostrar prova social.
  //
  // Daqui o Firestore é só escrita: o formulário grava, e as regras não
  // permitem leitura a ninguém de fora (ferramentas/firestore.rules).
  const fbConfig = () => {
    const c = catalogo.loja.feedback?.firebase;
    if (!c?.projeto || !c?.chaveApi) return null;
    if (location.protocol === 'file:') return null;
    return c;
  };

  const fbUrl = (c, caminho) =>
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(c.projeto)}` +
    `/databases/(default)/documents${caminho}?key=${encodeURIComponent(c.chaveApi)}`;

  const fbPedido = (c, caminho, corpo) =>
    fetch(fbUrl(c, caminho), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
      // Sem isto, rede pendurada deixa a promessa aberta pra sempre — no
      // formulário isso é um botão "Enviando..." que nunca volta.
      signal: AbortSignal.timeout?.(ESPERA_FIRESTORE),
    }).then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))));

  function enviarAvaliacao(dados) {
    const c = fbConfig();
    if (!c) return Promise.reject(new Error('sem-firebase'));
    const campos = {
      nome: { stringValue: dados.nome },
      cidade: { stringValue: dados.cidade || '' },
      texto: { stringValue: dados.texto },
      criadoEm: { timestampValue: new Date().toISOString() },
      // Nasce reprovado. Formulário aberto na internet publicando direto é
      // convite a spam na própria vitrine; virar `true` é um clique no console
      // do Firebase, e é esse clique que publica.
      aprovado: { booleanValue: false },
      destaque: { booleanValue: false },
    };
    // Foto vai como data URI dentro do próprio documento. Não é jeito de
    // SERVIR imagem — é caixa de entrada: documento com foto nunca é lido pelo
    // site (só os aprovados são, e aprovar passa por tirar a foto daqui).
    // Ver ferramentas/colher-depoimentos.mjs e "Fotos de cliente" no LEIA-ME.
    if (dados.fotos?.length) {
      campos.fotos = {
        arrayValue: { values: dados.fotos.map((f) => ({ stringValue: f })) },
      };
    }
    return fbPedido(c, '/' + encodeURIComponent(c.colecao || 'avaliacoes'), { fields: campos });
  }

  /* ---------- Avaliações -------------------------------------------------- */

  // Fonte única: `avaliacoes` no catálogo. O que está no Firestore ainda não é
  // público — vira público quando o colher-depoimentos.mjs traz pra cá.
  const todasAvaliacoes = () =>
    (catalogo.avaliacoes || []).filter((a) => a && a.texto && a.nome);

  // Sem estrela e sem média: com um punhado de depoimentos por peça, nota média
  // é estatística de enfeite — e estrela vazia ao lado do preço comunica
  // "ninguém avaliou" em vez de "é bom". Vale o texto do cliente, só.
  // Aceita `fotos: [...]` e também `foto: "..."` de uma entrada antiga, pra não
  // quebrar depoimento já cadastrado com o campo no singular.
  const fotosDe = (a) => (a.fotos?.length ? a.fotos : a.foto ? [a.foto] : []);

  // Com mínimo de 51 caracteres e teto de 1200, um depoimento pode ser bem
  // mais longo que o vizinho — e cartão de 20 linhas ao lado de um de 3 destrói
  // a grade. Então o texto é recortado por CSS e ganha um "ver mais".
  //
  // O botão é criado aqui, depois de pintar, e não no HTML: só dá pra saber se
  // o texto transbordou medindo o elemento já renderizado. Depoimento curto não
  // ganha botão nenhum — "ver mais" que não revela nada é pior que não ter.
  const FOLGA_RECORTE = 4; // px de tolerância pra arredondamento de linha

  function ligarVerMais(raiz) {
    for (const txt of raiz.querySelectorAll('.avaliacao-texto')) {
      if (txt.dataset.medido) continue;
      txt.dataset.medido = '1';
      if (txt.scrollHeight - txt.clientHeight <= FOLGA_RECORTE) {
        // Cabe inteiro: tira o recorte pra não deixar reticências sobrando num
        // texto que não precisava delas.
        txt.classList.add('avaliacao-texto-inteiro');
        continue;
      }
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'avaliacao-vermais';
      botao.textContent = 'ver mais';
      botao.setAttribute('aria-expanded', 'false');
      botao.addEventListener('click', () => {
        const aberto = txt.classList.toggle('avaliacao-texto-inteiro');
        botao.textContent = aberto ? 'ver menos' : 'ver mais';
        botao.setAttribute('aria-expanded', String(aberto));
      });
      txt.insertAdjacentElement('afterend', botao);
    }
  }

  // Inicial do nome num disco de cor. Não é foto de perfil (ninguém manda uma
  // e inventar avatar seria mentir): é só âncora visual pro nome não ficar
  // boiando numa linha solta de rodapé.
  function inicialDe(nome) {
    const letra = String(nome || '?').trim().charAt(0).toUpperCase();
    return letra || '?';
  }

  function cartaoAvaliacao(a) {
    const fotos = fotosDe(a);
    return `<figure class="avaliacao">
      <span class="avaliacao-aspas" aria-hidden="true">&ldquo;</span>
      <blockquote class="avaliacao-texto">&ldquo;${esc(a.texto)}&rdquo;</blockquote>
      ${
        fotos.length
          ? `<div class="avaliacao-fotos" data-quantas="${Math.min(fotos.length, 3)}">
              ${fotos
                .map(
                  (f, i) => `<img src="${esc(f)}"
                       alt="Foto ${i + 1} enviada por ${esc(a.nome)}"
                       role="button" tabindex="0"
                       title="Ver em tamanho grande"
                       loading="lazy" decoding="async">`
                )
                .join('')}
            </div>`
          : ''
      }
      <figcaption class="avaliacao-autor">
        <span class="avaliacao-inicial" aria-hidden="true">${esc(inicialDe(a.nome))}</span>
        <span class="avaliacao-assinatura">
          <strong>${esc(a.nome)}</strong>
          ${a.cidade || a.data ? `<small>${esc([a.cidade, a.data ? dataLonga(a.data) : ''].filter(Boolean).join(' · '))}</small>` : ''}
        </span>
      </figcaption>
    </figure>`;
  }

  // Depoimento não é amarrado a peça: aparece na capa, e só na capa. Enquanto
  // ele vinha do slug da URL do formulário, o link mandado por WhatsApp
  // carregava o nome da peça e a seção existia em duas telas — contexto que
  // ninguém pedia e um campo a mais pra manter. Na capa: os marcados com
  // `destaque`, e se não houver nenhum marcado cai nos mais recentes, pra a
  // seção nascer funcionando sem curadoria manual.
  function secaoAvaliacoesInicio() {
    const todas = todasAvaliacoes();
    const marcadas = todas.filter((a) => a.destaque);
    const lista = (marcadas.length ? marcadas : [...todas].reverse()).slice(0, 6);
    if (!lista.length) return '';
    const f = catalogo.loja.feedback || {};
    // Um depoimento por vez, em carrossel que anda sozinho. Na grade de dois ou
    // três, cada cartão ficava estreito e o segundo não era lido; sozinho, cada
    // um ganha o arranjo largo (foto ao lado do texto) e a sua vez. Por isso
    // também cabem mais na seção do que os três de antes.
    const controles =
      lista.length > 1
        ? `<div class="avaliacao-controles">
             <button type="button" class="avaliacao-seta avaliacao-seta-ant" aria-label="Depoimento anterior">
               <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
             <div class="avaliacao-pontos">
               ${lista
                 .map(
                   (a, i) => `<button type="button" class="avaliacao-ponto" data-ir="${i}"
                     aria-label="Ver o depoimento de ${esc(a.nome)}"${i === 0 ? ' aria-current="true"' : ''}></button>`
                 )
                 .join('')}
             </div>
             <button type="button" class="avaliacao-seta avaliacao-seta-prox" aria-label="Próximo depoimento">
               <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>
           </div>`
        : '';
    return `<section class="avaliacoes-faixa">
      <div class="secao avaliacoes">
        <div class="secao-topo"><h2>${esc(f.titulo || 'Quem já tem em casa')}</h2></div>
        <p class="secao-resumo">Fotos e palavras de quem comprou e montou o cantinho em casa.</p>
        <div class="avaliacao-carrossel" data-avaliacoes
             role="group" aria-roledescription="carrossel" aria-label="Depoimentos de quem comprou">
          <div class="avaliacao-trilho" tabindex="0" aria-label="Depoimentos">
            ${lista.map((a) => `<div class="avaliacao-quadro">${cartaoAvaliacao(a)}</div>`).join('')}
          </div>
          ${controles}
        </div>
      </div>
    </section>`;
  }

  /* ---------- Cores -------------------------------------------------------- */

  // Sem a chave "cores", o produto herda as cores padrão da loja.
  function coresDe(p) {
    const paleta = catalogo.loja.paletaCores || {};
    const chaves = p.cores && p.cores.length ? p.cores : catalogo.loja.coresPadrao || [];
    return chaves.map((k) => paleta[k] || { nome: k, hex: '#CCC' });
  }

  // Peças que desmontam (tampa, corpo, base…) podem ter cor escolhida por
  // parte em vez de uma cor só pra peça inteira.
  function partesCoresDe(p) {
    const paleta = catalogo.loja.paletaCores || {};
    return (p.partesCores || []).map((parte) => ({
      titulo: parte.titulo,
      cores: (parte.cores || []).map((k) => paleta[k] || { nome: k, hex: '#CCC' }),
    }));
  }

  function blocoCoresLista(cores) {
    return `<div class="escolha-lista">
      ${cores
        .map(
          (c, i) => `<button type="button" class="opcao" role="radio"
            aria-checked="${i === 0}" data-valor="${esc(c.nome)}">
            <span class="opcao-bola" style="--cor:${esc(c.hex)}" aria-hidden="true"></span>
            <span class="opcao-nome">${esc(c.nome)}</span>
          </button>`
        )
        .join('')}
    </div>`;
  }

  function blocoCores(p) {
    const partes = partesCoresDe(p);
    if (partes.length) {
      return partes
        .map(
          (parte) => `<div class="escolha" data-grupo="cor-parte" data-parte="${esc(parte.titulo)}"
            role="radiogroup" aria-label="Cor — ${esc(parte.titulo)}">
            <h2 class="escolha-titulo">Cor — ${esc(parte.titulo)}</h2>
            ${blocoCoresLista(parte.cores)}
          </div>`
        )
        .join('');
    }
    const cores = coresDe(p);
    if (!cores.length) return '';
    return `<div class="escolha" data-grupo="cor" role="radiogroup" aria-label="Cor">
      <h2 class="escolha-titulo">Cor</h2>
      ${blocoCoresLista(cores)}
    </div>`;
  }

  function blocoOpcoes(p) {
    return (p.opcoes || [])
      .map(
        (o) => `<div class="escolha" data-grupo="${esc(o.titulo)}" role="radiogroup" aria-label="${esc(o.titulo)}">
          <h2 class="escolha-titulo">${esc(o.titulo)}</h2>
          <div class="escolha-lista">
            ${(o.valores || [])
              .map((v, i) => {
                const mostraPreco = (o.valores || []).some((x) => x.preco != null);
                return `<button type="button" class="opcao" role="radio"
                  aria-checked="${i === 0}" data-valor="${esc(v.valor)}">
                  <span class="opcao-nome">${esc(v.valor)}</span>
                  ${
                    mostraPreco && v.preco != null
                      ? `<span class="opcao-preco">${moeda.format(v.preco)}</span>`
                      : ''
                  }
                </button>`;
              })
              .join('')}
          </div>
        </div>`
      )
      .join('');
  }

  // Ficha técnica no formato de tabela. Linha sem valor preenchido não aparece.
  function blocoFicha(p) {
    const linhas = (p.ficha || []).filter((l) => l.valor);
    if (!linhas.length) return '';
    return `<section class="ficha">
      <h2 class="ficha-titulo">Ficha técnica</h2>
      <div class="ficha-rolagem">
        <table class="ficha-tabela">
          <tbody>
            ${linhas
              .map(
                (l) => `<tr><th scope="row">${esc(l.rotulo)}</th><td>${esc(l.valor)}</td></tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </section>`;
  }

  function blocoQuantidade() {
    return `<div class="escolha escolha-quantidade">
      <h2 class="escolha-titulo">Quantidade</h2>
      <div class="contador">
        <button type="button" class="contador-botao" data-passo="-1" aria-label="Diminuir">−</button>
        <input class="contador-campo" id="quantidade" type="number" inputmode="numeric"
               min="1" max="99" value="1" aria-label="Quantidade">
        <button type="button" class="contador-botao" data-passo="1" aria-label="Aumentar">+</button>
      </div>
    </div>`;
  }

  /* ---------- Vídeo ------------------------------------------------------ */

  // Aceita link completo do YouTube (watch, youtu.be, shorts, embed) ou só o ID.
  function idDoYoutube(valor) {
    if (!valor) return null;
    const v = String(valor).trim();
    if (/^[\w-]{11}$/.test(v)) return v;
    const m = v.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/v\/)([\w-]{11})/);
    return m ? m[1] : null;
  }

  function caminhoVideoLocal(valor) {
    if (!valor) return null;
    const v = String(valor).trim();
    return /\.(mp4|webm|mov)$/i.test(v) ? v : null;
  }

  /* ---------- Foto ampliada (depoimentos) --------------------------------- */

  // Foto de cliente na bancada dele é o argumento mais forte que a página tem,
  // e miniatura de 100px não deixa ver acabamento nem a cor de verdade. Daqui
  // abre em tela cheia, com seta pra percorrer as do mesmo depoimento.
  //
  // Um overlay só, criado na primeira abertura e reaproveitado: um por cartão
  // multiplicaria nó e ouvinte à toa.
  let lupa = null;
  let lupaFotos = [];
  let lupaAtual = 0;

  function montarLupa() {
    if (lupa) return lupa;
    lupa = document.createElement('div');
    lupa.className = 'lupa';
    lupa.hidden = true;
    lupa.innerHTML = `
      <button type="button" class="lupa-fechar" aria-label="Fechar">&times;</button>
      <button type="button" class="lupa-seta lupa-anterior" aria-label="Foto anterior">&#8249;</button>
      <figure class="lupa-palco"><img alt=""><figcaption></figcaption></figure>
      <button type="button" class="lupa-seta lupa-proxima" aria-label="Próxima foto">&#8250;</button>`;
    document.body.appendChild(lupa);

    lupa.addEventListener('click', (e) => {
      if (e.target.closest('.lupa-anterior')) return mostrarNaLupa(lupaAtual - 1);
      if (e.target.closest('.lupa-proxima')) return mostrarNaLupa(lupaAtual + 1);
      // Clique fora da imagem fecha. É o gesto que todo mundo tenta primeiro.
      if (!e.target.closest('.lupa-palco') || e.target.closest('.lupa-fechar')) fecharLupa();
    });
    document.addEventListener('keydown', (e) => {
      if (lupa.hidden) return;
      if (e.key === 'Escape') fecharLupa();
      if (e.key === 'ArrowLeft') mostrarNaLupa(lupaAtual - 1);
      if (e.key === 'ArrowRight') mostrarNaLupa(lupaAtual + 1);
    });
    return lupa;
  }

  function mostrarNaLupa(i) {
    if (!lupaFotos.length) return;
    // Circular: na última, a seta volta pra primeira em vez de virar botão morto.
    lupaAtual = (i + lupaFotos.length) % lupaFotos.length;
    const f = lupaFotos[lupaAtual];
    const img = lupa.querySelector('.lupa-palco img');
    img.src = f.src;
    img.alt = f.alt;
    lupa.querySelector('figcaption').textContent =
      lupaFotos.length > 1 ? `${lupaAtual + 1} de ${lupaFotos.length} — ${f.legenda}` : f.legenda;
    lupa.querySelectorAll('.lupa-seta').forEach((b) => (b.hidden = lupaFotos.length < 2));
  }

  function abrirLupa(fotos, i) {
    montarLupa();
    lupaFotos = fotos;
    mostrarNaLupa(i);
    lupa.hidden = false;
    // Trava a rolagem do fundo: sem isto, rolar no celular move a página atrás
    // da foto em vez de nada.
    document.body.classList.add('sem-rolagem');
    lupa.querySelector('.lupa-fechar').focus();
  }

  function fecharLupa() {
    if (!lupa) return;
    lupa.hidden = true;
    // removeAttribute e não src='': string vazia faz o navegador resolver pra
    // URL da página e disparar um pedido inútil a cada fechamento.
    lupa.querySelector('.lupa-palco img').removeAttribute('src');
    document.body.classList.remove('sem-rolagem');
  }

  // Delegado no document: os cartões são redesenhados a cada rota, enganchar em
  // cada imagem exigiria religar o ouvinte em todo desenho.
  // Enter e espaço abrem igual ao clique: a imagem tem role=button e tabindex,
  // então precisa responder ao teclado pra não ser um botão que só o mouse usa.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const img = e.target.closest?.('.avaliacao-fotos img');
    if (!img) return;
    e.preventDefault();
    img.click();
  });

  document.addEventListener('click', (e) => {
    const img = e.target.closest('.avaliacao-fotos img');
    if (!img) return;
    const cartao = img.closest('.avaliacao');
    const todas = [...cartao.querySelectorAll('.avaliacao-fotos img')];
    const autor = cartao.querySelector('.avaliacao-autor')?.textContent.trim() || '';
    abrirLupa(
      todas.map((x) => ({ src: x.src, alt: x.alt, legenda: `Foto de ${autor.split('·')[0].trim()}` })),
      todas.indexOf(img)
    );
  });

  /* ---------- Peças de interface ----------------------------------------- */

  function selos(p) {
    const itens = [];
    if (p.destaque) itens.push('<span class="selo selo-destaque">Destaque</span>');
    return itens.length ? `<div class="selos">${itens.join('')}</div>` : '';
  }

  function semFoto(nome) {
    return `<div class="sem-foto">
      <img src="marca/mascote.svg" alt="" aria-hidden="true">
      <span>Foto de ${esc(nome)} a caminho</span>
    </div>`;
  }

  // Todos os preços que a peça pode ter: o dela, mais os das opções.
  function precosPossiveis(p) {
    const das = (p.opcoes || []).flatMap((g) => (g.valores || []).map((v) => v.preco)).filter((x) => x != null);
    return das.length ? das : p.preco != null ? [p.preco] : [];
  }

  // O preço de agora, já contando o que a pessoa escolheu nesta página.
  function precoAtual(p) {
    if (escolha.slug === p.slug) {
      for (const grupo of p.opcoes || []) {
        const v = (grupo.valores || []).find((x) => x.valor === escolha.opcoes[grupo.titulo]);
        if (v && v.preco != null) return v.preco;
      }
    }
    const possiveis = precosPossiveis(p);
    return possiveis.length ? Math.min(...possiveis) : null;
  }

  function precoHtml(p, classe = 'preco') {
    const possiveis = precosPossiveis(p);
    if (!possiveis.length) return `<span class="${classe} preco-consultar">Consultar</span>`;
    const variavel = new Set(possiveis).size > 1 && escolha.slug !== p.slug;
    const valor = variavel ? Math.min(...possiveis) : precoAtual(p);
    return `<span class="${classe}">${
      variavel ? `<span class="preco-apartir">a partir de</span> ` : ''
    }${moeda.format(valor)}</span>`;
  }

  // Bolinhas de cor no cartão: é a pergunta que mais aparece antes do clique
  // ("sai em preto?"), e responder na grade poupa a visita à página. Mostra no
  // máximo quatro e resume o resto num "+N" — fila de dez bolinhas vira ruído.
  function bolinhasCartao(p) {
    const cores = coresDe(p);
    if (cores.length < 2) return '';
    const visiveis = cores.slice(0, 4);
    const sobra = cores.length - visiveis.length;
    return `<div class="cartao-cores" aria-label="Cores: ${esc(cores.map((c) => c.nome).join(', '))}">
      ${visiveis
        .map((c) => `<span class="cartao-cor" style="--cor:${esc(c.hex)}" aria-hidden="true"></span>`)
        .join('')}
      ${sobra > 0 ? `<span class="cartao-cor-mais" aria-hidden="true">+${sobra}</span>` : ''}
    </div>`;
  }

  // Cartão de catálogo enxuto: foto, nome, cor e preço. O resumo saiu de
  // propósito — na grade ele dobrava a altura do cartão sem ajudar a escolher,
  // e quem quer o detalhe abre a peça. A segunda foto aparece no hover (padrão
  // de vitrine: mostra o outro ângulo sem tirar a pessoa da grade).
  function cartao(p, prioridade = false) {
    const fotos = p.fotos || [];
    const foto = fotos[0];
    const img = foto
      ? `<img class="cartao-img" src="${esc(foto)}" alt="${esc(p.nome)}" width="800" height="600"
           loading="${prioridade ? 'eager' : 'lazy'}" decoding="async"
           ${prioridade ? 'fetchpriority="high"' : ''}>${
          fotos[1]
            ? `<img class="cartao-img cartao-img-verso" src="${esc(fotos[1])}" alt=""
                 aria-hidden="true" loading="lazy" decoding="async">`
            : ''
        }`
      : semFoto(p.nome);
    return `<a class="cartao" href="#/p/${esc(p.slug)}">
      <div class="cartao-foto">${selos(p)}${img}</div>
      <div class="cartao-corpo">
        <h3>${esc(p.nome)}</h3>
        ${bolinhasCartao(p)}
        <div class="cartao-rodape">${precoHtml(p)}<span class="cartao-seta">Ver peça</span></div>
      </div>
    </a>`;
  }

  const grade = (lista) =>
    `<div class="grade">${lista.map((p, i) => cartao(p, i < 4)).join('')}</div>`;

  /* ---------- Telas ------------------------------------------------------ */

  // A chamada da capa com um trecho realçado em terracota. O texto é escapado
  // antes de qualquer coisa — só a marcação do realce é nossa.
  function chamadaHtml(loja) {
    const texto = loja.chamada || loja.nome;
    const alvo = loja.chamadaDestaque;
    if (!alvo || !texto.includes(alvo)) return esc(texto);
    const i = texto.indexOf(alvo);
    return esc(texto.slice(0, i)) + `<em>${esc(alvo)}</em>` + esc(texto.slice(i + alvo.length));
  }

  /* ---------- Blocos de venda da capa ------------------------------------- */

  // Afirmações sobre a loja, logo abaixo da capa: título é o benefício, `texto`
  // é o mecanismo que o sustenta (o <p> só nasce se o texto existir, pra dar
  // pra ficar só no título quando a frase de apoio repetiria o título com mais
  // palavras). Ficam no JSON porque
  // são texto de venda, não lógica — e os marcadores {minimo} e {total} são
  // preenchidos com o catálogo de verdade, pra não envelhecerem: preço mínimo
  // escrito à mão vira mentira na primeira mudança de tabela.
  function blocoProvas() {
    const provas = catalogo.loja.provas || [];
    if (!provas.length) return '';
    const precos = catalogo.produtos.map(precoAtual).filter((v) => v != null);
    const dados = {
      '{total}': String(catalogo.produtos.length),
      '{minimo}': precos.length ? moeda.format(Math.min(...precos)) : '',
    };
    const preencher = (t) =>
      Object.entries(dados).reduce((acc, [de, para]) => acc.replaceAll(de, para), String(t || ''));

    return `<section class="provas" aria-label="Por que comprar aqui">
      <div class="provas-interno">
        ${provas
          .map(
            (p, i) => `<div class="prova">
              <span class="prova-icone" aria-hidden="true">${ICONES_PROVA[i % ICONES_PROVA.length]}</span>
              <div>
                <h3>${esc(preencher(p.titulo))}</h3>
                ${p.texto ? `<p>${esc(preencher(p.texto))}</p>` : ''}
              </div>
            </div>`
          )
          .join('')}
      </div>
    </section>`;
  }

  // Vitrine de categorias logo abaixo da capa. Quem chega numa loja decide
  // primeiro o tipo de peça ("quero uma luminária"), não a peça — e no celular
  // o menu de categorias está escondido atrás do hambúrguer, então sem esta
  // faixa a primeira tela não oferece caminho nenhum além de rolar.
  // A foto de cada azulejo sai do catálogo: primeira peça em destaque da
  // categoria, ou a primeira com foto. Nada de arte nova pra manter.
  // `evitar` são os slugs que já aparecem na grade de destaques logo abaixo:
  // sem isso o azulejo de "Organização" era a mesma foto do primeiro cartão de
  // "O que mais sai", a dois palmos de distância, e a página parecia repetida.
  function capaDaCategoria(slug, evitar = new Set()) {
    const comFoto = produtosDa(slug).filter((p) => p.fotos && p.fotos.length);
    const livres = comFoto.filter((p) => !evitar.has(p.slug));
    const pool = livres.length ? livres : comFoto;
    const escolhida = pool.find((p) => p.destaque) || pool[0];
    return escolhida ? escolhida.fotos[0] : null;
  }

  function blocoCategorias(evitar = new Set()) {
    const cats = catalogo.categorias || [];
    if (cats.length < 2) return '';
    return `<section class="secao categorias-secao">
      <div class="secao-topo"><h2>Escolha por tipo de peça</h2></div>
      <div class="categorias" data-quantas="${cats.length}">
        ${cats
          .map((c) => {
            const foto = capaDaCategoria(c.slug, evitar);
            const quantas = produtosDa(c.slug).length;
            return `<a class="categoria" href="#/c/${esc(c.slug)}">
              <div class="categoria-foto">
                ${
                  foto
                    ? `<img src="${esc(foto)}" alt="" aria-hidden="true" loading="lazy" decoding="async">`
                    : `<img src="marca/mascote.svg" alt="" aria-hidden="true">`
                }
              </div>
              <span class="categoria-nome">${esc(c.nome)}</span>
              <span class="categoria-conta">${quantas} ${quantas === 1 ? 'peça' : 'peças'}</span>
            </a>`;
          })
          .join('')}
      </div>
    </section>`;
  }

  // Fecha a home puxando pra conversa. Numa loja que vende por WhatsApp, a
  // dúvida que não é respondida é a venda que não acontece — e a dúvida mais
  // comum aqui é "serve na minha máquina?", que só uma foto resolve.
  function blocoFechamento() {
    const f = catalogo.loja.fechamento;
    if (!f?.titulo) return '';
    // Texto e botão em caixas separadas pro desktop poder pôr um ao lado do
    // outro sem o botão esticar junto com o parágrafo.
    return `<section class="fechamento">
      <div class="fechamento-caixa">
        <div class="fechamento-texto">
          <h2>${esc(f.titulo)}</h2>
          ${f.texto ? `<p>${esc(f.texto)}</p>` : ''}
        </div>
        <a class="botao botao-zap" href="${linkZap(null)}" target="_blank" rel="noopener">
          ${SVG_ZAP} ${esc(f.textoBotao || 'Falar no WhatsApp')}
        </a>
      </div>
    </section>`;
  }

  // A arte da capa é foto de peça, não mascote: numa loja, a primeira tela tem
  // que mostrar o que se vende. Duas fotos sobrepostas (a de destaque e uma
  // segunda em plano menor) dão profundidade sem precisar de arte nova. Se não
  // houver foto nenhuma no catálogo, cai no mascote de novo.
  function arteDaCapa(destaques) {
    const comFoto = destaques.filter((p) => p.fotos && p.fotos.length);
    if (!comFoto.length) {
      return `<img class="capa-mascote" src="marca/mascote-cheio.svg" alt="" aria-hidden="true" width="280" height="280">`;
    }
    const [a, b] = comFoto;
    return `<figure class="capa-pilha">
      <img class="capa-foto capa-foto-frente" src="${esc(a.fotos[0])}" alt="${esc(a.nome)}"
           width="800" height="800" fetchpriority="high" decoding="async">
      ${
        b
          ? `<img class="capa-foto capa-foto-fundo" src="${esc(b.fotos[0])}" alt=""
               aria-hidden="true" width="600" height="600" loading="lazy" decoding="async">`
          : ''
      }
    </figure>`;
  }

  function telaInicio() {
    const loja = catalogo.loja;
    const destaques = catalogo.produtos.filter((p) => p.destaque).slice(0, 8);
    const primeira = catalogo.categorias[0];

    return `
      <section class="capa">
        <div class="capa-interno">
          <div class="capa-texto-bloco">
            <h1>${chamadaHtml(loja)}</h1>
            <p class="capa-texto">${esc(loja.descricao || '')}</p>
            <div class="capa-acoes">
              <a class="botao" href="#/c/${esc(primeira.slug)}">Ver as peças</a>
              <a class="botao botao-zap" href="${linkZap(null)}" target="_blank" rel="noopener">
                ${SVG_ZAP} Falar no WhatsApp
              </a>
            </div>
          </div>
          <div class="capa-arte">${arteDaCapa(destaques)}</div>
        </div>
      </section>

      ${blocoProvas()}

      ${blocoCategorias(new Set(destaques.map((p) => p.slug)))}

      ${
        destaques.length
          ? `<section class="secao">
              <div class="secao-topo">
                <h2>O que mais sai</h2>
                <a class="ver-tudo" href="#/c/${esc(primeira.slug)}">Ver o catálogo</a>
              </div>
              ${grade(destaques)}
            </section>`
          : ''
      }

      ${secaoAvaliacoesInicio()}

      ${blocoFechamento()}
    `;
  }

  function telaCategoria(slug) {
    const c = porSlug(catalogo.categorias, slug);
    if (!c) return telaNaoEncontrado('Essa categoria não existe mais.');
    const lista = produtosDa(slug);
    return `
      <nav class="trilha" aria-label="Você está em">
        <a href="#/">Início</a><span>/</span>${esc(c.nome)}
      </nav>
      <section class="secao">
        <div class="secao-topo">
          <h2>${esc(c.nome)}</h2>
          <span class="ver-tudo">${lista.length} ${lista.length === 1 ? 'peça' : 'peças'}</span>
        </div>
        <p class="secao-resumo">${esc(c.resumo || '')}</p>
        ${lista.length ? grade(lista) : '<p>Nada por aqui ainda.</p>'}
      </section>
    `;
  }

  function telaBusca(termo) {
    const k = chave(termo);
    const achados = !k
      ? []
      : catalogo.produtos.filter((p) =>
          chave(
            [
              p.nome, p.resumo, p.paraQueServe, p.descricao,
              (p.detalhes || []).join(' '),
              (p.ficha || []).map((l) => l.rotulo + ' ' + l.valor).join(' '),
              categoriaDe(p)?.nome,
            ].join(' ')
          ).includes(k)
        );
    return `
      <nav class="trilha" aria-label="Você está em">
        <a href="#/">Início</a><span>/</span>Busca
      </nav>
      <section class="secao">
        <div class="secao-topo"><h2>“${esc(termo)}”</h2>
          <span class="ver-tudo">${achados.length} ${achados.length === 1 ? 'resultado' : 'resultados'}</span>
        </div>
        ${
          achados.length
            ? grade(achados)
            : `<div class="vazio">
                 <img src="marca/mascote-compacto.svg" alt="" aria-hidden="true">
                 <h2>Nada com esse nome</h2>
                 <p>Tente outra palavra, ou dê uma olhada em tudo que tem na loja.</p>
                 <a class="botao botao-vazado" href="#/">Voltar ao início</a>
               </div>`
        }
      </section>
    `;
  }

  function telaProduto(slug) {
    const p = porSlug(catalogo.produtos, slug);
    if (!p) return telaNaoEncontrado('Essa peça saiu do catálogo.');
    const c = categoriaDe(p);
    const fotos = p.fotos || [];
    const idVideo = idDoYoutube(p.video);
    const videoLocal = !idVideo ? caminhoVideoLocal(p.video) : null;

    // Quadros do carrossel: vídeo primeiro (quando houver), depois as fotos.
    const temVideo = Boolean(idVideo || videoLocal);
    const quadroFotos = fotos.map(
      (f, i) =>
        `<div class="quadro" role="group" aria-roledescription="slide" aria-label="Foto ${i + 1} de ${fotos.length}">
           <img src="${esc(f)}" alt="${esc(p.nome)} — foto ${i + 1}"
                loading="${i === 0 && !temVideo ? 'eager' : 'lazy'}" decoding="async"
                ${i === 0 && !temVideo ? 'fetchpriority="high"' : ''}>
         </div>`
    );
    let quadroVideo = '';
    if (videoLocal) {
      quadroVideo = `<div class="quadro" role="group" aria-roledescription="slide" aria-label="Vídeo">
           <div class="video">
             <video src="${esc(videoLocal)}" poster="${esc(fotos[0] || '')}"
                    autoplay muted loop playsinline controls preload="auto"></video>
           </div>
         </div>`;
    } else if (idVideo) {
      quadroVideo = `<div class="quadro" role="group" aria-roledescription="slide" aria-label="Vídeo">
           <div class="video" data-video="${esc(idVideo)}">
             <img src="https://i.ytimg.com/vi/${esc(idVideo)}/hqdefault.jpg" alt="" aria-hidden="true" loading="eager">
             <button class="video-play" type="button" aria-label="Assistir ao vídeo de ${esc(p.nome)}"><span></span></button>
           </div>
         </div>`;
    }
    const quadros = temVideo ? [quadroVideo, ...quadroFotos] : quadroFotos;
    if (!quadros.length) quadros.push(`<div class="quadro">${semFoto(p.nome)}</div>`);

    const miniaturas =
      quadros.length > 1
        ? `<div class="miniaturas" role="tablist" aria-label="Escolher mídia">
            ${
              temVideo
                ? `<button class="miniatura miniatura-video" type="button" role="tab" data-ir="0"
                     aria-current="true" aria-label="Ver o vídeo">
                     <img src="${idVideo ? `https://i.ytimg.com/vi/${esc(idVideo)}/default.jpg` : esc(fotos[0] || '')}" alt="" loading="lazy"></button>`
                : ''
            }
            ${fotos
              .map(
                (f, i) =>
                  `<button class="miniatura" type="button" role="tab" data-ir="${temVideo ? i + 1 : i}" aria-current="${!temVideo && i === 0}"
                    aria-label="Ver foto ${i + 1}"><img src="${esc(f)}" alt="" loading="lazy"></button>`
              )
              .join('')}
          </div>`
        : '';

    const setas =
      quadros.length > 1
        ? `<button class="seta seta-ant" type="button" aria-label="Anterior" disabled>
             <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
           <button class="seta seta-prox" type="button" aria-label="Próximo">
             <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>`
        : '';

    const paragrafos = String(p.descricao || '')
      .split(/\n{2,}/)
      .map((t) => `<p>${esc(t.trim())}</p>`)
      .join('');

    const detalhes = (p.detalhes || []).length
      ? `<ul class="detalhes">${p.detalhes.map((d) => `<li>${escLink(d)}</li>`).join('')}</ul>`
      : '';

    return `
      <nav class="trilha" aria-label="Você está em">
        <a href="#/">Início</a><span>/</span>
        <a href="#/c/${esc(c.slug)}">${esc(c.nome)}</a><span>/</span>${esc(p.nome)}
      </nav>

      <article class="produto">
        <div class="carrossel" data-carrossel>
          <div class="palco">
            ${setas}
            <div class="trilho" tabindex="0" aria-label="Fotos de ${esc(p.nome)}">${quadros.join('')}</div>
          </div>
          ${miniaturas}
        </div>

        <div class="produto-info">
          <h1>${esc(p.nome)}</h1>
          <p class="produto-resumo">${esc(p.resumo || '')}</p>


          <div class="produto-preco">
            <span data-preco>${precoHtml(p)}</span>
            <span class="preco-nota">${esc(catalogo.loja.prazoEntrega || '')}</span>
          </div>
          ${
            catalogo.loja.avisoFrete
              ? `<p class="aviso-frete">
                   <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
                   ${esc(catalogo.loja.avisoFrete)}
                 </p>`
              : ''
          }

          ${
            p.paraQueServe
              ? `<section class="serve">
                   <h2 class="serve-titulo">Para o que serve?</h2>
                   <p class="serve-texto">${esc(p.paraQueServe)}</p>
                 </section>`
              : ''
          }

          <div class="produto-descricao">${paragrafos}</div>
          ${detalhes}
          ${blocoFicha(p)}

          <div class="escolhas" data-escolhas>
            ${blocoOpcoes(p)}
            ${blocoCores(p)}
            ${blocoQuantidade()}
          </div>

          <div class="compra">
            <p class="compra-total" data-total hidden></p>
            <button type="button" class="botao botao-comprar botao-largo" data-adicionar-carrinho>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.4 12.4a2 2 0 002 1.6h8.6a2 2 0 002-1.6L21 8H6"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>
              Adicionar ao carrinho
            </button>
            <p class="compra-nota">${esc(catalogo.loja.avisoPedido || catalogo.loja.avisoPreco || '')}</p>
          </div>
        </div>
      </article>

      ${secaoRelacionados(p)}
    `;
  }

  /* ---------- Fotos do cliente (compressão no navegador) ------------------ */

  // Um documento do Firestore tem teto de 1 MiB, e base64 infla 33%: é esse teto
  // que manda aqui, não o gosto. Cada foto é reduzida no navegador até caber no
  // orçamento, e o orçamento é dividido entre as que já entraram — uma foto
  // sozinha sai grande, dez saem menores, e o documento cabe nos dois casos.
  // Não é a compressão final: o TinyPNG, que aperta de verdade, roda depois em
  // ferramentas/colher-depoimentos.mjs, onde a chave dele fica em máquina sua
  // em vez de no JavaScript do site.
  const MAX_FOTOS = 10;
  const ORCAMENTO_TOTAL = 950_000; // caracteres de base64 somados no documento
  const ORCAMENTO_FOTO = 230_000; // teto de uma foto só, quando sobra espaço
  const LADO_INICIAL = 1280; // px no maior lado — folga pra o TinyPNG trabalhar
  const QUALIDADE_INICIAL = 0.72;

  // Foto de celular moderno passa de 4 MB. Ler isso inteiro pra memória antes
  // de saber se dá pra decodificar é desperdício, mas é o único caminho: o
  // navegador não expõe as dimensões sem decodificar.
  function carregarImagem(arquivo) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(arquivo);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        // Acontece de verdade com HEIC em navegador que não decodifica o
        // formato. O iPhone normalmente converte pra JPEG no seletor de
        // arquivo, mas não dá pra contar com isso.
        reject(new Error('formato-nao-suportado'));
      };
      img.src = url;
    });
  }

  function desenhar1(img, lado, qualidade) {
    const escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
    const tela = document.createElement('canvas');
    tela.width = Math.round(img.naturalWidth * escala);
    tela.height = Math.round(img.naturalHeight * escala);
    const ctx = tela.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, tela.width, tela.height);
    // JPEG e não WebP: o script de colheita e o TinyPNG lidam com os dois, mas
    // JPEG decodifica em qualquer navegador que chegue até aqui.
    return tela.toDataURL('image/jpeg', qualidade);
  }

  // Sem corte: só reduz e recomprime, mantendo o enquadramento que a pessoa
  // escolheu. Vai apertando até caber no orçamento — primeiro pela qualidade,
  // que degrada menos que perder pixel, depois pelo tamanho.
  async function comprimirFoto(arquivo, orcamento = ORCAMENTO_FOTO) {
    const img = await carregarImagem(arquivo);
    let lado = LADO_INICIAL;
    let qualidade = QUALIDADE_INICIAL;
    let saida = desenhar1(img, lado, qualidade);
    // Dez voltas e não seis: com dez fotos o orçamento de cada uma é bem menor
    // que o de uma foto sozinha, e aí são precisos mais apertos pra chegar lá.
    for (let i = 0; i < 10 && saida.length > orcamento; i++) {
      if (qualidade > 0.45) qualidade -= 0.1;
      else lado = Math.round(lado * 0.8);
      saida = desenhar1(img, lado, qualidade);
    }
    // Se depois de tudo ainda não couber, é imagem fora do normal (panorâmica
    // gigante, por exemplo). Melhor recusar do que estourar o documento e o
    // envio falhar com erro que não explica nada.
    if (saida.length > orcamento) throw new Error('foto-grande-demais');
    return saida;
  }

  /* ---------- Tela de feedback -------------------------------------------- */

  // Mínimo do depoimento: baixo de propósito. Piso só pra barrar "oi" e ".";
  // exigir texto longo espanta quem ia escrever duas linhas boas, e duas linhas
  // boas valem mais que nenhuma. Quem quiser escrever muito tem até 1200 — e é
  // por isso que o cartão ganhou "ver mais".
  //
  // Igual ao que as regras do Firestore exigem (ferramentas/firestore.rules).
  // Se mudar aqui, mudar lá: cliente mais permissivo que servidor viraria envio
  // recusado com 403 depois da pessoa já ter escrito.
  const MIN_TEXTO = 10;

  // Não há rascunho salvo no navegador, de propósito: o formulário abre sempre
  // em branco. O preço disso é que recarregar a página no meio perde o texto;
  // em troca ninguém encontra o formulário já preenchido com o que digitou
  // semanas antes (ou, em computador compartilhado, com o que outra pessoa
  // digitou). Se o ENVIO falhar o texto continua na tela e no botão de
  // WhatsApp — que é o caso em que perder de verdade doeria.

  // Mensagem de WhatsApp com o depoimento dentro. É a rota de fuga quando o
  // Firestore não responde — e é uma rota boa, porque WhatsApp já é o canal da
  // loja: o texto chega, só chega por outro cano.
  function linkZapFeedback(dados) {
    const loja = catalogo.loja;
    const f = loja.feedback || {};
    const corpo = [
      dados.texto,
      '',
      `— ${dados.nome}${dados.cidade ? ', ' + dados.cidade : ''}`,
      'Autorizo publicar no site e nas redes sociais.',
      // Link de wa.me só carrega texto. Se a pessoa tinha escolhido foto, ela
      // precisa anexar na mão — e precisa saber disso antes de mandar.
      dados.fotos?.length
        ? `(Tinha ${dados.fotos.length} foto(s) junto — dá pra anexar aqui na conversa.)`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
    const modelo = f.mensagemWhatsapp || 'Olá! Quero deixar um feedback:\n\n{depoimento}';
    const texto = String(modelo).replaceAll('{depoimento}', corpo);
    return 'https://wa.me/' + String(loja.whatsapp || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(texto);
  }

  function telaFeedback() {
    const f = catalogo.loja.feedback || {};
    // Sem peça: nem na URL, nem como campo. O depoimento vale pela história de
    // quem escreve, e amarrar a um slug só servia pra deixar o nome da peça
    // atravessado no link que vai por WhatsApp.
    return `
      <nav class="trilha" aria-label="Você está em"><a href="#/">Início</a><span>/</span>Deixar feedback</nav>

      <section class="secao feedback-pagina">
        <div class="feedback-marca">
          <img src="marca/logo-vertical.svg" alt="cafezim" width="132" height="132">
        </div>
        <div class="secao-topo"><h1>Que bom te ver por aqui!</h1></div>
        <p class="feedback-intro">
          Obrigado de verdade por comprar com a gente. Se a peça já está no seu cantinho,
          conta como ficou: o que você escreve aqui ajuda quem está decidindo muito mais
          do que qualquer texto nosso. Leva um minuto, e não precisa criar conta em
          lugar nenhum.
        </p>

        <form class="feedback-form" novalidate>
          <label class="feedback-campo">
            <span>Como podemos te chamar? <em>(aparece no site)</em></span>
            <input name="nome" type="text" required maxlength="60" autocomplete="name"
                   placeholder="Só o primeiro nome já está ótimo">
          </label>

          <label class="feedback-campo">
            <span>De onde você fala com a gente?</span>
            <input name="cidade" type="text" required maxlength="80" autocomplete="address-level2"
                   placeholder="Ex: Niterói, RJ">
          </label>

          <label class="feedback-campo">
            <span>Conta como ficou</span>
            <textarea name="texto" required rows="7" minlength="${MIN_TEXTO}" maxlength="1200"
                      placeholder="O que te fez escolher a peça, e como ela ficou no seu cantinho? Duas ou três linhas já fazem o nosso dia."></textarea>
            <small class="feedback-conta" data-conta aria-live="polite"></small>
          </label>

          <div class="feedback-campo">
            <span>Fotos da peça na sua casa <em>(opcional, até ${MAX_FOTOS})</em></span>
            <p class="feedback-dica">
              Essa é a parte que mais ajuda quem está decidindo: a peça na bancada de
              verdade, não na foto do catálogo. Manda do jeito que está — não precisa
              enquadrar, cortar nem arrumar a cozinha.
            </p>
            <label class="feedback-anexar">
              <!-- Escondido por recorte, e não pelo atributo hidden: hidden tira
                   o campo da ordem de tabulação e deixa o anexo inalcançável
                   por teclado. Assim ele continua focável, e o foco aparece na
                   borda do botão via :focus-within. -->
              <input name="fotos" type="file" accept="image/*" multiple class="so-leitor">
              <span class="botao botao-vazado">Escolher fotos</span>
            </label>
            <div class="feedback-previas" data-previas></div>
          </div>

          <label class="feedback-autorizo">
            <input name="autorizo" type="checkbox" required>
            <span>
              Autorizo o cafezim a publicar meu depoimento, minhas fotos, meu nome e
              minha cidade no site e nas redes sociais. Posso pedir a remoção quando
              quiser pelo WhatsApp.
            </span>
          </label>

          <div class="feedback-acoes">
            <button type="submit" class="botao botao-largo" data-enviar>Enviar meu depoimento</button>
          </div>

          <p class="feedback-aviso" data-aviso role="status" aria-live="polite"></p>
        </form>

        <p class="feedback-nota">
          Preferir mandar pelo WhatsApp, ou ficou com alguma dúvida? Fala com a gente
          <a href="${esc(linkZap(null))}" target="_blank" rel="noopener">por aqui</a> —
          a gente responde.
        </p>
      </section>
    `;
  }

  function ligarFormularioFeedback() {
    const form = main.querySelector('.feedback-form');
    if (!form) return;

    const aviso = form.querySelector('[data-aviso]');
    const botao = form.querySelector('[data-enviar]');
    const conta = form.querySelector('[data-conta]');
    const campoTexto = form.elements.texto;

    const dizer = (html, tipo) => {
      aviso.innerHTML = html;
      aviso.dataset.tipo = tipo;
    };

    const campoFotos = form.elements.fotos;
    const previas = form.querySelector('[data-previas]');

    // Cada item guarda o `arquivo` original junto do base64: quando a soma das
    // fotos estoura o orçamento do documento, todas são reapertadas a partir do
    // original — reapertar o que já foi apertado degrada duas vezes.
    let fotos = [];

    const somaFotos = () => fotos.reduce((t, f) => t + f.src.length, 0);

    const lerCampos = () => ({
      nome: form.elements.nome.value.trim(),
      cidade: form.elements.cidade.value.trim(),
      texto: campoTexto.value.trim(),
      fotos: fotos.map((f) => f.src),
    });

    function desenharPrevias() {
      previas.innerHTML = fotos
        .map(
          ({ src }, i) => `<figure class="feedback-previa">
            <img src="${src}" alt="Foto ${i + 1} que você escolheu">
            <button type="button" class="feedback-tirar" data-tirar="${i}"
                    aria-label="Tirar a foto ${i + 1}">&times;</button>
          </figure>`
        )
        .join('');
      previas.hidden = !fotos.length;
    }
    desenharPrevias();

    previas.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tirar]');
      if (!b) return;
      fotos.splice(Number(b.dataset.tirar), 1);
      desenharPrevias();
    });

    // Reaperta todas pela cota igual quando a soma estoura o orçamento do
    // documento. Apertar só a última deixaria uma foto borrada no meio de nove
    // boas — e o teto de 1 MiB é do documento, não de cada foto. Devolve os
    // nomes do que não deu pra encaixar nem na cota (panorâmica gigante).
    async function apertarAteCaber() {
      if (somaFotos() <= ORCAMENTO_TOTAL) return [];
      const cota = Math.floor(ORCAMENTO_TOTAL / fotos.length);
      const recusadas = [];
      for (const f of [...fotos]) {
        if (f.src.length <= cota) continue;
        try {
          f.src = await comprimirFoto(f.arquivo, cota);
        } catch {
          recusadas.push(f.arquivo.name);
          fotos.splice(fotos.indexOf(f), 1);
        }
      }
      return recusadas;
    }

    campoFotos?.addEventListener('change', async () => {
      const escolhidas = [...(campoFotos.files || [])];
      campoFotos.value = ''; // libera o mesmo arquivo pra ser escolhido de novo
      if (!escolhidas.length) return;

      const vagas = MAX_FOTOS - fotos.length;
      if (vagas <= 0) return dizer(`Já são ${MAX_FOTOS} fotos — tire uma pra trocar.`, 'erro');

      dizer('Preparando as fotos…', '');
      const recusadas = [];
      for (const arquivo of escolhidas.slice(0, vagas)) {
        try {
          fotos.push({ arquivo, src: await comprimirFoto(arquivo) });
        } catch {
          recusadas.push(arquivo.name);
        }
      }
      // Cada foto entra solta com o teto de uma foto; é a soma que precisa
      // caber no documento. Quem manda duas leva as duas grandes, quem manda
      // dez leva dez menores — e quem manda uma não paga pelas nove que não
      // mandou, que era o que uma cota fixa de 1/10 faria.
      for (const f of await apertarAteCaber()) recusadas.push(f);
      desenharPrevias();

      if (recusadas.length)
        dizer(
          `Não conseguimos usar ${recusadas.map((n) => esc(n)).join(', ')}. ` +
            'Tenta um print ou salvar como JPEG — e sem foto o depoimento vale igual, de verdade.',
          'erro'
        );
      else if (escolhidas.length > vagas)
        dizer(`Pegamos as ${vagas} primeiras — o limite é ${MAX_FOTOS} fotos.`, '');
      else dizer('', '');
    });

    // Campo vazio não mostra contador: "0 de 10 caracteres" num formulário que a
    // pessoa acabou de abrir é cobrança antes de ela começar.
    const atualizarConta = () => {
      const n = campoTexto.value.trim().length;
      conta.textContent = !n
        ? ''
        : n < MIN_TEXTO
          ? `${n} de ${MIN_TEXTO} caracteres no mínimo`
          : `${n} caracteres`;
      conta.classList.toggle('feedback-conta-curta', n > 0 && n < MIN_TEXTO);
    };
    atualizarConta();

    form.addEventListener('input', atualizarConta);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const dados = lerCampos();

      // Validação própria em vez de só confiar no `required`: a mensagem nativa
      // do navegador é um balãozinho que some, e aqui o erro precisa ficar na
      // tela junto com a saída de emergência.
      if (dados.nome.length < 2) return dizer('Como podemos te chamar? Falta o nome.', 'erro');
      if (dados.cidade.length < 2) return dizer('Falta a cidade — pode ser só a cidade e o estado.', 'erro');
      if (dados.texto.length < MIN_TEXTO)
        return dizer('Conta um pouquinho mais, pra dar pra entender a ideia.', 'erro');
      if (!form.elements.autorizo.checked)
        return dizer('Precisamos da sua autorização pra publicar o depoimento no site.', 'erro');

      botao.disabled = true;
      botao.textContent = 'Enviando…';
      dizer('', '');

      enviarAvaliacao(dados)
        .then(() => {
          medir('feedback_enviado');
          const f = catalogo.loja.feedback || {};
          main.querySelector('.feedback-pagina').innerHTML = `
            <div class="vazio">
              <img src="marca/mascote.svg" alt="" aria-hidden="true">
              <h2>Obrigado de verdade!</h2>
              <p>${esc(f.agradecimento || 'Recebemos seu depoimento. Ele entra no site depois de uma olhada nossa.')}</p>
              <a class="botao botao-vazado" href="#/">Voltar ao catálogo</a>
            </div>`;
        })
        .catch((erro) => {
          // Nunca perder o depoimento é mais importante do que gravar no
          // Firestore. Falhou a gravação (offline, regra, projeto fora, bloqueio
          // de rastreador): o texto fica na tela, intacto, e o aviso vira um
          // link de WhatsApp com ele inteiro dentro, pronto pra mandar.
          botao.disabled = false;
          botao.textContent = 'Tentar enviar de novo';
          medir('feedback_falhou', { motivo: String(erro?.message || erro).slice(0, 80) });
          dizer(
            `Não conseguimos salvar agora — seu texto está guardado aqui, não se perdeu.
             <a class="botao botao-zap feedback-escape" href="${esc(linkZapFeedback(dados))}"
                target="_blank" rel="noopener">Mandar pelo WhatsApp</a>`,
            'erro'
          );
        });
    });
  }

  // Piada sorteada a cada erro. Página de erro é o único lugar do site onde a
  // pessoa chegou sem querer: ou ela ri e fica, ou fecha a aba. Sortear em vez
  // de fixar uma frase é de graça e rende a quem bate aqui duas vezes.
  const PIADAS_404 = [
    'Essa página passou direto pelo filtro.',
    'Procuramos na bancada, no armário e atrás da máquina. Nada.',
    'A água ferveu, mas não tinha pó nenhum aqui.',
    'Essa página saiu pra tomar um café e até agora não voltou.',
    'Nem com dose dupla a gente achou essa página.',
    'Moemos o grão, passamos na prensa e veio só água quente.',
  ];

  function telaNaoEncontrado(mensagem) {
    const piada = PIADAS_404[Math.floor(Math.random() * PIADAS_404.length)];
    // Pode ser chamada com o catálogo ainda não carregado (falha de rede no
    // dados/catalogo.js): sem ele, nada de botão de WhatsApp nem de sugestões.
    const temCatalogo = !!(catalogo && catalogo.loja);
    const sugestoes = temCatalogo ? catalogo.produtos.filter((p) => p.destaque).slice(0, 4) : [];
    return `<div class="vazio erro">
      <div class="erro-arte" aria-hidden="true">
        <span class="erro-numero">404</span>
        <img class="erro-mascote" src="marca/mascote.svg" alt="">
      </div>
      <h2>Xícara vazia.</h2>
      <p class="erro-piada">${esc(piada)}</p>
      <p class="erro-motivo">${esc(mensagem)}</p>
      <div class="erro-acoes">
        <a class="botao" href="#/">Voltar ao início</a>
        ${
          temCatalogo
            ? `<a class="botao botao-zap" href="${linkZap(null)}" target="_blank" rel="noopener">
                 ${SVG_ZAP} Falar no WhatsApp
               </a>`
            : ''
        }
      </div>
    </div>
    ${
      sugestoes.length
        ? `<section class="secao">
            <div class="secao-topo"><h2>Já que você está por aqui</h2></div>
            ${grade(sugestoes)}
          </section>`
        : ''
    }`;
  }

  function telaCarrinho() {
    if (!carrinho.length) {
      return `
        <nav class="trilha" aria-label="Você está em"><a href="#/">Início</a><span>/</span>Carrinho</nav>
        <div class="vazio">
          <img src="marca/mascote-compacto.svg" alt="" aria-hidden="true">
          <h2>Seu carrinho está vazio</h2>
          <p>Adicione peças do catálogo pra montar seu pedido.</p>
          <a class="botao botao-vazado" href="#/">Ver o catálogo</a>
        </div>
      `;
    }

    const linhas = carrinho
      .map((it, i) => {
        const p = porSlug(catalogo.produtos, it.slug);
        const foto = p?.fotos?.[0];
        const escolhaTexto = [
          it.cor,
          ...Object.entries(it.cores || {})
            .filter(([, v]) => v)
            .map(([parte, v]) => `${parte}: ${v}`),
          ...Object.entries(it.opcoes || {})
            .filter(([, v]) => v)
            .map(([t, v]) => `${t}: ${v}`),
        ]
          .filter(Boolean)
          .join(' · ');
        return `
          <li class="carrinho-item" data-item="${i}">
            <a class="carrinho-foto" href="#/p/${esc(it.slug)}">${
              foto ? `<img src="${esc(foto)}" alt="" loading="lazy">` : semFoto(it.nome)
            }</a>
            <div class="carrinho-detalhe">
              <a class="carrinho-nome" href="#/p/${esc(it.slug)}">${esc(it.nome)}</a>
              ${escolhaTexto ? `<p class="carrinho-opcoes">${esc(escolhaTexto)}</p>` : ''}
              <div class="contador contador-pequeno">
                <button type="button" class="contador-botao" data-carrinho-passo="-1" aria-label="Diminuir quantidade">−</button>
                <span class="contador-campo" aria-live="polite">${it.quantidade}</span>
                <button type="button" class="contador-botao" data-carrinho-passo="1" aria-label="Aumentar quantidade">+</button>
              </div>
            </div>
            <div class="carrinho-preco">
              <span>${it.preco != null ? moeda.format(it.preco * it.quantidade) : 'Consultar'}</span>
              ${
                it.preco != null && it.quantidade > 1
                  ? `<small class="carrinho-unitario">${moeda.format(it.preco)} cada</small>`
                  : ''
              }
              <button type="button" class="carrinho-remover" data-carrinho-remover aria-label="Remover ${esc(it.nome)} do carrinho">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
              </button>
            </div>
          </li>
        `;
      })
      .join('');

    const pecas = quantidadeCarrinho();
    // Duas colunas no desktop, como em qualquer loja: a lista rola à esquerda e
    // o resumo fica grudado à direita, com o botão sempre à vista. Antes a lista
    // ocupava a largura inteira e o total vinha solto embaixo, centralizado —
    // quem tinha cinco itens perdia o botão de vista ao conferir o quinto.
    return `
      <nav class="trilha" aria-label="Você está em"><a href="#/">Início</a><span>/</span>Carrinho</nav>
      <section class="secao carrinho">
        <div class="secao-topo">
          <h2>Seu carrinho</h2>
          <a class="ver-tudo" href="#/">Continuar comprando</a>
        </div>
        <div class="carrinho-corpo">
          <ul class="carrinho-lista">${linhas}</ul>
          <aside class="carrinho-resumo" aria-label="Resumo do pedido">
            <h3 class="carrinho-resumo-titulo">Resumo do pedido</h3>
            <dl class="carrinho-contas">
              <div>
                <dt>Subtotal (${pecas} ${pecas === 1 ? 'peça' : 'peças'})</dt>
                <dd data-resumo-subtotal>${moeda.format(totalCarrinho())}</dd>
              </div>
              <div>
                <dt>Frete</dt>
                <dd data-resumo-frete class="carrinho-conta-fraca">calcule pelo CEP</dd>
              </div>
            </dl>
            ${blocoFrete()}
            <p class="carrinho-total">Total <strong data-resumo-total>${moeda.format(totalCarrinho())}</strong></p>
            <a class="botao botao-zap botao-largo" data-zap-carrinho href="${linkZapCarrinho()}" target="_blank" rel="noopener">
              ${SVG_ZAP} Finalizar no WhatsApp
            </a>
            <p class="compra-nota">${esc(
              catalogo.loja.avisoCarrinho || catalogo.loja.avisoPreco || ''
            )}</p>
          </aside>
        </div>
      </section>
    `;
  }

  // Mantém o resumo em dia quando a pessoa escolhe (ou troca) o frete. Roda
  // pelo `aoMudar` do bloco de frete, o mesmo gancho que atualiza o link do
  // WhatsApp — nenhum re-render, só os três números.
  function atualizarResumoCarrinho() {
    const alvoFrete = main.querySelector('[data-resumo-frete]');
    const alvoTotal = main.querySelector('[data-resumo-total]');
    if (!alvoFrete || !alvoTotal) return;
    if (freteEscolhido) {
      alvoFrete.textContent = moeda.format(freteEscolhido.preco);
      alvoFrete.classList.remove('carrinho-conta-fraca');
    } else {
      alvoFrete.textContent = 'calcule pelo CEP';
      alvoFrete.classList.add('carrinho-conta-fraca');
    }
    alvoTotal.textContent = moeda.format(totalComFrete());
  }

  function ligarCarrinho() {
    const lista = main.querySelector('.carrinho-lista');
    if (!lista) return;

    lista.addEventListener('click', (e) => {
      const linha = e.target.closest('[data-item]');
      if (!linha) return;
      const i = Number(linha.dataset.item);

      if (e.target.closest('[data-carrinho-remover]')) {
        removerDoCarrinho(i);
        redesenharCarrinho();
        return;
      }
      const passo = e.target.closest('[data-carrinho-passo]');
      if (passo) {
        definirQuantidadeCarrinho(i, carrinho[i].quantidade + Number(passo.dataset.carrinhoPasso));
        redesenharCarrinho();
      }
    });
  }

  // Re-render só da tela do carrinho, sem passar pelo roteador (o hash não muda
  // ao tirar/ajustar item, então desenhar() normal ignoraria por estar na mesma rota).
  function redesenharCarrinho() {
    main.innerHTML = telaCarrinho();
    ligarCarrinho();
    ligarFreteCarrinho();
  }

  /* ---------- Frete (SuperFrete) ------------------------------------------- */

  // Chama o SuperFrete direto do navegador — decisão deliberada de não usar
  // backend nenhum (Function/Worker). O token abaixo fica legível pra qualquer
  // pessoa que abra o DevTools ou o histórico do git deste repositório público,
  // e de lá não sai mais.
  //
  // O que ele expõe, verificado contra a API (não é suposição):
  //   - GET /api/v0/user responde 200 com o cadastro da conta: nome completo,
  //     telefone e e-mail. Confirmado.
  //   - O SuperFrete não emite token restrito a cotação. A tela de integração
  //     tem um token só, sem escopo. Logo este é um token de conta e a hipótese
  //     padrão é que também cria etiqueta e gasta saldo da carteira.
  //
  // Mitigação em uso: manter a carteira SuperFrete zerada e só recarregar na
  // hora de comprar cada etiqueta. Sem saldo não há etiqueta a ser criada por
  // terceiros. Se um dia a carteira passar a ficar com saldo parado, este
  // token vira exposição financeira real e aí precisa de um proxy guardando
  // o segredo.
  const SUPERFRETE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3OTQyMzIyMDYsInN1YiI6ImNUTXdKVEhJZFZOUThPZ2lFQmtvclAyT21UQzIifQ.8tqETixgNADjFZ1q-VCB79dD-WSpuPn5H4xZ600X2lY';
  const SUPERFRETE_URL = 'https://api.superfrete.com/api/v0/calculator';
  const CEP_ORIGEM = '25745122';
  const SERVICOS_FRETE = '1,2,17,3,31,33';
  const CHAVE_CEP_FRETE = 'cafezim-cep-frete';
  const cacheFrete = new Map();

  async function cotarCaixa(cepDestino, caixa) {
    const resposta = await fetch(SUPERFRETE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${SUPERFRETE_TOKEN}`,
        'User-Agent': 'cafezim (marinhoesathler@gmail.com)',
      },
      body: JSON.stringify({
        from: { postal_code: CEP_ORIGEM },
        to: { postal_code: cepDestino },
        services: SERVICOS_FRETE,
        package: {
          weight: caixa.pesoGramas / 1000,
          height: Math.max(caixa.alturaCm, 0.4),
          width: Math.max(caixa.larguraCm, 6),
          length: Math.max(caixa.comprimentoCm, 11),
        },
      }),
    });
    const dados = await resposta.json().catch(() => null);
    if (!resposta.ok) throw new Error(dados?.message || 'Não foi possível calcular o frete agora.');
    return (Array.isArray(dados) ? dados : []).filter((o) => !o.has_error && o.price != null);
  }

  async function calcularFrete(cepDestino, itens) {
    const chave = cepDestino + '|' + JSON.stringify(itens);
    if (cacheFrete.has(chave)) return cacheFrete.get(chave);

    // Cota cada arranjo e fica com o menor preço de cada modalidade. Um arranjo
    // que falhe (ou que a transportadora recuse por formato) não derruba os
    // outros — só não contribui.
    const respostas = await Promise.allSettled(
      caixasCandidatas(itens).map((c) => cotarCaixa(cepDestino, c))
    );
    const erro = respostas.every((r) => r.status === 'rejected');
    if (erro) throw respostas[0].reason;

    const melhorPorServico = new Map();
    for (const r of respostas) {
      if (r.status !== 'fulfilled') continue;
      for (const o of r.value) {
        const atual = melhorPorServico.get(o.name);
        if (!atual || Number(o.price) < atual.preco) {
          melhorPorServico.set(o.name, {
            nome: o.name,
            transportadora: o.company?.name || null,
            prazoDias: o.delivery_time ?? o.delivery_range?.max ?? null,
            preco: Number(o.price),
          });
        }
      }
    }

    const opcoes = [...melhorPorServico.values()].sort((a, b) => a.preco - b.preco);
    cacheFrete.set(chave, opcoes);
    return opcoes;
  }

  function cepSalvo() {
    try { return localStorage.getItem(CHAVE_CEP_FRETE) || ''; } catch { return ''; }
  }

  function salvarCep(cep) {
    try { localStorage.setItem(CHAVE_CEP_FRETE, cep); } catch {}
  }

  function maskCep(valor) {
    const d = String(valor).replace(/\D/g, '').slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  }

  function diasUteis(n) {
    if (n == null) return '';
    return n === 1 ? 'até 1 dia útil' : `até ${n} dias úteis`;
  }

  function blocoFrete() {
    return `
      <div class="frete" data-frete>
        <div class="frete-linha">
          <!-- size="9" não é decoração: a largura intrínseca de um input é a do
               atributo size (20 caracteres por padrão), e é ela que entra na
               conta de min-content da coluna. Com o padrão, a linha do CEP não
               cabia na caixa de resumo do carrinho e vazava pra fora dela. -->
          <input type="text" inputmode="numeric" class="frete-cep" data-frete-cep size="9"
                 placeholder="00000-000" maxlength="9" aria-label="CEP de destino para calcular o frete">
          <button type="button" class="botao botao-vazado frete-botao" data-frete-calcular>Calcular frete</button>
        </div>
        <div class="frete-resultado" data-frete-resultado aria-live="polite"></div>
      </div>
    `;
  }

  // `lista` é [{produto, quantidade}]. Volta null se algum produto não tem
  // peso/dimensão cadastrados — melhor avisar do que cotar frete errado.
  function itensParaFrete(lista) {
    const itens = [];
    for (const { produto, quantidade } of lista) {
      const envio = produto?.envio;
      if (!envio?.pesoGramas || !envio?.alturaCm || !envio?.larguraCm || !envio?.comprimentoCm) return null;
      itens.push({
        pesoGramas: envio.pesoGramas,
        alturaCm: envio.alturaCm,
        larguraCm: envio.larguraCm,
        comprimentoCm: envio.comprimentoCm,
        quantidade,
      });
    }
    return itens;
  }

  // As peças não vão soltas: vão numa caixa só com plástico bolha. Então o
  // pedido inteiro vira UMA caixa combinada, não uma cotação por peça.
  //
  // Cada peça entra DEITADA — a menor das três medidas é que empilha, as duas
  // maiores formam o chão da caixa. É como se embala de verdade (ninguém põe
  // uma plaquinha de pé numa caixa) e é o que mantém o pedido dentro do Mini
  // Envios, que exige altura até 4cm e sai ~22% mais barato que o PAC. Os
  // campos alturaCm/larguraCm/comprimentoCm do catálogo são só os três eixos
  // do modelo, em ordem arbitrária — por isso ordena aqui em vez de confiar
  // no nome do campo.
  //
  // Margem menor na altura que no chão: peça fina não vira pacote de 4,4cm,
  // vira ~2,9cm com o bolha (bolha ~1cm + papelão ~0,6cm). Nas laterais o
  // bolha sobra mais, daí os 3cm.
  const MARGEM_ALTURA_CM = 1.5;
  const MARGEM_CHAO_CM = 3;
  const PESO_EMBALAGEM_GRAMAS = 50;

  // Monta a caixa para um arranjo dado: nx peças lado a lado na largura e ny
  // no comprimento, antes de começar uma camada nova. nx=ny=1 é a torre pura.
  function caixaComArranjo(itens, nx, ny) {
    let largura = 0;
    let comprimento = 0;
    let peso = PESO_EMBALAGEM_GRAMAS;
    for (const it of itens) {
      const [, medio, maior] = [it.alturaCm, it.larguraCm, it.comprimentoCm].sort((a, b) => a - b);
      largura = Math.max(largura, medio * nx);
      comprimento = Math.max(comprimento, maior * ny);
      peso += it.pesoGramas * it.quantidade;
    }

    // Quantas peças de cada tipo cabem numa camada deste chão, e quantas
    // camadas isso exige. Peça grande num chão pequeno cai em 1 por camada.
    let altura = 0;
    for (const it of itens) {
      const [menor, medio, maior] = [it.alturaCm, it.larguraCm, it.comprimentoCm].sort((a, b) => a - b);
      const porCamada = Math.max(
        1,
        Math.floor(largura / medio) * Math.floor(comprimento / maior)
      );
      altura += Math.ceil(it.quantidade / porCamada) * menor;
    }

    return {
      pesoGramas: peso,
      alturaCm: altura + MARGEM_ALTURA_CM,
      larguraCm: largura + MARGEM_CHAO_CM,
      comprimentoCm: comprimento + MARGEM_CHAO_CM,
    };
  }

  // Um mesmo pedido cabe em caixas de formatos diferentes, e o formato muda o
  // preço: o Mini Envios, o mais barato, só aceita até 4cm de altura. Quatro
  // cortadores empilhados dão 5,9cm e perdem a modalidade; os mesmos quatro
  // lado a lado dão 3,7cm e ganham — a diferença passa de R$3 no bolso de quem
  // compra. Como as regras de aceitação são de cada transportadora e mudam sem
  // aviso, não vale replicá-las aqui: o código monta alguns arranjos plausíveis
  // e deixa a cotação dizer qual sai melhor.
  function caixasCandidatas(itens) {
    const vistas = new Set();
    let caixas = [];
    for (const [nx, ny] of [[1, 1], [1, 2], [2, 1], [2, 2], [1, 3], [3, 1]]) {
      const c = caixaComArranjo(itens, nx, ny);
      const assinatura = [c.alturaCm, c.larguraCm, c.comprimentoCm].map((v) => v.toFixed(1)).join('x');
      if (vistas.has(assinatura)) continue;
      vistas.add(assinatura);
      caixas.push(c);
    }

    // Espalhar nem sempre encurta a pilha: quando o pedido é pequeno, a altura
    // já é a mínima e o chão só cresce à toa. Caixa que perde nas três medidas
    // pra outra não tem como sair mais barata — fora, pra não gastar chamada.
    const dominada = (a, b) =>
      b.alturaCm <= a.alturaCm && b.larguraCm <= a.larguraCm && b.comprimentoCm <= a.comprimentoCm &&
      (b.alturaCm < a.alturaCm || b.larguraCm < a.larguraCm || b.comprimentoCm < a.comprimentoCm);
    caixas = caixas.filter((a) => !caixas.some((b) => dominada(a, b)));

    return caixas;
  }

  // Mantida para o resto do código (e os testes) que pedem "a" caixa do pedido:
  // é o arranjo conservador, tudo empilhado.
  function caixaCombinada(itens) {
    return caixaComArranjo(itens, 1, 1);
  }

  // A pessoa escolhe qual frete quer — fica marcado e entra na mensagem do
  // WhatsApp. Zera a cada novo cálculo (CEP ou itens mudaram).
  let freteEscolhido = null;

  function renderizarOpcoesFrete(opcoes) {
    if (!opcoes.length) return '<p class="frete-erro">Nenhuma opção de frete pra esse CEP.</p>';
    return `<ul class="frete-opcoes" role="radiogroup" aria-label="Opções de frete">${opcoes
      .map(
        (o, i) => `
        <li>
          <button type="button" class="frete-opcao" role="radio"
                  aria-checked="${o === freteEscolhido}" data-frete-opcao="${i}">
            <span class="frete-opcao-nome">${esc(o.nome)}${
              o.transportadora ? ` <small>(${esc(o.transportadora)})</small>` : ''
            }</span>
            <span class="frete-opcao-prazo">${esc(diasUteis(o.prazoDias))}</span>
            <span class="frete-opcao-preco">${moeda.format(o.preco)}</span>
          </button>
        </li>`
      )
      .join('')}</ul>`;
  }

  // Linha pra entrar no pedido do WhatsApp — vazia se nada foi escolhido ainda.
  function textoFrete() {
    if (!freteEscolhido) return '';
    const transp = freteEscolhido.transportadora ? ` (${freteEscolhido.transportadora})` : '';
    return `• Frete: ${freteEscolhido.nome}${transp} — ${moeda.format(freteEscolhido.preco)} — ${diasUteis(freteEscolhido.prazoDias)}`;
  }

  // `obterLista()` lê a escolha/carrinho no momento do clique, não no momento
  // em que o bloco foi desenhado — assim quantidade atualizada sempre entra.
  // `aoMudar()`, se passado, roda toda vez que a seleção de frete muda — usado
  // pra manter o link do WhatsApp (que é montado uma vez só no HTML) sincronizado.
  function ligarFrete(raiz, obterLista, aoMudar) {
    const caixa = raiz.querySelector('[data-frete]');
    if (!caixa) return;
    const campoCep = caixa.querySelector('[data-frete-cep]');
    const botao = caixa.querySelector('[data-frete-calcular]');
    const resultado = caixa.querySelector('[data-frete-resultado]');

    campoCep.value = cepSalvo();
    campoCep.addEventListener('input', () => { campoCep.value = maskCep(campoCep.value); });
    freteEscolhido = null;
    aoMudar?.();

    async function executar() {
      const cep = campoCep.value.replace(/\D/g, '');
      if (cep.length !== 8) {
        freteEscolhido = null;
        resultado.innerHTML = '<p class="frete-erro">Digite um CEP válido.</p>';
        aoMudar?.();
        return;
      }
      salvarCep(campoCep.value);

      const itens = itensParaFrete(obterLista());
      if (!itens) {
        freteEscolhido = null;
        resultado.innerHTML =
          '<p class="frete-erro">Ainda não temos as dimensões cadastradas pra calcular esse frete. Fala com a gente no WhatsApp.</p>';
        aoMudar?.();
        return;
      }

      botao.disabled = true;
      freteEscolhido = null;
      resultado.innerHTML = '<p class="frete-carregando">Calculando…</p>';
      try {
        const opcoes = await calcularFrete(cep, itens);
        freteEscolhido = opcoes[0] || null; // mais barato já vem marcado; a pessoa pode trocar.
        resultado.innerHTML = renderizarOpcoesFrete(opcoes);
      } catch (erro) {
        resultado.innerHTML = `<p class="frete-erro">${esc(erro.message || 'Não foi possível calcular o frete agora.')}</p>`;
      } finally {
        botao.disabled = false;
        aoMudar?.();
      }
    }

    botao.addEventListener('click', executar);
    campoCep.addEventListener('keydown', (e) => { if (e.key === 'Enter') executar(); });

    resultado.addEventListener('click', (e) => {
      const item = e.target.closest('[data-frete-opcao]');
      if (!item) return;
      const opcoesAtuais = cacheFrete.get(campoCep.value.replace(/\D/g, '') + '|' + JSON.stringify(itensParaFrete(obterLista())));
      freteEscolhido = opcoesAtuais?.[Number(item.dataset.freteOpcao)] || freteEscolhido;
      resultado.querySelectorAll('[data-frete-opcao]').forEach((b) => {
        b.setAttribute('aria-checked', String(Number(b.dataset.freteOpcao) === Number(item.dataset.freteOpcao)));
      });
      aoMudar?.();
    });
  }

  function ligarFreteCarrinho() {
    const linkZap = () => main.querySelector('[data-zap-carrinho]');
    ligarFrete(
      main,
      () => carrinho.map((it) => ({ produto: porSlug(catalogo.produtos, it.slug), quantidade: it.quantidade })),
      () => {
        const a = linkZap();
        if (a) a.href = linkZapCarrinho();
        atualizarResumoCarrinho();
      }
    );
  }

  /* ---------- Seletores do pedido ------------------------------------------ */

  // Cada escolha recalcula preço e total na hora, pra quando a pessoa adicionar
  // ao carrinho o item já ir com a quantidade, cor e opção certas.
  function ligarSeletores(p) {
    const caixa = main.querySelector('[data-escolhas]');
    if (!caixa) return;
    const total = main.querySelector('[data-total]');
    const campo = caixa.querySelector('#quantidade');
    const botaoCarrinho = main.querySelector('[data-adicionar-carrinho]');

    botaoCarrinho?.addEventListener('click', () => {
      adicionarAoCarrinho(p);
      const precoAdd = precoAtual(p);
      medir('add_to_cart', {
        currency: 'BRL',
        ...(precoAdd != null && { value: precoAdd * escolha.quantidade }),
        items: [itemMedido(p, escolha.quantidade)],
      });
      const rotuloOriginal = botaoCarrinho.innerHTML;
      botaoCarrinho.disabled = true;
      botaoCarrinho.innerHTML = 'Adicionado ✓';
      setTimeout(() => {
        botaoCarrinho.innerHTML = rotuloOriginal;
        botaoCarrinho.disabled = false;
      }, 1400);
    });

    const mostrador = main.querySelector('[data-preco]');

    function atualizar() {
      const preco = precoAtual(p);
      if (mostrador) mostrador.innerHTML = precoHtml(p);
      if (preco != null && escolha.quantidade > 1) {
        total.textContent = `${escolha.quantidade} × ${moeda.format(preco)} = ${moeda.format(
          preco * escolha.quantidade
        )}`;
        total.hidden = false;
      } else {
        total.hidden = true;
      }
    }

    caixa.addEventListener('click', (e) => {
      const opcao = e.target.closest('.opcao');
      if (opcao) {
        const grupo = opcao.closest('.escolha');
        grupo.querySelectorAll('.opcao').forEach((b) => b.setAttribute('aria-checked', String(b === opcao)));
        const nome = grupo.dataset.grupo;
        if (nome === 'cor') escolha.cor = opcao.dataset.valor;
        else if (nome === 'cor-parte') escolha.cores[grupo.dataset.parte] = opcao.dataset.valor;
        else escolha.opcoes[nome] = opcao.dataset.valor;
        atualizar();
        return;
      }
      const passo = e.target.closest('.contador-botao');
      if (passo) {
        campo.value = Math.min(99, Math.max(1, escolha.quantidade + Number(passo.dataset.passo)));
        campo.dispatchEvent(new Event('input'));
      }
    });

    campo.addEventListener('input', () => {
      const n = Math.min(99, Math.max(1, Math.floor(Number(campo.value) || 1)));
      campo.value = n;
      escolha.quantidade = n;
      atualizar();
    });

    // Setas do teclado andam entre as opções do grupo, como num radiogroup.
    caixa.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      const atual = e.target.closest('.opcao');
      if (!atual) return;
      e.preventDefault();
      const irmaos = [...atual.closest('.escolha').querySelectorAll('.opcao')];
      const passo = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
      const proximo = irmaos[(irmaos.indexOf(atual) + passo + irmaos.length) % irmaos.length];
      proximo.focus();
      proximo.click();
    });

    atualizar();
  }

  /* ---------- Carrossel --------------------------------------------------- */

  function ligarCarrossel(raiz) {
    const trilho = raiz.querySelector('.trilho');
    const quadros = [...raiz.querySelectorAll('.quadro')];
    const ant = raiz.querySelector('.seta-ant');
    const prox = raiz.querySelector('.seta-prox');
    const minis = [...raiz.querySelectorAll('.miniatura')];
    if (quadros.length < 2) return;

    let atual = 0;

    const irPara = (i) => {
      atual = Math.max(0, Math.min(quadros.length - 1, i));
      trilho.scrollTo({ left: quadros[atual].offsetLeft, behavior: 'smooth' });
    };

    const sincronizar = () => {
      const i = Math.round(trilho.scrollLeft / trilho.clientWidth);
      if (i === atual) return;
      atual = i;
      if (ant) ant.disabled = atual === 0;
      if (prox) prox.disabled = atual === quadros.length - 1;
      minis.forEach((m, j) => m.setAttribute('aria-current', String(j === atual)));
    };

    let agendado;
    trilho.addEventListener('scroll', () => {
      cancelAnimationFrame(agendado);
      agendado = requestAnimationFrame(sincronizar);
    }, { passive: true });

    ant?.addEventListener('click', () => irPara(atual - 1));
    prox?.addEventListener('click', () => irPara(atual + 1));
    minis.forEach((m) => m.addEventListener('click', () => irPara(Number(m.dataset.ir))));

    trilho.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); irPara(atual + 1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); irPara(atual - 1); }
    });

    // O vídeo do YouTube só vira iframe quando alguém pede: nada dele carrega antes disso.
    raiz.querySelector('.video-play')?.addEventListener('click', (e) => {
      const caixa = e.currentTarget.closest('.video');
      const id = caixa.dataset.video;
      caixa.innerHTML =
        `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1"
          title="Vídeo do produto" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen></iframe>`;
    });
  }

  /* ---------- Carrossel de depoimentos ------------------------------------ */

  const PAUSA_AVALIACAO = 7000; // ms que um depoimento fica na tela sozinho

  // Troca por rolagem com snap, igual ao carrossel de fotos: o dedo arrasta de
  // graça no celular e o teclado continua tendo setas. A troca automática
  // existe pra o segundo depoimento aparecer sem ninguém clicar — então ela
  // para no primeiro sinal de que a pessoa está lendo (mouse em cima, foco
  // dentro, texto aberto no "ver mais", foto em tela cheia) e com a aba em
  // segundo plano, pra não voltar meia hora depois num depoimento qualquer.
  function ligarAvaliacoes(raiz) {
    const trilho = raiz.querySelector('.avaliacao-trilho');
    const quadros = [...raiz.querySelectorAll('.avaliacao-quadro')];
    const pontos = [...raiz.querySelectorAll('.avaliacao-ponto')];
    const ant = raiz.querySelector('.avaliacao-seta-ant');
    const prox = raiz.querySelector('.avaliacao-seta-prox');
    if (quadros.length < 2) return;

    const semAnimacao = window.matchMedia('(prefers-reduced-motion: reduce)');
    let atual = 0;
    let lendoAgora = false;

    const marcar = () => {
      pontos.forEach((p, i) => {
        if (i === atual) p.setAttribute('aria-current', 'true');
        else p.removeAttribute('aria-current');
      });
    };

    const irPara = (i) => {
      atual = (i + quadros.length) % quadros.length;
      trilho.scrollTo({
        left: atual * trilho.clientWidth,
        behavior: semAnimacao.matches ? 'auto' : 'smooth',
      });
      marcar();
    };

    // Rolagem na mão (dedo, trackpad) também move as bolinhas.
    let agendado;
    trilho.addEventListener('scroll', () => {
      cancelAnimationFrame(agendado);
      agendado = requestAnimationFrame(() => {
        const i = Math.round(trilho.scrollLeft / trilho.clientWidth);
        if (i === atual || !quadros[i]) return;
        atual = i;
        marcar();
      });
    }, { passive: true });

    // Quem está lendo não quer o cartão trocando debaixo do olho.
    const pausado = () =>
      lendoAgora ||
      document.hidden ||
      document.body.classList.contains('sem-rolagem') || // foto em tela cheia
      !!raiz.querySelector('.avaliacao-vermais[aria-expanded="true"]');

    let relogio = 0;
    const passo = () => {
      // A home é redesenhada a cada rota: sem isto o intervalo seguiria batendo
      // em nós já descartados, um por navegação.
      if (!raiz.isConnected) { clearInterval(relogio); return; }
      if (!pausado()) irPara(atual + 1);
    };
    // Depois de um clique, o relógio recomeça: trocar meio segundo depois de a
    // pessoa escolher um depoimento é desfazer o que ela pediu.
    const adiar = () => {
      if (semAnimacao.matches) return;
      clearInterval(relogio);
      relogio = setInterval(passo, PAUSA_AVALIACAO);
    };

    ['pointerenter', 'focusin'].forEach((e) =>
      raiz.addEventListener(e, () => { lendoAgora = true; })
    );
    ['pointerleave', 'focusout'].forEach((e) =>
      raiz.addEventListener(e, () => { lendoAgora = false; })
    );

    ant?.addEventListener('click', () => { irPara(atual - 1); adiar(); });
    prox?.addEventListener('click', () => { irPara(atual + 1); adiar(); });
    pontos.forEach((p) =>
      p.addEventListener('click', () => { irPara(Number(p.dataset.ir)); adiar(); })
    );
    trilho.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); irPara(atual + 1); adiar(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); irPara(atual - 1); adiar(); }
    });

    adiar();
  }

  /* ---------- Roteador ---------------------------------------------------- */

  // Segmento da URL do formulário de feedback. Vem do catálogo porque é pra ser
  // trocável: não há link pra ele em lugar nenhum do site, o endereço é mandado
  // por WhatsApp pra quem comprou, e um segmento que ninguém adivinha evita
  // robô achando o formulário por tentativa.
  //
  // Isso é obscuridade, não segurança — quem receber o link pode repassar. O
  // que de fato protege continua sendo as regras do Firestore: depoimento nasce
  // com `aprovado: false` e só aparece no site depois que você aprova.
  const rotaFeedback = () => catalogo.loja.feedback?.rota || 'feedback';

  function rota() {
    const h = location.hash.replace(/^#\/?/, '');
    const [tipo, ...resto] = h.split('/');
    const arg = decodeURIComponent(resto.join('/') || '');
    if (tipo === 'c') return { tela: 'categoria', arg };
    if (tipo === 'p') return { tela: 'produto', arg };
    if (tipo === 'busca') return { tela: 'busca', arg };
    if (tipo === 'carrinho') return { tela: 'carrinho', arg: '' };
    if (tipo === rotaFeedback()) return { tela: 'feedback', arg };
    return { tela: 'inicio', arg: '' };
  }

  function titulo({ tela, arg }) {
    const nome = catalogo.loja.nome;
    if (tela === 'produto') {
      const p = porSlug(catalogo.produtos, arg);
      return p ? `${p.nome} — ${nome}` : `${nome}`;
    }
    if (tela === 'categoria') {
      const c = porSlug(catalogo.categorias, arg);
      return c ? `${c.nome} — ${nome}` : nome;
    }
    if (tela === 'busca') return `“${arg}” — ${nome}`;
    if (tela === 'carrinho') return `Carrinho — ${nome}`;
    if (tela === 'feedback') return `Deixar feedback — ${nome}`;
    return `${nome} — peças para o seu cantinho do café`;
  }

  let ultimaChave = '';

  function desenhar(rolarTopo = true) {
    const r = rota();
    const chaveAtual = r.tela + '|' + r.arg + '|' + (catalogo.versao || '');
    if (chaveAtual === ultimaChave) return;
    ultimaChave = chaveAtual;

    main.innerHTML =
      r.tela === 'produto'   ? telaProduto(r.arg)   :
      r.tela === 'categoria' ? telaCategoria(r.arg) :
      r.tela === 'busca'     ? telaBusca(r.arg)     :
      r.tela === 'carrinho'  ? telaCarrinho()       :
      r.tela === 'feedback'  ? telaFeedback()      :
                               telaInicio();

    document.title = titulo(r);
    document.body.dataset.tela = r.tela;

    medir('page_view', {
      page_title: document.title,
      page_location: location.href,
      tela: r.tela,
    });
    if (r.tela === 'produto') {
      const vista = porSlug(catalogo.produtos, r.arg);
      if (vista) {
        const preco = precoAtual(vista);
        medir('view_item', {
          currency: 'BRL',
          ...(preco != null && { value: preco }),
          items: [itemMedido(vista)],
        });
      }
    }
    if (r.tela === 'busca' && r.arg) medir('search', { search_term: r.arg });
    main.querySelectorAll('[data-carrossel]').forEach(ligarCarrossel);
    ligarVerMais(main);
    // Depois do ligarVerMais: a altura do trilho depende do texto já recortado.
    main.querySelectorAll('[data-avaliacoes]').forEach(ligarAvaliacoes);
    if (r.tela === 'produto') {
      const p = porSlug(catalogo.produtos, r.arg);
      if (p) { zerarEscolha(p); ligarSeletores(p); }
    }
    if (r.tela === 'carrinho') { ligarCarrinho(); ligarFreteCarrinho(); }
    if (r.tela === 'feedback') ligarFormularioFeedback();

    // Marca a categoria aberta no menu.
    const alvo = r.tela === 'categoria' ? `#/c/${r.arg}` : r.tela === 'inicio' ? '#/' : '';
    document.querySelectorAll('.menu a').forEach((a) => {
      const ativo = a.getAttribute('href') === alvo;
      a.toggleAttribute('aria-current', ativo);
      if (ativo && window.matchMedia('(min-width: 760px)').matches) {
        a.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    });


    if (campoBusca && r.tela !== 'busca' && campoBusca.value) campoBusca.value = '';
    if (rolarTopo) window.scrollTo({ top: 0, behavior: 'auto' });
    document.getElementById('menu').classList.remove('aberto');
    document.getElementById('menu-botao').setAttribute('aria-expanded', 'false');
  }

  /* ---------- Molduras fixas (menu e rodapé) ------------------------------ */

  function montarMolduras() {
    const loja = catalogo.loja;

    const tarja = document.getElementById('tarja-topo');
    if (tarja) {
      tarja.textContent = loja.avisoTopo || '';
      tarja.hidden = !loja.avisoTopo;
    }

    document.getElementById('menu-categorias').innerHTML = catalogo.categorias
      .map((c) => {
        const n = produtosDa(c.slug).length;
        return `<a href="#/c/${esc(c.slug)}">${esc(c.nome)}<span class="barra-conta">${n}</span></a>`;
      })
      .join('');

    document.getElementById('rodape-texto').textContent = loja.descricao || '';
    document.getElementById('rodape-aviso').textContent =
      [loja.avisoFrete, loja.avisoPreco].filter(Boolean).join(' ');

    const links = [`<a href="${linkZap(null)}" target="_blank" rel="noopener">${SVG_ZAP} WhatsApp</a>`];
    if (loja.instagram) {
      const user = loja.instagram.replace(/^@/, '');
      links.push(`<a href="https://instagram.com/${esc(user)}" target="_blank" rel="noopener">@${esc(user)}</a>`);
    }
    if (loja.email) links.push(`<a href="mailto:${esc(loja.email)}">${esc(loja.email)}</a>`);
    document.getElementById('rodape-links').innerHTML = links.join('');

    if (!document.querySelector('.zap-flutuante')) {
      const a = document.createElement('a');
      a.className = 'zap-flutuante';
      a.href = linkZap(null);
      a.target = '_blank';
      a.rel = 'noopener';
      a.setAttribute('aria-label', 'Falar no WhatsApp');
      a.innerHTML = SVG_ZAP;
      document.body.appendChild(a);
    }
  }

  /* ---------- Busca -------------------------------------------------------- */

  // No celular as categorias moram atrás do hambúrguer e a busca atrás da lupa.
  const faixa = document.querySelector('.faixa');
  const botaoMenu = document.getElementById('menu-botao');
  const menuEl = document.getElementById('menu');

  function fecharMenu() {
    menuEl.classList.remove('aberto');
    botaoMenu.setAttribute('aria-expanded', 'false');
  }
  botaoMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    const aberto = menuEl.classList.toggle('aberto');
    botaoMenu.setAttribute('aria-expanded', String(aberto));
  });
  menuEl.addEventListener('click', (e) => { if (e.target.closest('a')) fecharMenu(); });
  document.addEventListener('click', (e) => {
    if (menuEl.classList.contains('aberto') && !e.target.closest('.cabecalho')) fecharMenu();
  });

  const abrirBusca = document.getElementById('busca-abrir');
  const fecharBusca = document.getElementById('busca-fechar');

  abrirBusca.addEventListener('click', () => {
    faixa.classList.add('buscando');
    abrirBusca.setAttribute('aria-expanded', 'true');
    campoBusca.focus();
  });
  function recolherBusca() {
    faixa.classList.remove('buscando');
    abrirBusca.setAttribute('aria-expanded', 'false');
  }
  fecharBusca.addEventListener('click', () => {
    campoBusca.value = '';
    if (location.hash.startsWith('#/busca')) location.hash = '#/';
    recolherBusca();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { campoBusca.blur(); recolherBusca(); fecharMenu(); }
  });

  let timerBusca;
  // Clique em qualquer link do WhatsApp. Delegado no document porque esses
  // links são redesenhados a cada rota (capa, carrinho, rodapé) — enganchar em
  // cada um exigiria religar o ouvinte em todo desenho.
  //
  // O do carrinho é begin_checkout: fechar pedido aqui É mandar a mensagem, não
  // existe etapa de pagamento depois. Os outros são contato solto.
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href*="wa.me"]');
    if (!link) return;

    if (link.matches('[data-zap-carrinho]')) {
      medir('begin_checkout', {
        currency: 'BRL',
        value: totalCarrinho(),
        items: carrinho.map((it) => ({
          item_id: it.slug,
          item_name: it.nome,
          ...(it.preco != null && { price: it.preco }),
          quantity: it.quantidade,
        })),
        ...(freteEscolhido && {
          shipping_tier: freteEscolhido.nome,
          shipping: freteEscolhido.preco,
        }),
      });
      return;
    }

    medir('contato_whatsapp', { origem: document.body.dataset.tela || 'desconhecida' });
  });

  campoBusca?.addEventListener('input', () => {
    clearTimeout(timerBusca);
    timerBusca = setTimeout(() => {
      const v = campoBusca.value.trim();
      const destino = v ? '#/busca/' + encodeURIComponent(v) : '#/';
      if (location.hash !== destino) location.hash = destino;
    }, 180);
  });
  document.getElementById('busca')?.addEventListener('submit', (e) => {
    e.preventDefault();
    campoBusca.blur();
  });

  /* ---------- Autocorreção silenciosa -------------------------------------- */

  // A tela já está pintada com o catálogo embutido. Em segundo plano conferimos
  // o catalogo.json original: se alguém editou o JSON e esqueceu de rodar o
  // gerador, o site se corrige sozinho — sem atrasar nada do primeiro desenho.
  function conferirEmSegundoPlano() {
    if (location.protocol === 'file:') return;
    fetch('dados/catalogo.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((novo) => {
        if (!novo?.produtos) return;
        for (const p of novo.produtos) for (const c of CAMPOS_INTERNOS) delete p[c];
        // `avaliacoes` entra na comparação: depoimento colado à mão no JSON sem
        // rodar o gerador é exatamente o caso que esta conferência existe pra
        // cobrir, e deixá-lo fora fazia a correção nunca disparar por isso.
        const limpo = (o) =>
          JSON.stringify({
            loja: o.loja,
            categorias: o.categorias,
            produtos: o.produtos,
            avaliacoes: o.avaliacoes || [],
          });
        if (limpo(novo) === limpo(catalogo)) return;
        novo.versao = 'json-' + Date.now();
        catalogo = window.CATALOGO = novo;
        montarMolduras();
        desenhar(false);
      })
      .catch(() => {});
  }

  /* ---------- Partida ------------------------------------------------------- */

  function iniciar() {
    montarMolduras();
    atualizarBadgeCarrinho();
    desenhar();
    window.addEventListener('hashchange', () => desenhar());
    conferirEmSegundoPlano();
  }

  if (catalogo) {
    iniciar();
  } else {
    // Rede de segurança: só acontece se dados/catalogo.js faltar no deploy.
    fetch('dados/catalogo.json')
      .then((r) => r.json())
      .then((d) => { catalogo = window.CATALOGO = d; iniciar(); })
      .catch(() => {
        main.innerHTML = telaNaoEncontrado('Não conseguimos carregar o catálogo.');
      });
  }
})();
