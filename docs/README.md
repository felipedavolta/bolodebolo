# Sales Report Parser – Relatório de Vendas para Planilha

## O que é este projeto?
Ferramenta web que interpreta relatórios de vendas da **Barra Olímpica** (Raffinato) e **Shopping Millennium** (RaffinatoCore), extrai quantidades e faturamento por categoria e gera uma lista pronta para colar em planilhas.

## Funcionalidades
- **Detecção automática**: identifica o sistema de origem do relatório colado
- **Processamento inteligente**: extrai quantidades por sabor e faturamento por categoria
- **Alerta de sabores não reconhecidos**: exibe nome e quantidade de itens dos grupos BOLOS/BOLOS IFOOD que não constam na lista cadastrada; persiste por loja — só some quando as duas lojas estiverem sem itens faltantes
- **Resumo de bolos**: exibe total de bolos da Barra, do Millennium e o combinado
- **Validação automática**: rejeita resultados já processados
- **Botões de cópia** com estados visuais (desabilitado → pronto → copiado)
- **Modo escuro**: segue a preferência do sistema
- **Tudo local**: nenhum dado sai do navegador

## Como usar
1. Abra `index.html` no navegador (ou acesse pelo servidor local)
2. Cole o relatório no campo de texto (Barra ou Millennium — o sistema detecta automaticamente)
3. Aguarde o processamento automático
4. O botão de cópia fica verde quando o resultado está pronto
5. Clique para copiar e cole na planilha

## Estrutura do Projeto
```
bolodebolo/
├── index.html          # Interface principal
├── main.js             # Ponto de entrada (inicializa UI)
├── ui.js               # Lógica de interface e orquestração
├── parsers.js          # Parsers do Millennium e da Barra
├── constants.js        # Lista de bolos e produtos especiais
├── styles.css          # Estilos e responsividade
└── docs/
    ├── README.md               # Este arquivo
    └── DOCUMENTACAO_PARSER.md  # Documentação técnica
```

## Estados do botão "Copiar"
| Estado | Visual | Quando |
|--------|--------|--------|
| Desabilitado | Cinza | Sem dados ou erro |
| Pronto | Verde sólido | Após processar relatório válido |
| Copiado | Borda verde | Após clicar (confirma a cópia) |

## Observações
- Desenvolvido para os formatos Raffinato e RaffinatoCore
- Otimizado para Safari/macOS com fallback de clipboard
- Para detalhes técnicos, consulte `DOCUMENTACAO_PARSER.md`

## Licença
Uso interno.
