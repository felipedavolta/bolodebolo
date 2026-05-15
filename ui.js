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

// Bolos summary state
const bolosState = {
    loja: null,
    quiosque: null
};

// Unknown bolos state per store
const unknownState = {
    loja: [],
    quiosque: []
};

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

function updateBolosSummary() {
    const summary = document.getElementById('bolos-summary');
    if (!summary) return;

    const loja = bolosState.loja ?? null;
    const quiosque = bolosState.quiosque ?? null;

    if (loja === null && quiosque === null) {
        summary.classList.remove('visible');
        return;
    }

    document.getElementById('bolos-barra').textContent = loja !== null ? loja : '—';
    document.getElementById('bolos-millennium').textContent = quiosque !== null ? quiosque : '—';
    document.getElementById('bolos-total').textContent = (loja ?? 0) + (quiosque ?? 0);
    summary.classList.add('visible');
}

function clearDashboard() {
    updateBolosSummary();
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

    // Millennium: reforçar detecção
    if (
        text.match(/PRODUTOS VENDIDOS/i) &&
        (text.match(/Totalizadores Gerais/i) || text.match(/Total Geral/i) || text.match(/Impresso em/i) || text.match(/Página \d+ de \d+/i))
    ) {
        return 'quiosque';
    }

    // Barra Olímpica
    if (
        text.match(/Vendas:/i) ||
        text.match(/Valor Unitário:/i) ||
        text.match(/Produtos Vendidos/i)
    ) {
        return 'loja';
    }

    return 'unknown';
}

async function processInputMain(autoCopy = false) {
    errorDiv.style.display = 'none';
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
        if (result && stats) {
            previewQuiosque.textContent = result;
            bolosState.quiosque = (stats.bolosLoja || 0) + (stats.bolosIfood || 0);
            updateBolosSummary();

            highlightCopyButton(copyButtonQuiosque);

            if (autoCopy) {
                await copyText(result, copyButtonQuiosque);
            }

            unknownState.quiosque = stats.unknownBolos || [];
            updateUnknownAlert();
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

        if (result && stats) {
            previewLoja.textContent = result;
            bolosState.loja = stats.bolosQty || 0;
            updateBolosSummary();

            highlightCopyButton(copyButtonLoja);

            if (autoCopy) {
                await copyText(result, copyButtonLoja);
            }

            unknownState.loja = stats.unknownBolos || [];
            updateUnknownAlert();
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

export function init() {
    document.removeEventListener('paste', null);

    setupThemeToggle();

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
            processInputMain(false);
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
    
}
