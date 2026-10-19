import { useSyncExternalStore } from "react";

export type Valor = string | number | boolean;
export type TipoCampo = "texto" | "area" | "numero" | "bool" | "select" | "cor" | "imagem" | "hora";
export interface Campo {
  key: string;
  label: string;
  desc: string;
  tipo: TipoCampo;
  padrao: Valor;
  opcoes?: { v: string; l: string }[];
}
export interface Secao { key: string; titulo: string; desc: string; campos: Campo[] }

const t = (key: string, label: string, desc: string, padrao = ""): Campo => ({ key, label, desc, tipo: "texto", padrao });
const a = (key: string, label: string, desc: string, padrao = ""): Campo => ({ key, label, desc, tipo: "area", padrao });
const n = (key: string, label: string, desc: string, padrao = 0): Campo => ({ key, label, desc, tipo: "numero", padrao });
const b = (key: string, label: string, desc: string, padrao = false): Campo => ({ key, label, desc, tipo: "bool", padrao });
const c = (key: string, label: string, desc: string, padrao: string): Campo => ({ key, label, desc, tipo: "cor", padrao });
const img = (key: string, label: string, desc: string): Campo => ({ key, label, desc, tipo: "imagem", padrao: "" });
const h = (key: string, label: string, desc: string, padrao: string): Campo => ({ key, label, desc, tipo: "hora", padrao });
const s = (key: string, label: string, desc: string, padrao: string, ops: [string, string][]): Campo => ({
  key, label, desc, tipo: "select", padrao, opcoes: ops.map(([v, l]) => ({ v, l })),
});

