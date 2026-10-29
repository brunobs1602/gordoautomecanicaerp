# Gráficos — auditoria e roteiro de validação

## Escopo

Foram encontrados 13 gráficos em uso: seis no Dashboard operacional e sete no Dashboard financeiro. Os relatórios financeiros são tabulares; o componente genérico `ui/chart.tsx` não é usado por essas telas.

A revisão não altera consultas, agregações, filtros, permissões, saldos, lançamentos ou dados no banco.

## Constatações no código anterior

- Os dois dashboards usavam tooltips padrão do Recharts, com fundo e borda personalizados, mas sem definir explicitamente a cor do texto. As séries herdavam cores diferentes, sem um padrão de contraste para os valores.
- A pizza de recebimentos dependia exclusivamente da seleção interna do Recharts. Não havia seleção persistente por toque nem alternativa para consultar fatias pequenas; rótulos externos disputavam espaço dentro de uma área fixa.
- Tooltips financeiros não informavam explicitamente o intervalo selecionado, nem o percentual da pizza.
- Nomes de produtos e serviços já eram cortados antes de chegar ao tooltip.
- Séries mensais e resumos de contas sempre tinham linhas de dados, mesmo quando todos os valores eram zero, deixando gráficos sem informação visível.

Essas são constatações estáticas, não uma reprodução do defeito em um navegador. A causa exata de um evento de mouse falhar em um dispositivo específico não foi confirmada por execução visual.

## Implementação

- Conteúdo compartilhado com fundo e texto dos tokens existentes, largura limitada, quebra de nomes longos, camada de sobreposição e sem interceptar o ponteiro.
- Valores monetários em reais; quantidades com até duas casas; valores não finitos ou ausentes como “—”.
- Períodos mensais com ano completo; comparativo identifica os intervalos anterior e atual. Contas distinguem posição atual em aberto e liquidações no período filtrado.
- Barras com consulta por mouse e seleção fixada no clique/toque, descartada quando mudam o período ou os dados. Camada de acessibilidade do Recharts habilitada.
- Pizza com seleção explícita por setor, consulta persistente ao selecionar, percentual sobre o total filtrado e lista de botões para consulta por toque ou teclado. A lista substitui rótulos externos que poderiam se sobrepor ou ser cortados.
- Animações das séries desabilitadas para evitar alvos transitórios durante a consulta.
- Cartões com largura mínima flexível e mensagem de ausência de dados para séries vazias/zeradas. Estoque baixo preserva itens zerados, pois eles são informação relevante.

## Testes adicionados

- `TooltipGrafico.test.tsx`: reais, quantidades, valores inválidos, percentual, nomes completos, período, vazio e estado de seleção.
- `PizzaRecebimentos.test.tsx`: eventos reais nos setores do Recharts com tamanho fixo, consulta pela lista, foco, seleção e ausência de registros.
- `BarrasGrafico.test.tsx`: integração da seleção com tooltip e descarte ao alterar dados/filtros; usa simulação da camada de eventos do Recharts.

Os testes foram escritos, mas não executados neste ambiente de edição, que não oferece terminal ou navegador. Executar os testes e o build no ambiente do projeto antes de considerar a validação de execução concluída.

## Conferência visual no Lovable

Verificar com registros existentes, sem criar ou alterar valores financeiros para testar:

1. **Dashboard**: Orçamentos por status; Ordens de serviço por status; Cadastros e OS por mês; Serviços mais utilizados; Produtos mais utilizados; Produtos com estoque baixo.
2. **Financeiro → Dashboard**: Entradas e saídas; Contas a pagar e receber; Recebimentos por forma de pagamento; Faturamento por mês; Recebido por bandeira; Comparativo com o período anterior; Recebido por maquininha.
3. Em cada gráfico, passar o mouse sobre as barras ou fatias. Conferir nome, série, período e valor; séries operacionais devem mostrar quantidades, não reais.
4. Na pizza, conferir valor absoluto e percentual da forma de pagamento. Passar o mouse, clicar na fatia, retirar o ponteiro e selecionar outra fatia. Repetir pelos botões da lista e pelo teclado.
5. Em celular/tablet, tocar nas barras e nas fatias e retirar o dedo. Conferir que a consulta pode ser lida e que a lista da pizza permite consultar setores pequenos.
6. Trocar todos os filtros financeiros, inclusive período personalizado, e confirmar que nenhuma seleção antiga permanece. Os gráficos mensais continuam seguindo sua série original de 12 meses.
7. Conferir o comparativo: cada grupo deve identificar seu próprio intervalo, não apenas o atual.
8. Sem registros, conferir a mensagem de ausência de dados e ausência de tooltip inválido. Em gráficos com parte dos dados zerada, zeros devem aparecer corretamente no tooltip das categorias existentes.
9. Testar largura de celular e nomes longos: não deve haver rolagem horizontal causada pelo cartão nem texto ilegível. Conferir também o tema que estiver em uso.
10. Conferir que os valores e filtros coincidem com os relatórios e registros existentes; esta alteração é apenas de apresentação/interação.
