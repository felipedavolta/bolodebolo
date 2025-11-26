import { bolosList, specialBolos } from './constants.js';

// Helper functions
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\\\\\\]\\\\]/g, '\\\\$&');
}

function parseValue(value) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;

    value = value.replace(/\s*\([\s\S]*?\)/g, '').trim();

    if (value.includes('.') && /,\d{2}$/.test(value)) {
        value = value.replace(/\./g, '').replace(',', '.');
    } else {
        value = value.replace(',', '.');
    }

    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
}

function extractValueByLabel(text, label, isCurrency = false, isQuantity = false) {
    if (!text || !label) return isCurrency || isQuantity ? 0 : '';
    try {
        const lines = text.split(/\r?\n/);
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const directRegex = new RegExp(`^${escapeRegExp(label)}\\s*(?:-|–|:|\\s)\\s*([\\d.,]+(?:\\s*\\([\\d.,%]+\\))?)`, 'i');
            let match = line.match(directRegex);
            if (match && match[1]) {
                return parseValue(match[1]);
            }

            if (line.toUpperCase().includes(label.toUpperCase())) {
                if (line.toLowerCase().includes('total')) {
                    const totalMatch = line.match(/total[\s.:]*[\d.,]+[\s]*[\d.,]*[\s]*([\d.,]+)/i);
                    if (totalMatch && totalMatch[1]) {
                        const value = parseValue(totalMatch[1]);
                        if (value > 0) return value;
                    }
                    
                    const numbers = line.match(/[\d.,]+/g);
                    if (numbers && numbers.length >= 3) {
                        const lastNumber = numbers[numbers.length - 1];
                        const value = parseValue(lastNumber);
                        if (value > 0) return value;
                    }
                }
                
                if (line.toLowerCase().includes('código') || 
                    line.toLowerCase().includes('produto') ||
                    line.toLowerCase().includes('unidade')) {
                    continue;
                }
                
                const numbers = line.match(/[\d.,]+/g);
                if (numbers && numbers.length > 0) {
                    const lastNumber = numbers[numbers.length - 1];
                    const value = parseValue(lastNumber);
                    if (value > 0) return value;
                }
            }

            const spacedRegex = new RegExp(`${escapeRegExp(label)}[\\s.\\-–]*([\\d.,]+)`, 'i');
            match = line.match(spacedRegex);
            if (match && match[1]) {
                return parseValue(match[1]);
            }
        }

        for (let i = 0; i < lines.length - 3; i++) {
            const line = lines[i].trim();
            
            if (line.toUpperCase().includes(label.toUpperCase())) {
                for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
                    const nextLine = lines[j].trim();
                    
                    if (nextLine.toLowerCase().includes('total')) {
                        const totalMatch = nextLine.match(/total[\s.:]*([\\d.,]+)/i);
                        if (totalMatch && totalMatch[1]) {
                            return parseValue(totalMatch[1]);
                        }
                    }
                    
                    if (nextLine.match(/^[\\d.,]+$/)) {
                        return parseValue(nextLine);
                    }
                }
            }
        }

    } catch (e) {
        console.error(`[extractValueByLabel] Erro para label "${label}":`, e);
    }
    
    return isCurrency || isQuantity ? 0 : '';
}

function extractSectionValue(text, sectionName) {
    const lines = text.split(/\r?\n/);
    let inSection = false;
    let sectionTotal = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        if (line.toLowerCase() === sectionName.toLowerCase()) {
            inSection = true;
            continue;
        }
        
        if (inSection) {
            if (line.toLowerCase().includes('código') || 
                line.toLowerCase().includes('produto') ||
                line.toLowerCase().includes('unidade') ||
                line.toLowerCase().includes('qtd')) {
                continue;
            }
            
            if (line.match(/^[A-ZÁÉÍÓÚÀÂÊÔÃÇ\s]+$/) && line.length > 5 && 
                !line.toLowerCase().includes('total') && 
                !line.toLowerCase().includes('impresso')) {
                break;
            }
            
            if (line.toLowerCase().startsWith('total ')) {
                const numbers = line.match(/[\d.,]+/g);
                if (numbers && numbers.length >= 3) {
                    sectionTotal = parseValue(numbers[numbers.length - 1]);
                    break;
                }
            }
        }
    }
    
    return sectionTotal;
}