export const SECOES: Secao[] = [
  { key: "empresa", titulo: "Dados da empresa", desc: "Usados no painel, documentos e relatórios.", campos: [
    t("razaoSocial", "Razão social", "Nome jurídico da empresa."),
    t("nomeFantasia", "Nome fantasia", "Nome exibido no sistema e nos documentos.", "Gordo Auto Mecânica"),
    t("documento", "CNPJ ou CPF", "Documento da empresa."),
    t("ie", "Inscrição estadual", "Quando houver."),
    t("im", "Inscrição municipal", "Quando houver."),
    t("cnae", "CNAE", "Atividade econômica, quando aplicável."),
    s("regime", "Regime tributário", "Enquadramento fiscal.", "simples", [["simples", "Simples Nacional"], ["mei", "MEI"], ["presumido", "Lucro Presumido"], ["real", "Lucro Real"]]),
    t("telefone", "Telefone principal", "Contato principal."),
    t("telefone2", "Telefone secundário", "Contato alternativo."),
    t("whatsapp", "WhatsApp", "Número exibido aos clientes.", "(16) 98173-0566"),
    t("email", "E-mail principal", "Contato geral."),
    t("emailFinanceiro", "E-mail financeiro", "Cobranças e pagamentos."),
    t("site", "Site", "Endereço do site."),
    t("instagram", "Instagram / redes sociais", "Perfil nas redes.", "@gordo_mecanica"),
    t("cep", "CEP", "Endereço da oficina."),
    t("logradouro", "Logradouro", "Rua ou avenida.", "Rua Luis Augusto Veludo"),
    t("numero", "Número", "Número do endereço.", "495"),
    t("complemento", "Complemento", "Sala, bloco etc."),
    t("bairro", "Bairro", ""),
    t("cidade", "Cidade", ""),
    t("estado", "Estado", "UF."),
    t("pais", "País", "", "Brasil"),
    img("logo", "Logo principal", "Exibida no menu e no login."),
    img("logoDocs", "Logo para documentos", "Usada em orçamentos e OS. Se vazio, usa a principal."),
    img("favicon", "Ícone do sistema", "Ícone da aba do navegador."),
    t("responsavel", "Nome do responsável", ""),
    t("responsavelTelefone", "Telefone do responsável", ""),
    t("responsavelEmail", "E-mail do responsável", ""),
    a("observacoes", "Observações institucionais", "Texto livre sobre a empresa."),
  ]},
  { key: "visual", titulo: "Identidade visual", desc: "Cores e aparência do sistema.", campos: [
    c("primaria", "Cor principal", "Botões e destaques.", "#e0262c"),
    c("secundaria", "Cor secundária", "Elementos de apoio.", "#33353a"),
    c("destaque", "Cor de destaque", "Itens selecionados.", "#3a3c42"),
    c("fundo", "Cor de fundo", "Fundo das telas.", "#16171a"),
    c("texto", "Cor dos textos", "Texto principal.", "#f2f3f5"),
    c("sucesso", "Cor de sucesso", "", "#3cba78"),
    c("alerta", "Cor de alerta", "", "#e9b949"),
    c("erro", "Cor de erro", "", "#e2403c"),
    s("tema", "Tema", "Claro ou escuro.", "escuro", [["escuro", "Escuro"], ["claro", "Claro"]]),
    b("logoMenu", "Exibir logo no menu", "Mostra a logo no menu lateral.", true),
    b("logoDocs", "Exibir logo nos documentos", "", true),
    n("tamanhoLogo", "Tamanho da logo (px)", "Tamanho no menu.", 44),
    b("menuRecolhido", "Menu lateral recolhido", "Mostra apenas ícones no computador.", false),
    s("menuPosicao", "Posição do menu", "", "esquerda", [["esquerda", "Esquerda"], ["direita", "Direita"]]),
    b("mostrarNome", "Exibir nome da empresa", "Mostra o nome ao lado da logo.", true),
    s("estiloCards", "Estilo dos cards do painel", "", "padrao", [["padrao", "Padrão"], ["contorno", "Contorno"], ["destaque", "Destaque vermelho"]]),
    n("arredondamento", "Arredondamento (px)", "Cantos dos elementos.", 8),
    s("densidade", "Densidade da interface", "", "normal", [["compacta", "Compacta"], ["normal", "Normal"], ["confortavel", "Confortável"]]),
    n("fonte", "Tamanho da fonte (px)", "Tamanho base do texto.", 16),
  ]},
  { key: "documentos", titulo: "Documentos", desc: "Orçamentos, ordens de serviço e relatórios.", campos: [
    t("titulo", "Título dos documentos", "Exibido no topo do orçamento.", "Orçamento"),
    a("apresentacao", "Texto de apresentação", "Aparece antes dos itens."),
    a("rodape", "Rodapé padrão", "Aparece no fim do documento.", "Obrigado pela preferência!"),
    a("garantia", "Texto de garantia", "", "Garantia de 90 dias para serviços executados."),
    a("validadeTexto", "Texto de validade do orçamento", "", "Orçamento válido pelo prazo indicado."),
    n("validadeDias", "Prazo padrão de validade (dias)", "", 7),
    a("pagamento", "Condições de pagamento", "Usado quando o orçamento não informa."),
    a("obsCliente", "Observações padrão para o cliente", ""),
    b("mostrarCusto", "Exibir preços de custo", "", false),
    b("mostrarDescontos", "Exibir descontos", "", true),
    b("mostrarResponsavel", "Exibir dados do responsável", "", true),
    b("mostrarEndereco", "Exibir endereço da empresa", "", true),
    b("mostrarTelefone", "Exibir telefone e WhatsApp", "", true),
    b("mostrarLogo", "Exibir logo", "", true),
    b("mostrarAssinatura", "Exibir campo de assinatura do cliente", "", true),
    a("textoAprovacao", "Texto para aprovação", "", "Autorizo a execução dos serviços descritos."),
    a("textoRecusa", "Texto para recusa", "", "Orçamento não aprovado pelo cliente."),
    s("formatoImpressao", "Formato de impressão", "", "A4", [["A4", "A4"], ["carta", "Carta"]]),
    s("formatoExportacao", "Formato de exportação", "", "pdf", [["pdf", "PDF"]]),
  ]},
  { key: "cadastros", titulo: "Clientes e veículos", desc: "Regras padrão dos cadastros.", campos: [
    b("exigirDocumento", "Exigir CPF/CNPJ", "", true),
    b("exigirTelefone", "Exigir telefone", "", true),
    b("exigirEndereco", "Exigir endereço", "", false),
    b("exigirPlaca", "Exigir placa", "", true),
    b("exigirKm", "Exigir quilometragem", "", false),
    s("formatoTelefone", "Formato de telefone", "", "(00) 00000-0000", [["(00) 00000-0000", "(00) 00000-0000"]]),
    s("formatoDocumento", "Formato de CPF/CNPJ", "", "pontuado", [["pontuado", "Com pontuação"], ["numeros", "Somente números"]]),
    s("formatoPlaca", "Formato de placa", "", "ambos", [["ambos", "Antiga e Mercosul"], ["mercosul", "Somente Mercosul"]]),
    s("unidadeKm", "Unidade de quilometragem", "", "km", [["km", "Quilômetros (km)"], ["mi", "Milhas (mi)"]]),
    b("permitePF", "Permitir pessoa física", "", true),
    b("permitePJ", "Permitir pessoa jurídica", "", true),
    b("multiplosVeiculos", "Permitir vários veículos por cliente", "", true),
    a("obsPadrao", "Texto padrão para observações", ""),
  ]},
  { key: "orcamentos", titulo: "Orçamentos e OS", desc: "Numeração, status e valores.", campos: [
    t("prefixoOrc", "Prefixo do orçamento", "Ex.: ORC-00001.", "ORC"),
    t("prefixoOS", "Prefixo da ordem de serviço", "Ex.: OS-00001.", "OS"),
    n("numeracaoInicial", "Numeração inicial", "Primeiro número usado.", 1),
    b("numeracaoAuto", "Numeração automática", "", true),
    n("validadeDias", "Prazo padrão de validade (dias)", "", 7),
    s("statusInicial", "Status inicial", "", "rascunho", [["rascunho", "Rascunho"]]),
    t("statusDisponiveis", "Status disponíveis", "Lista exibida no fluxo.", "Rascunho, Aguardando, Aprovado, Recusado, Reaberto, Cancelado, Convertido"),
    b("reabrirRecusado", "Permitir reabrir orçamento recusado", "", true),
    b("editarAprovado", "Permitir editar após aprovação", "", false),
    b("exigirAprovacao", "Exigir aprovação antes de converter em OS", "", true),
    b("exigirDiagnostico", "Exigir diagnóstico", "", false),
    b("exigirObsStatus", "Exigir observação ao alterar status", "", false),
    n("descontoPadrao", "Desconto padrão (%)", "", 0),
    n("descontoMax", "Desconto máximo (%)", "", 20),
    n("acrescimoPadrao", "Acréscimo padrão (%)", "", 0),
    s("arredondamento", "Arredondamento dos valores", "", "centavos", [["centavos", "Centavos"], ["inteiro", "Real inteiro"]]),
    b("separarItens", "Exibir serviços e produtos separados", "", true),
    b("subtotalServicos", "Exibir subtotal dos serviços", "", true),
    b("subtotalProdutos", "Exibir subtotal dos produtos", "", true),
    b("exibirDescontos", "Exibir descontos e acréscimos", "", true),
    a("obsInterna", "Observação interna padrão", ""),
    a("obsCliente", "Observação padrão para o cliente", ""),
  ]},
  { key: "estoque", titulo: "Produtos e estoque", desc: "Padrões de produtos e baixa de estoque.", campos: [
    s("unidade", "Unidade de medida padrão", "", "UN", [["UN", "Unidade"], ["L", "Litro"], ["KG", "Quilo"], ["CJ", "Conjunto"]]),
    t("categoria", "Categoria padrão", ""),
    n("estoqueMinimo", "Estoque mínimo padrão", "", 0),
    b("estoqueNegativo", "Permitir estoque negativo", "", false),
    b("avisoBaixo", "Exibir aviso de estoque baixo", "", true),
    b("bloquearSemEstoque", "Bloquear produto sem estoque", "", false),
    b("precoManual", "Permitir alterar preço no orçamento", "", true),
    b("rapidoProduto", "Permitir cadastro rápido de produto", "", true),
    b("rapidoServico", "Permitir cadastro rápido de serviço", "", true),
    s("baixa", "Quando dar baixa no estoque", "Preparado para as próximas etapas.", "finalizacao", [["aprovacao", "Na aprovação"], ["execucao", "Na execução"], ["finalizacao", "Na finalização da OS"]]),
    b("inativosBusca", "Mostrar produtos inativos nas buscas", "", false),
    s("arredondamentoPreco", "Arredondamento de preços", "", "centavos", [["centavos", "Centavos"], ["inteiro", "Real inteiro"]]),
  ]},
  { key: "financeiro", titulo: "Financeiro básico", desc: "Moeda, formatos e pagamentos.", campos: [
    s("moeda", "Moeda padrão", "", "BRL", [["BRL", "Real (BRL)"]]),
    t("simbolo", "Símbolo da moeda", "", "R$"),
    t("formasPagamento", "Formas de pagamento", "Separadas por vírgula.", "Dinheiro, PIX, Cartão de débito, Cartão de crédito"),
    n("prazoPagamento", "Prazo padrão de pagamento (dias)", "", 0),
    n("descontoMax", "Desconto máximo (%)", "", 20),
    n("acrescimoMax", "Acréscimo máximo (%)", "", 20),
    a("condicoes", "Condições de pagamento padrão", ""),
    b("custoFuncionarios", "Exibir custo para funcionários", "", false),
    b("margem", "Exibir margem de lucro", "", false),
    n("casasDecimais", "Casas decimais", "", 2),
    t("separadorDecimal", "Separador decimal", "", ","),
    t("separadorMilhar", "Separador de milhares", "", "."),
  ]},
  { key: "atendimento", titulo: "Atendimento", desc: "Horários e mensagens padrão.", campos: [
    t("dias", "Dias de atendimento", "", "Segunda a sexta"),
    h("abertura", "Abertura", "", "08:00"),
    h("fechamento", "Fechamento", "", "18:00"),
    t("almoco", "Intervalo para almoço", "", "12:00 às 13:00"),
    a("feriados", "Feriados ou dias sem atendimento", "Um por linha."),
    n("prazoRetorno", "Prazo de retorno ao cliente (horas)", "", 24),
    t("responsavel", "Responsável pelo atendimento", ""),
    a("msgAtendimento", "Mensagem de atendimento", "", "Olá! Obrigado por entrar em contato com a Gordo Auto Mecânica."),
    a("msgEnviado", "Mensagem: orçamento enviado", "", "Seu orçamento está pronto. Confira os detalhes."),
    a("msgAprovado", "Mensagem: orçamento aprovado", "", "Recebemos sua aprovação. Vamos iniciar o serviço."),
    a("msgRecusado", "Mensagem: orçamento recusado", "", "Entendido. Ficamos à disposição."),
    a("msgPronto", "Mensagem: veículo pronto", "", "Seu veículo está pronto para retirada!"),
  ]},
  { key: "seguranca", titulo: "Usuários e segurança", desc: "Senhas, sessões e auditoria.", campos: [
    n("sessaoMinutos", "Expiração da sessão (minutos)", "0 = não expira.", 0),
    b("trocarSenha", "Exigir troca de senha no primeiro acesso", "", false),
    n("senhaMin", "Tamanho mínimo da senha", "", 6),
    b("letrasNumeros", "Exigir letras e números", "", false),
    b("bloquearTentativas", "Bloquear após tentativas inválidas", "", true),
    n("maxTentativas", "Máximo de tentativas de login", "", 5),
    b("multiplasSessoes", "Permitir múltiplas sessões", "", true),
    b("ultimoAcesso", "Exibir último acesso do usuário", "", true),
    b("auditoria", "Ativar registro de auditoria", "", true),
    n("retencaoDias", "Retenção dos registros (dias)", "Informativo; o histórico não é apagado.", 365),
    b("resetAdmin", "Permitir redefinição de senha pelo administrador", "", true),
  ]},
  { key: "notificacoes", titulo: "Notificações", desc: "Avisos internos no sistema.", campos: [
    b("ativas", "Ativar notificações internas", "", true),
    b("estoqueBaixo", "Estoque baixo", "", true),
    b("aguardando", "Orçamento aguardando aprovação", "", true),
    b("recusado", "Orçamento recusado", "", true),
    b("aprovado", "Orçamento aprovado", "", true),
    b("osConcluida", "Ordem de serviço concluída", "", true),
    b("usuarioCriado", "Usuário criado", "", false),
    b("alteracaoAdmin", "Alteração administrativa", "", false),
  ]},
];

