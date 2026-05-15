# Documentação Técnica do Parser de Relatórios

## Visão Geral

Parser web modular para relatórios de vendas da **Barra Olímpica** (Raffinato) e **Shopping Millennium** (RaffinatoCore). Detecta automaticamente o sistema de origem, extrai quantidades e faturamento por categoria e exibe alertas para sabores não reconhecidos.

---

## Estrutura do Projeto

```
bolodebolo/
├── index.html       # Interface principal
├── main.js          # Ponto de entrada — chama init()
├── ui.js            # Orquestração, estado e exibição
├── parsers.js       # Funções de parsing (Millennium + Barra)
├── constants.js     # bolosList e specialBolos
└── styles.css       # Estilos e responsividade
```

### `constants.js`
- **`bolosList`**: array de pares `[nome_regular, nome_ifood]` para cada sabor cadastrado
- **`specialBolos`**: bolos sem variante iFood mapeada (SF, tabuleiro, etc.)

### `parsers.js`
Exporta duas funções principais:
- `processSalesReport(text)` — Millennium
- `parseStoreReport(text)` — Barra Olímpica

### `ui.js`
- Detecção do tipo de relatório
- Chamada dos parsers
- Atualização do resumo de bolos e do alerta de não reconhecidos
- Gerenciamento de estado por loja

---

## Parsers

### `processSalesReport(text)` — Millennium

**Fluxo:**
1. Extrai data do cabeçalho
2. Extrai faturamento por categoria com sistema de múltiplas camadas
3. Processa cada linha de produto via `processProductLine()`
4. Gera array de saída via `generateOutput()`
5. Detecta sabores não reconhecidos

**Retorno:**
```javascript
{
    result: string,       // Saída formatada para planilha
    stats: {
        bolosLoja: number,
        bolosIfood: number,
        unknownBolos: [{ name: string, qty: number }],
        revenue: { total, bebidas, alimentos, bolos, artigos, fatias, acrescimo, desconto }
    }
}
```

### `parseStoreReport(text)` — Barra Olímpica

**Fluxo:**
1. Extrai totais gerais (vendas, desconto, acréscimo)
2. Divide o texto em seções por categoria
3. Faz parse dos itens de cada seção
4. Consolida bolos regulares + iFood em `allBolos`
5. Detecta sabores não reconhecidos

**Retorno:**
```javascript
{
    result: string,
    stats: {
        bolosQty: number,   // Total de bolos vendidos (quantidade)
        unknownBolos: [{ name: string, qty: number }],
        dateRange: { start, end },
        revenue: { total, bebidas, alimentos, bolos, artigos, fatias, acrescimo, desconto }
    }
}
```

---

## Detecção de Sabores Não Reconhecidos

### Millennium
Após processar todas as linhas, compara as chaves de `bolosRegular` e `bolosIfood` contra os conjuntos conhecidos derivados de `bolosList` e `specialBolos`:

```javascript
const knownRegularBolos = new Set([
    ...bolosList.map(([r]) => r),
    ...specialBolos,
    'GANACHE 200G', 'GANACHE 100G', 'BRIGADEIRO'
]);
const knownIfoodBolos = new Set([
    ...bolosList.map(([, i]) => i),
    'GANACHE 200G I', 'GANACHE 100G I'
]);

const unknownBolos = [
    ...Object.keys(bolosRegular)
        .filter(n => !knownRegularBolos.has(n))
        .map(n => ({ name: n, qty: bolosRegular[n] })),
    ...Object.keys(bolosIfood)
        .filter(n => !knownIfoodBolos.has(n))
        .map(n => ({ name: n, qty: bolosIfood[n] }))
];
```

### Barra Olímpica
Durante o processamento das seções BOLO e BOLOS IFOOD, qualquer item cujo nome normalizado não exista em `allBolos` é coletado:

```javascript
if (normalizedName in allBolos) {
    allBolos[normalizedName].qty = Number(item.quantity) || 0;
} else {
    unknownBolos.push({ name: normalizedName, qty: Number(item.quantity) || 0 });
}
```

### Exibição e Persistência (ui.js)