function extractTotalizadorValue(text, itemName) {
    const lines = text.split(/\r?\n/);
    let inTotalizadores = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.includes('Totalizadores Gerais')) {
            inTotalizadores = true;
            continue;
        }
        
        if (inTotalizadores) {
            if (line.toLowerCase().includes(itemName.toLowerCase())) {
                const valueMatch = line.match(/([\d.,]+)$/);
                if (valueMatch && valueMatch[1]) {
                    return parseValue(valueMatch[1]);
                }
                
                const numbers = line.match(/[\d.,]+/g);
                if (numbers && numbers.length > 0) {
                    return parseValue(numbers[numbers.length - 1]);
                }
            }
            
            if (line.toLowerCase().includes('impresso em') || 
                line.toLowerCase().includes('página')) {
                break;
            }
        }
    }
    
    return 0;
}

function extractFaturamentoQuiosque(text, categoria) {
    const lines = text.split(/\r?\n/);
    
    for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        
        if (line.toLowerCase() === categoria.toLowerCase()) {
            for (let j = i + 1; j < lines.length; j++) {
                const nextLine = lines[j].trim();
                
                if (!nextLine) continue;
                
                if (nextLine.toLowerCase().includes('código') || 
                    nextLine.toLowerCase().includes('produto') ||
                    nextLine.toLowerCase().includes('unidade') ||
                    nextLine.toLowerCase().includes('qtd')) {
                    continue;
                }
                
                if (nextLine.match(/^[A-ZÁÉÍÓÚÀÂÊÔÃÇ\s]+$/) && nextLine.length > 5 && 
                    nextLine !== line && !nextLine.toLowerCase().includes('total') &&
                    !nextLine.toLowerCase().includes('impresso')) {
                    break;
                }
                
                if (nextLine.toLowerCase().startsWith('total ')) {
                    const numbers = nextLine.match(/[\d.,]+/g);
                    if (numbers && numbers.length >= 3) {
                        const value = parseValue(numbers[numbers.length - 1]);
                        if (value > 0) {
                            return value;
                        }
                    }
                }
            }
        }
    }
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.toLowerCase().includes(categoria.toLowerCase()) && 
            line.toLowerCase().includes('total') &&
            !line.toLowerCase().includes('código') &&
            !line.toLowerCase().includes('produto')) {
            
            const numbers = line.match(/[\d.,]+/g);
            if (numbers && numbers.length > 0) {
                return parseValue(numbers[numbers.length - 1]);
            }
        }
    }
    
    return 0;
}

