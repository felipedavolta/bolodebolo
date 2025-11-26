import { processSalesReport, parseStoreReport } from './parsers.js';

// DOM Elements
const textareaQuiosque = document.getElementById('input-quiosque');
const previewQuiosque = document.getElementById('preview-quiosque');
const copyButtonQuiosque = document.getElementById('copyButton-quiosque');
const errorDiv = document.getElementById('error');
const unknownBolosDiv = document.getElementById('unknown-bolos');

const textareaLoja = document.getElementById('input-loja');
const previewLoja = document.getElementById('preview-loja');
const copyButtonLoja = document.getElementById('copyButton-loja');

// Helper functions
async function copyText(text, button, otherButtonToReset) {
    try {
        await navigator.clipboard.writeText(text);
        
        const span = button.querySelector('span');
        if (span) span.textContent = 'Copiado!';
        button.classList.remove('button-disabled', 'button-ready');
        button.classList.add('button-copied');
        button.style.animation = '';
        button.style.transform = '';

        if (otherButtonToReset && !otherButtonToReset.classList.contains('button-disabled')) {
            resetButtonToReady(otherButtonToReset);
        }
        
        return true;
    } catch (err) {
        console.warn('Clipboard API falhou (provavelmente Safari):', err);
        
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
                const span = button.querySelector('span');
                if (span) span.textContent = 'Copiado!';
                button.classList.remove('button-disabled', 'button-ready');
                button.classList.add('button-copied');
                button.style.animation = '';
                button.style.transform = '';

                if (otherButtonToReset && !otherButtonToReset.classList.contains('button-disabled')) {
                    resetButtonToReady(otherButtonToReset);
                }
                
                return true;
            }
        } catch (fallbackErr) {
            console.error('Todos os métodos de cópia falharam:', fallbackErr);
        }
        
        return false;
    }
}

function highlightCopyButton(button) {
    if (!button.classList.contains('button-copied')) {
        button.classList.remove('button-disabled');
        button.classList.add('button-ready');
    }
}

function resetButtonToReady(button) {
    const span = button.querySelector('span');
    if (span) span.textContent = 'Copiar Resultado';
    button.classList.remove('button-disabled', 'button-copied');
    button.classList.add('button-ready');
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
    revenueIds.forEach(id => {
        const el = document.getElementById(`revenue-${id}`);
        if (el) el.textContent = 'R$ 0,00';
    });
}

