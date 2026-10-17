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
└── ferramentas/                  os dois scripts de manutenção
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

Edite `site/dados/catalogo.json` direto no site do GitHub e salve. O workflow
`.github/workflows/publicar.yml` regera o `catalogo.js`, valida e publica.
Se você escrever algo inválido, a publicação falha com a mensagem do erro em vez
de subir um site quebrado.

### Na sua máquina

```bash
node site/ferramentas/gerar.mjs          # valida o JSON e regera o catalogo.js
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
  "destaque": true,                        // entra em "As que mais saem" na home
  "preVenda": false,                       // true liga o selo e muda o botão
  "dataVenda": null,                       // "2026-11-24" — vira "a partir de 24 de novembro de 2026"
  "observacaoPreVenda": "",                // linha extra no aviso, ex: "Primeiro lote de 20 unidades"
  "cores": null,                           // null = usa as cores padrão da loja
  "opcoes": [],                            // outros atributos de escolha, ex: acabamento
  "fotos": ["fotos/knock-box/01.jpg"],     // a primeira é a capa
  "video": null,                           // link do YouTube ou só o ID
  "pastaOrigem": "Organização/Knock Box…"  // interno: de onde a foto é sincronizada
}
```

Os campos `pastaOrigem`, `revisarFoto` e `observacoes` **não vão para o site** —
o gerador os remove do `catalogo.js`. Servem só para as ferramentas e para você.

### Pré-venda

```jsonc
"preVenda": true,
"dataVenda": "2026-11-24",
"observacaoPreVenda": "Primeiro lote limitado a 20 unidades."
```

Liga de uma vez: o selo "Pré-venda" no cartão, o aviso com a data por extenso na
página, a seção "Em pré-venda" na home, e o botão passa de "Comprar pelo
WhatsApp" para "Reservar na pré-venda" — com mensagem própria.

Sem `dataVenda`, o aviso vira "Data de produção e envio a confirmar".

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

O formato da mensagem está em `loja.mensagemPadrao` (e `loja.mensagemPreVenda`
para pré-venda). Dois marcadores:

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

Para puxar de novo o `thumbnail.png` da pasta de trabalho de cada produto:

```bash
./site/ferramentas/sincronizar-fotos.sh            # só preenche o que falta
./site/ferramentas/sincronizar-fotos.sh --forcar   # refaz todas as capas
```

Ele nunca encosta em `02.jpg` para cima — fotos que você adicionou à mão ficam.
Precisa do ImageMagick (`brew install imagemagick`).

## Publicar no GitHub Pages

1. Suba o repositório.
2. **Settings › Pages › Build and deployment › Source: GitHub Actions.**
3. Pronto. Cada push na `main` republica.

O workflow envia **apenas a pasta `site/`** — cerca de 2,7 MB. As pastas de
modelos ficam fora do deploy.

## Dados da loja

No topo do JSON, em `"loja"`:

| Campo | Para que serve |
|---|---|
| `whatsapp` | Número com código do país e DDD, só dígitos. **Hoje está `5500000000000` — troque.** |
| `mensagemPadrao` | Texto que já vai digitado no WhatsApp. Aceita `{pedido}` e `{link}` |
| `mensagemPreVenda` | O mesmo, para produto em pré-venda |
| `paletaCores`, `coresPadrao` | As cores que todo produto aceita |
| `avisoFrete` | Aparece na página de cada produto e no rodapé |
| `prazoEntrega` | Linha pequena ao lado do preço |
| `instagram`, `email` | Se preenchidos, viram botões no rodapé |

## O que ainda falta

- **Número do WhatsApp.** Está no placeholder; todo botão do site aponta para ele.
- **Fotos reais** de três peças: `capivara` e `ornamentos-cafe` (sem foto
  nenhuma), e `latteshot` (a capa é um render, não uma foto).
- **Foto da `bandeja-cafe`.** As duas pastas de bandeja vieram com o mesmo
  thumbnail, e ele não corresponde ao produto (é a foto de um copo dosador).
- **Dimensões e peso** na ficha técnica de cada peça. Os campos já estão lá,
  vazios; enquanto estiverem vazios, a linha simplesmente não aparece no site.
- **Conferir "Material: Bioplástico PLA"** na ficha, caso você prefira outra
  forma de descrever.
- **Revisar os 53 preços.** Foram estimados por tamanho e complexidade —
  são um ponto de partida, não um valor fechado.