export function processSalesReport(text) {
    try {
        const bolosRegular = {};
        const bolosIfood = {};
        const result = [];
        let fatiasRegularQtd = 0;
        let fatiaIntegralQtd = 0;
        let fatiaAipimQtd = 0;
        let quadradinhoQtd = 0;
        let faturamentoText = '';
        let acrescimosDescontosText = '';
        let faturamentoBebidas = 0;
        let faturamentoAlimentos = 0;
        let faturamentoBolosCombinado = 0;
        let faturamentoArtigosFesta = 0;
        let faturamentoFatias = 0;
        let faturamentoAcrescimo = 0;
        let faturamentoDesconto = 0;
        let totalGeral = 0;
        let revenueStart = 53;
        let currentSection = 'BOLOS';
        let dateStartISO = null;
        let dateEndISO = null;
        let reportDayNumber = '';
        try {
            const dataMatch = text.match(/Data:\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*\d{2}:\d{2}:\d{2}\s*à\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*\d{2}:\d{2}:\d{2}/i);
            const startBR = dataMatch?.[1] || null;
            const endBR = dataMatch?.[2] || null;
            const toISO = (br) => {
                if (!br) return null;
                const [d, m, y] = br.split('/').map(n => parseInt(n, 10));
                if (!y || !m || !d) return null;
                return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            };
            dateStartISO = toISO(startBR);
            dateEndISO = toISO(endBR);
            const dayStr = (endBR || startBR || '').split('/')[0];
            if (dayStr) reportDayNumber = String(parseInt(dayStr, 10));
        } catch (e) {
            console.warn('[Quiosque] Falha ao extrair data do cabeçalho.');
        }

        if (!faturamentoText) {
            faturamentoText = text;
        }

        const acrescimosDescontosRegex = /Acréscimos e Descontos([\\s\\S]*?)(?=Total da Operação|Total Geral|Nome Fantasia|$)/i;
        const acrescimosMatch = text.match(acrescimosDescontosRegex);
        if (acrescimosMatch && acrescimosMatch[1]) {
            acrescimosDescontosText = acrescimosMatch[1].trim();
        } else {
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
                    break;
                }
            }
            
            if (!acrescimosDescontosText) {
                acrescimosDescontosText = text;
            }
        }

        faturamentoBebidas = extractFaturamentoQuiosque(text, 'BEBIDAS');
        faturamentoAlimentos = extractFaturamentoQuiosque(text, 'ALIMENTOS');
        const bolosValue = extractFaturamentoQuiosque(text, 'BOLOS');
        const bolosIfoodValue = extractFaturamentoQuiosque(text, 'BOLOS IFOOD') || extractFaturamentoQuiosque(text, 'BOLOS I');
        faturamentoBolosCombinado = bolosValue + bolosIfoodValue;
        faturamentoArtigosFesta = extractFaturamentoQuiosque(text, 'ARTIGOS FESTA') || extractFaturamentoQuiosque(text, 'ARTIGOS DE FESTA');
        faturamentoFatias = extractFaturamentoQuiosque(text, 'FATIAS') || extractFaturamentoQuiosque(text, 'FATIA');
        
        if (faturamentoBebidas === 0 && faturamentoAlimentos === 0 && faturamentoBolosCombinado === 0) {
            faturamentoBebidas = extractSectionValue(text, 'BEBIDAS');
            faturamentoAlimentos = extractSectionValue(text, 'ALIMENTOS');
            const bolosValue2 = extractSectionValue(text, 'BOLOS');
            const bolosIfoodValue2 = extractSectionValue(text, 'BOLOS IFOOD');
            faturamentoBolosCombinado = bolosValue2 + bolosIfoodValue2;
            faturamentoArtigosFesta = extractSectionValue(text, 'ARTIGOS FESTA') || extractSectionValue(text, 'ARTIGOS DE FESTA');
            faturamentoFatias = extractSectionValue(text, 'FATIA') || extractSectionValue(text, 'FATIAS');
        }
        
        const acrescimoMatchVal = text.match(/Valor\s+total\s+de\s+acr[ée]scimo\s+de\s+pedidos[^\d]+([\d.,]+)/i);
        faturamentoAcrescimo = acrescimoMatchVal ? parseValue(acrescimoMatchVal[1]) : 0;
        
        const descontoMatchVal = text.match(/Valor\s+total\s+de\s+desconto\s+de\s+pedidos[^\d]+([\d.,]+)/i);
        faturamentoDesconto = descontoMatchVal ? parseValue(descontoMatchVal[1]) : 0;
        
        function extractTotalGeralAnywhere(t) {
            const m = t.match(/Total\s+Geral\s*[:\-]?\s*([\d.,]+)/i);
            return m && m[1] ? parseValue(m[1]) : 0;
        }

        totalGeral = extractTotalizadorValue(text, 'Total Geral') || 
                    extractTotalGeralAnywhere(text) ||
                    extractTotalizadorValue(text, 'total de produtos vendidos') ||
                    extractValueByLabel(text, 'Total Geral', true);

        function extractTotalGeralStrict(t) {
            const m = t.match(/Total\s+Geral[^\d]+((?:\d{1,3}\.)*\d{1,3},\d{2})/i);
            if (m && m[1]) {
                return parseValue(m[1]);
            }
            return 0;
        }
        const strictTG = extractTotalGeralStrict(text);
        if (strictTG > 0) {
            totalGeral = strictTG;
        }
        
        if (faturamentoBebidas === 0 && faturamentoAlimentos === 0 && faturamentoBolosCombinado === 0) {
            if (faturamentoText) {
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
            }
        }

        if (faturamentoAcrescimo === 0 && faturamentoDesconto === 0) {
            if (acrescimosDescontosText) {
                const acrescimoVariations = ['ACRÉSCIMO', 'ACRESCIMO', 'Total de Acréscimos', 'Acréscimos', 'acréscimo', 'acrescimo'];
                for (let variation of acrescimoVariations) {
                    const tempAcrescimo = extractValueByLabel(acrescimosDescontosText, variation, true);
                    if (tempAcrescimo > 0) {
                        faturamentoAcrescimo = tempAcrescimo;
                        break;
                    }
                }

                const descontoVariations = ['DESCONTO', 'Total de Descontos', 'Descontos', 'desconto'];
                for (let variation of descontoVariations) {
                    const tempDesconto = extractValueByLabel(acrescimosDescontosText, variation, true);
                    if (tempDesconto > 0) {
                        faturamentoDesconto = tempDesconto;
                        break;
                    }
                }
            }
        }
        
        function normalizeProductName(name) {
            if (!name) return '';
            const n = name.trim().toUpperCase();

            if (n === 'FATIA DE BOLO' || n === 'FATIA MINI' || n === 'FATIA PROMO' || 
                (n.includes('FATIA') && n.includes('BOLO') && !n.includes('INTEGRAL') && !n.includes('AIPIM'))) return 'FATIA DE BOLO';
            
            if (n === 'FATIA INTEGRAL' || n === 'FATIA DE BOLO INTEGRAL' || n === 'FATIA BOLO INTEGRAL') return 'FATIA INTEGRAL';
            
            if (n === 'FATIA AIPIM' || n === 'FATIA DE AIPIM' || n === 'FATIA DE BOLO DE AIPIM' || n === 'FATIA BOLO AIPIM') return 'FATIA AIPIM';

            if (n === 'BOLO INTEGRAL BANANA E AVEIA') return 'BOLO BANANA AVEIA';
            if (n === 'BOLO INTEGRAL BANANA E AVEIA I') return 'BOLO BANANA AVEIA I';

            return n;
        }

        function processProductLine(parts, sectionName) {
            if (!parts || parts.length < 2) return;

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

            let valueData = parts.slice(unitIndex + 1);
            if (valueData.length >= 3) {
                const qtdIndex = valueData.findIndex(v => v.startsWith('Qtd:'));
                if (qtdIndex !== -1) {
                    quantity = parseValue(valueData[qtdIndex].replace('Qtd:', ''));
                } else {
                    quantity = parseValue(valueData[valueData.length - 2]);
                }
                totalValue = parseValue(valueData[valueData.length - 1]);
            }

            if (productName === 'FATIA DE BOLO' || productName === 'FATIA MINI' || productName === 'FATIA PROMO') {
                fatiasRegularQtd += quantity;
            } else if (productName === 'FATIA INTEGRAL') {
                fatiaIntegralQtd += quantity;
            } else if (productName === 'FATIA AIPIM') {
                fatiaAipimQtd += quantity;
            } else if (productName === 'QUADRADINHO') {
                quadradinhoQtd += quantity;
            }

            if ((productName.startsWith('BOLO ') && !productName.endsWith(' I')) ||
                productName === 'BOLO INTEGRAL BANANA E AVEIA') {
                bolosRegular[productName] = (bolosRegular[productName] || 0) + quantity;
            } else if (productName.startsWith('BOLO ') && productName.endsWith(' I')) {
                bolosIfood[productName] = (bolosIfood[productName] || 0) + quantity;
            }
            else if (productName === 'GANACHE 200G') {
                bolosRegular['GANACHE 200G'] = (bolosRegular['GANACHE 200G'] || 0) + quantity;
            } else if (productName === 'GANACHE 100G') {
                bolosRegular['GANACHE 100G'] = (bolosRegular['GANACHE 100G'] || 0) + quantity;
            } else if (productName === 'GANACHE 200G I') {
                bolosIfood['GANACHE 200G I'] = (bolosIfood['GANACHE 200G I'] || 0) + quantity;
            } else if (productName === 'GANACHE 100G I') {
                bolosIfood['GANACHE 100G I'] = (bolosIfood['GANACHE 100G I'] || 0) + quantity;
            }
            else if (productName === 'BRIGADEIRO') {
                bolosRegular['BRIGADEIRO'] = (bolosRegular['BRIGADEIRO'] || 0) + quantity;
            }
        }

        function generateOutput() {
            bolosList.forEach(([regular, ifood], index) => {
                const regularQty = bolosRegular[regular] || 0;
                const ifoodQty = bolosIfood[ifood] || 0;
                result[index] = (regularQty + ifoodQty).toString();
            });

            let idx = bolosList.length;
            specialBolos.forEach((bolo, sIndex) => {
                result[idx + sIndex] = (bolosRegular[bolo] || 0).toString();
            });
            idx += specialBolos.length;

            result[idx++] = '';

            result[idx++] = (bolosRegular['GANACHE 200G'] || 0).toString();
            result[idx++] = (bolosRegular['GANACHE 100G'] || 0).toString();
            result[idx++] = (bolosIfood['GANACHE 200G I'] || 0).toString();
            result[idx++] = (bolosIfood['GANACHE 100G I'] || 0).toString();
            result[idx++] = (bolosRegular['BRIGADEIRO'] || 0).toString();

            result[idx++] = fatiasRegularQtd.toString();
            result[idx++] = fatiaIntegralQtd.toString();
            result[idx++] = fatiaAipimQtd.toString();
            result[idx++] = quadradinhoQtd.toString();

            result[idx++] = '';
            result[idx++] = reportDayNumber || '';
            result[idx++] = '';

            revenueStart = idx;
            const totalFaturamentoCalculado = (
                (faturamentoBebidas || 0) +
                (faturamentoAlimentos || 0) +
                (faturamentoBolosCombinado || 0) +
                (faturamentoArtigosFesta || 0) +
                (faturamentoFatias || 0) +
                (faturamentoAcrescimo || 0) +
                (-(Math.abs(faturamentoDesconto || 0)))
            );
            const totalParaSaida = (totalGeral && totalGeral > 0) ? totalGeral : totalFaturamentoCalculado;
            result[idx++] = totalParaSaida.toFixed(2);
            result[idx++] = (faturamentoBebidas || 0).toFixed(2);
            result[idx++] = (faturamentoAlimentos || 0).toFixed(2);
            result[idx++] = (faturamentoBolosCombinado || 0).toFixed(2);
            result[idx++] = (faturamentoArtigosFesta || 0).toFixed(2);
            result[idx++] = (faturamentoFatias || 0).toFixed(2);
            result[idx++] = (faturamentoAcrescimo || 0).toFixed(2);
            result[idx++] = (-Math.abs(faturamentoDesconto || 0)).toFixed(2);
        }

        const sections = text.split(/(?=PRODUTOS VENDIDOS|ALIMENTOS|BEBIDAS|BOLOS IFOOD|BOLOS|FATIA$|ARTIGOS)/);

        text.split('\n').forEach(line => {
            if (line.includes('Valor total de produtos vendidos') && totalGeral === 0) {
                totalGeral = parseValue(line.split(/\s+/).pop());
            }
        });

        const headerSection = sections[0];
        const headerLines = headerSection.split('\n');
        
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

        sections.forEach(section => {
            const sectionName = section.split('\n')[0].trim();
            const lines = section.split('\n');
            let total = 0;
            let currentTotal = 0;

            if (sectionName === 'FATIA') {
                let foundTotal = false;
                for (let i = lines.length - 1; i >= 0; i--) {
                    const line = lines[i].trim();
                    if (line.startsWith('Total') && !line.includes('Total Geral')) {
                        const parts = line.split(/\s+/);
                        const lastValue = parts[parts.length - 1];
                        currentTotal = parseValue(lastValue);
                        total = currentTotal;
                        foundTotal = true;
                        break;
                    }
                }

                lines.forEach(line => {
                    if (!line.includes('Impresso em') && !line.includes('Código Produto')) {
                        const parts = line.trim().split(/\s+/);
                        if (parts.length >= 5 && /^\d+$/.test(parts[0])) {
                            processProductLine(parts, sectionName);
                        }
                    }
                });
            } else {
                const totalLines = lines.filter(line => line.trim().startsWith('Total') && !line.includes('Total Geral'));
                if (totalLines.length > 0) {
                    const lastTotalLine = totalLines[totalLines.length - 1].trim();
                    const totalParts = lastTotalLine.split(/\s+/);
                    total = parseValue(totalParts[totalParts.length - 1]);
                }
            }

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
            
        generateOutput();

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
                revenue: {
                    total: totalGeral,
                    bebidas: faturamentoBebidas,
                    alimentos: faturamentoAlimentos,
                    bolos: faturamentoBolosCombinado,
                    artigos: faturamentoArtigosFesta,
                    fatias: faturamentoFatias,
                    acrescimo: faturamentoAcrescimo,
                    desconto: faturamentoDesconto
                }
            }
        };
    } catch (error) {
        console.error('Erro ao processar:', error);
        throw new Error(`Erro ao processar relatório: ${error.message}`);
    }
}

