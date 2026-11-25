import { createSupabaseContext, withSupabase } from "npm:@supabase/server@1.9.2";
import webpush from "npm:web-push@3.6.7";

// Notificações do próprio Pulsar (Web Push), para os aparelhos em push_assinaturas.
// - POST com o login do Pulsar, { acao: "teste" }: manda um aviso de teste para os aparelhos
//   de quem pediu.
// - POST com o cabeçalho x-pulsar-cron (pg_cron, todo dia às 8h), { acao: "diario" }: avisa cada
//   pessoa do que vence no dia, só dos módulos liberados para ela. { simular: true } devolve os
//   avisos sem enviar (para conferência).
// Cada aviso vai só para os aparelhos da própria pessoa.
// verify_jwt fica desligado porque o pg_cron não tem login; o cabeçalho é conferido aqui, e as
// chamadas com login são validadas pelo withSupabase.

const VAPID_PUBLICA = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVADA = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const TOKEN_CRON = Deno.env.get("NOTIFICACOES_TOKEN") ?? "";
const FUSO = "America/Sao_Paulo";

webpush.setVapidDetails("mailto:alansilveira@pulsarprocessos.com.br", VAPID_PUBLICA, VAPID_PRIVADA);

type Aviso = { titulo: string; corpo: string; url: string; tag: string };
type Assinatura = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };
// deno-lint-ignore no-explicit-any
type Admin = any;

const brl = (n: number) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function hojeSP() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date()); // AAAA-MM-DD
}

/** Dia do mês na data; dia 31 em mês de 30 dias vira o último dia (igual ao app). */
function dataNoMes(ano: number, mes: number, dia: number) {
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return `${ano}-${String(mes).padStart(2, "0")}-${String(Math.min(dia, ultimo)).padStart(2, "0")}`;
}

/** "A · B · C e mais 2" com no máximo 3 itens. */
function lista(itens: string[]) {
  const mostrar = itens.slice(0, 3).join(" · ");
  return itens.length > 3 ? `${mostrar} e mais ${itens.length - 3}` : mostrar;
}

// Compara sem vazar pelo tempo de resposta quantos caracteres batem.
function tokenConfere(recebido: string) {
  if (!TOKEN_CRON || recebido.length !== TOKEN_CRON.length) return false;
  let dif = 0;
  for (let i = 0; i < recebido.length; i++) dif |= recebido.charCodeAt(i) ^ TOKEN_CRON.charCodeAt(i);
  return dif === 0;
}

async function enviar(admin: Admin, assinaturas: Assinatura[], aviso: Aviso) {
  let enviados = 0, removidas = 0;
  for (const a of assinaturas) {
    try {
      await webpush.sendNotification(
        { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
        JSON.stringify(aviso),
        { TTL: 12 * 60 * 60, urgency: "high", topic: aviso.tag },
      );
      enviados++;
      await admin.from("push_assinaturas").update({ ultimo_envio: new Date().toISOString() }).eq("id", a.id);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        // O aparelho cancelou ou a assinatura venceu: não adianta tentar de novo.
        await admin.from("push_assinaturas").delete().eq("id", a.id);
        removidas++;
      } else {
        console.error("envio de notificação", status, (e as Error).message);
      }
    }
  }
  return { enviados, removidas };
}