function updateDashboard(stats) {
    if (!stats) return;
    
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
    
    document.getElementById('total-bolos').textContent = formatNumber(stats.bolosLoja + stats.bolosIfood);
    
    document.getElementById('bolos-grandes').textContent = formatNumber(stats.bolosGrandes || 0);
    document.getElementById('bolos-mini').textContent = formatNumber(stats.bolosMini || 0);
    document.getElementById('bolos-c').textContent = formatNumber(stats.bolosC || 0);
    document.getElementById('bolos-especiais').textContent = formatNumber(stats.bolosEspeciais || 0);
    document.getElementById('bolos-loja').textContent = formatNumber(stats.bolosLoja || 0);
    document.getElementById('bolos-ifood').textContent = formatNumber(stats.bolosIfood || 0);
    document.getElementById('total-fatias').textContent = formatNumber(stats.totalFatias);

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
    function parseBolosCount(str) {
        const match = (str || '').match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    }

    const loja = parseBolosCount(document.getElementById('summary-loja').textContent);
    const quiosque = parseBolosCount(document.getElementById('summary-quiosque').textContent);
    
    const totalBolos = loja + quiosque;

    function parseCurrencyFlexible(str) {
        const s = str || '';
        const m = s.match(/(\d{1,3}(?:[.,]\d{3})*[.,]\d{2}|\d+(?:[.,]\d{2})?)(?!.*\d)/);
        if (!m) return 0;
        const num = m[1];
        if (num.includes(',') && num.includes('.')) {
            return parseFloat(num.replace(/\./g, '').replace(',', '.')) || 0;
        }
        if (num.includes(',')) {
            return parseFloat(num.replace(',', '.')) || 0;
        }
        return parseFloat(num) || 0;
    }
    const lojaValor = parseCurrencyFlexible(document.getElementById('summary-loja-valor').textContent);
    const quiosqueValor = parseCurrencyFlexible(document.getElementById('summary-quiosque-valor').textContent);
    const totalValor = lojaValor + quiosqueValor;

    document.getElementById('summary-total').textContent = `${totalBolos} bolos`;
    document.getElementById('summary-valor-total').textContent = `R$ ${totalValor.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

function updateSummaryItemOpacity(elementId, count, value) {
    const element = document.getElementById(elementId);
    if (!element) return;
    const item = element.parentElement;
    if (count === 0 && value === 0) {
        item.classList.add('empty');
    } else {
        item.classList.remove('empty');
    }
}

function resetSummary(type) {
    const suffix = type === 'loja' ? 'loja' : 'quiosque';
    document.getElementById(`summary-${suffix}`).textContent = '0 bolos';
    document.getElementById(`summary-${suffix}-ifood`).textContent = '(0 iFood)';
    document.getElementById(`summary-${suffix}-valor`).textContent = 'R$ 0,00';
    
    const el = document.getElementById(`summary-${suffix}`);
    if (el && el.parentElement) {
        el.parentElement.classList.add('empty');
    }
    updateSummaryTotal();
}

async function processInputQuiosque(autoCopy = false) {
    previewQuiosque.textContent = '';
    errorDiv.style.display = 'none';
    unknownBolosDiv.style.display = 'none';
    clearDashboard();
    
    if (copyButtonQuiosque.classList.contains('button-copied')) {
        resetButtonToReady(copyButtonQuiosque);
    }
    
    try {
        const text = textareaQuiosque.value;
        if (!text.trim()) {
            copyButtonQuiosque.classList.remove('button-ready', 'button-copied');
            copyButtonQuiosque.classList.add('button-disabled');
            resetSummary('quiosque');
            return;
        }

        const lines = text.trim().split('\n').filter(l => l.trim());
        const numbersOnly = lines.every(line => {
            const trimmed = line.trim();
            return /^[\d.,]+$/.test(trimmed) || trimmed === '';
        });
        
        if (numbersOnly && lines.length > 10) {
            throw new Error('Este parece ser um resultado já processado. Cole o relatório original do sistema.');
        }
        
        if (text.includes('Vendas:') && text.includes('Desconto:') && text.includes('Acréscimo:') && 
            !text.includes('Total Geral') && !text.includes('Totalizadores Gerais')) {
            textareaQuiosque.value = '';
            textareaLoja.value = text;
            
            textareaLoja.classList.add('textarea-success');
            setTimeout(() => textareaLoja.classList.remove('textarea-success'), 1000);
            
            errorDiv.textContent = '✓ Relatório da Barra Olímpica movido para o campo correto!';
            errorDiv.style.display = 'block';
            errorDiv.style.background = 'var(--green-light)';
            errorDiv.style.color = 'var(--green-text)';
            setTimeout(() => {
                errorDiv.style.display = 'none';
                errorDiv.style.background = '';
                errorDiv.style.color = '';
            }, 3000);
            
            processInputLoja(autoCopy);
            return;
        }

        const { result, stats } = processSalesReport(text);

        let totalBolos = 0;
        let totalBolosIf = 0;
        let totalFaturado = 0;
        if (stats) {
            totalBolos = stats.bolosLoja || 0;
            totalBolosIf = stats.bolosIfood || 0;
            totalFaturado = stats.revenue.total || 0;
        }

        if (result && stats) {
            previewQuiosque.textContent = result;
            updateDashboard(stats);

            document.getElementById('summary-quiosque').textContent = `${totalBolos + totalBolosIf} bolos`;
            document.getElementById('summary-quiosque-ifood').textContent = `(${totalBolosIf} iFood)`;
            document.getElementById('summary-quiosque-valor').textContent = `R$ ${totalFaturado.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

            updateSummaryItemOpacity('summary-quiosque', totalBolos + totalBolosIf, totalFaturado);

            updateSummaryTotal();
            
            highlightCopyButton(copyButtonQuiosque);

            if (autoCopy) {
                await copyText(result, copyButtonQuiosque, copyButtonLoja);
            }

            if (stats.unknownBolos?.length > 0) {
                unknownBolosDiv.textContent = `Novo(s) sabor(es) identificado(s): ${stats.unknownBolos.join(', ')}. Não contabilizado(s) no resultado.`;
                unknownBolosDiv.style.display = 'block';
            }
        } else {
            copyButtonQuiosque.classList.remove('button-ready', 'button-copied');
            copyButtonQuiosque.classList.add('button-disabled');
            textareaQuiosque.classList.add('textarea-error');
            setTimeout(() => textareaQuiosque.classList.remove('textarea-error'), 500);
        }
    } catch (err) {
        console.error('Erro:', err);
        errorDiv.textContent = err.message || 'Erro ao processar relatório. Verifique o formato.';
        errorDiv.style.display = 'block';
        
        copyButtonQuiosque.classList.remove('button-ready', 'button-copied');
        copyButtonQuiosque.classList.add('button-disabled');
        textareaQuiosque.classList.add('textarea-error');
        setTimeout(() => textareaQuiosque.classList.remove('textarea-error'), 500);
    }
}

