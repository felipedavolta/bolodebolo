# Sales Report Parser – Relatório de Vendas para Planilha

## O que é este projeto?
Uma ferramenta web que interpreta relatórios de vendas da **Barra Olímpica** (sistema Raffinato) e **Shopping Millennium** (sistema RaffinatoCore), extraindo automaticamente quantidades e valores de faturamento por categoria de produto. O resultado é uma lista pronta para colar em planilhas, facilitando o controle financeiro.

## Principais Funcionalidades
- **Cole em qualquer campo**: o sistema detecta automaticamente qual relatório foi colado e move para o campo correto
- **Processamento inteligente**: extrai quantidades e faturamento por categoria
- **Validação automática**: detecta e rejeita resultados já processados ou relatórios inválidos
- **Feedback visual**: animações e notificações indicam o status do processamento
- **Botão "Copiar Resultado"** com estados visuais (desabilitado, pronto, copiado)
- **Resumo visual**: totais de bolos, iFood e faturamento por categoria
- **Interface responsiva**: funciona em diferentes tamanhos de tela
- **Modo escuro**: adapta-se automaticamente às preferências do sistema
- **Tudo local**: nenhum dado é enviado para servidores

## Como usar
1. Abra o arquivo `index.html` em seu navegador
2. Cole o relatório de vendas em **qualquer um dos campos** (o sistema move automaticamente para o correto)
3. O sistema processa automaticamente e atualiza o dashboard
4. O botão "Copiar Resultado" fica **verde** indicando que está pronto
5. Clique no botão para copiar e cole na sua planilha
6. O botão muda para **"Copiado!"** confirmando a ação

## Estrutura do Projeto
```
Web/
├── index.html      # Interface principal
├── script.js       # Lógica de parsing e processamento
├── styles.css      # Estilos visuais
├── DOCUMENTACAO_PARSER.md # Documentação técnica detalhada
├── README.md       # Este arquivo
└── Logo Bolo de Bolo 2025 Cor Small.png
```

## Principais Seções da Interface
- **Header**: Logo, título, botões de acesso aos sistemas (Barra Olímpica e Shopping Millennium)
- **Barra Olímpica**: campo para processar relatórios do sistema Raffinato
- **Shopping Millennium**: campo para processar relatórios do sistema RaffinatoCore
- **Resumo do dia**: totais consolidados de bolos, iFood e faturamento de ambas as lojas
- **Dashboard**: métricas detalhadas por categoria e canal (oculto até processar relatórios)
- **Faturamento**: valores por categoria (Bebidas, Alimentos, Bolos, Artigos Festa, Fatias)

## Estados do Botão "Copiar Resultado"
1. **Desabilitado** (cinza): antes de colar relatório ou se houver erro
2. **Pronto** (verde): após processar relatório válido, pronto para copiar
3. **Copiado** (borda verde): após clicar no botão, confirmando a cópia

## Validações Automáticas
- ✅ Detecta qual sistema gerou o relatório e move para o campo correto
- ✅ Rejeita resultados já processados (apenas números)
- ✅ Vibra o campo e exibe erro quando o texto não é reconhecido
- ✅ Mostra notificação verde quando move relatório automaticamente

## Observações
- O parser foi desenvolvido para lidar com os formatos Raffinato e RaffinatoCore
- O processamento é feito inteiramente no navegador, garantindo privacidade
- Interface otimizada para Safari no macOS
- Para detalhes técnicos, consulte o arquivo `DOCUMENTACAO_PARSER.md`

## Licença
Uso interno. Consulte o responsável pelo projeto para informações sobre distribuição ou modificações.
