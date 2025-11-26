# Documentação do Parser de Relatórios de Vendas

## Visão Geral

Este documento descreve a implementação do parser de relatórios de vendas para duas lojas: **Barra Olímpica** (sistema Raffinato) e **Shopping Millennium** (sistema RaffinatoCore). O parser é uma ferramenta web inteligente que interpreta relatórios de vendas, extrai dados estruturados e fornece feedback visual em tempo real.

## Estrutura do Projeto

```
bolodebolo/
├── index.html          # Interface do usuário com navegação
├── script.js           # Lógica de parsing, validação e feedback
├── styles.css          # Estilos responsivos e animações
├── README.md           # Documentação de uso
├── DOCUMENTACAO_PARSER.md  # Este arquivo (documentação técnica)
└── Logo Bolo de Bolo 2025 Cor Small.png
```

## Funcionalidades Principais

### 1. Detecção Automática de Relatórios
- **Barra Olímpica** (Raffinato): Detecta padrões específicos (Vendas:, Desconto:, Acréscimo:)
- **Shopping Millennium** (RaffinatoCore): Detecta padrões (Total Geral, Totalizadores Gerais, Impresso em)
- **Auto-correção**: Move automaticamente relatórios colados no campo errado
- **Validação**: Rejeita resultados já processados (apenas números)

### 2. Extração de Dados
- Quantidades de produtos vendidos por categoria (41 sabores de bolos)
- Valores de faturamento por categoria com precisão de centavos
- Consolidação automática de categorias relacionadas (BOLOS + BOLOS IFOOD)
- Acréscimos, descontos e taxa de entrega
- Totalizadores gerais e impostos

### 3. Interface e Feedback Visual
- **Estados do botão**: Desabilitado (cinza) → Pronto (verde) → Copiado (borda verde)
- **Animações**: Pulsação quando pronto, vibração quando erro
- **Notificações**: Verde para sucesso, vermelho para erro
- **Dashboard em tempo real**: Atualização imediata dos totais
- **Modo escuro**: Adapta-se automaticamente às preferências do sistema

## Arquitetura do Parser

### Função Principal: `processSalesReport(text)`

Função central que orquestra todo o processo de parsing para **relatórios do Quiosque**:

```javascript
function processSalesReport(text) {
    // 1. Inicialização de variáveis
    // 2. Extração de faturamento (Quiosque)
    // 3. Processamento linha por linha
    // 4. Consolidação de dados
    // 5. Geração de saída
}
```

### Função Principal: `parseStoreReport(text)`

Função central que orquestra todo o processo de parsing para **relatórios da Loja**:

```javascript
function parseStoreReport(text) {
    // 1. Extração de totais (vendas, desconto, acréscimo)
    // 2. Parsing de seções por categoria
    // 3. Consolidação de bolos regulares + iFood
    // 4. Cálculo preciso de faturamento por categoria
    // 5. Retorno de dados estruturados
}
```

### Sistema de Extração Multi-Camadas

O parser utiliza uma abordagem de **múltiplas estratégias** com fallback automático:

#### Camada 1: Extração Específica por Categoria
```javascript
function extractFaturamentoQuiosque(text, categoria)
```
- Procura por seções específicas (BEBIDAS, BOLOS, etc.)
- Identifica linhas de total correspondentes
- Extrai valores monetários precisos

#### Camada 2: Extração por Seção
```javascript
function extractSectionValue(text, sectionName)
```
- Localiza início e fim de seções
- Pula cabeçalhos de tabela
- Procura por linhas que começam com "Total"

#### Camada 3: Extração por Label
```javascript
function extractValueByLabel(text, label, isCurrency, isQuantity)
```
- Busca por labels específicos no texto
- Múltiplas estratégias de matching
- Suporte para busca multi-linha

#### Camada 4: Extração de Totalizadores
```javascript
function extractTotalizadorValue(text, itemName)
```
- Procura na seção "Totalizadores Gerais"
- Extrai acréscimos, descontos e totais
- Regex otimizada para valores finais

## Mapeamento de Produtos

### Categorias de Bolos
O parser consolida automaticamente as categorias:
- **BOLOS** + **BOLOS iFood** = Total de Bolos
- Produtos individuais somados por sabor (ex: BOLO AIPIM + BOLO AIPIM I)

