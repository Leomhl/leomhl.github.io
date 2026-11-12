# Vitrine cafezim

Site estático, sem framework e sem build obrigatório. Tudo que aparece na tela
sai de um arquivo só: `dados/catalogo.json`.

```
site/
├── index.html                    estrutura da página (raramente muda)
├── assets/estilo.css             toda a aparência
├── assets/app.js                 roteador, carrossel, busca, WhatsApp
├── dados/catalogo.json  ←        VOCÊ EDITA AQUI
├── dados/catalogo.js             gerado a partir do JSON — não edite à mão
├── fotos/<slug>/01.jpg           fotos dos produtos
├── marca/                        logos e ícones
└── ferramentas/                  gerador, colheita de depoimentos, regras
```

## Por que o site abre sem delay

`index.html` carrega `dados/catalogo.js` como script **bloqueante no `<head>`**.
Quando o navegador pinta o primeiro pixel, os 53 produtos já estão na memória:
nenhum `fetch`, nenhum spinner, nenhum salto de layout. Medido: o catálogo chega
aos 83 ms e a primeira pintura acontece aos 168 ms.

`catalogo.js` é só o `catalogo.json` embrulhado em `window.CATALOGO = …`.
Quem manda é o JSON; o `.js` é derivado.

Depois que a tela já está desenhada, o site confere o `catalogo.json` em segundo
plano. Se você editou o JSON e esqueceu de gerar o `.js`, ele se corrige sozinho
— sem atrasar nada da primeira tela.

## Mexer no catálogo

### Pela interface do GitHub (sem instalar nada)

Edite `dados/catalogo.json` direto no site do GitHub e salve. **Não há
workflow nenhum** — o GitHub Pages serve a raiz do branch como está, então o
`catalogo.js` fica com o dado velho até alguém rodar o gerador. O site se
corrige: ele confere o `catalogo.json` em segundo plano (`assets/app.js`) e
repinta com o dado novo.

O custo de editar só pela interface é esse: a primeira tela de quem abre o site
mostra o estado anterior por um instante, e nada valida o JSON antes de subir —
se você escrever algo inválido, o `catalogo.js` velho continua no ar e o
conserto em segundo plano falha calado. **Rodar `node ferramentas/gerar.mjs` não
é redundância com um CI: é a única geração e a única validação que existem.**

### Na sua máquina

```bash
node ferramentas/gerar.mjs               # valida o JSON e regera o catalogo.js
```

Rode sempre depois de editar o JSON.

## Como é um produto

```jsonc
{
  "slug": "knock-box",                     // vira o endereço: #/p/knock-box. Não mude depois de divulgar.
  "nome": "Knock Box com Tampa",
  "categoria": "organizacao",              // slug de uma das categorias lá de cima
  "resumo": "Caixa de descarte de borra…", // uma linha, aparece no cartão da grade
  "paraQueServe": "Depois de tirar um…",   // explicação para leigo, em destaque antes da descrição
  "descricao": "Texto corrido…",           // linha em branco dupla separa parágrafos
  "detalhes": ["Barra de batida interna"], // vira a lista de bolinhas
  "ficha": [                               // tabela de especificações
    { "rotulo": "Material", "valor": "Bioplástico PLA" },
    { "rotulo": "Dimensões", "valor": "" } // linha com valor vazio não aparece no site
  ],
  "preco": 92.0,                           // número. null mostra "Consultar"
  "destaque": true,                        // entra em "O que mais sai" na home
  "cores": null,                           // null = usa as cores padrão da loja
  "opcoes": [],                            // outros atributos de escolha, ex: acabamento
  "fotos": ["fotos/knock-box/01.jpg"],     // a primeira é a capa
  "video": null,                           // link do YouTube ou só o ID
  "pastaOrigem": "Organização/Knock Box…"  // interno: de onde a foto é sincronizada
}
```

Os campos `pastaOrigem`, `revisarFoto` e `observacoes` **não vão para o site** —
o gerador os remove do `catalogo.js`. Servem só para as ferramentas e para você.

