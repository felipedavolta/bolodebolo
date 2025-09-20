// Helper functions and constants at top level
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\\\\\\]\\\\]/g, '\\\\$&'); // $& means the whole matched string
}

function parseValue(value) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;
    // Remove parentheses and content within them (e.g., percentages)
    value = value.replace(/\\s*\\(.*\\)/g, '').trim();
    // Normalize decimal and thousands separators
    // If it contains a comma and a dot, assume dot is thousands and comma is decimal (e.g., 1.234,56)
    if (value.includes(',') && value.includes('.')) {
        if (value.lastIndexOf('.') < value.lastIndexOf(',')) {
            // Dot is thousands, comma is decimal
            value = value.replace(/\\./g, '').replace(',', '.');
        } else {
            // Comma is thousands, dot is decimal
            value = value.replace(/,/g, '');
        }
    } else {
        // Only comma or only dot (or neither)
        value = value.replace(',', '.'); // Assume comma is decimal if it's the only one
    }
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
}

const bolosList = [
    ['BOLO AIPIM', 'BOLO AIPIM I'],
    ['BOLO AMENDOIM', 'BOLO AMENDOIM I'],
    ['BOLO AMENDOIM MINI', 'BOLO AMENDOIM MINI I'],
    ['BOLO BANANA AVEIA', 'BOLO BANANA AVEIA I'],
    ['BOLO BANANA', 'BOLO BANANA I'],
    ['BOLO BANANA MINI', 'BOLO BANANA MINI I'],
    ['BOLO BOLO', 'BOLO BOLO I'],
    ['BOLO BOLO MINI', 'BOLO BOLO MINI I'],
    ['BOLO CACAU INTEGRAL', 'BOLO CACAU INTEGRAL I'],
    ['BOLO CENOURA', 'BOLO CENOURA I'],
    ['BOLO CENOURA MINI', 'BOLO CENOURA MINI I'],
    ['BOLO CENOURA C', 'BOLO CENOURA C I'],
    ['BOLO CHOCOLATE', 'BOLO CHOCOLATE I'],
    ['BOLO CHOCOLATE MINI', 'BOLO CHOCOLATE MINI I'],
    ['BOLO CHUVA', 'BOLO CHUVA I'],
    ['BOLO CHUVA MINI', 'BOLO CHUVA MINI I'],
    ['BOLO COCO', 'BOLO COCO I'],
    ['BOLO COCO MINI', 'BOLO COCO MINI I'],
    ['BOLO FORMIGUEIRO', 'BOLO FORMIGUEIRO I'],
    ['BOLO FORMIGUEIRO MINI', 'BOLO FORMIGUEIRO MINI I'],
    ['BOLO FUBÁ', 'BOLO FUBÁ I'],
    ['BOLO FUBÁ MINI', 'BOLO FUBÁ MINI I'],
    ['BOLO LARANJA', 'BOLO LARANJA I'],
    ['BOLO LARANJA MINI', 'BOLO LARANJA MINI I'],
    ['BOLO LARANJA C', 'BOLO LARANJA C I'],
    ['BOLO LIMÃO', 'BOLO LIMÃO I'],
    ['BOLO LIMÃO MINI', 'BOLO LIMÃO MINI I'],
    ['BOLO MESCLADO', 'BOLO MESCLADO I'],
    ['BOLO MESCLADO MINI', 'BOLO MESCLADO MINI I'],
    ['BOLO MILHO', 'BOLO MILHO I'],
    ['BOLO MILHO MINI', 'BOLO MILHO MINI I'],
    ['BOLO NOZES', 'BOLO NOZES I'],
    ['BOLO NOZES MINI', 'BOLO NOZES MINI I']
];

const specialBolos = [
    'BOLO SF BOLO DE BOLO',
    'BOLO SF CENOURA',
    'BOLO SF CHOCOLATE',
    'BOLO SF NOZES',
    'BOLO AIPIM TABULEIRO',
    'BOLINHO PRESENTE'
];

function getTotalFromSection(text, sectionName) {
    const sectionRegex = new RegExp(`${sectionName}[\\s\\S]*?Total[^\\n]*?(\\d+[.,]\\d+)`, 'g');
    let lastTotal = 0;
    let match;
    
    // Encontrar todas as ocorrências e pegar a última
    while ((match = sectionRegex.exec(text)) !== null) {
        lastTotal = parseValue(match[1]);
    }
    
    return lastTotal;
}

function extractSectionTotal(text, sectionName) {
    // Parser linha a linha robusto
    const lines = text.split(/\r?\n/);
    let inSection = false;
    let lastTotal = 0;
    const sectionNameUpper = sectionName.toUpperCase();
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Detecta início da seção (linha igual ao nome, ignorando espaços)
        if (line.replace(/\s+/g, ' ').toUpperCase() === sectionNameUpper) {
            inSection = true;
            continue;
        }
        // Se não encontrou a seção exatamente, tenta encontrar por substring
        if (!inSection && line.toUpperCase().includes(sectionNameUpper)) {
            inSection = true;
            continue;
        }
        // Detecta início de nova seção (linha toda em maiúsculas, pelo menos 3 letras, diferente da seção atual)
        if (inSection && /^[A-ZÁ-Ú ]{3,}$/.test(line) && !line.toUpperCase().includes(sectionNameUpper)) {
            break;
        }
        // Se estiver na seção, procura por linha 'Total ...'
        if (inSection && line.toUpperCase().startsWith('TOTAL') && !line.includes('Totalizadores Gerais') && !line.includes('Total Geral')) {
            // Pega o último número da linha
            const values = line.match(/[\d.,]+/g);
            if (values && values.length) {
                lastTotal = parseValue(values[values.length - 1]);
            }
        }
    }
    if (!lastTotal) {
        console.warn('Seção não encontrada ou sem total:', sectionName);
        // Log para debug: mostrar as linhas do relatório
        console.warn('Primeiras linhas do relatório:', lines.slice(0, 20).join('\n'));
        console.warn('Últimas linhas do relatório:', lines.slice(-20).join('\n'));
    } else {
        console.log('Seção:', sectionName, '| Valor extraído:', lastTotal);
    }
    return lastTotal;
}

function extractValueByLabel(text, label, isCurrency = false, isQuantity = false) {
    if (!text || !label) return isCurrency || isQuantity ? 0 : '';
    try {
        const lines = text.split(/\r?\n/);
        console.log(`[extractValueByLabel] Procurando por "${label}" em ${lines.length} linhas`);
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Strategy 1: Direct match at start of line "LABEL VALUE" or "LABEL - VALUE"
            const directRegex = new RegExp(`^${escapeRegExp(label)}\\s*(?:-|–|:|\\s)\\s*([\\d.,]+(?:\\s*\\([\\d.,%]+\\))?)`, 'i');
            let match = line.match(directRegex);
            if (match && match[1]) {
                console.log(`[extractValueByLabel] ✓ Direct match for "${label}": "${line}" → "${match[1]}"`);
                return parseValue(match[1]);
            }

            // Strategy 2: Line contains label - look for the total at the end
            if (line.toUpperCase().includes(label.toUpperCase())) {
                // Se a linha contém "Total", procura por padrão específico
                if (line.toLowerCase().includes('total')) {
                    // Procura por números após "total"
                    const totalMatch = line.match(/total[\s.:]*[\d.,]+[\s]*[\d.,]*[\s]*([\d.,]+)/i);
                    if (totalMatch && totalMatch[1]) {
                        const value = parseValue(totalMatch[1]);
                        if (value > 0) {
                            console.log(`[extractValueByLabel] ✓ Total match for "${label}": "${line}" → "${totalMatch[1]}"`);
                            return value;
                        }
                    }
                    
                    // Fallback: pega o último número se houver múltiplos números
                    const numbers = line.match(/[\d.,]+/g);
                    if (numbers && numbers.length >= 3) {
                        // Em linha como "Total 354,00 16,000 490,00", pega o último
                        const lastNumber = numbers[numbers.length - 1];
                        const value = parseValue(lastNumber);
                        if (value > 0) {
                            console.log(`[extractValueByLabel] ✓ Total fallback match for "${label}": "${line}" → "${lastNumber}"`);
                            return value;
                        }
                    }
                }
                
                // Pula linhas de cabeçalho
                if (line.toLowerCase().includes('código') || 
                    line.toLowerCase().includes('produto') ||
                    line.toLowerCase().includes('unidade')) {
                    continue;
                }
                
                // Extract all numbers from the line (not header)
                const numbers = line.match(/[\d.,]+/g);
                if (numbers && numbers.length > 0) {
                    // Para linhas de produto, pega o último número (valor total)
                    const lastNumber = numbers[numbers.length - 1];
                    const value = parseValue(lastNumber);
                    if (value > 0) {
                        console.log(`[extractValueByLabel] ✓ Contains match for "${label}": "${line}" → "${lastNumber}"`);
                        return value;
                    }
                }
            }

            // Strategy 3: Look for pattern where label is followed by spaces/dots and then value
            const spacedRegex = new RegExp(`${escapeRegExp(label)}[\\s.\\-–]*([\\d.,]+)`, 'i');
            match = line.match(spacedRegex);
            if (match && match[1]) {
                console.log(`[extractValueByLabel] ✓ Spaced match for "${label}": "${line}" → "${match[1]}"`);
                return parseValue(match[1]);
            }
        }

        // Strategy 4: Multi-line search - look for label on one line and value on next lines
        for (let i = 0; i < lines.length - 3; i++) {
            const line = lines[i].trim();
            
            if (line.toUpperCase().includes(label.toUpperCase())) {
                // Check next few lines for a Total line or numeric value
                for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
                    const nextLine = lines[j].trim();
                    
                    // Look for "Total" line
                    if (nextLine.toLowerCase().includes('total')) {
                        const totalMatch = nextLine.match(/total[\s.:]*([\\d.,]+)/i);
                        if (totalMatch && totalMatch[1]) {
                            console.log(`[extractValueByLabel] ✓ Multi-line Total match for "${label}": "${line}" + "${nextLine}" → "${totalMatch[1]}"`);
                            return parseValue(totalMatch[1]);
                        }
                    }
                    
                    // Look for pure numeric line
                    if (nextLine.match(/^[\\d.,]+$/)) {
                        console.log(`[extractValueByLabel] ✓ Multi-line numeric match for "${label}": "${line}" + "${nextLine}" → "${nextLine}"`);
                        return parseValue(nextLine);
                    }
                }
            }
        }

    } catch (e) {
        console.error(`[extractValueByLabel] Erro para label "${label}":`, e);
    }
    
    console.warn(`[extractValueByLabel] ❌ Label "${label}" não encontrada`);
    return isCurrency || isQuantity ? 0 : '';
}

