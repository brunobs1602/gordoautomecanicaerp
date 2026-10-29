# Financeiro integrado à OS — Item 18

## Mudanças

- Formas de pagamento continuam em `fin_cadastros`; os dados existentes não são removidos.
- O cadastro simples pede nome e tipo. Conta, parcelamento, taxas e observações continuam disponíveis.
- A lista textual antiga de formas em Configurações deixa de ser exibida para não competir com o cadastro real. Valores antigos salvos não são apagados.
- Pagamentos usam uma conta escolhida explicitamente, a conta padrão ativa da forma, a única conta ativa ou o Caixa da oficina automático, nessa ordem.
- O caixa automático nasce com saldo inicial zero, apenas quando necessário, e sua criação é serializada entre operações simultâneas.
- Maquininha, bandeira e chave Pix são opcionais. Sem configuração de taxa aplicável, o recebimento não desconta taxa automática.
- A confirmação da OS usa uma única transação para títulos, movimentos, histórico e status da ordem.
- O título mantém o vínculo com a OS e o cliente; o movimento mantém o vínculo com esse título, a OS, a forma, a conta e a data.
- Repetir a confirmação de uma OS com títulos ativos não cria outro lançamento: o banco bloqueia a operação e orienta conferir Contas a receber.
- A opção de receber depois cria somente títulos em aberto, sem movimento de recebimento.
- Com a etapa de pagamento desativada nas configurações, finalizar a OS não registra recebimento; a própria OS concluída oferece o registro posterior.
- Recebimentos parciais, múltiplas formas, parcelas do saldo, taxas, comprovantes, estornos e permissões existentes continuam disponíveis.

## Validações efetivamente realizadas nesta alteração

- Inspeção das funções, permissões e gatilhos atuais no banco antes da migração.
- Migração validada pelo banco e aplicada com autorização, sem apagar registros.
- Consulta posterior: nenhuma OS encontrada com mais de um grupo financeiro ativo.
- Consulta posterior: nenhum recebimento de OS encontrado sem título vinculado.
- Consulta posterior: a função interna de preparação de pagamentos não pode ser executada diretamente por visitantes ou usuários autenticados.
- Na revisão final, as consultas retornaram zero grupos financeiros duplicados por OS, zero recebimentos sem título e zero títulos de OS com cliente divergente da ordem.
- A conferência de valores entre títulos de OS e movimentos retornou zero divergências, mas também zero títulos ativos de origem OS. Portanto, não há pagamentos existentes nessa amostra para comprovar o fluxo de recebimento real.
- Essas consultas verificam o estado existente, não substituem um teste de pagamento com usuário autenticado.

## Testes automatizados adicionados

Arquivos: `src/components/financeiro/FinalizarOS.test.tsx` e `src/components/financeiro/Cadastros.test.tsx`.

Cobrem cadastro e edição de forma personalizada sem conta obrigatória, ativação/inativação preservando dados e ações ocultas sem permissão. No pagamento, cobrem confirmação explícita, formas ativas, Pix sem configuração bancária adicional, recebimento posterior sem pagamentos, recebimento parcial, divisão entre duas formas, bloqueio de cliques repetidos, erro sem fechar a tela e validação de valores/arredondamento.

O recebimento posterior em Contas a receber também bloqueia cliques repetidos na mesma confirmação e alterações no formulário durante o envio. Ao trocar de forma de pagamento, os dados específicos da forma anterior são limpos para evitar conta, taxa ou identificadores incorretos.

Os testes de componente simulam a resposta do banco; não são testes de integração com o banco real. A suíte e o build não foram executados nesta sessão, pois o ambiente de edição não oferece execução de comandos.

## Roteiro de conferência no preview

Use uma OS de teste com cliente vinculado e total conhecido. Não altere históricos ou pagamentos reais para testar.

1. Como administrador, abra Financeiro → Formas de pagamento e cadastre uma forma personalizada apenas com nome e tipo.
2. Edite seu nome, desative-a e confirme que ela não aparece na finalização de uma OS; reative e confira novamente.
3. Em Configurações → Financeiro básico, deixe “Registrar pagamento ao finalizar a OS” ativado.
4. Abra uma OS de R$ 100, finalize, escolha “Sim” e confirme R$ 100 na forma desejada, sem conta explícita ou dados de maquininha.
5. Confira na OS: status finalizada, recebido R$ 100 e saldo zero. Confira Contas recebidas e Histórico financeiro: valor, forma, data, conta e documento.
6. Confira no título o cliente vinculado e no fluxo de caixa a entrada na conta selecionada/automática.
7. Repita a confirmação, inclusive em outra aba aberta antes do primeiro registro: o banco deve rejeitar o segundo registro, sem novo título ou movimento.
8. Em outra OS de R$ 100, informe que o cliente pagará depois: deve aparecer saldo aberto de R$ 100 em Contas a receber e nenhuma entrada no caixa.
9. Registre posteriormente o recebimento dessa conta e confira a mudança para paga e uma única entrada.
10. Em outra OS de R$ 100, receba R$ 40: confira entrada de R$ 40 e saldo de R$ 60, não R$ 100 recebidos.
11. Divida um pagamento entre duas formas, com valores que somem o total, e confira os movimentos e o saldo.
12. Desative a etapa de pagamento nas configurações. Finalize outra OS: ela deve continuar não paga e oferecer “Registrar pagamento / saldo”. Use esse botão para registrar posteriormente.
13. Tente registrar valor zero, acima do total sem autorização e uma forma desativada em outra sessão: deve haver bloqueio e orientação, sem lançamento parcial.
14. Confira um perfil sem acesso financeiro e outro sem permissão de registrar pagamentos: as ações devem continuar bloqueadas. Usuário financeiro sem permissão de status só pode registrar posteriormente em uma OS já finalizada/entregue.
15. Confira os fluxos adicionais existentes: taxa de cartão, comprovante, estorno justificado e saldo por conta.

Após sincronizar, executar a suíte do projeto e o build no ambiente de desenvolvimento/Lovable antes de considerar a validação ponta a ponta concluída.