### "Para o que serve?"

O campo `paraQueServe` aparece num quadro em destaque, **antes** da descrição.
É o lugar de explicar a peça para quem nunca viu uma igual: que problema ela
resolve, em palavras do dia a dia, traduzindo o jargão (portafiltro, V60,
tamper, borra). A descrição vem depois e fala de como a peça é feita.

Esse texto também entra na busca — alguém que procura "prensar café" encontra
o tamper mesmo sem saber o nome dele.

### Opções (atributos que não são cor)

Quando a mesma peça tem variações, use `opcoes` em vez de criar dois produtos:

```jsonc
"opcoes": [
  { "titulo": "Acabamento do fundo", "valores": ["Liso", "Textura de madeira"] }
]
```

Cada entrada vira um grupo de botões selecionáveis na página, acima das cores.
Dá para ter mais de um grupo (tamanho e acabamento, por exemplo).

**Quando a opção muda o preço**, troque o texto por um objeto com `preco`:

```jsonc
"preco": null,
"opcoes": [
  { "titulo": "Modelo do coador", "valores": [
    { "valor": "V60 tamanho 02", "preco": 54.0 },
    { "valor": "V60 tamanho 03", "preco": 59.0 },
    { "valor": "Chemex",         "preco": 69.0 }
  ]}
]
```

O preço aparece dentro de cada botão, e o valor grande da página muda assim que
a pessoa escolhe. Na grade, o cartão mostra "a partir de" com o menor deles.
Só **um** grupo pode mexer no preço — o gerador recusa mais de um.

### Ficha técnica

`ficha` é uma lista de `{ "rotulo", "valor" }` que vira a tabela de
especificações, no estilo de marketplace. **Linha com `valor` vazio não aparece
no site** — então dá para deixar os campos prontos e ir preenchendo.

A linha "Cores" é montada sozinha, a partir das cores do produto; não precisa
colocar na ficha.

Hoje todos os 53 produtos já vêm com Material, Acabamento, Limpeza e Produção
preenchidos, e com **Dimensões e Peso em branco** — esses dois só você tem.

### Cores

A paleta vive em `loja.paletaCores`. Hoje tem branco e preto, e `loja.coresPadrao`
diz que todo produto aceita os dois.

Para oferecer uma cor nova, acrescente na paleta:

```jsonc
"paletaCores": {
  "branco":    { "nome": "Branco",    "hex": "#F2EFE9" },
  "preto":     { "nome": "Preto",     "hex": "#1C1C1C" },
  "terracota": { "nome": "Terracota", "hex": "#C9742F" }
}
```

Para todos os produtos: acrescente a chave em `coresPadrao`.
Só para alguns: liste as chaves no produto — `"cores": ["branco", "terracota"]`.

## O pedido montado no WhatsApp

Na página do produto a pessoa escolhe **opção, cor e quantidade** antes de sair
do site. A cada toque o link do botão verde é reescrito, então a mensagem já
chega pronta no seu WhatsApp:

```
Olá! Quero fazer um pedido no cafezim:

• Bandeja para Café
• Quantidade: 3
• Cor: Preto
• Acabamento do fundo: Textura de madeira
• Valor: R$ 95,00 cada — total R$ 285,00

https://…/#/p/bandeja-cafe
```

Com mais de uma unidade, o total aparece também na tela, acima do botão.

O formato da mensagem está em `loja.mensagemPadrao`. Dois marcadores:

| Marcador | Vira |
|---|---|
| `{pedido}` | O bloco de linhas acima — produto, quantidade, cor, opções e valor |
| `{link}` | O endereço daquele produto |

### Vídeo

```jsonc
"video": "https://www.youtube.com/watch?v=XXXXXXXXXXX"
```

Aceita link de `watch`, `youtu.be`, `shorts`, `embed`, ou só o ID de 11
caracteres. O vídeo entra como último quadro do carrossel e **nada do YouTube
carrega** antes de alguém tocar no play — só a miniatura.