// Nova função específica para extrair valores de seções do relatório quiosque
function extractSectionValue(text, sectionName) {
    console.log(`[extractSectionValue] Procurando seção "${sectionName}"`);
    
    const lines = text.split(/\r?\n/);
    let inSection = false;
    let sectionTotal = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Identifica início da seção - deve ser exatamente igual
        if (line.toLowerCase() === sectionName.toLowerCase()) {
            inSection = true;
            console.log(`[extractSectionValue] ✓ Encontrada seção "${sectionName}" na linha: "${line}"`);
            continue;
        }
        
        // Se estiver na seção, procura por valores
        if (inSection) {
            // Pula cabeçalho da tabela
            if (line.toLowerCase().includes('código') || 
                line.toLowerCase().includes('produto') ||
                line.toLowerCase().includes('unidade') ||
                line.toLowerCase().includes('qtd')) {
                console.log(`[extractSectionValue] Pulando cabeçalho: "${line}"`);
                continue;
            }
            
            // Verifica se é uma nova seção (linha toda em maiúsculas, sem números, com mais de 5 caracteres)
            if (line.match(/^[A-ZÁÉÍÓÚÀÂÊÔÃÇ\s]+$/) && line.length > 5 && 
                !line.toLowerCase().includes('total') && 
                !line.toLowerCase().includes('impresso')) {
                console.log(`[extractSectionValue] Fim da seção "${sectionName}" encontrado: "${line}"`);
                break;
            }
            
            // Procura especificamente por linhas que começam com "Total"
            if (line.toLowerCase().startsWith('total ')) {
                const numbers = line.match(/[\d.,]+/g);
                if (numbers && numbers.length >= 3) {
                    // Em uma linha de total típica: "Total 354,00 16,000 490,00"
                    // O último número é o valor total em dinheiro
                    sectionTotal = parseValue(numbers[numbers.length - 1]);
                    console.log(`[extractSectionValue] ✓ Total da seção "${sectionName}": ${sectionTotal} da linha: "${line}"`);
                    break;
                }
            }
        }
    }
    
    if (sectionTotal === 0) {
        console.warn(`[extractSectionValue] ❌ Não foi possível extrair valor da seção "${sectionName}"`);
    }
    
    return sectionTotal;
}

// Nova função para extrair valores dos totalizadores gerais
function extractTotalizadorValue(text, itemName) {
    console.log(`[extractTotalizadorValue] Procurando "${itemName}" nos totalizadores`);
    
    const lines = text.split(/\r?\n/);
    let inTotalizadores = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Identifica início dos totalizadores
        if (line.includes('Totalizadores Gerais')) {
            inTotalizadores = true;
            console.log(`[extractTotalizadorValue] ✓ Encontrada seção "Totalizadores Gerais"`);
            continue;
        }
        
        // Se estiver nos totalizadores, procura pelo item específico
        if (inTotalizadores) {
            if (line.toLowerCase().includes(itemName.toLowerCase())) {
                // Procura por padrão: "Texto ... valor,decimal"
                const valueMatch = line.match(/([\d.,]+)$/);
                if (valueMatch && valueMatch[1]) {
                    const value = parseValue(valueMatch[1]);
                    console.log(`[extractTotalizadorValue] ✓ ${itemName}: ${value} da linha: "${line}"`);
                    return value;
                }
                
                // Fallback: procura qualquer número na linha
                const numbers = line.match(/[\d.,]+/g);
                if (numbers && numbers.length > 0) {
                    const value = parseValue(numbers[numbers.length - 1]);
                    console.log(`[extractTotalizadorValue] ✓ ${itemName} (fallback): ${value} da linha: "${line}"`);
                    return value;
                }
            }
            
            // Para quando sair da seção de totalizadores
            if (line.toLowerCase().includes('impresso em') || 
                line.toLowerCase().includes('página')) {
                break;
            }
        }
    }
    
    console.warn(`[extractTotalizadorValue] ❌ Não foi possível extrair "${itemName}"`);
    return 0;
}

// Função específica para extrair faturamento por categoria do Quiosque
function extractFaturamentoQuiosque(text, categoria) {
    console.log(`[extractFaturamentoQuiosque] Procurando faturamento para "${categoria}"`);
    
    const lines = text.split(/\r?\n/);
    
    // Estratégia 1: Procurar pela categoria seguida de uma linha com total
    for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        
        // Verifica se a linha contém exatamente a categoria (não apenas includes)
        if (line.toLowerCase() === categoria.toLowerCase()) {
            console.log(`[extractFaturamentoQuiosque] Categoria "${categoria}" encontrada na linha: "${line}"`);
            
            // Procura nas próximas linhas por um total
            for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
                const nextLine = lines[j].trim();
                
                // Pula linhas vazias
                if (!nextLine) continue;
                
                // Pula cabeçalho da tabela
                if (nextLine.toLowerCase().includes('código') || 
                    nextLine.toLowerCase().includes('produto') ||
                    nextLine.toLowerCase().includes('unidade') ||
                    nextLine.toLowerCase().includes('qtd')) {
                    continue;
                }
                
                // Para na próxima categoria (linha em maiúsculas sem números)
                if (nextLine.match(/^[A-ZÁÉÍÓÚÀÂÊÔÃÇ\s]+$/) && nextLine.length > 5 && 
                    nextLine !== line && !nextLine.toLowerCase().includes('total') &&
                    !nextLine.toLowerCase().includes('impresso')) {
                    console.log(`[extractFaturamentoQuiosque] Próxima categoria encontrada: "${nextLine}"`);
                    break;
                }
                
                // Procura especificamente por linha que inicia com "Total"
                if (nextLine.toLowerCase().startsWith('total ')) {
                    const numbers = nextLine.match(/[\d.,]+/g);
                    if (numbers && numbers.length >= 3) {
                        // Em uma linha de total típica: "Total 354,00 16,000 490,00"
                        // O último número é o valor total em dinheiro
                        const value = parseValue(numbers[numbers.length - 1]);
                        if (value > 0) {
                            console.log(`[extractFaturamentoQuiosque] ✓ Total encontrado para "${categoria}": ${value} na linha: "${nextLine}"`);
                            return value;
                        }
                    }
                }
            }
        }
    }
    
    // Estratégia 2: Procurar por padrão "CATEGORIA ... TOTAL ... VALOR" em uma linha
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.toLowerCase().includes(categoria.toLowerCase()) && 
            line.toLowerCase().includes('total') &&
            !line.toLowerCase().includes('código') &&
            !line.toLowerCase().includes('produto')) {
            
            const numbers = line.match(/[\d.,]+/g);
            if (numbers && numbers.length > 0) {
                const value = parseValue(numbers[numbers.length - 1]);
                console.log(`[extractFaturamentoQuiosque] ✓ Categoria e total na mesma linha "${categoria}": ${value} na linha: "${line}"`);
                return value;
            }
        }
    }
    
    console.warn(`[extractFaturamentoQuiosque] ❌ Não foi possível extrair faturamento para "${categoria}"`);
    return 0;
}

