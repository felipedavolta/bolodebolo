# Sales Report Parser – Relatório de Vendas para Planilha

## O que é este projeto?
Uma ferramenta web que interpreta relatórios de vendas das lojas "Loja" e "Quiosque", extraindo automaticamente quantidades e valores de faturamento por categoria de produto. O resultado é uma lista pronta para colar em planilhas, facilitando o controle financeiro.

## Principais Funcionalidades
- **Colar relatório da Loja ou Quiosque** em campos separados
- **Processamento automático**: extrai quantidades e faturamento por categoria
- **Resultado pronto para copiar** e colar na planilha
- **Resumo visual**: totais de bolos, fatias, canais de venda e faturamento por categoria
- **Tudo local**: nenhum dado é enviado para servidores

## Como usar
1. Abra o arquivo `index.html` em seu navegador
2. Cole o relatório de vendas da Loja ou do Quiosque no campo correspondente
3. Veja o resultado processado e o resumo visual
4. Clique em "Copiar Resultado" para transferir os dados para sua planilha

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
- **Relatório Loja**: campo para colar relatório e visualizar resultado
- **Relatório Quiosque**: campo para colar relatório e visualizar resultado
- **Resumo do dia**: totais de bolos, iFood e faturamento
- **Dashboard**: métricas detalhadas por categoria e canal
- **Faturamento**: valores por categoria (Bebidas, Alimentos, Bolos, Artigos Festa, Fatias)

## Observações
- O parser foi desenvolvido para lidar com variações comuns nos relatórios das duas lojas
- O processamento é feito inteiramente no navegador, garantindo privacidade
- Para detalhes técnicos, consulte o arquivo `DOCUMENTACAO_PARSER.md`

## Licença
Uso interno. Consulte o responsável pelo projeto para informações sobre distribuição ou modificações.