### Produtos Especiais
- **Ganache/Calda**: Não somadas entre categorias normais e iFood
- **Fatias**: Consolidadas (FATIA + FATIA PROMO + FATIA MINI)
- **Produtos SF**: Sem açúcar, categoria separada

## Algoritmo de Parsing

### 1. Pré-processamento
```javascript
// Divisão em linhas
const lines = text.split(/\r?\n/);

// Identificação de seções
const potentialHeaders = text.match(/^[A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚ\s]{10,}$/gm);
```

### 2. Extração de Faturamento (Quiosque)
```javascript
// Estratégia primária
faturamentoBebidas = extractFaturamentoQuiosque(text, 'BEBIDAS');

// Fallback automático
if (faturamentoBebidas === 0) {
    faturamentoBebidas = extractSectionValue(text, 'BEBIDAS');
}
```

### 3. Processamento Linha por Linha
```javascript
for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Identificação de seção atual
    if (isProductSection(line)) {
        currentSection = line;
        continue;
    }
    
    // Extração de produtos
    if (currentSection && isProductLine(line)) {
        processProductLine(line, currentSection);
    }
}
```

### 4. Consolidação de Dados
```javascript
// Soma de categorias relacionadas
const boloTotal = bolosRegular[sabor] + (bolosIfood[sabor] || 0);

// Validação de consistência
if (totalCalculado !== totalExtraido) {
    console.warn('Inconsistência detectada');
}
```

## Funções Utilitárias

### `parseValue(str)`
Converte strings numéricas brasileiras para números:
```javascript
// "1.234,56" → 1234.56
// "1,50" → 1.5
// "100" → 100
```

### `escapeRegExp(string)`
Escapa caracteres especiais para uso em regex:
```javascript
// "BOLOS IFOOD" → "BOLOS IFOOD"
// "R$ 1.000,00" → "R\\$ 1\\.000,00"
```

### `formatBrazilianCurrency(value)`
Formata números como moeda brasileira:
```javascript
// 1234.56 → "1.234,56"
// 0 → "0,00"
```

## Estratégias de Extração Robusta

### 1. Identificação de Seções
```javascript
// Busca exata por nome da seção
if (line.toLowerCase() === sectionName.toLowerCase()) {
    inSection = true;
}
```

### 2. Detecção de Fim de Seção
```javascript
// Nova seção detectada
if (line.match(/^[A-ZÁÉÍÓÚÀÂÊÔÃÇ\s]+$/) && 
    line.length > 5 && 
    !line.toLowerCase().includes('total')) {
    break; // Fim da seção atual
}
```

### 3. Extração de Totais
```javascript
// Procura por linha que inicia com "Total"
if (line.toLowerCase().startsWith('total ')) {
    const numbers = line.match(/[\d.,]+/g);
    if (numbers && numbers.length >= 3) {
        // Último número = valor monetário
        return parseValue(numbers[numbers.length - 1]);
    }
}
```

### 4. Filtragem de Cabeçalhos
```javascript
// Pula cabeçalhos de tabela
if (line.toLowerCase().includes('código') || 
    line.toLowerCase().includes('produto') ||
    line.toLowerCase().includes('unidade')) {
    continue;
}
```

## Sistema de Logging

### Níveis de Log
- **[Log]**: Informações normais do processo
- **[Warning]**: Situações que podem indicar problemas
- **[Error]**: Erros que impedem o funcionamento

### Categorias de Log
```javascript
console.log('[extractFaturamentoQuiosque] Procurando faturamento para "BEBIDAS"');
console.log('[extractSectionValue] ✓ Encontrada seção "BOLOS"');
console.warn('[extractValueByLabel] ❌ Label "ALIMENTOS" não encontrada');
```

## Formato de Saída

### Array de Resultados
O parser gera um array de 60 posições com:
- Posições 0-52: Quantidades de produtos por sabor
- Posição 53: Faturamento BEBIDAS
- Posição 54: Faturamento ALIMENTOS  
- Posição 55: Faturamento BOLOS (consolidado)
- Posição 56: Faturamento ARTIGOS FESTA
- Posição 57: Faturamento FATIAS
- Posição 58: Acréscimos
- Posição 59: Descontos

### Regras de Formatação
- Números decimais com ponto (ex: "123.45")
- Linhas em branco representadas como strings vazias
- Valores zero como "0" ou "0.00" conforme contexto

