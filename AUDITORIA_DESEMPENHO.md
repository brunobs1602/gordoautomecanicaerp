# Auditoria de desempenho — Item 11

## Causas verificadas
- O perfil do usuário era consultado sem verificar o erro da consulta: uma falha temporária podia ser confundida com usuário inexistente e provocar saída.
- A sessão era publicada antes da conclusão das coleções; permissões e dados eram buscados em paralelo sem uma fase explícita de identificação do perfil.
- A promessa de sessão ausente permanecia em memória, e respostas antigas podiam repor caches após logout.
- Leituras concorrentes não eram deduplicadas nem protegidas contra gravações otimistas posteriores.
- As consultas usavam limite de 10.000 sem percorrer páginas; o limite efetivo do serviço também podia truncar os resultados.
- Histórico administrativo era carregado em todo primeiro acesso. Exclusão e atualização das listas reliam todas as tabelas.
- Falhas de atualização automática eram ignoradas; rollback de configurações podia sobrescrever uma edição posterior.

## Correções
- Identidade e perfis concluídos antes das consultas dependentes; sessão visível somente após conclusão do conjunto necessário.
- Erros de perfil tratados separadamente de usuário desativado; sessão ausente e inicialização com erro podem ser tentadas novamente.
- Repetição limitada a falhas transitórias, com cancelamento de consultas após 15 segundos; erros de autorização não são repetidos.
- Consultas por coleção deduplicadas; páginas de 500 ordenadas por ID; publicação somente quando todas as páginas terminam.
- Revisões de cache e geração de sessão impedem respostas antigas de sobrescrever gravações ou repor dados após saída.
- Histórico sob demanda em Histórico/Configurações; dependências operacionais mantidas para formulários, contagens, validações e notificações.
- Atualizações de Clientes consultam clientes/veículos; Veículos consulta veículos/clientes/marcas; exclusão consulta a coleção afetada e auditoria.
- Fila aguardada até esvaziar, em vez de resolver uma atualização sem ler os dados. Saída aguarda gravações e limpa caches.
- Rollback de configurações condicionado à revisão atual.

## Banco e segurança
- Saúde observada: banco e pool disponíveis; memória 39%; conexões 17/60; sem alerta de esgotamento.
- Consultas mais recorrentes tiveram médias aproximadas de 6 a 12 ms; não há evidência para recomendar aumento de capacidade.
- Índices existentes de IDs, cliente/veículo de orçamentos, proprietário do veículo, documentos, placas e códigos conferidos no banco real.
- Nenhum índice, política, permissão ou dado existente foi alterado. Filtragem de requisições no cliente não substitui RLS.

## Validação executada
- 44 testes automatizados aprovados, incluindo inicialização, permissões, recuperação, 1.201 registros paginados, atualização direcionada, gravação concorrente e resposta após logout.
- Navegador novo com armazenamento inicialmente vazio, seguido de restauração de sessão autorizada: painel e cadastros apareceram sem atualização manual.
- Falha de rede injetada na primeira consulta de clientes: recuperação automática e painel carregado.
- Navegação por Clientes, Veículos, Produtos, Serviços e Orçamentos: sem novas consultas de dados durante a navegação normal.
- Histórico reutilizou os dados carregados pelas Configurações sem repetir consulta.
- Atualizar Clientes gerou somente consultas de clientes e veículos.
- Recarregamento da página manteve os registros visíveis.
- Falha persistente mostrou mensagem de erro; tentativa posterior restaurou a lista, sem erros de JavaScript observados.
- Logout seguido de Voltar permaneceu no login, sem tabelas protegidas visíveis.
- Verificação automática final sem erros.

## Limitações e resultados não comprovados
- Não foi demonstrada redução do tempo total: medições de primeiro acesso variaram de 4,0 s antes a 4,75 s depois; a medição com falha temporária ficou em 3,94 s. Essas amostras não permitem concluir ganho de velocidade.
- Coleções operacionais permitidas ainda são carregadas integralmente, em páginas de transporte, para preservar as dependências atuais. Não foi implementada paginação visual ou busca remota em cada módulo; grandes volumes reais precisam de validação adicional.
- Não foram criados, editados ou excluídos registros reais durante esta auditoria. Fluxos completos dessas operações e sincronização entre dois usuários distintos continuam sem validação real; testes cobrem regras e comportamento de cache isoladamente.
- Login com senha não foi executado: o teste utilizou sessão autorizada. Apenas uma conta foi utilizada no navegador; diferentes perfis foram testados automaticamente, não por sessões reais distintas.
- Não foi realizado teste de carga de produção, nem validação da versão publicada. Melhorias estão na prévia do projeto.