export function parseStoreReport(text) {
    try {
        if (!text?.trim()) {
            throw new Error('O relatório está vazio');
        }

        const vendasMatch = text.match(/Vendas\s*:\s*([\d.,]+)/i);
        const descontoMatch = text.match(/Desconto\s*:\s*([\d.,]+)/i);
        const acrescimoMatch = text.match(/Acr[ée]scimo\s*:\s*([\d.,]+)/i);

        if (!vendasMatch) {
            // Try to find total sales in another way or just proceed if we have items
            const hasItems = text.includes('Valor Unitário:');
            if (!hasItems) {
                const lines = text.split('\n').filter(l => l.trim().length > 0);
                console.error('Linhas do relatório para debug:', lines.slice(-15).join('\n'));
                throw new Error('Não foi possível encontrar os dados do relatório (Vendas ou Itens)');
            }
        }

        const totals = {
            vendas: vendasMatch ? parseFloat(vendasMatch[1].replace('.', '').replace(',', '.') || 0) : 0,
            desconto: descontoMatch ? parseFloat(descontoMatch[1].replace('.', '').replace(',', '.') || 0) : 0,
            acrescimo: acrescimoMatch ? parseFloat(acrescimoMatch[1].replace('.', '').replace(',', '.') || 0) : 0
        };

        let dateStartISO = null;
        let dateEndISO = null;
        let reportDayNumber = null;
        try {
            const diMatch = text.match(/Data\s*Inicial[^\n]*\n\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
            const dfMatch = text.match(/Data\s*Final[^\n]*\n\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);

            function toISO(brDate) {
                if (!brDate) return null;
                const [d, m, y] = brDate.split('/').map(n => parseInt(n, 10));
                if (!y || !m || !d) return null;
                return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            }

            const di = diMatch?.[1] || null;
            const df = dfMatch?.[1] || null;
            dateStartISO = toISO(di);
            dateEndISO = toISO(df);

            if (df) {
                reportDayNumber = String(parseInt(df.split('/')[0], 10));
            } else if (di) {
                reportDayNumber = String(parseInt(di.split('/')[0], 10));
            } else {
                reportDayNumber = String(new Date().getDate());
            }
        } catch (e) {
            console.warn('Falha ao extrair datas do relatório, usando data atual para o dia do mês.');
            reportDayNumber = String(new Date().getDate());
        }

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
            bolos: / BOLO\n([\s\S]*?)(?=\n {1,2}(?:BOLOS IFOOD|ALIMENTOS|BEBIDAS|FATIA|ARTIGOS|$))/,
            bolosIFood: / BOLOS IFOOD\n([\s\S]*?)(?=\n \w|$)/,
            fatias: / FATIA DE BOLO\n([\s\S]*?)(?=\n \w|$)/,
            alimentos: / ALIMENTOS\n([\s\S]*?)(?=\n \w|$)/,
            bebidas: / BEBIDAS\n([\s\S]*?)(?=\n \w|$)/,
            artigos: / ARTIGOS DE FESTA\n([\s\S]*?)(?=\n \w|$)/
        };

        const sectionData = {};
        Object.entries(sections).forEach(([key, regex]) => {
            const match = text.match(regex);
            sectionData[key] = parseItems(match?.[1] || '');
        });

        let result = '';
        let allBolos = {};
        
        bolosList.forEach(([regular]) => {
            allBolos[regular] = { qty: 0, value: 0 };
        });
        specialBolos.forEach(bolo => {
            allBolos[bolo] = { qty: 0, value: 0 };
        });

        sectionData.bolos.forEach(item => {
            const name = item.name.trim();
            let normalizedName = name;
            
            if (name.startsWith('BOLO SF')) {
                normalizedName = name.toUpperCase();
            }
            else if (name.startsWith('SF')) {
                normalizedName = 'BOLO ' + name.toUpperCase();
            }
            
            if (normalizedName in allBolos) {
                allBolos[normalizedName].qty = Number(item.quantity) || 0;
                allBolos[normalizedName].value = Number(item.value) || 0;
            }
        });

        sectionData.bolosIFood.forEach(item => {
            const name = item.name.trim();
            const regularName = name.replace(/ I$/, '');
            if (regularName in allBolos) {
                allBolos[regularName].qty += Number(item.quantity) || 0;
                allBolos[regularName].value += Number(item.value) || 0;
            }
        });

        bolosList.forEach(([regular]) => {
            result += allBolos[regular].qty.toString() + '\n';
        });

        specialBolos.forEach(bolo => {
            result += allBolos[bolo].qty.toString() + '\n';
        });

        result += '\n';

        const bolosTotalValue = Object.values(allBolos)
            .reduce((sum, item) => sum + (item.value || 0), 0);
        
        const alimentosMap = {
            'CALDA POTE 200g': 0,
            'CALDA POTE 100G': 0,
            'CALDA POTE 200g I': 0,
            'CALDA POTE 100G I': 0,
            'BRIGADEIRO DE COLHER': 0
        };

        sectionData.alimentos.forEach(item => {
            const exactName = item.name.trim();
            if (exactName in alimentosMap) {
                alimentosMap[exactName] = Number(item.quantity) || 0;
            }
        });

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

        const fatiaTotal = sectionData.fatias.reduce((acc, item) => {
            if (['FATIA DE BOLO', 'FATIA PROMO', 'FATIA MINI'].includes(item.name)) {
                return acc + (item.quantity || 0);
            }
            return acc;
        }, 0);

        result += fatiaTotal.toString() + '\n';

        ['FATIA INTEGRAL', 'FATIA DE AIPIM', 'QUADRADINHO'].forEach(name => {
            const item = sectionData.fatias.find(i => i.name === name);
            result += (item?.quantity || 0).toString() + '\n';
        });

        result += '\n' + reportDayNumber + '\n\n';

        const revenueMatches = {
            bolos: text.match(/ BOLO\n([\d.,]+)\n/),
            bolosIFood: text.match(/ BOLOS IFOOD\n([\d.,]+)\n/),
            bebidas: text.match(/ BEBIDAS\n([\d.,]+)\n/),
            alimentos: text.match(/ ALIMENTOS\n([\d.,]+)\n/),
            artigos: text.match(/ ARTIGOS DE FESTA\n([\d.,]+)\n/),
            fatias: text.match(/ FATIA DE BOLO\n([\d.,]+)\n/)
        };

        function parseBRNumber(str) {
            if (!str) return 0;
            const withoutDots = str.replace(/\./g, '');
            const withDecimalDot = withoutDots.replace(',', '.');
            return parseFloat(withDecimalDot);
        }

        const bolosValue = parseBRNumber(revenueMatches.bolos?.[1]);
        const bolosIFoodValue = parseBRNumber(revenueMatches.bolosIFood?.[1]);
        
        const revenues = [
            parseBRNumber(revenueMatches.bebidas?.[1]),
            parseBRNumber(revenueMatches.alimentos?.[1]),
            bolosValue + bolosIFoodValue,
            parseBRNumber(revenueMatches.artigos?.[1]),
            parseBRNumber(revenueMatches.fatias?.[1]),
            totals.acrescimo,
            -totals.desconto
        ];

        const totalRevenueLine = revenues.reduce((sum, val) => sum + val, 0).toFixed(2);
        result += totalRevenueLine + '\n' + revenues.map(v => v.toFixed(2)).join('\n');

        return {
            result: result.trim(),
            stats: {
                bolosTotal: bolosTotalValue,
                ...(dateStartISO && dateEndISO ? { dateRange: { start: dateStartISO, end: dateEndISO } } : {}),
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
    } catch (err) {
        console.error('Error parsing store report:', err);
        throw new Error(err.message || 'Formato do relatório da loja inválido. Verifique se o texto foi copiado corretamente.');
    }
}