## Tratamento de Erros

### Estratégias de Recuperação
1. **Fallback entre métodos**: Se um método falha, tenta o próximo automaticamente
2. **Validação cruzada**: Compara resultados de diferentes estratégias 
3. **Logs detalhados**: Permite debugging preciso com indicação do método usado
4. **Valores padrão**: Retorna 0 quando não encontra dados
5. **Consistência de faturamento**: Sistema corrigido garante que resumo e clipboard usem a mesma lógica

### Casos Especiais
- Relatórios com formatação não padrão
- Seções ausentes ou renomeadas  
- Valores com formatação inconsistente
- Caracteres especiais em nomes de produtos
- **Inconsistência entre linha "Vendas:" e soma por categoria** (corrigido)

## Performance

### Otimizações Implementadas
- Processamento linha por linha (O(n))
- Regex compiladas uma vez
- Parada antecipada quando seção termina
- Cache de resultados intermediários

### Complexidade
- **Temporal**: O(n×m) onde n = linhas, m = categorias
- **Espacial**: O(n) para armazenamento temporário

## Manutenção

### Adicionando Novos Produtos
1. Adicionar ao mapeamento de produtos
2. Atualizar função de consolidação
3. Ajustar índices do array de saída
4. Testar com relatórios reais

### Modificando Categorias
1. Atualizar funções de extração
2. Ajustar regex de identificação
3. Modificar lógica de consolidação
4. Atualizar documentação

## Debugging

### Console do Desenvolvedor
O parser fornece logs detalhados no console do navegador:
```javascript
// Logs de extração para Quiosque
[extractFaturamentoQuiosque] Procurando faturamento para "BEBIDAS"
[extractSectionValue] ✓ Encontrada seção "BOLOS" 
[extractValueByLabel] ❌ Label "ALIMENTOS" não encontrada

// Logs de cálculo para Loja  
[Loja] Usando faturamento calculado corretamente: 1250.75
[Loja] Bolos revenue: 490.00 → Total bolos revenue: 638.00

// Ativar modo debug adicional
const DEBUG_MODE = true;
console.log('[DEBUG] Valor extraído:', valor, 'da linha:', linha);
```

### Pontos de Breakpoint Recomendados
- Início de `processSalesReport()` (para Quiosque)
- Início de `parseStoreReport()` (para Loja)
- Dentro de `extractFaturamentoQuiosque()` 
- No loop principal de processamento
- **Cálculo de `revenues` em `parseStoreReport()`** (novo)
- **Seleção de método de faturamento em `processInputLoja()`** (novo)
- Na geração do array final

## Considerações Técnicas

### Compatibilidade
- Navegadores modernos (ES6+)
- Clipboard API (requer HTTPS ou localhost)
- FileReader API para upload de arquivos

### Limitações
- Tamanho máximo de arquivo: ~10MB
- Formatação específica dos relatórios
- Dependente da estrutura textual dos relatórios

### Segurança
- Processamento local (sem envio para servidor)
- Não persiste dados sensíveis
- Validação de entrada básica

---

## Exemplos de Uso

### Relatório Quiosque Típico
```
BEBIDAS
Código Produto Unidade Val. unit. médio Qtd. vendida Valor total
401 CAFÉ UNID 7,50 1,000 7,50
Total 7,50 1,000 7,50

BOLOS
Código Produto Unidade Val. unit. médio Qtd. vendida Valor total
111 BOLO CENOURA UNID 40,00 2,000 80,00
Total 354,00 16,000 490,00
```

### Saída Esperada
```
Posição 53 (BEBIDAS): 7.50
Posição 55 (BOLOS): 490.00
```

Esta implementação garante extração robusta e confiável de dados de relatórios de vendas, com múltiplas camadas de validação e recuperação de erros.

## Sistema de Faturamento Corrigido

### Problema Anterior
O sistema tinha inconsistência entre os valores de faturamento exibidos no resumo da loja versus os valores enviados para o clipboard. O resumo estava usando apenas as linhas "Vendas:" e "Acréscimo:" do relatório, ignorando o cálculo detalhado por categoria.

### Solução Implementada