/** O que vence hoje para cada pessoa, só dos módulos liberados e de contas não bloqueadas. */
async function avisosDoDia(admin: Admin, userIds: string[], hoje: string) {
  const avisos = new Map<string, Aviso[]>();
  if (userIds.length === 0) return avisos;
  const add = (u: string, a: Aviso) => avisos.set(u, [...(avisos.get(u) ?? []), a]);
  const [ano, mes] = hoje.split("-").map(Number);
  const competencia = `${hoje.slice(0, 7)}-01`;
  const dataTag = hoje.replace(/-/g, "");

  const ativos: string[] = [];
  for (const id of userIds) {
    const { data } = await admin.auth.admin.getUserById(id);
    const bloqueadoAte = data?.user?.banned_until ? new Date(data.user.banned_until).getTime() : 0;
    if (data?.user && bloqueadoAte <= Date.now()) ativos.push(id);
  }
  if (ativos.length === 0) return avisos;

  const { data: mods } = await admin.from("modulos_usuario").select("user_id, modulo").in("user_id", ativos);
  const comPessoal = (mods ?? []).filter((m: { modulo: string }) => m.modulo === "pessoal").map((m: { user_id: string }) => m.user_id);
  const comEmpresa = (mods ?? []).filter((m: { modulo: string }) => m.modulo === "empreendedor").map((m: { user_id: string }) => m.user_id);

  // ---- Pessoal: lançamentos e parcelas a pagar hoje + contas fixas que vencem hoje ----
  if (comPessoal.length > 0) {
    const [{ data: lancs }, { data: contas }] = await Promise.all([
      admin.from("pessoal_lancamentos")
        .select("user_id, descricao, valor, divida_id, parcela_numero")
        .in("user_id", comPessoal).eq("tipo", "Despesa").eq("status", "Pendente").eq("data", hoje),
      admin.from("pessoal_contas_fixas")
        .select("id, user_id, descricao, valor, dia_vencimento")
        .in("user_id", comPessoal).eq("ativa", true).lte("inicio", competencia),
    ]);
    const contasHoje = (contas ?? []).filter((c: { dia_vencimento: number }) => dataNoMes(ano, mes, c.dia_vencimento) === hoje);
    let pagas = new Set<string>();
    if (contasHoje.length > 0) {
      const { data } = await admin.from("pessoal_lancamentos")
        .select("conta_fixa_id").in("conta_fixa_id", contasHoje.map((c: { id: string }) => c.id)).eq("competencia", competencia);
      pagas = new Set((data ?? []).map((l: { conta_fixa_id: string }) => l.conta_fixa_id));
    }
    const dividaIds = [...new Set((lancs ?? []).filter((l: { divida_id: string | null }) => l.divida_id).map((l: { divida_id: string }) => l.divida_id))];
    const totais = new Map<string, number>();
    if (dividaIds.length > 0) {
      const { data } = await admin.from("pessoal_dividas").select("id, total_parcelas").in("id", dividaIds);
      for (const d of data ?? []) totais.set(d.id, d.total_parcelas);
    }

    for (const u of comPessoal) {
      const itens: { texto: string; valor: number }[] = [];
      for (const l of (lancs ?? []).filter((x: { user_id: string }) => x.user_id === u)) {
        const nome = l.divida_id ? `Parcela ${l.parcela_numero}/${totais.get(l.divida_id) ?? "?"} ${l.descricao}` : l.descricao;
        itens.push({ texto: `${nome} ${brl(l.valor)}`, valor: Number(l.valor) });
      }
      for (const c of contasHoje.filter((x: { user_id: string; id: string }) => x.user_id === u && !pagas.has(x.id))) {
        itens.push({ texto: `${c.descricao} ${brl(c.valor)}`, valor: Number(c.valor) });
      }
      if (itens.length === 0) continue;
      itens.sort((a, b) => b.valor - a.valor);
      const total = itens.reduce((s, i) => s + i.valor, 0);
      add(u, {
        titulo: itens.length === 1 ? "Vence hoje · Pessoal" : `${itens.length} contas vencem hoje · Pessoal`,
        corpo: `${lista(itens.map((i) => i.texto))}${itens.length > 1 ? ` · total ${brl(total)}` : ""}`,
        url: "/pessoal/movimentacoes",
        tag: `pessoal-${dataTag}`,
      });
    }
  }

  // ---- Empreendedor: o que está para pagar e receber hoje no financeiro ----
  if (comEmpresa.length > 0) {
    const { data: lancs } = await admin.from("lancamentos")
      .select("user_id, tipo, valor").in("user_id", comEmpresa).eq("status", "Pendente").eq("data", hoje);
    for (const u of comEmpresa) {
      const meus = (lancs ?? []).filter((l: { user_id: string }) => l.user_id === u);
      const pagar = meus.filter((l: { tipo: string }) => l.tipo === "Despesa");
      const receber = meus.filter((l: { tipo: string }) => l.tipo === "Receita");
      if (pagar.length === 0 && receber.length === 0) continue;
      const soma = (xs: { valor: number }[]) => brl(xs.reduce((s, l) => s + Number(l.valor), 0));
      const partes: string[] = [];
      if (pagar.length > 0) partes.push(`A pagar: ${pagar.length} (${soma(pagar)})`);
      if (receber.length > 0) partes.push(`A receber: ${receber.length} (${soma(receber)})`);
      add(u, {
        titulo: "Hoje no financeiro · Empreendedor",
        corpo: partes.join(" · "),
        url: "/empreendedor/financeiro/lancamentos",
        tag: `empresa-${dataTag}`,
      });
    }
  }
  return avisos;
}

