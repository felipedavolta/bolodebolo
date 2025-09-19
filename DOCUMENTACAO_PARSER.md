# Documentação do Parser de Relatórios de Vendas

## Visão Geral

Este documento descreve a implementação do parser de relatórios de vendas para duas lojas: **Loja** e **Quiosque**. O parser é uma ferramenta web que interpreta relatórios de vendas e extrai dados estruturados para transferência para planilhas.

## Estrutura do Projeto

```
Web/
├── index.html          # Interface do usuário
├── script.js           # Lógica principal do parser
├── styles.css          # Estilos da interface
└── Logo Bolo de Bolo 2025 Cor Small.png
```

## Funcionalidades Principais

### 1. Interpretação de Relatórios
- **Loja**: Relatórios com formato específico para loja física, incluindo seções BOLO, BOLOS IFOOD, ALIMENTOS, BEBIDAS, FATIAS e ARTIGOS DE FESTA
- **Quiosque**: Relatórios com categorias de produtos (BEBIDAS, BOLOS, BOLOS IFOOD, FATIAS, etc.)

### 2. Extração de Dados
- Quantidades de produtos vendidos por categoria
- Valores de faturamento por categoria com cálculo preciso
- Consolidação automática de categorias relacionadas (BOLOS + BOLOS IFOOD)
- Acréscimos e descontos
- Totalizadores gerais

### 3. Saída Formatada
- Lista de números formatados para clipboard
- Dashboard com resumo visual **consistente** com os valores extraídos
- Validação cruzada entre diferentes métodos de extração

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
- ✅ Parser do Quiosque: Funcionando corretamente
- ✅ Parser da Loja: Funcionando corretamente  
- ✅ Sistema de faturamento: Consistente entre resumo e clipboard
- ✅ Logs de debugging: Implementados e funcionais
- ✅ Documentação: Atualizada com correções