export type Config = Record<string, Record<string, Valor>>;
export const CONFIG_PADRAO: Config = Object.fromEntries(
  SECOES.map((sec) => [sec.key, Object.fromEntries(sec.campos.map((f) => [f.key, f.padrao]))]),
);

const KEY = "gordo.config";
const listeners = new Set<() => void>();
let cache: Config | null = null;

function mesclar(salvo: Partial<Config>): Config {
  return Object.fromEntries(SECOES.map((sec) => [sec.key, { ...CONFIG_PADRAO[sec.key], ...(salvo[sec.key] ?? {}) }]));
}
export function getConfig(): Config {
  if (typeof window === "undefined") return CONFIG_PADRAO;
  if (cache) return cache;
  try {
    cache = mesclar(JSON.parse(localStorage.getItem(KEY) || "{}"));
  } catch {
    cache = CONFIG_PADRAO;
  }
  return cache;
}
export function salvarConfig(cfg: Config) {
  localStorage.setItem(KEY, JSON.stringify(cfg));
  cache = null;
  listeners.forEach((l) => l());
}
export function importarConfig(json: string): Config {
  const obj = JSON.parse(json);
  if (!obj || typeof obj !== "object") throw new Error("Arquivo inválido.");
  return mesclar(obj.config ?? obj);
}
export function useConfig() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getConfig,
    () => CONFIG_PADRAO,
  );
}

export const VERSAO = "1.5.0";

/** Lista legível do que mudou numa seção (para auditoria). */
export function diffSecao(secao: string, antes: Record<string, Valor>, depois: Record<string, Valor>) {
  const sec = SECOES.find((x) => x.key === secao);
  return (sec?.campos ?? [])
    .filter((f) => antes[f.key] !== depois[f.key])
    .map((f) => ({
      campo: f.label,
      antes: f.tipo === "imagem" ? (antes[f.key] ? "imagem" : "vazio") : String(antes[f.key] ?? ""),
      depois: f.tipo === "imagem" ? (depois[f.key] ? "imagem" : "vazio") : String(depois[f.key] ?? ""),
    }));
}

/** Valida a senha conforme as regras de segurança configuradas. Retorna mensagem de erro ou "". */
export function validarSenha(pw: string, cfg: Config = getConfig()) {
  const min = Number(cfg.seguranca.senhaMin) || 6;
  if (pw.length < min) return `A senha deve ter pelo menos ${min} caracteres.`;
  if (cfg.seguranca.letrasNumeros && !(/[a-zA-Z]/.test(pw) && /\d/.test(pw))) return "A senha deve conter letras e números.";
  return "";
}