### Fotos

Uma foto por arquivo em `fotos/<slug>/`, numeradas: `01.jpg`, `02.jpg`, `03.jpg`.
Liste na ordem que você quer no carrossel; a primeira é a capa.

Copiar da pasta de produção pra cá é manual. Existia um
`ferramentas/sincronizar-fotos.sh` que gerava a capa a partir do
`thumbnail.png` de cada pasta de produto; foi removido porque aquele arquivo não
existe mais (as pastas têm `miniatura.png`, com 240x180 — menor que as capas que
já estão no ar) e porque `pastaOrigem` aponta pra fora do repositório, que é
onde o script precisava ler.

## Analytics (GA4)

Tag no `index.html`, propriedade `cafezim-store`, ID `G-L0BK585G8H`. As páginas
`p/<slug>/` **não** levam a tag: elas redirecionam pra rota `#/` no mesmo
instante, então a visita real é contada uma vez só, pela vitrine.

`send_page_view` fica desligado na configuração da tag, de propósito: a
navegação é por `#/`, e o `page_view` automático dispararia só no primeiro
carregamento — toda troca de tela ficaria invisível. O `app.js` manda o
`page_view` a cada rota desenhada, inclusive a primeira.

Eventos, todos com nome que o GA4 já reconhece (os relatórios de monetização se
preenchem sozinhos, sem métrica personalizada):

| Evento | Quando | O que leva |
|---|---|---|
| `page_view` | toda rota desenhada | título, URL, `tela` |
| `view_item` | abriu a página de um produto | item, preço atual, BRL |
| `add_to_cart` | clicou em "Adicionar ao carrinho" | item, quantidade, valor total |
| `search` | buscou alguma coisa | `search_term` |
| `begin_checkout` | clicou em "Finalizar pedido no WhatsApp" | carrinho inteiro, valor, frete escolhido |
| `contato_whatsapp` | qualquer outro link de WhatsApp | `origem` (a tela de onde saiu) |

`begin_checkout` é o evento de conversão desta loja: fechar pedido aqui *é*
mandar a mensagem, não existe etapa de pagamento depois.

Toda chamada passa por `medir()`, que confere se o `gtag` existe antes de usar.
Com a tag bloqueada por adblock, ou o site aberto por `file://`, o evento
simplesmente não acontece e nada quebra.

## Publicar no GitHub Pages

O repositório é `Leomhl/leomhl.github.io` — site de usuário do GitHub
Pages, servido direto da raiz do branch. **Sem GitHub Actions e sem workflow:**
cada push na `master` republica os arquivos como estão. O `CNAME` da raiz aponta
o domínio `www.cafezim.store`.

Por isso o gerador roda **na sua máquina, antes do commit** — não há CI pra
cobrir se você esquecer. As pastas de produção (`Decoração/`, `Preparo/`, ...)
estão fora do repositório, então nunca entram no deploy.

## Dados da loja

No topo do JSON, em `"loja"`:

| Campo | Para que serve |
|---|---|
| `whatsapp` | Número com código do país e DDD, só dígitos |
| `mensagemPadrao` | Texto que já vai digitado no WhatsApp. Aceita `{pedido}` e `{link}` |
| `paletaCores`, `coresPadrao` | As cores que todo produto aceita |
| `avisoTopo` | Tarja fixa no topo do site, acima do menu. Vazio = some |
| `avisoFrete` | Aparece na página de cada produto e no rodapé |
| `prazoEntrega` | Linha pequena ao lado do preço |
| `instagram`, `email` | Se preenchidos, viram botões no rodapé |
| `provas[]` | As quatro afirmações abaixo da capa (`titulo` + `texto`). Aceitam `{total}` e `{minimo}`, preenchidos com o catálogo de verdade — preço escrito à mão viraria mentira na primeira mudança de tabela |
| `fechamento` | Bloco que fecha a home puxando pro WhatsApp (`titulo`, `texto`, `textoBotao`) |
| `feedback.rota` | Segmento da URL do formulário de feedback. Hoje `conta-como-ficou` |
| `feedback.titulo`, `feedback.convite`, `feedback.textoBotao` | Textos da seção de depoimentos |
| `feedback.agradecimento` | Texto da tela de "obrigado", depois que a pessoa envia |
| `feedback.mensagemWhatsapp` | Modelo da mensagem de emergência, com `{depoimento}`. Usado quando o Firestore não responde |
| `feedback.firebase.projeto`, `.chaveApi`, `.colecao` | Firestore que guarda os depoimentos. **Vazio = o site mostra só os depoimentos do JSON e o formulário cai no WhatsApp** |