function processSalesReport(text) {
    try {
        // Inicialização de variáveis
        let result = Array(60).fill('');
        let bolosRegular = {};
        let bolosIfood = {};
        let currentSection = '';
        
        // Totalizadores de fatias
        let fatiasRegularQtd = 0;
        let fatiaIntegralQtd = 0;
        let fatiaAipimQtd = 0;
        let quadradinhoQtd = 0;
        // let fatiasFaturamentoTotal = 0; // This will be derived from new faturamento logic

        // Outros totalizadores de quantidade (manter para stats de quantidade)
        // let bolosTotal = 0; // Refers to revenue, will be replaced by faturamentoBolosCombinado
        // let bolosIfoodTotal = 0; // Refers to revenue, will be replaced
        // let bebidasTotal = 0; // Refers to revenue, will be replaced by faturamentoBebidas
        // let alimentosTotal = 0; // Refers to revenue, will be replaced by faturamentoAlimentos
        // let artigosFesta = 0; // Refers to revenue, will be replaced by faturamentoArtigosFesta
        // let fatiasCategoryTotal = 0; // Refers to revenue, will be replaced by faturamentoFatias
        // let acrescimo = 0; // Refers to revenue, will be replaced by faturamentoAcrescimo
        // let desconto = 0; // Refers to revenue, will be replaced by faturamentoDesconto
        let totalGeral = 0; 

        // NEW: Declare faturamento variables in the outer scope of processSalesReport
        let faturamentoBebidas = 0;
        let faturamentoAlimentos = 0;
        let faturamentoBolosCombinado = 0; // For BOLOS + BOLOS IFOOD
        let faturamentoArtigosFesta = 0;
        let faturamentoFatias = 0;
        let faturamentoAcrescimo = 0;
        let faturamentoDesconto = 0;

        // NEW: Extract faturamento sections and values early
        console.log("[Faturamento Quiosque] Iniciando extração de faturamento principal.");
        let faturamentoText = '';
        let acrescimosDescontosText = '';

        // Debug: log potential section headers
        const potentialHeaders = text.match(/^[A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚ\s]{10,}$/gm);
        if (potentialHeaders) {
            console.log("[Faturamento Quiosque] Possíveis cabeçalhos de seção encontrados:", potentialHeaders.slice(0, 20));
        }

        // Strategy 1: Look for standard faturamento sections
        const faturamentoCategoriaRegex = /Faturamento por Categoria de Produto([\\s\\S]*?)(?=Acréscimos e Descontos|Totalizadores Gerais|Total da Operação|Nome Fantasia|$)/i;
        const faturamentoMatch = text.match(faturamentoCategoriaRegex);
        if (faturamentoMatch && faturamentoMatch[1]) {
            faturamentoText = faturamentoMatch[1].trim();
            console.log("[Faturamento Quiosque] Bloco 'Faturamento por Categoria de Produto' encontrado:", `\\n---\\n${faturamentoText}\\n---`);
        } else {
            console.warn("[Faturamento Quiosque] Bloco 'Faturamento por Categoria de Produto' NÃO encontrado.");
            
            // Strategy 2: Try alternative patterns
            const altPatterns = [
                /Faturamento([\\s\\S]*?)(?=Acréscimos|Totalizadores|Total|Nome Fantasia|$)/i,
                /FATURAMENTO([\\s\\S]*?)(?=ACRÉSCIMOS|TOTALIZADORES|TOTAL|NOME FANTASIA|$)/i,
                /Categorias de Produto([\\s\\S]*?)(?=Acréscimos|Totalizadores|Total|$)/i
            ];
            
            for (let pattern of altPatterns) {
                const altMatch = text.match(pattern);
                if (altMatch && altMatch[1]) {
                    faturamentoText = altMatch[1].trim();
                    console.log("[Faturamento Quiosque] Bloco alternativo encontrado:", `\\n---\\n${faturamentoText}\\n---`);
                    break;
                }
            }
        }

        // Strategy 3: If no dedicated faturamento section, try to extract from entire text
        if (!faturamentoText) {
            console.log("[Faturamento Quiosque] Tentando extrair faturamento do texto completo...");
            faturamentoText = text; // Use the entire text as fallback
        }

        const acrescimosDescontosRegex = /Acréscimos e Descontos([\\s\\S]*?)(?=Total da Operação|Total Geral|Nome Fantasia|$)/i;
        const acrescimosMatch = text.match(acrescimosDescontosRegex);
        if (acrescimosMatch && acrescimosMatch[1]) {
            acrescimosDescontosText = acrescimosMatch[1].trim();
            console.log("[Faturamento Quiosque] Bloco 'Acréscimos e Descontos' encontrado:", `\\n---\\n${acrescimosDescontosText}\\n---`);
        } else {
            console.warn("[Faturamento Quiosque] Bloco 'Acréscimos e Descontos' NÃO encontrado.");
            
            // Try alternative patterns for acréscimos/descontos
            const altAcrescimosPatterns = [
                /Acréscimos([\\s\\S]*?)(?=Total|Nome Fantasia|$)/i,
                /ACRÉSCIMOS([\\s\\S]*?)(?=TOTAL|NOME FANTASIA|$)/i,
                /Descontos([\\s\\S]*?)(?=Total|Nome Fantasia|$)/i,
                /DESCONTOS([\\s\\S]*?)(?=TOTAL|NOME FANTASIA|$)/i
            ];
            
            for (let pattern of altAcrescimosPatterns) {
                const altAcrescimosMatch = text.match(pattern);
                if (altAcrescimosMatch && altAcrescimosMatch[1]) {
                    acrescimosDescontosText = altAcrescimosMatch[1].trim();
                    console.log("[Faturamento Quiosque] Bloco alternativo de acréscimos/descontos encontrado:", `\\n---\\n${acrescimosDescontosText}\\n---`);
                    break;
                }
            }
            
            // If still not found, use entire text as fallback
            if (!acrescimosDescontosText) {
                console.log("[Faturamento Quiosque] Usando texto completo para acréscimos/descontos...");
                acrescimosDescontosText = text;
            }
        }

        // NEW: Use more precise extraction methods first
        console.log("[Faturamento Quiosque] Extraindo valores usando funções específicas...");
        
        // Try the new specific function first
        faturamentoBebidas = extractFaturamentoQuiosque(text, 'BEBIDAS');
        faturamentoAlimentos = extractFaturamentoQuiosque(text, 'ALIMENTOS');
        const bolosValue = extractFaturamentoQuiosque(text, 'BOLOS');
        const bolosIfoodValue = extractFaturamentoQuiosque(text, 'BOLOS IFOOD') || extractFaturamentoQuiosque(text, 'BOLOS I');
        faturamentoBolosCombinado = bolosValue + bolosIfoodValue;
        faturamentoArtigosFesta = extractFaturamentoQuiosque(text, 'ARTIGOS FESTA') || extractFaturamentoQuiosque(text, 'ARTIGOS DE FESTA');
        faturamentoFatias = extractFaturamentoQuiosque(text, 'FATIAS') || extractFaturamentoQuiosque(text, 'FATIA');
        
        console.log(`[Faturamento Quiosque] Valores extraídos com função específica:`);
        console.log(`  Bebidas: ${faturamentoBebidas}`);
        console.log(`  Alimentos: ${faturamentoAlimentos}`);
        console.log(`  Bolos: ${bolosValue} + Bolos iFood: ${bolosIfoodValue} = ${faturamentoBolosCombinado}`);
        console.log(`  Artigos Festa: ${faturamentoArtigosFesta}`);
        console.log(`  Fatias: ${faturamentoFatias}`);
        
        // If specific function didn't work, try section-based extraction
        if (faturamentoBebidas === 0 && faturamentoAlimentos === 0 && faturamentoBolosCombinado === 0) {
            console.log("[Faturamento Quiosque] Função específica falhou, tentando extração por seção...");
            
            // Extract section totals directly from report sections
            faturamentoBebidas = extractSectionValue(text, 'BEBIDAS');
            faturamentoAlimentos = extractSectionValue(text, 'ALIMENTOS');
            const bolosValue2 = extractSectionValue(text, 'BOLOS');
            const bolosIfoodValue2 = extractSectionValue(text, 'BOLOS IFOOD');
            faturamentoBolosCombinado = bolosValue2 + bolosIfoodValue2;
            faturamentoArtigosFesta = extractSectionValue(text, 'ARTIGOS FESTA') || extractSectionValue(text, 'ARTIGOS DE FESTA');
            faturamentoFatias = extractSectionValue(text, 'FATIA') || extractSectionValue(text, 'FATIAS');
            
            console.log(`[Faturamento Quiosque] Valores extraídos com extração por seção:`);
            console.log(`  Bebidas: ${faturamentoBebidas}`);
            console.log(`  Alimentos: ${faturamentoAlimentos}`);
            console.log(`  Bolos: ${bolosValue2} + Bolos iFood: ${bolosIfoodValue2} = ${faturamentoBolosCombinado}`);
            console.log(`  Artigos Festa: ${faturamentoArtigosFesta}`);
            console.log(`  Fatias: ${faturamentoFatias}`);
        }
        
        // Extract from totalizadores gerais or acréscimos/descontos section
        faturamentoAcrescimo = extractTotalizadorValue(text, 'acréscimo de pedidos') || 
                              extractFaturamentoQuiosque(text, 'acréscimo') ||
                              extractValueByLabel(text, 'acréscimo', true);
        
        faturamentoDesconto = extractTotalizadorValue(text, 'desconto de pedidos') || 
                             extractFaturamentoQuiosque(text, 'desconto') ||
                             extractValueByLabel(text, 'desconto', true);
        
        totalGeral = extractTotalizadorValue(text, 'Total Geral') || 
                    extractTotalizadorValue(text, 'total de produtos vendidos') ||
                    extractValueByLabel(text, 'Total Geral', true);
        
        console.log(`[Faturamento Quiosque] Acréscimos/Descontos extraídos:`);
        console.log(`  Acréscimo: ${faturamentoAcrescimo}`);
        console.log(`  Desconto: ${faturamentoDesconto}`);
        console.log(`  Total Geral: ${totalGeral}`);

        // OLD LOGIC - keeping as fallback if new methods fail
        if (faturamentoBebidas === 0 && faturamentoAlimentos === 0 && faturamentoBolosCombinado === 0) {
            console.log("[Faturamento Quiosque] Novas funções retornaram zero, tentando método antigo...");

        if (faturamentoText) {
            console.log("[Faturamento Quiosque] Extraindo valores de faturamento...");
            
            // Multiple strategies for each category
            const categories = [
                { name: 'BEBIDAS', variations: ['BEBIDAS', 'BEBIDA', 'Bebidas', 'Bebida'] },
                { name: 'ALIMENTOS', variations: ['ALIMENTOS', 'ALIMENTO', 'Alimentos', 'Alimento'] },
                { name: 'BOLOS', variations: ['BOLOS', 'BOLO', 'Bolos', 'Bolo'] },
                { name: 'BOLOS IFOOD', variations: ['BOLOS IFOOD', 'BOLOS IFOOD', 'BOLO IFOOD', 'BOLOS I', 'BOLO I'] },
                { name: 'ARTIGOS FESTA', variations: ['ARTIGOS FESTA', 'ARTIGOS DE FESTA', 'ARTIGO FESTA', 'ARTIGO DE FESTA'] },
                { name: 'FATIAS', variations: ['FATIAS', 'FATIA', 'Fatias', 'Fatia'] }
            ];
            
            for (let category of categories) {
                let value = 0;
                for (let variation of category.variations) {
                    value = extractValueByLabel(faturamentoText, variation, true);
                    if (value > 0) {
                        console.log(`[Faturamento Quiosque] ${category.name} encontrado como "${variation}": ${value}`);
                        break;
                    }
                }
                
                switch(category.name) {
                    case 'BEBIDAS':
                        if (faturamentoBebidas === 0) faturamentoBebidas = value;
                        break;
                    case 'ALIMENTOS':
                        if (faturamentoAlimentos === 0) faturamentoAlimentos = value;
                        break;
                    case 'BOLOS':
                        if (faturamentoBolosCombinado === 0) faturamentoBolosCombinado += value;
                        break;
                    case 'BOLOS IFOOD':
                        if (faturamentoBolosCombinado === 0) faturamentoBolosCombinado += value;
                        break;
                    case 'ARTIGOS FESTA':
                        if (faturamentoArtigosFesta === 0) faturamentoArtigosFesta = value;
                        break;
                    case 'FATIAS':
                        if (faturamentoFatias === 0) faturamentoFatias = value;
                        break;
                }
            }
            
            console.log(`[Faturamento Quiosque] Valores do método antigo: Bebidas: ${faturamentoBebidas}, Alimentos: ${faturamentoAlimentos}, Bolos: ${faturamentoBolosCombinado}, Artigos: ${faturamentoArtigosFesta}, Fatias: ${faturamentoFatias}`);
        } else {
            console.warn("[Faturamento Quiosque] Texto de faturamento vazio, valores serão 0.");
        }
        } // End fallback

        // OLD acrescimos/descontos logic - keeping as fallback
        if (faturamentoAcrescimo === 0 && faturamentoDesconto === 0) {
        if (acrescimosDescontosText) {
            console.log("[Faturamento Quiosque] Extraindo acréscimos e descontos...");
            
            // Multiple strategies for acréscimos
            const acrescimoVariations = ['ACRÉSCIMO', 'ACRESCIMO', 'Total de Acréscimos', 'Acréscimos', 'acréscimo', 'acrescimo'];
            for (let variation of acrescimoVariations) {
                const tempAcrescimo = extractValueByLabel(acrescimosDescontosText, variation, true);
                if (tempAcrescimo > 0) {
                    faturamentoAcrescimo = tempAcrescimo;
                    console.log(`[Faturamento Quiosque] Acréscimo encontrado como "${variation}": ${faturamentoAcrescimo}`);
                    break;
                }
            }

            // Multiple strategies for descontos
            const descontoVariations = ['DESCONTO', 'Total de Descontos', 'Descontos', 'desconto'];
            for (let variation of descontoVariations) {
                const tempDesconto = extractValueByLabel(acrescimosDescontosText, variation, true);
                if (tempDesconto > 0) {
                    faturamentoDesconto = tempDesconto;
                    console.log(`[Faturamento Quiosque] Desconto encontrado como "${variation}": ${faturamentoDesconto}`);
                    break;
                }
            }
        } else {
            console.warn("[Faturamento Quiosque] Texto de acréscimos/descontos vazio, valores serão 0.");
        }
        } // End acrescimos/descontos fallback
        
        console.log(`[Faturamento Quiosque] Valores finais: Bebidas: ${faturamentoBebidas}, Alimentos: ${faturamentoAlimentos}, Bolos: ${faturamentoBolosCombinado}, Artigos: ${faturamentoArtigosFesta}, Fatias: ${faturamentoFatias}, Acrescimo: ${faturamentoAcrescimo}, Desconto: ${faturamentoDesconto}`);

        // Mapear nomes alternativos para GANACHE/CALDA e BRIGADEIRO
        function normalizeProductName(name) {
            if (!name) return '';
            const n = name.trim().toUpperCase();

            // Normalização de fatias
            // Grupo 1: Fatia Regular (inclui FATIA DE BOLO, MINI e PROMO)
            if (n === 'FATIA DE BOLO' || n === 'FATIA MINI' || n === 'FATIA PROMO' || 
                (n.includes('FATIA') && n.includes('BOLO') && !n.includes('INTEGRAL') && !n.includes('AIPIM'))) return 'FATIA DE BOLO';
            
            // Grupo 2: Fatia Integral
            if (n === 'FATIA INTEGRAL' || n === 'FATIA DE BOLO INTEGRAL' || n === 'FATIA BOLO INTEGRAL') return 'FATIA INTEGRAL';
            
            // Grupo 3: Fatia Aipim
            if (n === 'FATIA AIPIM' || n === 'FATIA DE AIPIM' || n === 'FATIA DE BOLO DE AIPIM' || n === 'FATIA BOLO AIPIM') return 'FATIA AIPIM';

            return n;
        }

        // Função local para processar linha de produto
        function processProductLine(parts, sectionName) {
            if (!parts || parts.length < 2) return;

            // Extrair o nome do produto dos primeiros elementos
            const productNameParts = [];
            let unitIndex = -1;
            for (let i = 0; i < parts.length; i++) {
                if (parts[i].toUpperCase() === 'UNID') {
                    unitIndex = i;
                    break;
                }
                if (/^\d+[,.]?\d*$/.test(parts[i])) continue;
                productNameParts.push(parts[i]);
            }

            let productName = normalizeProductName(productNameParts.join(' '));
            let quantity = 0;
            let totalValue = 0;

            // Processar valores e quantidades
            let valueData = parts.slice(unitIndex + 1);
            if (valueData.length >= 3) {
                // Se encontrar "Qtd:", usar esse valor
                const qtdIndex = valueData.findIndex(v => v.startsWith('Qtd:'));
                if (qtdIndex !== -1) {
                    quantity = parseValue(valueData[qtdIndex].replace('Qtd:', ''));
                } else {
                    quantity = parseValue(valueData[valueData.length - 2]); // Penúltimo valor é a quantidade
                }
                totalValue = parseValue(valueData[valueData.length - 1]); // Último valor é o total
            }

            // Debug de fatias
            if (sectionName === 'FATIA') {
                console.log(`Processing fatia: ${productName}, qty: ${quantity}, value: ${totalValue}`);
            }

            // Processamento de fatias
            if (productName === 'FATIA DE BOLO' || productName === 'FATIA MINI' || productName === 'FATIA PROMO') {
                fatiasRegularQtd += quantity;
                if (sectionName === 'FATIA' || sectionName === 'FATIAS') {
                    // fatiasFaturamentoTotal += totalValue; // Removed, now handled by faturamento
                }
                console.log(`Regular fatia added: ${quantity}, total now: ${fatiasRegularQtd}`);
            } else if (productName === 'FATIA INTEGRAL') {
                fatiaIntegralQtd += quantity;
                if (sectionName === 'FATIA' || sectionName === 'FATIAS') {
                    // fatiasFaturamentoTotal += totalValue; // Removed, now handled by faturamento
                }
                console.log(`Integral fatia added: ${quantity}, total now: ${fatiaIntegralQtd}`);
            } else if (productName === 'FATIA AIPIM') {
                fatiaAipimQtd += quantity;
                if (sectionName === 'FATIA' || sectionName === 'FATIAS') {
                    // fatiasFaturamentoTotal += totalValue; // Removed, now handled by faturamento
                }
                console.log(`Aipim fatia added: ${quantity}, total now: ${fatiaAipimQtd}`);
            } else if (productName === 'QUADRADINHO') {
                quadradinhoQtd += quantity;
                if (sectionName === 'FATIA' || sectionName === 'FATIAS') {
                    // fatiasFaturamentoTotal += totalValue; // Removed, now handled by faturamento
                }
                console.log(`Quadradinho added: ${quantity}, total now: ${quadradinhoQtd}`);
            }

            // Resto do processamento para outros produtos
            if ((productName.startsWith('BOLO ') && !productName.endsWith(' I')) ||
                productName === 'BOLO INTEGRAL BANANA E AVEIA') {
                bolosRegular[productName] = (bolosRegular[productName] || 0) + quantity;
            } else if (productName.startsWith('BOLO ') && productName.endsWith(' I')) {
                bolosIfood[productName] = (bolosIfood[productName] || 0) + quantity;
            }
            // GANACHE/CALDA
            else if (productName === 'GANACHE 200G') {
                bolosRegular['GANACHE 200G'] = (bolosRegular['GANACHE 200G'] || 0) + quantity;
            } else if (productName === 'GANACHE 100G') {
                bolosRegular['GANACHE 100G'] = (bolosRegular['GANACHE 100G'] || 0) + quantity;
            } else if (productName === 'GANACHE 200G I') {
                bolosIfood['GANACHE 200G I'] = (bolosIfood['GANACHE 200G I'] || 0) + quantity;
            } else if (productName === 'GANACHE 100G I') {
                bolosIfood['GANACHE 100G I'] = (bolosIfood['GANACHE 100G I'] || 0) + quantity;
            }
            // Brigadeiro
            else if (productName === 'BRIGADEIRO') {
                bolosRegular['BRIGADEIRO'] = (bolosRegular['BRIGADEIRO'] || 0) + quantity;
            }
        }

        // Função local para atualizar totais de seção (legacy - not used with new faturamento logic)
        function updateSectionTotal(sectionName, value) {
            // Legacy function - faturamento values are now extracted from dedicated sections
            console.log(`Legacy updateSectionTotal called for ${sectionName}: ${value}`);
        }

        // Função local para gerar saída
        function generateOutput() {
            // Preencher quantidades de bolos (loja + ifood) na ordem correta
            bolosList.forEach(([regular, ifood], index) => {
                const regularQty = bolosRegular[regular] || 0;
                const ifoodQty = bolosIfood[ifood] || 0;
                result[index] = (regularQty + ifoodQty).toString(); // Sempre número, mesmo que zero
            });

            // Preencher bolos especiais
            specialBolos.forEach((bolo, index) => {
                result[33 + index] = (bolosRegular[bolo] || 0).toString(); // Sempre número
            });

            result[39] = '';

            // Ganaches e brigadeiro
            result[40] = (bolosRegular['GANACHE 200G'] || 0).toString();
            result[41] = (bolosRegular['GANACHE 100G'] || 0).toString();
            result[42] = (bolosIfood['GANACHE 200G I'] || 0).toString();
            result[43] = (bolosIfood['GANACHE 100G I'] || 0).toString();
            result[44] = (bolosRegular['BRIGADEIRO'] || 0).toString();

            // Fatias
            result[45] = fatiasRegularQtd.toString();
            result[46] = fatiaIntegralQtd.toString();
            result[47] = fatiaAipimQtd.toString();
            result[48] = quadradinhoQtd.toString();

            // Linhas em branco
            result[49] = '';
            result[50] = '';
            result[51] = '';
            result[52] = '';

            // Faturamento - uses pre-calculated faturamentoXXX values
            result[53] = faturamentoBebidas.toFixed(2);
            result[54] = faturamentoAlimentos.toFixed(2);
            result[55] = faturamentoBolosCombinado.toFixed(2);
            result[56] = faturamentoArtigosFesta.toFixed(2);
            result[57] = faturamentoFatias.toFixed(2);
            result[58] = faturamentoAcrescimo.toFixed(2);
            result[59] = (-Math.abs(faturamentoDesconto)).toFixed(2);
            
            console.log("[Faturamento Quiosque generateOutput] Valores formatados para o resultado (clipboard):");
            console.log(`  result[53] (BEBIDAS): ${result[53]}`);
            console.log(`  result[54] (ALIMENTOS): ${result[54]}`);
            console.log(`  result[55] (BOLO total): ${result[55]}`);
            console.log(`  result[56] (ARTIGOS FESTA): ${result[56]}`);
            console.log(`  result[57] (FATIAS): ${result[57]}`);
            console.log(`  result[58] (ACRÉSCIMO): ${result[58]}`);
            console.log(`  result[59] (DESCONTO): ${result[59]}`);
        }

        // Processamento do relatório
        const sections = text.split(/(?=PRODUTOS VENDIDOS|ALIMENTOS|BEBIDAS|BOLOS IFOOD|BOLOS|FATIA$|ARTIGOS)/);

        // Capturar total geral, acréscimo e desconto (legacy - now handled by new extraction methods)
        text.split('\n').forEach(line => {
            if (line.includes('Valor total de produtos vendidos') && totalGeral === 0) {
                totalGeral = parseValue(line.split(/\s+/).pop());
            }
        });

        // Processar primeira seção (cabeçalho + possíveis bolos)
        const headerSection = sections[0];
        const headerLines = headerSection.split('\n');
        
        // Processar produtos na primeira seção
        let isProcessingProducts = false;
        headerLines.forEach(line => {
            if (line.includes('Código Produto')) {
                isProcessingProducts = true;
                return;
            }
            if (isProcessingProducts && line.trim() && !line.includes('Impresso em')) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 5 && /^\d+$/.test(parts[0])) {
                    processProductLine(parts, currentSection);
                }
            }
        });

        // Processar seções restantes
        sections.forEach(section => {
            const sectionName = section.split('\n')[0].trim();
            
            // Extrair total da seção e processar linhas
            const lines = section.split('\n');
            let total = 0;
            let currentTotal = 0;

            // Para seção de FATIA
            if (sectionName === 'FATIA') {
                console.log('Processing FATIA section...');
                let foundTotal = false;
                // Procura todas as linhas de Total e pega a última
                for (let i = lines.length - 1; i >= 0; i--) {
                    const line = lines[i].trim();
                    if (line.startsWith('Total') && !line.includes('Total Geral')) {
                        const parts = line.split(/\s+/);
                        const lastValue = parts[parts.length - 1];
                        currentTotal = parseValue(lastValue);
                        total = currentTotal;
                        // fatiasCategoryTotal = total; // Removed - no longer used
                        // fatiasFaturamentoTotal = total; // Removed - no longer used
                        console.log(`Found fatia total: ${total} (faturamento)`);
                        foundTotal = true;
                        break;
                    }
                }
                // Se não encontrou o total, soma os valores individuais
                if (!foundTotal) {
                    // total = fatiasFaturamentoTotal; // Legacy
                    // fatiasCategoryTotal = total; // Legacy 
                    console.log(`No total found for fatia section, using product-level accumulation`);
                }

                // Processar cada linha de produto
                lines.forEach(line => {
                    if (!line.includes('Impresso em') && !line.includes('Código Produto')) {
                        const parts = line.trim().split(/\s+/);
                        if (parts.length >= 5 && /^\d+$/.test(parts[0])) {
                            console.log('Processing fatia line:', line);
                            processProductLine(parts, sectionName);
                        }
                    }
                });
            } else {
                // Para outras seções, processa normalmente
                const totalLines = lines.filter(line => line.trim().startsWith('Total') && !line.includes('Total Geral'));
                if (totalLines.length > 0) {
                    const lastTotalLine = totalLines[totalLines.length - 1].trim();
                    const totalParts = lastTotalLine.split(/\s+/);
                    total = parseValue(totalParts[totalParts.length - 1]);
                }
            }

            // Atualiza os totais por categoria (these are mostly for quantity counts or intermediate sums, faturamentoXXX are now primary for revenue)
            switch(sectionName) {
                case 'BOLOS':
                    // bolosRegularTotal = total; // This was for revenue, now handled by faturamentoBolosCombinado
                    console.log(`BOLOS section total (from product list): ${total}`);
                    break;
                case 'BOLOS IFOOD':
                    // bolosIfoodTotal = total; // This was for revenue, now handled by faturamentoBolosCombinado
                    console.log(`BOLOS IFOOD section total (from product list): ${total}`);
                    break;
                // case 'BEBIDAS': // Revenue handled by faturamentoBebidas
                //     bebidasTotal = total;
                //     break;
                // case 'ALIMENTOS': // Revenue handled by faturamentoAlimentos
                //     alimentosTotal = total;
                //     break;
                case 'FATIA': // Revenue handled by faturamentoFatias
                    // fatiasCategoryTotal = total;
                    // fatiasFaturamentoTotal = total; // This was used for fatias revenue
                    console.log(`FATIA section total (from product list): ${total}`);
                    break;
                // case 'ARTIGOS DE FESTA': // Revenue handled by faturamentoArtigosFesta
                //     artigosFesta = total;
                //     break;
            }

            // Processar produtos da seção
            lines.forEach(line => {
                const trimmedLine = line.trim();
                if (trimmedLine && !trimmedLine.includes('Impresso em') && !trimmedLine.includes('Código Produto')) {
                    const parts = trimmedLine.split(/\s+/);
                    if (parts.length >= 5 && /^\d+$/.test(parts[0])) {
                        processProductLine(parts, sectionName);
                    }
                }
            });
        });
            
            // Legacy code removed - fatiasCategoryTotal and fatiasFaturamentoTotal no longer used
            // Faturamento values are now extracted from dedicated sections
            
            console.log(`Totais finais antes de gerar output (legacy values may not reflect final faturamento):`);
            // console.log(`- Bolos Regular: ${bolosRegularTotal}`); // These are from product list totals, not necessarily final revenue figures
            // console.log(`- Bolos iFood: ${bolosIfoodTotal}`);
            // console.log(`- Fatias: ${fatiasCategoryTotal}`);
            // console.log(`- Fatias Faturamento: ${fatiasFaturamentoTotal}`);

        generateOutput();

        // Corrigir stats: bolosLoja e bolosIfood devem ser a soma dos bolos, não das fatias
        // Fatias não entram na soma de bolosLoja/bolosIfood

        // Soma correta dos bolos (apenas bolos, não fatias)
        let totalBolosLoja = 0;
        let totalBolosIfood = 0;
        bolosList.forEach(([regular, ifood]) => {
            totalBolosLoja += bolosRegular[regular] || 0;
            totalBolosIfood += bolosIfood[ifood] || 0;
        });
        specialBolos.forEach(bolo => {
            totalBolosLoja += bolosRegular[bolo] || 0;
        });

        return { 
            result: result.join('\n'),
            stats: {
                totalSales: totalGeral,
                bolosLoja: totalBolosLoja,
                bolosIfood: totalBolosIfood,
                bolosGrandes: Object.keys(bolosRegular).filter(name => !name.includes('MINI') && !name.includes(' C') && !name.includes('SF') && !name.includes('TABULEIRO')).reduce((a, b) => a + (bolosRegular[b] || 0), 0),
                bolosMini: Object.keys(bolosRegular).filter(name => name.includes('MINI')).reduce((a, b) => a + (bolosRegular[b] || 0), 0),
                bolosC: Object.keys(bolosRegular).filter(name => name.includes(' C')).reduce((a, b) => a + (bolosRegular[b] || 0), 0),
                bolosEspeciais: Object.keys(bolosRegular).filter(name => name.includes('SF') || name.includes('TABULEIRO')).reduce((a, b) => a + (bolosRegular[b] || 0), 0),
                totalFatias: fatiasRegularQtd + fatiaIntegralQtd + fatiaAipimQtd + quadradinhoQtd,
                revenue: { // UPDATE THIS PART to use faturamentoXXX values
                    total: totalGeral, // totalGeral is from 'Valor total de produtos vendidos'
                    bebidas: faturamentoBebidas,
                    alimentos: faturamentoAlimentos,
                    bolos: faturamentoBolosCombinado,
                    artigos: faturamentoArtigosFesta,
                    fatias: faturamentoFatias
                }
            }
        };
    } catch (error) {
        console.error('Erro ao processar:', error);
        throw new Error(`Erro ao processar relatório: ${error.message}`);
    }
}