async function diario(req: Request) {
  if (!tokenConfere(req.headers.get("x-pulsar-cron") ?? "")) return Response.json({ erro: "Não autorizado." }, { status: 401 });
  const { data: ctx, error } = await createSupabaseContext(req, { auth: "none" });
  if (error || !ctx) return Response.json({ erro: "Falha interna." }, { status: 500 });
  const admin = ctx.supabaseAdmin;
  const corpo = await req.json().catch(() => ({}));
  const hoje = typeof corpo.hoje === "string" && corpo.simular && /^\d{4}-\d{2}-\d{2}$/.test(corpo.hoje) ? corpo.hoje : hojeSP();

  const { data: assinaturas, error: assErr } = await admin.from("push_assinaturas").select("id, user_id, endpoint, p256dh, auth");
  if (assErr) return Response.json({ erro: "Falha ao ler os aparelhos." }, { status: 500 });
  const porUsuario = new Map<string, Assinatura[]>();
  for (const a of (assinaturas ?? []) as Assinatura[]) porUsuario.set(a.user_id, [...(porUsuario.get(a.user_id) ?? []), a]);

  // Na simulação, inclui quem foi pedido mesmo sem aparelho (para conferir o texto).
  const ids = corpo.simular && Array.isArray(corpo.usuarios) ? corpo.usuarios : [...porUsuario.keys()];
  const avisos = await avisosDoDia(admin, ids, hoje);
  if (corpo.simular) return Response.json({ hoje, avisos: Object.fromEntries(avisos) });

  let enviados = 0, removidas = 0;
  for (const [u, lista] of avisos) {
    for (const aviso of lista) {
      const r = await enviar(admin, porUsuario.get(u) ?? [], aviso);
      enviados += r.enviados;
      removidas += r.removidas;
    }
  }
  return Response.json({ hoje, pessoas: avisos.size, enviados, removidas });
}

const api = withSupabase({ auth: "user" }, async (req, ctx) => {
  if (req.method !== "POST") return Response.json({ erro: "Método não permitido." }, { status: 405 });
  const userId = ctx.userClaims?.id;
  if (!userId) return Response.json({ erro: "Sessão inválida. Entre novamente." }, { status: 401 });
  const corpo = await req.json().catch(() => ({}));
  if (corpo.acao !== "teste") return Response.json({ erro: "Ação desconhecida." }, { status: 400 });

  const admin = ctx.supabaseAdmin;
  const { data: assinaturas } = await admin.from("push_assinaturas").select("id, user_id, endpoint, p256dh, auth").eq("user_id", userId);
  if (!assinaturas || assinaturas.length === 0) {
    return Response.json({ erro: "Nenhum aparelho com notificações ativas." }, { status: 404 });
  }
  const r = await enviar(admin, assinaturas, {
    titulo: "Notificações do Pulsar ativadas",
    corpo: "É assim que os avisos de contas e vencimentos vão chegar.",
    url: "/",
    tag: "teste",
  });
  return Response.json(r);
});

export default {
  fetch(req: Request) {
    if (req.headers.has("x-pulsar-cron")) return diario(req);
    return api(req);
  },
};