## "Você também pode gostar"

Fecha a página de cada produto com 4 peças. Monta a lista em três camadas, nessa
ordem, até completar 4:

1. **`combinaCom`** no produto — curadoria sua, é a camada que vende melhor:

   ```json
   { "slug": "bandeja-hexagonal-coador", "combinaCom": ["knock-box", "dosador-cafe"] }
   ```

2. **Mesma categoria**, com os marcados `destaque` na frente.
3. **Resto do catálogo com preço mais próximo** — quem está olhando peça de
   R$ 30 não se interessa pela de R$ 110 só porque sobrou espaço na grade.

A terceira camada existe porque Luminárias tem 6 peças: sem ela a seção
apareceria com dois cartões numa página de luminária.

Não precisa preencher nada: sem `combinaCom` as camadas 2 e 3 cobrem os 92
produtos. O gerador valida os slugs de `combinaCom` e avisa quantos produtos
têm curadoria manual.

## Depoimentos de cliente

Vêm de **um lugar só**: o array `"avaliacoes"` do `catalogo.json`.

O formulário do site grava no Firestore, mas **nada do Firestore aparece no
site**. Fica lá até você rodar

```bash
node ferramentas/colher-depoimentos.mjs
```

que baixa texto e fotos, grava no `catalogo.json` e sobe o site local pra você
conferir antes de commitar. Nada é publicado sem passar por você, e a página não
depende do Firebase estar de pé pra mostrar prova social.

Daqui o Firestore é **só escrita**: as regras não permitem leitura a ninguém de
fora. Quem lê é o script, com a credencial de conta de serviço, que passa por
cima das regras. O campo `aprovado` ficou como sua marcação de triagem no
console — não é ele que publica.

### O formato

```json
"avaliacoes": [
  {
    "nome": "Mariana",
    "cidade": "Niterói, RJ",
    "texto": "Comprei pelo porta-cápsulas e acabei levando a bandeja junto.",
    "data": "2026-10-14",
    "produto": "porta-capsulas-deluxe",
    "fotos": ["fotos/avaliacoes/mariana-01.jpg", "fotos/avaliacoes/mariana-02.jpg"],
    "destaque": true
  }
]
```

| Campo | Obrigatório | O que faz |
|---|---|---|
| `nome` | sim | Aparece na assinatura |
| `texto` | sim | O depoimento |
| `cidade` | não | Entra na assinatura, depois do nome |
| `data` | não | `AAAA-MM-DD`. Vai pro `datePublished` do JSON-LD |
| `fotos` | não | Lista de caminhos, ex. `fotos/avaliacoes/mariana-01.jpg`. Uma foto ocupa a largura toda; duas ou mais viram grade. Aceita também `foto` no singular, de entrada antiga |
| `destaque` | não | Marca quais aparecem na capa. Se nenhum estiver marcado, a capa mostra os 3 mais recentes |

Onde aparece: **só na capa**, em seção com até 3 depoimentos. Página de produto
não tem depoimento — o campo `produto` foi removido do modelo, e o gerador
recusa quem insistir em usá-lo.

**Sem nenhum depoimento a seção desaparece** — não fica um bloco vazio nem um
"0 avaliações". E **foto só aparece depois de passar pelo
`colher-depoimentos.mjs`**: o que está no Firestore é base64, e o site não serve
base64.

