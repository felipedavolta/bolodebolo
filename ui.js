import { processSalesReport, parseStoreReport } from './parsers.js';

// DOM Elements
const textareaMain = document.getElementById('input-main');
const pasteButtonMain = document.getElementById('pasteButton-main');
const copyButtonLoja = document.getElementById('copyButton-loja');
const copyButtonQuiosque = document.getElementById('copyButton-quiosque');
const clearButtonMain = document.getElementById('clear-main');
const detectionBadge = document.getElementById('detection-badge');
const detectionText = document.getElementById('detection-text');

const previewQuiosque = document.getElementById('preview-quiosque');
const previewLoja = document.getElementById('preview-loja');
const errorDiv = document.getElementById('error');
const unknownBolosDiv = document.getElementById('unknown-bolos');

// State for revenue comparison
const revenueState = {
    loja: null,
    quiosque: null
};

// Helper functions
function getButtonDefaultText(button) {
    if (button.id === 'copyButton-loja') return 'Copiar Barra';
    if (button.id === 'copyButton-quiosque') return 'Copiar Millennium';
    return 'Copiar';
}

async function copyText(text, button) {
    try {
        await navigator.clipboard.writeText(text);
        
        const span = button.querySelector('span');
        if (span) span.textContent = 'Copiado!';
        button.classList.remove('button-disabled', 'button-ready');
        button.classList.add('button-copied');
        button.style.animation = '';
        button.style.transform = '';
        
        setTimeout(() => {
            if (button.classList.contains('button-copied')) {
                resetButtonToReady(button);
            }
        }, 2000);
        
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
                
                setTimeout(() => {
                    if (button.classList.contains('button-copied')) {
                        resetButtonToReady(button);
                    }
                }, 2000);
                
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

function disableCopyButton(button) {
    button.classList.remove('button-ready', 'button-copied');
    button.classList.add('button-disabled');
    const span = button.querySelector('span');
    if (span) span.textContent = getButtonDefaultText(button);
}

function resetButtonToReady(button) {
    const span = button.querySelector('span');
    if (span) span.textContent = getButtonDefaultText(button);
    button.classList.remove('button-disabled', 'button-copied');
    button.classList.add('button-ready');
}

function updateRevenueTable() {
    const tbody = document.getElementById('revenue-table-body');
    if (!tbody) return;

    const categories = [
        { id: 'total', label: 'TOTAL', isTotal: true },
        { id: 'bebidas', label: 'BEBIDAS' },
        { id: 'alimentos', label: 'ALIMENTOS' },
        { id: 'bolos', label: 'BOLO' },
        { id: 'artigos', label: 'ARTIGOS FESTA' },
        { id: 'fatias', label: 'FATIAS' },
        { id: 'acrescimo', label: 'ACRÉSCIMO', isAcrescimo: true },
        { id: 'desconto', label: 'DESCONTOS', isDesconto: true }
    ];

    const formatCurrency = (val) => {
        const num = Number(val || 0);
        return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    let html = '';

    categories.forEach(cat => {
        const lojaVal = revenueState.loja ? (revenueState.loja[cat.id] || 0) : 0;
        const quiosqueVal = revenueState.quiosque ? (revenueState.quiosque[cat.id] || 0) : 0;
        
        // For discounts, we want to show them as negative in the total calculation if they are positive numbers in the object
        // But usually they are stored as negative or positive depending on parser.
        // In parsers.js:
        // Loja: desconto is positive number.
        // Quiosque: desconto is positive number.
        // Total calculation subtracts them.
        // Let's display them as is, but handle total column correctly.
        
        let totalVal = 0;
        if (cat.id === 'desconto') {
             // If both are positive representing discount amount, total discount amount is sum.
             totalVal = lojaVal + quiosqueVal;
        } else {
             totalVal = lojaVal + quiosqueVal;
        }

        let rowClass = '';
        if (cat.isTotal) rowClass = 'row-total';
        else if (cat.isAcrescimo) rowClass = 'row-acrescimo';
        else if (cat.isDesconto) rowClass = 'row-desconto';

        html += `
            <tr class="${rowClass}">
                <td>${cat.label}</td>
                <td>${formatCurrency(lojaVal)}</td>
                <td>${formatCurrency(quiosqueVal)}</td>
                <td>${formatCurrency(totalVal)}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;

    // Ensure dashboard is visible when table is updated
    const dashboard = document.querySelector('.dashboard');
    if (dashboard) {
        dashboard.style.display = 'grid';
    }
}

function clearDashboard() {
    // Only clear revenue state if explicitly needed, but for now we keep it for comparison.
    // We might want to clear the date though?
    document.getElementById('report-date').textContent = '';
    
    revenueState.loja = revenueState.loja || null;
    revenueState.quiosque = revenueState.quiosque || null;
    
    updateRevenueTable();
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
    
    // Removed metric updates as elements were removed from HTML
    // Revenue update is now handled by updateRevenueTable called separately
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

let badgeTimeout;

function updateDetectionBadge(status, message, duration = 0) {
    if (badgeTimeout) clearTimeout(badgeTimeout);

    detectionBadge.className = 'detection-badge'; // Reset classes
    if (status === 'hidden') {
        detectionBadge.classList.add('hidden');
    } else {
        detectionBadge.classList.add(status);
        detectionText.textContent = message;

        if (duration > 0) {
            badgeTimeout = setTimeout(() => {
                detectionBadge.classList.add('hidden');
            }, duration);
        }
    }
}

function detectStore(text) {
    if (!text || !text.trim()) return null;
    
    // Check for Millennium specific keywords
    if (text.includes('Total Geral') || text.includes('Totalizadores Gerais') || 
        text.includes('Impresso em') || text.includes('Página 1 de 2')) {
        return 'quiosque';
    }
    
    // Check for Barra Olímpica specific keywords
    // Raffinato reports usually have "Vendas:" in the footer, or "Valor Unitário:" in items
    if (text.includes('Vendas:') || text.includes('Valor Unitário:') || text.includes('Produtos Vendidos')) {
        return 'loja';
    }
    
    return 'unknown';
}

async function processInputMain(autoCopy = false) {
    errorDiv.style.display = 'none';
    unknownBolosDiv.style.display = 'none';
    clearDashboard();
    
    // Check if we have stored data and enable buttons accordingly
    if (previewLoja.textContent.trim()) {
        highlightCopyButton(copyButtonLoja);
    } else {
        disableCopyButton(copyButtonLoja);
    }

    if (previewQuiosque.textContent.trim()) {
        highlightCopyButton(copyButtonQuiosque);
    } else {
        disableCopyButton(copyButtonQuiosque);
    }
    
    const text = textareaMain.value;
    if (!text.trim()) {
        updateDetectionBadge('hidden', '');
        return;
    }

    const storeType = detectStore(text);
    
    if (storeType === 'quiosque') {
        updateDetectionBadge('success', 'Detectado: Shopping Millennium', 3000);
        processQuiosqueLogic(text, autoCopy);
    } else if (storeType === 'loja') {
        updateDetectionBadge('success', 'Detectado: Barra Olímpica', 3000);
        processLojaLogic(text, autoCopy);
    } else {
        updateDetectionBadge('error', 'Formato desconhecido');
        errorDiv.textContent = 'Não foi possível identificar o relatório. Verifique se copiou todo o conteúdo.';
        errorDiv.style.display = 'block';
    }
}

async function processQuiosqueLogic(text, autoCopy) {
    try {
        const lines = text.trim().split('\n').filter(l => l.trim());
        const numbersOnly = lines.every(line => {
            const trimmed = line.trim();
            return /^[\d.,]+$/.test(trimmed) || trimmed === '';
        });
        
        if (numbersOnly && lines.length > 10) {
            throw new Error('Este parece ser um resultado já processado. Cole o relatório original do sistema.');
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
            
            // Update revenue state for Quiosque
            if (stats.revenue) {
                revenueState.quiosque = stats.revenue;
                updateRevenueTable();
            }

            document.getElementById('summary-quiosque').textContent = `${totalBolos + totalBolosIf} bolos`;
            document.getElementById('summary-quiosque-ifood').textContent = `(${totalBolosIf} iFood)`;
            document.getElementById('summary-quiosque-valor').textContent = `R$ ${totalFaturado.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

            updateSummaryItemOpacity('summary-quiosque', totalBolos + totalBolosIf, totalFaturado);
            updateSummaryTotal();
            
            highlightCopyButton(copyButtonQuiosque);

            if (autoCopy) {
                await copyText(result, copyButtonQuiosque);
            }

            if (stats.unknownBolos?.length > 0) {
                unknownBolosDiv.textContent = `Novo(s) sabor(es) identificado(s): ${stats.unknownBolos.join(', ')}. Não contabilizado(s) no resultado.`;
                unknownBolosDiv.style.display = 'block';
            }
        } else {
            throw new Error('Falha ao processar dados do Millennium');
        }
    } catch (err) {
        console.error('Erro:', err);
        errorDiv.textContent = err.message || 'Erro ao processar relatório.';
        errorDiv.style.display = 'block';
        updateDetectionBadge('error', 'Erro no processamento');
    }
}

async function processLojaLogic(text, autoCopy) {
    try {
        const lines = text.trim().split('\n').filter(l => l.trim());
        const numbersOnly = lines.every(line => {
            const trimmed = line.trim();
            return /^[\d.,]+$/.test(trimmed) || trimmed === '';
        });
        
        if (numbersOnly && lines.length > 10) {
            throw new Error('Este parece ser um resultado já processado. Cole o relatório original do sistema.');
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

            // Update revenue state for Loja
            if (stats.revenue) {
                revenueState.loja = stats.revenue;
                updateRevenueTable();
            }

            document.getElementById('summary-loja').textContent = `${totalBolos} bolos`;
            document.getElementById('summary-loja-ifood').textContent = `(${totalBolosIf} iFood)`;
            document.getElementById('summary-loja-valor').textContent = `R$ ${totalFaturado.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

            updateSummaryItemOpacity('summary-loja', totalBolos, totalFaturado);
            updateSummaryTotal();
            
            highlightCopyButton(copyButtonLoja);

            if (autoCopy) {
                await copyText(result, copyButtonLoja);
            }

            if (stats.unknownBolos?.length > 0) {
                unknownBolosDiv.textContent = `Novo(s) sabor(es) identificado(s): ${stats.unknownBolos.join(', ')}. Não contabilizado(s) no resultado.`;
                unknownBolosDiv.style.display = 'block';
            }
        } else {
            throw new Error('Falha ao processar dados da Barra Olímpica');
        }
    } catch (err) {
        console.error('Erro:', err);
        errorDiv.textContent = err.message || 'Erro ao processar relatório.';
        errorDiv.style.display = 'block';
        updateDetectionBadge('error', 'Erro no processamento');
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

function setupClearButton() {
    function toggleButton() {
        if (textareaMain.value.trim().length > 0) {
            clearButtonMain.style.display = 'flex';
        } else {
            clearButtonMain.style.display = 'none';
        }
    }

    textareaMain.addEventListener('input', toggleButton);
    toggleButton();

    clearButtonMain.addEventListener('click', () => {
        textareaMain.value = '';
        toggleButton();
        textareaMain.dispatchEvent(new Event('input'));
        textareaMain.focus();
    });
}

function setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;
    
    const sunIcon = themeToggle.querySelector('.sun-icon');
    const moonIcon = themeToggle.querySelector('.moon-icon');
    
    function updateTheme(isDark) {
        if (isDark) {
            document.body.classList.add('dark-mode');
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        } else {
            document.body.classList.remove('dark-mode');
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        }
    }

    // Check saved theme or system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        updateTheme(savedTheme === 'dark');
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        updateTheme(prefersDark);
    }

    themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.contains('dark-mode');
        const newIsDark = !isDark;
        updateTheme(newIsDark);
        localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
    });
}

function setupRevenueToggle() {
    const revenueHeader = document.querySelector('.revenue-header');
    const revenueSection = document.querySelector('.revenue-section');
    
    if (revenueHeader && revenueSection) {
        revenueHeader.addEventListener('click', () => {
            revenueSection.classList.toggle('collapsed');
        });
    }
}

export function init() {
    document.removeEventListener('paste', null);

    setupThemeToggle();
    setupRevenueToggle();

    copyButtonLoja.addEventListener('click', () => {
        const resultToCopy = previewLoja.textContent;
        if (resultToCopy) {
            copyText(resultToCopy, copyButtonLoja);
        }
    });

    copyButtonQuiosque.addEventListener('click', () => {
        const resultToCopy = previewQuiosque.textContent;
        if (resultToCopy) {
            copyText(resultToCopy, copyButtonQuiosque);
        }
    });

    if (pasteButtonMain) {
        pasteButtonMain.addEventListener('click', async (event) => {
            event.preventDefault();
            textareaMain.focus();
            
            if (navigator.clipboard && navigator.clipboard.readText) {
                try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                        textareaMain.value = text;
                        textareaMain.dispatchEvent(new Event('input', { bubbles: true }));
                        textareaMain.dispatchEvent(new Event('paste', { bubbles: true }));
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

    textareaMain.addEventListener('paste', () => {
        setTimeout(() => {
            processInputMain(true);
        }, 50);
    });

    textareaMain.addEventListener('input', debounce(processInputMain, 500));

    setupClearButton();

    // Auto-focus on load
    textareaMain.focus();

    // Select all text when returning to the tab
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            textareaMain.focus();
            textareaMain.select();
        }
    });

    window.addEventListener('focus', () => {
        textareaMain.focus();
        textareaMain.select();
    });
    
    // Initialize empty table
    updateRevenueTable();
}