O estado é mantido por loja:
```javascript
const unknownState = { loja: [], quiosque: [] };
```

A cada relatório processado, apenas o estado da loja correspondente é atualizado. O alerta exibe a união dos dois estados e só desaparece quando ambos estão vazios:

```javascript
function updateUnknownAlert() {
    const all = [...unknownState.loja, ...unknownState.quiosque];
    if (all.length > 0) {
        const lista = all.map(b => `${b.name} (${b.qty})`).join(', ');
        unknownBolosDiv.textContent = `Não reconhecidos: ${lista}`;
        unknownBolosDiv.style.display = 'block';
    } else {
        unknownBolosDiv.style.display = 'none';
    }
}
```

---

## Resumo de Bolos

Substituiu a tabela de faturamento. Exibe três células:

| Barra | Millennium | Total |
|-------|------------|-------|

- **Barra**: `stats.bolosQty` do parser da loja
- **Millennium**: `stats.bolosLoja + stats.bolosIfood` do parser do quiosque
- **Total**: soma dos dois

O resumo só aparece (classe `.visible`) após pelo menos um relatório ser processado.

---

## Sistema de Extração Multi-Camadas (Millennium)

Quando um método não encontra o valor, o próximo é tentado automaticamente:

| Camada | Função | Estratégia |
|--------|--------|------------|
| 1 | `extractFaturamentoQuiosque` | Busca seção exata + linha "Total" |
| 2 | `extractSectionValue` | Localiza início/fim de seção por nome |
| 3 | `extractValueByLabel` | Busca por label no texto, multi-linha |
| 4 | `extractTotalizadorValue` | Seção "Totalizadores Gerais" |

---

## Formato de Saída

### Millennium (`processSalesReport`)
Array de valores separados por `\n`:
- Posições 0–(n-1): Quantidades por sabor (ordem de `bolosList` + `specialBolos`)
- Sequência de extras: GANACHE 200G, GANACHE 100G, GANACHE 200G I, GANACHE 100G I, BRIGADEIRO
- Fatias: regular, integral, aipim, quadradinho
- Dia do mês
- Faturamento: total, bebidas, alimentos, bolos, artigos, fatias, acréscimo, desconto

### Barra Olímpica (`parseStoreReport`)
Mesma estrutura de posições para quantidades, seguida por caldas/brigadeiro, fatias, dia do mês e faturamento.

---

## Adicionando Novos Sabores

1. Adicionar par `['BOLO NOME', 'BOLO NOME I']` em `bolosList` em `constants.js`
2. Para bolos sem variante iFood: adicionar em `specialBolos`
3. Caso o nome no sistema seja diferente do padrão, adicionar normalização em `normalizeProductName()` (Millennium) ou no loop de `sectionData.bolos` (Barra)

---

## Tratamento de Erros

- Relatório já processado (apenas números): erro explícito ao usuário
- Formato desconhecido: badge de erro + mensagem
- Erros de parsing: capturados com `try/catch`, exibidos no `#error`
- Valores ausentes: retornam `0` via `parseValue()`

---

## Compatibilidade

- Navegadores modernos com suporte a ES Modules
- Clipboard API com fallback `execCommand` para Safari
- Responsivo (mobile-first, border-radius preservado em telas pequenas)
- Modo escuro via `prefers-color-scheme` + toggle manual com persistência em `localStorage`

---

## Changelog

### 14/05/2026
- Detecção de sabores não reconhecidos com nome e quantidade
- Alerta persistente por loja (só some quando as duas estiverem sem itens faltantes)
- Substituída tabela de faturamento pelo resumo compacto de bolos (Barra / Millennium / Total)
- `parseStoreReport` retorna `bolosQty` (total de unidades de bolos)
- Botões mantêm `border-radius` arredondado em telas pequenas

### Versões anteriores
- Interface unificada com campo único e detecção automática de loja
- Refatoração em módulos ES (`constants.js`, `parsers.js`, `ui.js`, `main.js`)
- Sistema multi-camadas de extração de faturamento para o Millennium
- Correção de inconsistência entre resumo e clipboard na Barra Olímpica
