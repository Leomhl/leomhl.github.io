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

  /* ---------- WhatsApp -------------------------------------------------- */

  const SVG_ZAP =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M.06 24l1.69-6.16a11.87 11.87 0 01-1.6-5.95C.16 5.33 5.5 0 12.06 0a11.8 11.8 0 018.4 3.49 11.78 11.78 0 013.48 8.4c0 6.55-5.34 11.89-11.9 11.89a11.9 11.9 0 01-5.68-1.45L.06 24zm6.6-3.8c1.64.97 3.2 1.55 5.27 1.55 5.45 0 9.89-4.43 9.9-9.88a9.88 9.88 0 00-16.86-7 9.82 9.82 0 00-2.9 7 9.85 9.85 0 001.51 5.26l-.99 3.6 3.7-.97zm11.1-5.66c-.07-.12-.27-.2-.57-.35-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07a8.1 8.1 0 01-2.38-1.47 9 9 0 01-1.65-2.05c-.17-.3-.02-.46.13-.6.14-.14.3-.36.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.62-.93-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.5.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.42.25-.69.25-1.28.18-1.4z"/></svg>';

  // O que a pessoa escolheu na página do produto. Zera a cada troca de produto.
  let escolha = { slug: null, cor: null, opcoes: {}, quantidade: 1 };

  function zerarEscolha(p) {
    const cores = coresDe(p);
    escolha = {
      slug: p.slug,
      cor: cores.length ? cores[0].nome : null,
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
    if (p.preVenda) linhas.push(`• ${textoPreVenda(p)}`);
    return linhas.join('\n');
  }

  function linkZap(produto) {
    const loja = catalogo.loja;
    const numero = String(loja.whatsapp || '').replace(/\D/g, '');
    let texto;
    if (!produto) {
      texto = loja.mensagemGeral || 'Olá! Vim pelo site.';
    } else {
      const modelo = produto.preVenda && loja.mensagemPreVenda ? loja.mensagemPreVenda : loja.mensagemPadrao;
      texto = String(modelo || 'Olá! Quero pedir:\n{pedido}\n{link}')
        .replace('{pedido}', textoPedido(produto))
        .replace('{produto}', produto.nome)
        .replace('{link}', location.href.split('#')[0] + '#/p/' + produto.slug);
      if (!modelo.includes('{link}')) texto += '\n' + location.href.split('#')[0] + '#/p/' + produto.slug;
    }
    return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texto);
  }

  /* ---------- Pré-venda -------------------------------------------------- */

  function textoPreVenda(p) {
    if (!p.preVenda) return '';
    const loja = catalogo.loja;
    if (p.dataVenda) {
      return (loja.textoPreVenda || 'Pré-venda. Produção e envio a partir de {data}.')
        .replace('{data}', dataLonga(p.dataVenda));
    }
    return loja.textoPreVendaSemData || 'Pré-venda. Data de produção e envio a confirmar.';
  }

  function blocoPreVenda(p) {
    if (!p.preVenda) return '';
    const extra = p.observacaoPreVenda ? `<span>${esc(p.observacaoPreVenda)}</span>` : '';
    return `<div class="aviso-prevenda">
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M12 14v3"/></svg>
      <p class="aviso-prevenda-texto"><strong>${esc(textoPreVenda(p))}</strong>${extra}</p>
    </div>`;
  }

  /* ---------- Cores -------------------------------------------------------- */

  // Sem a chave "cores", o produto herda as cores padrão da loja.
  function coresDe(p) {
    const paleta = catalogo.loja.paletaCores || {};
    const chaves = p.cores && p.cores.length ? p.cores : catalogo.loja.coresPadrao || [];
    return chaves.map((k) => paleta[k] || { nome: k, hex: '#CCC' });
  }

  function blocoCores(p) {
    const cores = coresDe(p);
    if (!cores.length) return '';
    return `<div class="escolha" data-grupo="cor" role="radiogroup" aria-label="Cor">
      <h2 class="escolha-titulo">Cor</h2>
      <div class="escolha-lista">
        ${cores
          .map(
            (c, i) => `<button type="button" class="opcao" role="radio"
              aria-checked="${i === 0}" data-valor="${esc(c.nome)}">
              <span class="opcao-bola" style="--cor:${esc(c.hex)}" aria-hidden="true"></span>
              <span class="opcao-nome">${esc(c.nome)}</span>
            </button>`
          )
          .join('')}
      </div>
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
  function blocoFicha(p, cores) {
    const linhas = (p.ficha || []).filter((l) => l.valor);
    if (cores) linhas.splice(2, 0, { rotulo: 'Cores', valor: cores });
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

  /* ---------- Vídeo ---  /* ---------- Vídeo ------------------------------------------------------ */

  // Aceita link completo do YouTube (watch, youtu.be, shorts, embed) ou só o ID.
  function idDoYoutube(valor) {
    if (!valor) return null;
    const v = String(valor).trim();
    if (/^[\w-]{11}$/.test(v)) return v;
    const m = v.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/v\/)([\w-]{11})/);
    return m ? m[1] : null;
  }

  /* ---------- Peças de interface ----------------------------------------- */

  function selos(p) {
    const itens = [];
    if (p.preVenda) itens.push('<span class="selo selo-prevenda">Pré-venda</span>');
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

  function cartao(p, prioridade = false) {
    const foto = p.fotos && p.fotos[0];
    const img = foto
      ? `<img src="${esc(foto)}" alt="${esc(p.nome)}" width="800" height="600"
           loading="${prioridade ? 'eager' : 'lazy'}" decoding="async"
           ${prioridade ? 'fetchpriority="high"' : ''}>`
      : semFoto(p.nome);
    return `<a class="cartao" href="#/p/${esc(p.slug)}">
      <div class="cartao-foto">${selos(p)}${img}</div>
      <div class="cartao-corpo">
        <h3>${esc(p.nome)}</h3>
        <p class="cartao-resumo">${esc(p.resumo || '')}</p>
        <div class="cartao-rodape">${precoHtml(p)}<span class="cartao-seta">Ver peça →</span></div>
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

  function telaInicio() {
    const loja = catalogo.loja;
    const destaques = catalogo.produtos.filter((p) => p.destaque).slice(0, 8);
    const preVenda = catalogo.produtos.filter((p) => p.preVenda);

    const cartoesCategoria = catalogo.categorias
      .map((c) => {
        const n = produtosDa(c.slug).length;
        return `<a class="cartao-categoria" href="#/c/${esc(c.slug)}">
          <h3>${esc(c.nome)}</h3>
          <p>${esc(c.resumo || '')}</p>
          <span class="contagem">${n} ${n === 1 ? 'peça' : 'peças'}</span>
        </a>`;
      })
      .join('');

    return `
      <section class="capa">
        <div class="capa-interno">
          <div>
            <h1>${chamadaHtml(loja)}</h1>
            <p class="capa-texto">${esc(loja.descricao || '')}</p>
            <div class="capa-acoes">
              <a class="botao" href="#/c/${esc(catalogo.categorias[0].slug)}">Ver o catálogo</a>
              <a class="botao botao-zap" href="${linkZap(null)}" target="_blank" rel="noopener">
                ${SVG_ZAP} Falar no WhatsApp
              </a>
            </div>
          </div>
          <div class="capa-arte">
            <img src="marca/mascote-cheio.svg" alt="" aria-hidden="true" width="280" height="280">
          </div>
        </div>
      </section>

      ${
        preVenda.length
          ? `<section class="secao">
              <div class="secao-topo"><h2>Em pré-venda</h2></div>
              <p class="secao-resumo">Reserve agora e garanta a peça no primeiro lote.</p>
              ${grade(preVenda)}
            </section>`
          : ''
      }

      <section class="secao">
        <div class="secao-topo"><h2>Categorias</h2></div>
        <p class="secao-resumo">${catalogo.produtos.length} peças, divididas por onde elas vivem no seu cantinho do café.</p>
        <div class="grade-categorias">${cartoesCategoria}</div>
      </section>

      ${
        destaques.length
          ? `<section class="secao">
              <div class="secao-topo"><h2>As que mais saem</h2></div>
              ${grade(destaques)}
            </section>`
          : ''
      }
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

    // Quadros do carrossel: fotos primeiro, vídeo por último.
    const quadros = fotos.map(
      (f, i) =>
        `<div class="quadro" role="group" aria-roledescription="slide" aria-label="Foto ${i + 1} de ${fotos.length}">
           <img src="${esc(f)}" alt="${esc(p.nome)} — foto ${i + 1}"
                loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async"
                ${i === 0 ? 'fetchpriority="high"' : ''}>
         </div>`
    );
    if (idVideo) {
      quadros.push(
        `<div class="quadro" role="group" aria-roledescription="slide" aria-label="Vídeo">
           <div class="video" data-video="${esc(idVideo)}">
             <img src="https://i.ytimg.com/vi/${esc(idVideo)}/hqdefault.jpg" alt="" aria-hidden="true" loading="lazy">
             <button class="video-play" type="button" aria-label="Assistir ao vídeo de ${esc(p.nome)}"><span></span></button>
           </div>
         </div>`
      );
    }
    if (!quadros.length) quadros.push(`<div class="quadro">${semFoto(p.nome)}</div>`);

    const miniaturas =
      quadros.length > 1
        ? `<div class="miniaturas" role="tablist" aria-label="Escolher mídia">
            ${fotos
              .map(
                (f, i) =>
                  `<button class="miniatura" type="button" role="tab" data-ir="${i}" aria-current="${i === 0}"
                    aria-label="Ver foto ${i + 1}"><img src="${esc(f)}" alt="" loading="lazy"></button>`
              )
              .join('')}
            ${
              idVideo
                ? `<button class="miniatura miniatura-video" type="button" role="tab" data-ir="${fotos.length}"
                     aria-current="false" aria-label="Ver o vídeo">
                     <img src="https://i.ytimg.com/vi/${esc(idVideo)}/default.jpg" alt="" loading="lazy"></button>`
                : ''
            }
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
      ? `<ul class="detalhes">${p.detalhes.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>`
      : '';

    const rotuloBotao = p.preVenda ? 'Reservar na pré-venda' : 'Comprar pelo WhatsApp';

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

          ${blocoPreVenda(p)}

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
          ${blocoFicha(p, coresDe(p).map((c) => c.nome).join(', '))}

          <div class="escolhas" data-escolhas>
            ${blocoOpcoes(p)}
            ${blocoCores(p)}
            ${blocoQuantidade()}
          </div>

          <div class="compra">
            <p class="compra-total" data-total hidden></p>
            <a class="botao botao-zap botao-largo" data-zap href="${linkZap(p)}" target="_blank" rel="noopener">
              ${SVG_ZAP} ${rotuloBotao}
            </a>
            <p class="compra-nota">${esc(catalogo.loja.avisoPedido || catalogo.loja.avisoPreco || '')}</p>
          </div>
        </div>
      </article>

      ${(() => {
        const irmaos = produtosDa(c.slug).filter((x) => x.slug !== p.slug).slice(0, 4);
        return irmaos.length
          ? `<section class="secao">
              <div class="secao-topo"><h2>Também em ${esc(c.nome)}</h2>
                <a class="ver-tudo" href="#/c/${esc(c.slug)}">Ver todas →</a></div>
              ${grade(irmaos)}
            </section>`
          : '';
      })()}
    `;
  }

  function telaNaoEncontrado(mensagem) {
    return `<div class="vazio">
      <img src="marca/mascote.svg" alt="" aria-hidden="true">
      <h2>Não achei essa página</h2>
      <p>${esc(mensagem)}</p>
      <a class="botao" href="#/">Voltar ao início</a>
    </div>`;
  }

  /* ---------- Seletores do pedido ------------------------------------------ */

  // Cada escolha reescreve o link do WhatsApp na hora: quando a pessoa toca no
  // botão verde, a mensagem já está montada com produto, quantidade, cor e opção.
  function ligarSeletores(p) {
    const caixa = main.querySelector('[data-escolhas]');
    if (!caixa) return;
    const botaoZap = main.querySelector('[data-zap]');
    const total = main.querySelector('[data-total]');
    const campo = caixa.querySelector('#quantidade');

    const mostrador = main.querySelector('[data-preco]');

    function atualizar() {
      botaoZap.href = linkZap(p);
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

    // O vídeo só vira iframe quando alguém pede: nada do YouTube carrega antes disso.
    raiz.querySelector('.video-play')?.addEventListener('click', (e) => {
      const caixa = e.currentTarget.closest('.video');
      const id = caixa.dataset.video;
      caixa.innerHTML =
        `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1"
          title="Vídeo do produto" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen></iframe>`;
    });
  }

  /* ---------- Roteador ---------------------------------------------------- */

  function rota() {
    const h = location.hash.replace(/^#\/?/, '');
    const [tipo, ...resto] = h.split('/');
    const arg = decodeURIComponent(resto.join('/') || '');
    if (tipo === 'c') return { tela: 'categoria', arg };
    if (tipo === 'p') return { tela: 'produto', arg };
    if (tipo === 'busca') return { tela: 'busca', arg };
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
                               telaInicio();

    document.title = titulo(r);
    document.body.dataset.tela = r.tela;
    main.querySelectorAll('[data-carrossel]').forEach(ligarCarrossel);
    if (r.tela === 'produto') {
      const p = porSlug(catalogo.produtos, r.arg);
      if (p) { zerarEscolha(p); ligarSeletores(p); }
    }

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
        const limpo = (o) => JSON.stringify({ loja: o.loja, categorias: o.categorias, produtos: o.produtos });
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
        main.innerHTML = telaNaoEncontrado('Não consegui carregar o catálogo.');
      });
  }
})();