async function processInputLoja(autoCopy = false) {
    previewLoja.textContent = '';
    errorDiv.style.display = 'none';
    unknownBolosDiv.style.display = 'none';
    
    if (copyButtonLoja.classList.contains('button-copied')) {
        resetButtonToReady(copyButtonLoja);
    }
    
    try {
        const text = textareaLoja.value;
        if (!text.trim()) {
            copyButtonLoja.classList.remove('button-ready', 'button-copied');
            copyButtonLoja.classList.add('button-disabled');
            resetSummary('loja');
            return;
        }

        const lines = text.trim().split('\n').filter(l => l.trim());
        const numbersOnly = lines.every(line => {
            const trimmed = line.trim();
            return /^[\d.,]+$/.test(trimmed) || trimmed === '';
        });
        
        if (numbersOnly && lines.length > 10) {
            throw new Error('Este parece ser um resultado já processado. Cole o relatório original do sistema.');
        }
        
        if (text.includes('Total Geral') || text.includes('Totalizadores Gerais') || 
            text.includes('Impresso em') || text.includes('Página 1 de 2')) {
            textareaLoja.value = '';
            textareaQuiosque.value = text;
            
            textareaQuiosque.classList.add('textarea-success');
            setTimeout(() => textareaQuiosque.classList.remove('textarea-success'), 1000);
            
            errorDiv.textContent = '✓ Relatório do Shopping Millennium movido para o campo correto!';
            errorDiv.style.display = 'block';
            errorDiv.style.background = 'var(--green-light)';
            errorDiv.style.color = 'var(--green-text)';
            setTimeout(() => {
                errorDiv.style.display = 'none';
                errorDiv.style.background = '';
                errorDiv.style.color = '';
            }, 3000);
            
            processInputQuiosque(autoCopy);
            return;
        }

        const { result, stats } = parseStoreReport(text);

        let totalBolos = 0;
        let totalBolosIf = 0;
        let totalFaturado = 0;

        if (result) {
            const resultLines = result.split('\n');
            for (let i = 0; i < 39 && i < resultLines.length; i++) {
                const value = parseInt(resultLines[i]) || 0;
                totalBolos += value;
            }

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

        if (stats && stats.revenue && stats.revenue.total !== undefined) {
            totalFaturado = stats.revenue.total;
        } else {
            const vendaMatch = text.match(/Vendas:([\d.,]+)/);
            if (vendaMatch) {
                totalFaturado = parseFloat(vendaMatch[1].replace('.', '').replace(',', '.'));
                
                const acrescimoMatch = text.match(/Acréscimo:([\d.,]+)/);
                if (acrescimoMatch) {
                    totalFaturado += parseFloat(acrescimoMatch[1].replace('.', '').replace(',', '.'));
                }
            }
        }

        if (result && stats) {
            previewLoja.textContent = result;
            updateDashboard(stats);

            document.getElementById('summary-loja').textContent = `${totalBolos} bolos`;
            document.getElementById('summary-loja-ifood').textContent = `(${totalBolosIf} iFood)`;
            document.getElementById('summary-loja-valor').textContent = `R$ ${totalFaturado.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

            updateSummaryItemOpacity('summary-loja', totalBolos, totalFaturado);

            updateSummaryTotal();
            
            highlightCopyButton(copyButtonLoja);

            if (autoCopy) {
                await copyText(result, copyButtonLoja, copyButtonQuiosque);
            }

            if (stats.unknownBolos?.length > 0) {
                unknownBolosDiv.textContent = `Novo(s) sabor(es) identificado(s): ${stats.unknownBolos.join(', ')}. Não contabilizado(s) no resultado.`;
                unknownBolosDiv.style.display = 'block';
            }
        } else {
            copyButtonLoja.classList.remove('button-ready', 'button-copied');
            copyButtonLoja.classList.add('button-disabled');
            textareaLoja.classList.add('textarea-error');
            setTimeout(() => textareaLoja.classList.remove('textarea-error'), 500);
        }
    } catch (err) {
        console.error('Erro:', err);
        errorDiv.textContent = err.message || 'Erro ao processar relatório. Verifique o formato.';
        errorDiv.style.display = 'block';
        
        copyButtonLoja.classList.remove('button-ready', 'button-copied');
        copyButtonLoja.classList.add('button-disabled');
        textareaLoja.classList.add('textarea-error');
        setTimeout(() => textareaLoja.classList.remove('textarea-error'), 500);
    }
}

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

function setupClearButtons() {
    const clearLoja = document.getElementById('clear-loja');
    const clearQuiosque = document.getElementById('clear-quiosque');
    const pasteLoja = document.getElementById('pasteButton-loja');
    const pasteQuiosque = document.getElementById('pasteButton-quiosque');

    function toggleButtons(textarea, clearBtn, pasteBtn) {
        if (textarea.value.trim().length > 0) {
            clearBtn.style.display = 'flex';
        } else {
            clearBtn.style.display = 'none';
        }
    }

    textareaLoja.addEventListener('input', () => toggleButtons(textareaLoja, clearLoja, pasteLoja));
    textareaQuiosque.addEventListener('input', () => toggleButtons(textareaQuiosque, clearQuiosque, pasteQuiosque));

    toggleButtons(textareaLoja, clearLoja, pasteLoja);
    toggleButtons(textareaQuiosque, clearQuiosque, pasteQuiosque);

    clearLoja.addEventListener('click', () => {
        textareaLoja.value = '';
        toggleButtons(textareaLoja, clearLoja, pasteLoja);
        textareaLoja.dispatchEvent(new Event('input'));
    });

    clearQuiosque.addEventListener('click', () => {
        textareaQuiosque.value = '';
        toggleButtons(textareaQuiosque, clearQuiosque, pasteQuiosque);
        textareaQuiosque.dispatchEvent(new Event('input'));
    });
}

export function init() {
    document.removeEventListener('paste', null);

    copyButtonLoja.addEventListener('click', () => {
        if (!previewLoja.textContent && textareaLoja.value.trim()) {
            processInputLoja();
        }
        
        const result = previewLoja.textContent;
        if (!result) {
            errorDiv.textContent = 'Cole um relatório primeiro';
            errorDiv.style.display = 'block';
            return;
        }
        
        copyText(result, copyButtonLoja, copyButtonQuiosque);
    });

    const pasteButtonLoja = document.getElementById('pasteButton-loja');
    if (pasteButtonLoja) {
        pasteButtonLoja.addEventListener('click', async (event) => {
            event.preventDefault();
            
            textareaLoja.focus();
            
            if (navigator.clipboard && navigator.clipboard.readText) {
                try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                        textareaLoja.value = text;
                        textareaLoja.dispatchEvent(new Event('input', { bubbles: true }));
                        textareaLoja.dispatchEvent(new Event('paste', { bubbles: true }));
                    }
                } catch (err) {
                    console.warn('Erro ao ler clipboard:', err);
                    document.execCommand('paste');
                }
            } else {
                document.execCommand('paste');
            }
        });
    }

    const pasteButtonQuiosque = document.getElementById('pasteButton-quiosque');
    if (pasteButtonQuiosque) {
        pasteButtonQuiosque.addEventListener('click', async (event) => {
            event.preventDefault();
            
            textareaQuiosque.focus();
            
            if (navigator.clipboard && navigator.clipboard.readText) {
                try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                        textareaQuiosque.value = text;
                        textareaQuiosque.dispatchEvent(new Event('input', { bubbles: true }));
                        textareaQuiosque.dispatchEvent(new Event('paste', { bubbles: true }));
                    }
                } catch (err) {
                    console.warn('Erro ao ler clipboard:', err);
                    document.execCommand('paste');
                }
            } else {
                document.execCommand('paste');
            }
        });
    }

    copyButtonQuiosque.addEventListener('click', () => {
        if (!previewQuiosque.textContent && textareaQuiosque.value.trim()) {
            processInputQuiosque();
        }
        
        const result = previewQuiosque.textContent;
        if (!result) {
            errorDiv.textContent = 'Cole um relatório primeiro';
            errorDiv.style.display = 'block';
            return;
        }
        
        copyText(result, copyButtonQuiosque, copyButtonLoja);
    });

    textareaQuiosque.addEventListener('paste', () => {
        setTimeout(() => {
            processInputQuiosque(true);
        }, 50);
    });

    textareaLoja.addEventListener('paste', () => {
        setTimeout(() => {
            processInputLoja(true);
        }, 50);
    });

    textareaQuiosque.addEventListener('input', debounce(processInputQuiosque, 500));
    textareaLoja.addEventListener('input', debounce(processInputLoja, 500));

    setupClearButtons();
}