#### Para Relatórios da Loja (`parseStoreReport`)
```javascript
// Cálculo correto por categoria
const revenues = [
    parseBRNumber(revenueMatches.bebidas?.[1]),      // Bebidas
    parseBRNumber(revenueMatches.alimentos?.[1]),    // Alimentos  
    bolosValue + bolosIFoodValue,                    // Bolos consolidado
    parseBRNumber(revenueMatches.artigos?.[1]),      // Artigos de festa
    parseBRNumber(revenueMatches.fatias?.[1]),       // Fatias
    totals.acrescimo,                                // Acréscimo
    -totals.desconto                                 // Desconto (negativo)
];

// Retorna estrutura completa
return {
    result: result.trim(),
    stats: {
        revenue: {
            total: revenues.reduce((sum, val) => sum + val, 0),
            bebidas: revenues[0],
            alimentos: revenues[1], 
            bolos: revenues[2],
            artigos: revenues[3],
            fatias: revenues[4],
            acrescimo: revenues[5],
            desconto: revenues[6]
        }
    }
};
```

#### Uso Consistente em `processInputLoja`
```javascript
// ✅ Prioriza o cálculo correto
if (stats && stats.revenue && stats.revenue.total !== undefined) {
    totalFaturado = stats.revenue.total;
    console.log('[Loja] Usando faturamento calculado corretamente:', totalFaturado);
} else {
    // Fallback para método antigo
    totalFaturado = parseValue(vendaMatch[1]) + parseValue(acrescimoMatch[1]);
    console.log('[Loja] Usando método de fallback:', totalFaturado);
}
```

#### Para Relatórios do Quiosque
O sistema já funcionava corretamente com o sistema multi-camadas de extração implementado:
1. `extractFaturamentoQuiosque()` - Método principal
2. `extractSectionValue()` - Fallback por seção  
3. `extractValueByLabel()` - Fallback por label
4. `extractTotalizadorValue()` - Para totalizadores

### Benefícios da Correção
- **Consistência**: Resumo e clipboard usam a mesma lógica de cálculo
- **Precisão**: Soma real de todas as categorias ao invés de linha única
- **Robustez**: Sistema de fallback mantido para compatibilidade
- **Rastreabilidade**: Logs indicam qual método está sendo usado

---

## Changelog - Versão Atual

### ✅ Correções Implementadas

#### Faturamento do Quiosque
- Implementação de sistema multi-camadas de extração
- Função `extractFaturamentoQuiosque()` para detecção precisa de seções
- Melhorias em `extractSectionValue()` e `extractValueByLabel()`
- Logs detalhados para debugging de extração

#### Faturamento da Loja  
- **CORRIGIDO**: Inconsistência entre resumo e clipboard
- `parseStoreReport()` agora retorna estrutura completa de `revenue`
- `processInputLoja()` usa cálculo correto por categoria
- Sistema de fallback mantido para compatibilidade
- Logs indicam qual método de cálculo está sendo usado

#### Robustez Geral
- Melhor detecção de cabeçalhos de tabela
- Pulos automáticos de linhas irrelevantes  
- Regex mais precisas para extração de valores
- Validação cruzada entre métodos

### 🔍 Problemas Resolvidos
1. ~~Valores de faturamento sempre zerados no Quiosque~~ ✅
2. ~~Parser capturava cabeçalhos ao invés de totais~~ ✅  
3. ~~Inconsistência entre resumo e clipboard na Loja~~ ✅
4. ~~Extração imprecisa de valores com vírgulas~~ ✅

### 📋 Status Atual
- ✅ Parser do Shopping Millennium: Funcionando corretamente
- ✅ Parser da Barra Olímpica: Funcionando corretamente  
- ✅ Sistema de faturamento: Consistente entre resumo e clipboard
- ✅ Validação automática: Detecta e move relatórios para campo correto
- ✅ Feedback visual: Estados do botão e animações implementadas
- ✅ Interface unificada: Design consistente em todos os botões
- ✅ Logs de debugging: Implementados e funcionais
- ✅ Documentação: Atualizada com todas as funcionalidades

## Sistema de Validação e Feedback

### Validações Automáticas

#### 1. Detecção de Tipo de Relatório
```javascript
// Detecta relatório da Barra Olímpica (Raffinato)
if (text.includes('Vendas:') && text.includes('Desconto:') && 
    !text.includes('Total Geral')) {
    // Move para campo da Barra Olímpica
}

// Detecta relatório do Shopping Millennium (RaffinatoCore)
if (text.includes('Total Geral') || text.includes('Totalizadores Gerais')) {
    // Move para campo do Shopping Millennium
}
```