O texto do cartão é recortado em **6 linhas** e ganha um "ver mais" quando passa
disso. O botão é criado pelo JS depois de pintar, medindo o elemento: depoimento
que cabe inteiro não fica com reticências nem com botão que não revela nada.

**Não há estrela nem nota em lugar nenhum**, de propósito. Com um punhado de
depoimentos por peça, média é estatística sem significado, e estrela vazia ao
lado do preço comunica "ninguém avaliou" em vez de "é bom". Pelo mesmo motivo o
`aggregateRating` do JSON-LD fica fora: ele é o que faria o Google mostrar
estrela no resultado, e isso só vale com volume que a sustente.

### O formulário

Página do próprio site, no endereço que está em `loja.feedback.rota`:

```
https://www.cafezim.store/#/conta-como-ficou
```

**Não existe link pra ele em lugar nenhum do site.** O endereço é mandado por
WhatsApp pra quem comprou — é isso que mantém a seção honesta: quem escreve é
cliente, não quem passou pela vitrine. O segmento sorteado também evita robô
achando o formulário por tentativa; é obscuridade, não segurança, e o que de
fato protege continua sendo a moderação (`aprovado: false`).

Pra trocar o endereço: mude `loja.feedback.rota` e rode o gerador. Ele valida o
formato e imprime a URL completa no fim. Link antigo com peça no fim
(`#/<rota>/<slug>`) continua abrindo o formulário — o segmento extra é ignorado.

Sem login, sem Google Forms, sem sair do domínio.
Pede nome, cidade e o depoimento — **os três obrigatórios** — mais até 3 fotos
(opcionais) e a caixa de autorização, que é obrigatória: publicar nome e texto
de alguém precisa de consentimento explícito (LGPD, art. 7º).

O depoimento tem **mínimo de 10 caracteres** — piso só pra barrar "oi" e ".".
Baixo de propósito: exigir texto longo espanta quem ia escrever duas linhas boas,
e duas linhas boas valem mais que nenhuma. O teto é 1200, e é por isso que o
cartão tem "ver mais". O valor é o mesmo nas regras do Firestore
(`MIN_TEXTO` em `app.js` e `texto.size() >= 10` em `firestore.rules`) — mudar num
lugar só faria o envio ser recusado com 403 depois da pessoa ter escrito.

**Não pergunta qual peça, e não guarda peça nenhuma.** O depoimento não é
amarrado a produto: aparece na capa, e só na capa. Enquanto a peça vinha do slug
da URL, o link mandado por WhatsApp carregava o nome dela atravessado no
endereço, e a mesma seção existia em duas telas — contexto que ninguém pedia e
um campo a mais pra manter. O gerador **recusa** `produto` em `avaliacoes[]`:
chave muda no JSON é dado que ninguém lê e que engana quem editar depois.

**O formulário abre sempre em branco.** Não há rascunho salvo no navegador: o
preço é que recarregar a página no meio perde o texto, e em troca ninguém
encontra o formulário preenchido com o que digitou semanas antes — ou, em
computador compartilhado, com o que outra pessoa digitou. Se o *envio* falhar o
texto continua na tela e dentro do botão de WhatsApp, que é o caso em que perder
doeria.

### Publicar um depoimento que chegou

O que o formulário grava nasce com `aprovado: false` e **não aparece no site**.
Formulário aberto na internet publicando direto viraria mural de spam na
vitrine. Pra publicar:

1. Abra [o console do Firestore](https://console.firebase.google.com/project/cafezim-store/firestore/databases/-default-/data/~2Favaliacoes).
2. Clique no documento, depois no lápis do campo `aprovado`, e troque pra `true`.
3. Pronto — o site já mostra, sem deploy. (Vale o mesmo pro campo `destaque`,
   que é o que escolhe quais vão pra capa.)

Depois, quando quiser que o depoimento sobreviva a uma queda do Firebase (ou
ganhe foto), copie pro array `avaliacoes` do `catalogo.json` e rode o gerador.

### Se der errado no envio

O envio é a única coisa que **não** falha calada — a pessoa acabou de escrever
cinco linhas, perder isso é inaceitável. Se o Firestore não responder:

- o rascunho fica salvo no navegador dela (volta preenchido se recarregar);
- o aviso vira um botão **"Mandar pelo WhatsApp"** com o depoimento, o nome, a
  cidade, a peça e a autorização já dentro da mensagem;
- o botão de enviar volta como "Tentar enviar de novo".

Pior caso, o depoimento chega pelo WhatsApp, que já é o canal da loja.

### Fotos de cliente

O formulário aceita até 3 fotos. Elas **não** são servidas pelo Firestore — ele
é só a caixa de entrada:

```
cliente escolhe a foto no #/feedback
   ↓  canvas reduz pra 1280px e recomprime em JPEG, sem cortar
grava como base64 dentro do documento, aprovado: false
   ↓  node ferramentas/colher-depoimentos.mjs
TinyPNG aperta mais 30-60%  →  fotos/avaliacoes/<nome>-01.jpg
   ↓  cola o JSON impresso em catalogo.json, roda gerar.mjs, commita
site serve pelo CDN do GitHub Pages — grátis, cacheado, com lazy loading
```

**Por que não deixar a base64 no banco e pronto.** Documento do Firestore tem
teto de 1 MiB e base64 infla 33%, então até caberia. O que não cabe é a leitura:
cada depoimento passaria de ~600 bytes pra ~400 KB, e os 10 GiB/mês de cota do
Spark acabariam em ~1.250 visitas — além de 8 MB travando a seção a cada abertura
de página. A conta fecha porque **o site só lê documentos aprovados**, e aprovar
passa por tirar a foto de lá. O peso fica em documento que só você abre.

#### Colhendo

```bash
node ferramentas/colher-depoimentos.mjs
```

Um comando, sem opção nenhuma. Ele lê a coleção inteira (aprovados e
pendentes), baixa as fotos, aperta no TinyPNG, grava em `fotos/avaliacoes/`,
escreve os depoimentos novos no `catalogo.json`, roda o gerador, sobe um
servidor local e abre o site.

**Aprovar é dar commit.** Rejeitar:

```bash
git checkout dados/catalogo.json dados/catalogo.js index.html
git clean -f fotos/avaliacoes/ && node ferramentas/gerar.mjs
```

O servidor manda `Cache-Control: no-store`, então o que você vê é sempre a
versão recém-gerada — sem precisar de recarga forçada.

**Lê aprovados também**, não só pendentes. Depoimento que vive só no Firestore
desaparece do site se o Firebase cair; depois de passar por aqui ele está no
repositório.

**A limpeza do Firestore acontece na execução seguinte**, nunca na mesma que
trouxe o depoimento. Arquivar apaga o base64 da foto, e se isso fosse feito
junto, rejeitar as mudanças perderia a foto pra sempre — ela não estaria no
repositório nem no banco. Então ele arquiva o que já está no `catalogo.json`,
porque esse já sobreviveu à sua conferência:

```
1ª execução   traz o depoimento, não arquiva nada
você confere e commita
2ª execução   vê que já está estático e aí arquiva
```

Se você rejeitou, a 2ª execução traz de novo. Nunca existe um instante em que o
depoimento não esteja em lugar nenhum.

Documento já com `arquivado: true` é ignorado de vez — a foto dele não existe
mais no banco, e trazer só o texto criaria um depoimento sem a imagem que tinha.

Se o gerador reprovar o catálogo (slug inválido, data quebrada), o script
**desfaz** a alteração no `catalogo.json` e sai com erro, em vez de deixar o
arquivo num meio-estado.

O dedupe usa o mesmo critério do site (nome + 60 primeiros caracteres do texto,
sem acento e em minúsculo), então rodar duas vezes não duplica nada. O nome do
arquivo de foto sai do nome da pessoa (`Mariana Sá` → `mariana-sa-01.jpg`) e
nunca sobrescreve: se existe, vira `-02`.

#### Credencial (uma vez só)

As regras não deixam ninguém de fora ler documento não aprovado — nem você, pelo
site. Então o script precisa de credencial de administrador:

1. Console do Firebase > Configurações do projeto > **Contas de serviço** >
   "Gerar nova chave privada". Baixa um `.json`.
2. Salve como `ferramentas/.conta-firebase.json`.

Esse arquivo dá **acesso total** ao Firestore e já está no `.gitignore`. Nunca
commitar, nunca colar no `catalogo.json`.

#### TinyPNG

A chave fica em `ferramentas/.chaves.local` (também ignorado pelo git), como
`TINYPNG_KEY=...`. Também funciona pelo ambiente.

Fica no script e não no site de propósito: a API do TinyPNG não aceita CORS de
navegador, e chave em JavaScript de site é chave pública — o mesmo problema que
o token do SuperFrete tem hoje.

Conta grátis dá 500 compressões por mês. Estourando, o script avisa e salva a
foto como veio do navegador, que já está comprimida — só menos. Chave errada ou
TinyPNG fora do ar: idem. **Nunca perde a foto por causa do compressor.**

#### Limites

- **3 fotos** por depoimento, teto do navegador e das regras.
- **~230 KB de base64 por foto.** O navegador vai reduzindo qualidade e depois
  tamanho até caber. Se depois de seis tentativas não couber (panorâmica
  gigante), recusa a foto e diz isso — o depoimento vale sem ela.
- **HEIC** pode não decodificar em navegador que não suporta o formato. O iPhone
  normalmente converte pra JPEG no seletor, mas quando não converte o formulário
  avisa quais arquivos não deram, mantém os outros, e segue.
- Foto **não entra no rascunho** salvo no navegador: três data URIs passam do
  teto do `localStorage` e derrubariam o salvamento do texto junto.
- O botão de emergência do WhatsApp só carrega texto. Se havia foto escolhida, a
  mensagem avisa pra anexar na conversa.

### Segurança

As regras estão em `ferramentas/firestore.rules` e são a **única** proteção dos
dados: a chave em `loja.feedback.firebase.chaveApi` é pública por desenho
(identifica o projeto, não autoriza nada) e o site fala com o Firestore sem
login. Elas permitem a um anônimo só duas coisas: ler o que está aprovado e
criar um documento novo no formato exato, sempre reprovado. Alterar, apagar,
ler o que não foi aprovado e escrever em qualquer outra coleção: tudo negado.

Pra republicar depois de editar o arquivo: console do Firebase > Firestore >
Regras, cole e clique em Publicar.

## O que ainda falta

- **Foto de verdade da `capivara`.** As quatro imagens no site são renders de
  uma peça de madeira, e o produto é impresso em PLA — a foto não corresponde ao
  que chega na casa da pessoa. Mesma coisa, em menor grau, em `ornamentos-cafe`.
  As duas estão marcadas com `revisarFoto` no JSON (campo interno, não vai pro site).
- **Segunda foto** de `grao-de-la`, `organizador-cabo-biscoito` e
  `abridor-latas-garrafas` — são as três únicas peças com uma foto só, então o
  carrossel não tem pra onde ir.
- **Dimensões e peso** na ficha técnica de cada peça. Os campos já estão lá,
  vazios; enquanto estiverem vazios, a linha simplesmente não aparece no site.
- **Conferir "Material: Bioplástico PLA"** na ficha, caso você prefira outra
  forma de descrever.
- **Revisar os 53 preços.** Foram estimados por tamanho e complexidade —
  são um ponto de partida, não um valor fechado.
- **Revogar o acesso antigo do Apps Script.** Em
  [myaccount.google.com/permissions](https://myaccount.google.com/permissions),
  remover "Projeto sem título": a primeira versão do script pedia escopos largos
  de Drive e Planilhas, e o Google guardou essa autorização. O script atual pede
  só `FormApp`, e o formulário do site não usa Google nenhum.