// Remove paste event listener as it's handled by the UI
document.removeEventListener('paste', null);

        const productTemplate = [
            ['BOLO AIPIM', 'BOLO AIPIM I'],
            ['BOLO AMENDOIM', 'BOLO AMENDOIM I'],
            ['BOLO AMENDOIM MINI', 'BOLO AMENDOIM MINI I'],
            ['BOLO BANANA AVEIA', 'BOLO BANANA AVEIA I'],
            ['BOLO BANANA', 'BOLO BANANA I'],
            ['BOLO BANANA MINI', 'BOLO BANANA MINI I'],
            ['BOLO BOLO', 'BOLO BOLO I'],
            ['BOLO BOLO MINI', 'BOLO BOLO MINI I'],
            ['BOLO CACAU INTEGRAL', 'BOLO CACAU INTEGRAL I'],
            ['BOLO CENOURA', 'BOLO CENOURA I'],
            ['BOLO CENOURA MINI', 'BOLO CENOURA MINI I'],
            ['BOLO CENOURA C', 'BOLO CENOURA C I'],
            ['BOLO CHOCOLATE', 'BOLO CHOCOLATE I'],
            ['BOLO CHOCOLATE MINI', 'BOLO CHOCOLATE MINI I'],
            ['BOLO CHUVA', 'BOLO CHUVA I'],
            ['BOLO CHUVA MINI', 'BOLO CHUVA MINI I'],
            ['BOLO COCO', 'BOLO COCO I'],
            ['BOLO COCO MINI', 'BOLO COCO MINI I'],
            ['BOLO FORMIGUEIRO', 'BOLO FORMIGUEIRO I'],
            ['BOLO FORMIGUEIRO MINI', 'BOLO FORMIGUEIRO MINI I'],
            ['BOLO FUBÁ', 'BOLO FUBÁ I'],
            ['BOLO FUBÁ MINI', 'BOLO FUBÁ MINI I'],
            ['BOLO LARANJA', 'BOLO LARANJA I'],
            ['BOLO LARANJA MINI', 'BOLO LARANJA MINI I'],
            ['BOLO LARANJA C', 'BOLO LARANJA C I'],
            ['BOLO LIMÃO', 'BOLO LIMÃO I'],
            ['BOLO LIMÃO MINI', 'BOLO LIMÃO MINI I'],
            ['BOLO MESCLADO', 'BOLO MESCLADO I'],
            ['BOLO MESCLADO MINI', 'BOLO MESCLADO MINI I'],
            ['BOLO MILHO', 'BOLO MILHO I'],
            ['BOLO MILHO MINI', 'BOLO MILHO MINI I'],
            ['BOLO NOZES', 'BOLO NOZES I'],
            ['BOLO NOZES MINI', 'BOLO NOZES MINI I'],
            ['BOLO SF BOLO DE BOLO', ''],
            ['BOLO SF CENOURA', ''],
            ['BOLO SF CHOCOLATE', ''],
            ['BOLO SF NOZES', ''],
            ['BOLO AIPIM TABULEIRO', ''],
            ['BOLINHO PRESENTE', '']
        ];

        const textareaQuiosque = document.getElementById('input-quiosque');
        const previewQuiosque = document.getElementById('preview-quiosque');
        const copyButtonQuiosque = document.getElementById('copyButton-quiosque');
        const errorDiv = document.getElementById('error');
        const unknownBolosDiv = document.getElementById('unknown-bolos');

        const textareaLoja = document.getElementById('input-loja');
        const previewLoja = document.getElementById('preview-loja');
        const copyButtonLoja = document.getElementById('copyButton-loja');

        // Função auxiliar para copiar texto
        async function copyText(text, button) {
            try {
                await navigator.clipboard.writeText(text);
                button.textContent = 'Copiado!';
                setTimeout(() => {
                    button.textContent = 'Copiar Resultado';
                }, 2000);
                return true;
            } catch (err) {
                console.error('Falha ao copiar:', err);
                return false;
            }
        }

        function clearDashboard() {
            document.getElementById('total-bolos').textContent = '0';
            document.getElementById('bolos-grandes').textContent = '0';
            document.getElementById('bolos-mini').textContent = '0';
            document.getElementById('bolos-c').textContent = '0';
            document.getElementById('bolos-especiais').textContent = '0';
            document.getElementById('bolos-loja').textContent = '0';
            document.getElementById('bolos-ifood').textContent = '0';
            document.getElementById('total-fatias').textContent = '0';
            
            const revenueIds = ['total', 'bebidas', 'alimentos', 'bolos', 'artigos', 'fatias'];
            revenueIds.forEach(id => document.getElementById(`revenue-${id}`).textContent = 'R$ 0,00');
        }

        function processInputQuiosque() {
            previewQuiosque.textContent = '';
            errorDiv.style.display = 'none';
            unknownBolosDiv.style.display = 'none';
            document.getElementById('success-quiosque').classList.remove('visible');
            clearDashboard();
            
            try {
                const text = textareaQuiosque.value;
                if (!text.trim()) return;

                const { result, stats } = processSalesReport(text);

                // Soma todas as quantidades de bolos (loja + ifood)
                let totalBolos = 0;
                let totalBolosIf = 0;
                let totalFaturado = 0;
                if (stats) {
                    totalBolos = stats.bolosLoja || 0;
                    totalBolosIf = stats.bolosIfood || 0;
                    totalFaturado = stats.revenue.total || 0; // Use the value from processSalesReport
                }

                if (result && stats) {
                    previewQuiosque.textContent = result;
                    updateDashboard(stats);

                    // Atualiza o resumo do dashboard (parte de baixo)
                    document.getElementById('summary-quiosque').textContent = `${totalBolos + totalBolosIf} bolos`;
                    document.getElementById('summary-quiosque-ifood').textContent = `(${totalBolosIf} iFood)`;
                    document.getElementById('summary-quiosque-valor').textContent = `R$ ${totalFaturado.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

                    // Atualiza o total geral (soma dos dois)
                    updateSummaryTotal();

                    document.getElementById('success-quiosque').classList.add('visible');
                    copyText(result, copyButtonQuiosque);
                    if (stats.unknownBolos?.length > 0) {
                        unknownBolosDiv.textContent = `Novo(s) sabor(es) identificado(s): ${stats.unknownBolos.join(', ')}. Não contabilizado(s) no resultado.`;
                        unknownBolosDiv.style.display = 'block';
                    }
                }
            } catch (err) {
                console.error('Erro:', err);
                errorDiv.textContent = err.message || 'Erro ao processar relatório. Verifique o formato.';
                errorDiv.style.display = 'block';
            }
        }

        function parseStoreReport(text) {
            try {
                if (!text?.trim()) {
                    throw new Error('O relatório está vazio');
                }

                // Novo regex tolerante para capturar totais
                const vendasMatch = text.match(/Vendas\s*:\s*([\d.,]+)/i);
                const descontoMatch = text.match(/Desconto\s*:\s*([\d.,]+)/i);
                const acrescimoMatch = text.match(/Acr[ée]scimo\s*:\s*([\d.,]+)/i);

                if (!vendasMatch || !descontoMatch || !acrescimoMatch) {
                    // Log trecho do texto para debug
                    const lines = text.split('\n').filter(l => l.trim().length > 0);
                    console.error('Linhas do relatório para debug:', lines.slice(-15).join('\n'));
                    throw new Error('Não foi possível encontrar os totais do relatório');
                }

                const totals = {
                    vendas: parseFloat(vendasMatch[1].replace('.', '').replace(',', '.') || 0),
                    desconto: parseFloat(descontoMatch[1].replace('.', '').replace(',', '.') || 0),
                    acrescimo: parseFloat(acrescimoMatch[1].replace('.', '').replace(',', '.') || 0)
                };

                function parseItems(text) {
                    if (!text) return [];
                    const items = [];
                    const itemRegex = /^(.*?)\nQuantidade: ([\d,]+)(?:\s*Qtd: ([\d,]+))?\nValor Unitário: [\d,]+\n([\d,]+)/gm;
                    
                    let match;
                    while ((match = itemRegex.exec(text)) !== null) {
                        const name = match[1].trim();
                        const quantity = parseFloat(match[2].replace(',', '.'));
                        const value = parseFloat(match[4].replace('.', '').replace(',', '.'));
                        items.push({ name, quantity, value });
                    }
                    return items;
                }

                const sections = {
                    // Capture everything between ' BOLO\n' and the next section
                    bolos: / BOLO\n([\s\S]*?)(?=\n {1,2}(?:BOLOS IFOOD|ALIMENTOS|BEBIDAS|FATIA|ARTIGOS|$))/,
                    bolosIFood: / BOLOS IFOOD\n([\s\S]*?)(?=\n \w|$)/,
                    fatias: / FATIA DE BOLO\n([\s\S]*?)(?=\n \w|$)/,
                    alimentos: / ALIMENTOS\n([\s\S]*?)(?=\n \w|$)/,
                    bebidas: / BEBIDAS\n([\s\S]*?)(?=\n \w|$)/,
                    artigos: / ARTIGOS DE FESTA\n([\s\S]*?)(?=\n \w|$)/
                };

                // Parse all sections
                const sectionData = {};
                Object.entries(sections).forEach(([key, regex]) => {
                    const match = text.match(regex);
                    sectionData[key] = parseItems(match?.[1] || '');
                    // Debug section content
                    console.log(`=== ${key} section ===`);
                    console.log(match?.[1] || 'No match');
                });

                let result = '';
                let allBolos = {};
                
                // Initialize with zeros
                productTemplate.forEach(([regular]) => {
                    allBolos[regular] = { qty: 0, value: 0 };
                });

                // Process regular bolos first
                console.log('=== Processing Regular Bolos ===');
                sectionData.bolos.forEach(item => {
                    const name = item.name.trim();
                    // Normalize names for matching
                    let normalizedName = name;
                    
                    // Convert "BOLO SF Nozes" to "BOLO SF NOZES"
                    if (name.startsWith('BOLO SF')) {
                        normalizedName = name.toUpperCase();
                      }
                      // Convert "SF Nozes" to "BOLO SF NOZES" 
                      else if (name.startsWith('SF')) {
                        normalizedName = 'BOLO ' + name.toUpperCase();
                      }
                    
                    console.log(`Found bolo: ${name} (${item.quantity}) → ${normalizedName}`);
                    
                    if (normalizedName in allBolos) {
                        allBolos[normalizedName].qty = Number(item.quantity) || 0;
                        allBolos[normalizedName].value = Number(item.value) || 0;
                        console.log(`Added: ${normalizedName} = ${item.quantity}`);
                    }
                });

                // Now add iFood quantities to corresponding regular bolos
                console.log('=== Processing iFood Bolos ===');
                sectionData.bolosIFood.forEach(item => {
                    const name = item.name.trim();
                    // Find corresponding regular bolo by removing the 'I' suffix
                    const regularName = name.replace(/ I$/, '');
                    if (regularName in allBolos) {
                        allBolos[regularName].qty += Number(item.quantity) || 0;
                        allBolos[regularName].value += Number(item.value) || 0;
                        console.log(`Added iFood: ${name} → ${regularName} += ${item.quantity}`);
                    }
                });

                // Output combined quantities in template order
                productTemplate.forEach(([regular]) => {
                    console.log(`Final ${regular}: ${allBolos[regular].qty}`);
                    result += allBolos[regular].qty.toString() + '\n';
                });

                result += '\n';

                // Calculate total revenue
                const bolosTotalValue = Object.values(allBolos)
                    .reduce((sum, item) => sum + (item.value || 0), 0);
                
                console.log('Total bolos value:', bolosTotalValue);

                // Add CALDA and brigadeiro quantities
                const alimentosMap = {
                    'CALDA POTE 200g': 0,
                    'CALDA POTE 100G': 0,
                    'CALDA POTE 200g I': 0,
                    'CALDA POTE 100G I': 0,
                    'BRIGADEIRO DE COLHER': 0
                };

                // Count calda quantities - exact name matching
                sectionData.alimentos.forEach(item => {
                    const exactName = item.name.trim();
                    if (exactName in alimentosMap) {
                        alimentosMap[exactName] = Number(item.quantity) || 0;
                        console.log(`Found calda: ${exactName} = ${item.quantity}`);
                    }
                });

                // Output in fixed order
                const caldaOrder = [
                    'CALDA POTE 200g',
                    'CALDA POTE 100G',
                    'CALDA POTE 200g I',
                    'CALDA POTE 100G I',
                    'BRIGADEIRO DE COLHER'
                ];

                caldaOrder.forEach(name => {
                    result += (alimentosMap[name] || 0).toString() + '\n';
                });

                // Sum all fatias
                const fatiaTotal = sectionData.fatias.reduce((acc, item) => {
                    if (['FATIA DE BOLO', 'FATIA PROMO', 'FATIA MINI'].includes(item.name)) {
                        return acc + (item.quantity || 0);
                    }
                    return acc;
                }, 0);

                result += fatiaTotal.toString() + '\n';

                // Add other fatia types
                ['FATIA INTEGRAL', 'FATIA DE AIPIM', 'QUADRADINHO'].forEach(name => {
                    const item = sectionData.fatias.find(i => i.name === name);
                    result += (item?.quantity || 0).toString() + '\n';
                });

                // Add 4 blank lines before revenue
                result += '\n\n\n\n';

                // Extract revenue values with improved regex
                const revenueMatches = {
                    // Match the exact format: number after section header
                    bolos: text.match(/ BOLO\n([\d.,]+)\n/),
                    bolosIFood: text.match(/ BOLOS IFOOD\n([\d.,]+)\n/),
                    bebidas: text.match(/ BEBIDAS\n([\d.,]+)\n/),
                    alimentos: text.match(/ ALIMENTOS\n([\d.,]+)\n/),
                    artigos: text.match(/ ARTIGOS DE FESTA\n([\d.,]+)\n/),
                    fatias: text.match(/ FATIA DE BOLO\n([\d.,]+)\n/)
                };

                function parseBRNumber(str) {
                    if (!str) return 0;
                    // First remove all dots, then replace comma with dot for decimal
                    const withoutDots = str.replace(/\./g, '');
                    const withDecimalDot = withoutDots.replace(',', '.');
                    return parseFloat(withDecimalDot);
                }

                // Calculate revenue totals with proper debug logging
                const bolosValue = parseBRNumber(revenueMatches.bolos?.[1]);
                const bolosIFoodValue = parseBRNumber(revenueMatches.bolosIFood?.[1]);
                
                console.log('Bolos revenue:', revenueMatches.bolos?.[1], '→', bolosValue);
                console.log('iFood revenue:', revenueMatches.bolosIFood?.[1], '→', bolosIFoodValue);
                console.log('Total bolos revenue:', bolosValue + bolosIFoodValue);

                const revenues = [
                    parseBRNumber(revenueMatches.bebidas?.[1]),
                    parseBRNumber(revenueMatches.alimentos?.[1]),
                    bolosValue + bolosIFoodValue,
                    parseBRNumber(revenueMatches.artigos?.[1]),
                    parseBRNumber(revenueMatches.fatias?.[1]),
                    totals.acrescimo,
                    -totals.desconto
                ];

                // Debug final values
                console.log('Revenue values:', revenues);

                result += revenues.map(v => v.toFixed(2)).join('\n');

                return {
                    result: result.trim(),
                    stats: {
                        bolosTotal: bolosTotalValue,
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
                        // ...other stats as needed
                    }
                };
            } catch (err) {
                console.error('Error parsing store report:', err);
                throw new Error(err.message || 'Formato do relatório da loja inválido. Verifique se o texto foi copiado corretamente.');
            }
        }

        function processInputLoja() {
            previewLoja.textContent = '';
            errorDiv.style.display = 'none';
            unknownBolosDiv.style.display = 'none';
            document.getElementById('success-loja').classList.remove('visible');
            
            try {
                const text = textareaLoja.value;
                if (!text.trim()) return;

                const { result, stats } = parseStoreReport(text);

                // Soma todos os bolos (loja) a partir do resultado (primeiras 39 linhas)
                let totalBolos = 0;
                let totalBolosIf = 0;
                let totalFaturado = 0;

                if (result) {
                    const resultLines = result.split('\n');
                    // Soma todos os bolos (loja + especiais)
                    for (let i = 0; i < 39 && i < resultLines.length; i++) {
                        const value = parseInt(resultLines[i]) || 0;
                        totalBolos += value;
                    }

                    // Encontrar a seção BOLOS IFOOD e somar todas as quantidades
                    const ifoodMatch = text.match(/ BOLOS IFOOD\n([\s\S]*?)(?=\n \w|$)/);
                    if (ifoodMatch) {
                        const ifoodLines = ifoodMatch[1].split('\n');
                        ifoodLines.forEach(line => {
                            if (line.includes('Quantidade:')) {
                                const qtyMatch = line.match(/Quantidade: ([\d,]+)/);
                                if (qtyMatch) {
                                    totalBolosIf += parseFloat(qtyMatch[1].replace(',', '.')) || 0;
                                }
                            }
                        });
                    }
                }

                // Use o faturamento total calculado corretamente em parseStoreReport
                if (stats && stats.revenue && stats.revenue.total !== undefined) {
                    totalFaturado = stats.revenue.total;
                    console.log('[Loja] Usando faturamento calculado corretamente:', totalFaturado);
                } else {
                    // Fallback para o método antigo caso não haja stats.revenue
                    const vendaMatch = text.match(/Vendas:([\d.,]+)/);
                    if (vendaMatch) {
                        totalFaturado = parseValue(vendaMatch[1]);
                        
                        // Adiciona o valor do acréscimo (taxa de entrega)
                        const acrescimoMatch = text.match(/Acréscimo:([\d.,]+)/);
                        if (acrescimoMatch) {
                            totalFaturado += parseValue(acrescimoMatch[1]);
                        }
                    }
                    console.log('[Loja] Usando método de fallback para faturamento:', totalFaturado);
                }

                if (result && stats) {
                    previewLoja.textContent = result;
                    updateDashboard(stats);

                    // Atualiza o resumo do dashboard (parte de baixo)
                    document.getElementById('summary-loja').textContent = `${totalBolos} bolos`;
                    document.getElementById('summary-loja-ifood').textContent = `(${totalBolosIf} iFood)`;
                    document.getElementById('summary-loja-valor').textContent = 
                        `R$ ${totalFaturado.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

                    // Atualiza o total geral (soma dos dois)
                    updateSummaryTotal();

                    document.getElementById('success-loja').classList.add('visible');
                    copyText(result, copyButtonLoja);
                    if (stats.unknownBolos?.length > 0) {
                        unknownBolosDiv.textContent = `Novo(s) sabor(es) identificado(s): ${stats.unknownBolos.join(', ')}. Não contabilizado(s) no resultado.`;
                        unknownBolosDiv.style.display = 'block';
                    }
                }
            } catch (err) {
                console.error('Erro:', err);
                errorDiv.textContent = err.message || 'Erro ao processar relatório. Verifique o formato.';
                errorDiv.style.display = 'block';
            }
        }


        // Handler do botão de cópia para mostrar feedback visual
        copyButtonLoja.addEventListener('click', () => {
            const result = previewLoja.textContent;
            if (!result) return;
            copyButtonLoja.style.background = '#22c55e';
            copyButtonLoja.style.color = 'white';
            copyText(result, copyButtonLoja).finally(() => {
                setTimeout(() => {
                    copyButtonLoja.style.background = '';
                    copyButtonLoja.style.color = '';
                }, 2000);
            });
        });

        // Handler do botão de colar relatório da loja
        const pasteButtonLoja = document.getElementById('pasteButton-loja');
        if (pasteButtonLoja) {
            pasteButtonLoja.addEventListener('mousedown', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                // Safari pode bloquear clipboard sem interação direta, tente fallback
                if (navigator.clipboard && navigator.clipboard.readText) {
                    try {
                        const text = await navigator.clipboard.readText();
                        textareaLoja.value = text;
                        textareaLoja.dispatchEvent(new Event('input', { bubbles: true }));
                    } catch (err) {
                        alert('Não foi possível acessar a área de transferência. Permita o acesso ao clipboard no navegador.');
                    }
                } else {
                    // Fallback: tenta usar execCommand (antigo, mas pode funcionar em alguns browsers)
                    textareaLoja.focus();
                    document.execCommand('paste');
                }
            });
        }

        copyButtonQuiosque.addEventListener('click', () => {
            const result = previewQuiosque.textContent;
            if (!result) return;
            
            copyButtonQuiosque.style.background = '#22c55e';
            copyButtonQuiosque.style.color = 'white';
            
            copyText(result, copyButtonQuiosque).finally(() => {
                setTimeout(() => {
                    copyButtonQuiosque.style.background = '';
                    copyButtonQuiosque.style.color = '';
                }, 2000);
            });
        });

        // Debounce function to prevent too many updates
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        textareaQuiosque.addEventListener('input', debounce(processInputQuiosque, 500));
        textareaLoja.addEventListener('input', debounce(processInputLoja, 500));

        function updateDashboard(stats) {
            if (!stats) return;
            
            // Format and display date
            const dateDiv = document.getElementById('report-date');
            if (stats.dateRange) {
                const { start, end } = stats.dateRange;
                if (start === end) {
                    const date = new Date(start);
                    dateDiv.textContent = date.toLocaleDateString('pt-BR', { 
                        day: 'numeric',
                        month: 'long',
                                               year: 'numeric'
                    });
                } else {
                    dateDiv.textContent = `Período: ${new Date(start).toLocaleDateString('pt-BR')} a ${new Date(end).toLocaleDateString('pt-BR')}`;
                }
            } else {
                dateDiv.textContent = '';
            }
            
            const formatNumber = n => Math.round(n || 0).toString();
            const formatCurrency = v => {
                const value = Number(v || 0);
                return `R$ ${value.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}`;
            };
            
            // Update bolo metrics using category totals
            document.getElementById('total-bolos').textContent = formatNumber(stats.bolosLoja + stats.bolosIfood);
            
            // Rest of metrics stay the same
            document.getElementById('bolos-grandes').textContent = formatNumber(stats.bolosGrandes || 0);
            document.getElementById('bolos-mini').textContent = formatNumber(stats.bolosMini || 0);
            document.getElementById('bolos-c').textContent = formatNumber(stats.bolosC || 0);
            document.getElementById('bolos-especiais').textContent = formatNumber(stats.bolosEspeciais || 0);
            document.getElementById('bolos-loja').textContent = formatNumber(stats.bolosLoja || 0);
            document.getElementById('bolos-ifood').textContent = formatNumber(stats.bolosIfood || 0);
            document.getElementById('total-fatias').textContent = formatNumber(stats.totalFatias);

            // Update revenue items one by one to ensure proper handling
            if (stats.revenue) {
                document.getElementById('revenue-total').textContent = formatCurrency(stats.revenue.total);
                document.getElementById('revenue-bebidas').textContent = formatCurrency(stats.revenue.bebidas);
                document.getElementById('revenue-alimentos').textContent = formatCurrency(stats.revenue.alimentos);
                document.getElementById('revenue-bolos').textContent = formatCurrency(stats.revenue.bolos);
                document.getElementById('revenue-artigos').textContent = formatCurrency(stats.revenue.artigos);
                document.getElementById('revenue-fatias').textContent = formatCurrency(stats.revenue.fatias);
            }
        }

        function updateSummaryTotal() {
    // Parse numbers from strings that may include the word "bolos"
    function parseBolosCount(str) {
        const match = (str || '').match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    }

    // Pega os valores atuais do resumo das duas lojas
    const loja = parseBolosCount(document.getElementById('summary-loja').textContent);
    const quiosque = parseBolosCount(document.getElementById('summary-quiosque').textContent);
    
    // Total geral = loja + quiosque (cada um já inclui seus respectivos bolos do iFood)
    const totalBolos = loja + quiosque;

    // Faturamento
    function parseBRL(str) {
        return parseFloat((str || '').replace(/[^\d,]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
    }
    const lojaValor = parseBRL(document.getElementById('summary-loja-valor').textContent);
    const quiosqueValor = parseBRL(document.getElementById('summary-quiosque-valor').textContent);
    const totalValor = lojaValor + quiosqueValor;

    document.getElementById('summary-total').textContent = `${totalBolos} bolos`;
    document.getElementById('summary-valor-total').textContent = `R$ ${totalValor.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}