#### 2. Validação de Resultado Processado
```javascript
// Verifica se é resultado já processado (apenas números)
const numbersOnly = lines.every(line => /^[\d.,]+$/.test(line.trim()));
if (numbersOnly && lines.length > 10) {
    throw new Error('Resultado já processado detectado');
}
```

### Estados do Botão "Copiar Resultado"

#### Estado 1: Desabilitado (`.button-disabled`)
- **Aparência**: Fundo cinza (`#e5e7eb`), texto cinza claro
- **Quando**: Antes de colar, campo vazio, ou erro no processamento
- **Cursor**: `not-allowed`

#### Estado 2: Pronto (`.button-ready`)
- **Aparência**: Fundo verde (`#059669`), texto branco
- **Animação**: Pulsação 3 vezes (`@keyframes pulse`)
- **Quando**: Após processar relatório válido
- **Interação**: Clicável para copiar

#### Estado 3: Copiado (`.button-copied`)
- **Aparência**: Fundo branco, borda verde (`#059669`), texto verde
- **Texto**: Muda para "Copiado!"
- **Quando**: Após clicar no botão
- **Duração**: Permanece até o textarea ser modificado

### Animações e Feedback Visual

#### Animação de Sucesso (`.textarea-success`)
```css
@keyframes highlight {
    0% { border-color: #10b981; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
    50% { border-color: #10b981; box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
    100% { border-color: var(--border); }
}
```
- **Quando**: Relatório movido automaticamente para campo correto
- **Efeito**: Borda verde com expansão de shadow (efeito "ripple")
- **Duração**: 1 segundo

#### Animação de Erro (`.textarea-error`)
```css
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
    20%, 40%, 60%, 80% { transform: translateX(8px); }
}
```
- **Quando**: Erro no processamento, resultado já processado, campo errado
- **Efeito**: Vibração horizontal + borda vermelha
- **Duração**: 0.5 segundos

#### Notificações
```javascript
// Notificação de sucesso (verde)
errorDiv.style.background = 'var(--green-light)';  // #d1fae5
errorDiv.style.color = 'var(--green-text)';        // #065f46
errorDiv.textContent = '✓ Relatório movido para o campo correto!';

// Notificação de erro (vermelho)
errorDiv.style.background = '#fee2e2';
errorDiv.style.color = '#dc2626';
errorDiv.textContent = 'Erro ao processar relatório';
```

## Design System

### Paleta de Cores Padronizada
```css
:root {
    --green-dark:  #14532d;  /* Verde escuro (emerald-900) */
    --green-base:  #10b981;  /* Verde base (emerald-500) */
    --green-hover: #059669;  /* Verde hover/ativo (emerald-600) */
    --green-text:  #065f46;  /* Verde texto (emerald-800) */
    --green-light: #d1fae5;  /* Verde claro (emerald-100) */
}
```

### Consistência Visual
- Todos os botões compartilham o mesmo estilo base
- Hover: `#059669` (verde sólido, sem gradiente)
- Border-radius: `24px` (consistente)
- Padding: `12px 20px` (consistente)
- Box-shadow: `0 1px 2px rgba(0,0,0,0.05)` (consistente)

## Otimizações para Safari/macOS

### Scrollbar Oculta
```css
textarea::-webkit-scrollbar { display: none; }
textarea { scrollbar-width: none; }
```

### Clipboard API com Fallback
```javascript
// Tenta API moderna
await navigator.clipboard.writeText(text);

// Fallback para Safari (execCommand)
const textArea = document.createElement('textarea');
textArea.value = text;
document.body.appendChild(textArea);
textArea.select();
document.execCommand('copy');
document.body.removeChild(textArea);
```

## Navegação

### Links para Sistemas
- **Barra Olímpica**: https://gestor.raffinato.inf.br/ProdutosFaturados/Relatorio
- **Shopping Millennium**: https://gestor.raffinatocore.com/report/order/products-sold

### Última Modificação
- Exibido no rodapé da página
- Formato: "Atualizado em DD/MM/YYYY - HH:MM"
- Gerado automaticamente via JavaScript
