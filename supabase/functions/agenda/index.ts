import { createSupabaseContext, withSupabase } from "npm:@supabase/server@1.9.2";

// Agenda do Pulsar ligada ao Google Agenda.
// Os compromissos ficam no próprio Google, em duas agendas criadas pelo Pulsar (Pessoal e
// Empreendedor); por isso o que muda num lado aparece no outro, e os avisos no celular vêm
// do app Google Agenda. A permissão pedida (calendar.app.created) só alcança as agendas
// criadas pelo Pulsar: o resto da agenda do usuário fica fora.
//
// POST (com o login do Pulsar): status, conectar, listar, salvar, excluir, desconectar.
// GET ?code=&state=: retorno do Google depois que o usuário autoriza a conta.
// verify_jwt fica desligado porque o Google chega no retorno sem o login do Pulsar; as
// ações POST validam o login pelo withSupabase, e o retorno valida o "state" assinado.

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";
const AGENDA_CHAVE = Deno.env.get("AGENDA_CHAVE") ?? "";
const URL_RETORNO = `${Deno.env.get("SUPABASE_URL")}/functions/v1/agenda`;
const ESCOPOS = "openid email https://www.googleapis.com/auth/calendar.app.created";
const ORIGENS = ["https://pulsar.devalorepulsar.com.br", "http://localhost:5173"];
const API = "https://www.googleapis.com/calendar/v3";
const FUSO = "America/Sao_Paulo";
const ESTADO_VALIDADE_MS = 15 * 60 * 1000;

type Tipo = "pessoal" | "empreendedor";
const TIPOS: Tipo[] = ["pessoal", "empreendedor"];
// Cores de evento do Google: 9 = Mirtilo (azul), 6 = Tangerina (laranja).
const AGENDAS: Record<Tipo, { nome: string; cor: string }> = {
  pessoal: { nome: "Pulsar · Pessoal", cor: "9" },
  empreendedor: { nome: "Pulsar · Empreendedor", cor: "6" },
};

type Conexao = {
  user_id: string;
  google_email: string | null;
  refresh_token_cifrado: string;
  agenda_pessoal_id: string | null;
  agenda_empreendedor_id: string | null;
};

// deno-lint-ignore no-explicit-any
type Admin = any;

class ErroGoogle extends Error {
  constructor(public status: number, mensagem: string) {
    super(mensagem);
  }
}

function erro(status: number, mensagem: string, extra: Record<string, unknown> = {}) {
  return Response.json({ erro: mensagem, ...extra }, { status });
}

/** A Agenda faz parte do módulo Empreendedor: precisa dele liberado e a conta não pode estar bloqueada. */
async function podeUsar(admin: Admin, userId: string) {
  const [{ data: modulo }, { data: conta }] = await Promise.all([
    admin.from("modulos_usuario").select("modulo").eq("user_id", userId).eq("modulo", "empreendedor").maybeSingle(),
    admin.auth.admin.getUserById(userId),
  ]);
  const bloqueadoAte = conta?.user?.banned_until ? new Date(conta.user.banned_until).getTime() : 0;
  return !!modulo && !!conta?.user && bloqueadoAte <= Date.now();
}

// ============ CRIPTOGRAFIA ============
const enc = new TextEncoder();
const dec = new TextDecoder();

function paraB64url(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function deB64url(texto: string) {
  const b64 = texto.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

// Duas chaves derivadas da AGENDA_CHAVE: uma cifra o refresh token, a outra assina o state.
let chaves: Promise<{ cifra: CryptoKey; assinatura: CryptoKey }> | null = null;
function obterChaves() {
  chaves ??= (async () => {
    if (!AGENDA_CHAVE) throw new Error("AGENDA_CHAVE não configurada.");
    const base = await crypto.subtle.importKey("raw", deB64url(AGENDA_CHAVE), "HKDF", false, ["deriveKey"]);
    const derivar = (info: string, alg: AesKeyGenParams | HmacKeyGenParams, usos: KeyUsage[]) =>
      crypto.subtle.deriveKey(
        { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(), info: enc.encode(info) },
        base, alg, false, usos,
      );
    return {
      cifra: await derivar("pulsar-agenda-cifra", { name: "AES-GCM", length: 256 }, ["encrypt", "decrypt"]),
      assinatura: await derivar("pulsar-agenda-estado", { name: "HMAC", hash: "SHA-256", length: 256 }, ["sign", "verify"]),
    };
  })();
  return chaves;
}

async function cifrar(texto: string) {
  const { cifra } = await obterChaves();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const dados = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cifra, enc.encode(texto)));
  return `${paraB64url(iv)}.${paraB64url(dados)}`;
}
async function decifrar(texto: string) {
  const { cifra } = await obterChaves();
  const [iv, dados] = texto.split(".");
  const claro = await crypto.subtle.decrypt({ name: "AES-GCM", iv: deB64url(iv) }, cifra, deB64url(dados));
  return dec.decode(claro);
}

// state = dados.assinatura, para o retorno do Google saber de qual usuário é e para onde voltar.
async function criarEstado(userId: string, origem: string) {
  const { assinatura } = await obterChaves();
  const dados = paraB64url(enc.encode(JSON.stringify({ u: userId, o: origem, e: Date.now() + ESTADO_VALIDADE_MS })));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", assinatura, enc.encode(dados)));
  return `${dados}.${paraB64url(sig)}`;
}
async function lerEstado(estado: string): Promise<{ userId: string; origem: string } | null> {
  const [dados, sig] = (estado ?? "").split(".");
  if (!dados || !sig) return null;
  const { assinatura } = await obterChaves();
  const ok = await crypto.subtle.verify("HMAC", assinatura, deB64url(sig), enc.encode(dados));
  if (!ok) return null;
  const { u, o, e } = JSON.parse(dec.decode(deB64url(dados)));
  if (typeof u !== "string" || !ORIGENS.includes(o) || Date.now() > e) return null;
  return { userId: u, origem: o };
}

// ============ GOOGLE ============
async function tokenGoogle(parametros: Record<string, string>) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, ...parametros }),
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErroGoogle(r.status, dados.error ?? "falha no token");
  return dados as { access_token: string; expires_in: number; refresh_token?: string; id_token?: string };
}

async function google(token: string, metodo: string, caminho: string, corpo?: unknown) {
  const r = await fetch(API + caminho, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  if (r.status === 204) return null;
  const dados = await r.json().catch(() => null);
  if (!r.ok) throw new ErroGoogle(r.status, dados?.error?.message ?? r.statusText);
  return dados;
}

// O access token vale ~1 hora; guardamos enquanto esta instância da função estiver viva.
const tokens = new Map<string, { token: string; expira: number }>();

async function acessoGoogle(con: Conexao) {
  const guardado = tokens.get(con.user_id);
  if (guardado && guardado.expira > Date.now() + 60_000) return guardado.token;
  const t = await tokenGoogle({ grant_type: "refresh_token", refresh_token: await decifrar(con.refresh_token_cifrado) });
  tokens.set(con.user_id, { token: t.access_token, expira: Date.now() + t.expires_in * 1000 });
  return t.access_token;
}

/** Cria as agendas do Pulsar que ainda não existem (ou que foram apagadas no Google). */
async function garantirAgendas(token: string, ids: Record<Tipo, string | null>) {
  const resultado = { ...ids };
  for (const tipo of TIPOS) {
    if (resultado[tipo]) {
      try {
        await google(token, "GET", `/calendars/${encodeURIComponent(resultado[tipo]!)}`);
        continue;
      } catch (e) {
        if (!(e instanceof ErroGoogle && (e.status === 404 || e.status === 410))) throw e;
      }
    }
    const nova = await google(token, "POST", "/calendars", {
      summary: AGENDAS[tipo].nome,
      description: "Criada pelo Pulsar. O que estiver aqui aparece na Agenda do Pulsar.",
      timeZone: FUSO,
    });
    resultado[tipo] = nova.id;
  }
  return resultado;
}

function idsDa(con: Conexao): Record<Tipo, string | null> {
  return { pessoal: con.agenda_pessoal_id, empreendedor: con.agenda_empreendedor_id };
}

async function salvarIds(admin: Admin, userId: string, ids: Record<Tipo, string | null>) {
  await admin.from("agenda_google")
    .update({ agenda_pessoal_id: ids.pessoal, agenda_empreendedor_id: ids.empreendedor })
    .eq("user_id", userId);
}

// ============ RETORNO DO GOOGLE (GET) ============
function paginaErro(mensagem: string) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Pulsar</title><p style="font-family:sans-serif">${mensagem}</p>`,
    { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

async function retornoGoogle(req: Request) {
  const url = new URL(req.url);
  const estado = await lerEstado(url.searchParams.get("state") ?? "").catch(() => null);
  if (!estado) return paginaErro("Link de conexão inválido ou vencido. Volte ao Pulsar e clique em Conectar de novo.");
  const voltar = (resultado: string) =>
    Response.redirect(`${estado.origem}/empreendedor/agenda?google=${resultado}`, 302);

  const codigo = url.searchParams.get("code");
  if (!codigo) return voltar("cancelado");

  try {
    const t = await tokenGoogle({ grant_type: "authorization_code", code: codigo, redirect_uri: URL_RETORNO });
    if (!t.refresh_token) return voltar("erro");
    const email = t.id_token ? JSON.parse(dec.decode(deB64url(t.id_token.split(".")[1]))).email ?? null : null;

    const { data: ctx, error } = await createSupabaseContext(req, { auth: "none" });
    if (error || !ctx) return voltar("erro");
    const admin = ctx.supabaseAdmin;
    if (!(await podeUsar(admin, estado.userId))) return voltar("erro");

    const { data: anterior } = await admin.from("agenda_google").select("*").eq("user_id", estado.userId).maybeSingle();
    const ids = await garantirAgendas(
      t.access_token,
      anterior ? idsDa(anterior) : { pessoal: null, empreendedor: null },
    );
    const { error: erroGravar } = await admin.from("agenda_google").upsert({
      user_id: estado.userId,
      google_email: email,
      refresh_token_cifrado: await cifrar(t.refresh_token),
      agenda_pessoal_id: ids.pessoal,
      agenda_empreendedor_id: ids.empreendedor,
    });
    if (erroGravar) return voltar("erro");
    tokens.set(estado.userId, { token: t.access_token, expira: Date.now() + t.expires_in * 1000 });
    return voltar("conectado");
  } catch (e) {
    console.error("retorno do Google", e);
    return voltar("erro");
  }
}

// ============ COMPROMISSOS ============
type Compromisso = {
  id: string;
  tipo: Tipo;
  titulo: string;
  diaInteiro: boolean;
  inicio: string;
  fim: string;
  local: string | null;
  descricao: string | null;
  avisoMin: number | null;
  link: string | null;
  recorrente: boolean;
};

// deno-lint-ignore no-explicit-any
function mapear(e: any, tipo: Tipo): Compromisso {
  const aviso = e.reminders?.overrides?.find((r: { method: string }) => r.method === "popup");
  return {
    id: e.id,
    tipo,
    titulo: e.summary ?? "(sem título)",
    diaInteiro: !!e.start?.date,
    inicio: e.start?.dateTime ?? e.start?.date,
    fim: e.end?.dateTime ?? e.end?.date,
    local: e.location ?? null,
    descricao: e.description ?? null,
    avisoMin: aviso ? aviso.minutes : null,
    link: e.htmlLink ?? null,
    recorrente: !!e.recurringEventId,
  };
}

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{2}:\d{2}$/;

function diaSeguinte(data: string) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

type Entrada = {
  tipo?: string;
  titulo?: string;
  diaInteiro?: boolean;
  dataInicio?: string;
  horaInicio?: string;
  dataFim?: string;
  horaFim?: string;
  local?: string;
  descricao?: string;
  avisoMin?: number | null;
};

/** Monta o evento do Google a partir do formulário, ou devolve a mensagem de erro. */
function montarEvento(c: Entrada): { evento: Record<string, unknown> } | { erro: string } {
  const titulo = (c.titulo ?? "").trim();
  if (!titulo) return { erro: "Informe o título." };
  if (titulo.length > 300) return { erro: "O título está muito longo." };
  if (!TIPOS.includes(c.tipo as Tipo)) return { erro: "Escolha Pessoal ou Empreendedor." };
  const tipo = c.tipo as Tipo;
  if (!DATA.test(c.dataInicio ?? "") || !DATA.test(c.dataFim ?? "")) return { erro: "Data inválida." };

  let start: Record<string, string>, end: Record<string, string>;
  if (c.diaInteiro) {
    if (c.dataFim! < c.dataInicio!) return { erro: "A data final é antes da inicial." };
    // No Google, o fim de um evento de dia inteiro é o dia seguinte ao último dia.
    start = { date: c.dataInicio! };
    end = { date: diaSeguinte(c.dataFim!) };
  } else {
    if (!HORA.test(c.horaInicio ?? "") || !HORA.test(c.horaFim ?? "")) return { erro: "Horário inválido." };
    const ini = `${c.dataInicio}T${c.horaInicio}:00`;
    const fim = `${c.dataFim}T${c.horaFim}:00`;
    if (fim <= ini) return { erro: "O fim precisa ser depois do início." };
    start = { dateTime: ini, timeZone: FUSO };
    end = { dateTime: fim, timeZone: FUSO };
  }

  const aviso = c.avisoMin;
  if (aviso != null && (!Number.isInteger(aviso) || aviso < 0 || aviso > 40320)) {
    return { erro: "Aviso inválido." };
  }

  return {
    evento: {
      summary: titulo,
      location: (c.local ?? "").trim() || null,
      description: (c.descricao ?? "").trim() || null,
      start,
      end,
      colorId: AGENDAS[tipo].cor,
      reminders: aviso == null
        ? { useDefault: false, overrides: [] }
        : { useDefault: false, overrides: [{ method: "popup", minutes: aviso }] },
    },
  };
}

// ============ AÇÕES (POST) ============
type Corpo = Entrada & {
  acao?: string;
  origem?: string;
  inicio?: string;
  fim?: string;
  id?: string;
  tipoAnterior?: string;
};

const api = withSupabase({ auth: "user" }, async (req, ctx) => {
  if (req.method !== "POST") return erro(405, "Método não permitido.");
  const userId = ctx.userClaims?.id;
  if (!userId) return erro(401, "Sessão inválida. Entre novamente.");
  const admin = ctx.supabaseAdmin;
  if (!(await podeUsar(admin, userId))) return erro(403, "Você não tem acesso ao módulo Empreendedor.");
  const configurado = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && AGENDA_CHAVE);

  let corpo: Corpo;
  try {
    corpo = await req.json();
  } catch {
    return erro(400, "Requisição inválida.");
  }

  const { data: con } = await admin.from("agenda_google").select("*").eq("user_id", userId).maybeSingle();

  if (corpo.acao === "status") {
    return Response.json({ configurado, conectado: !!con, email: con?.google_email ?? null });
  }

  if (corpo.acao === "conectar") {
    if (!configurado) return erro(503, "A ligação com o Google ainda não foi configurada.");
    const origem = ORIGENS.includes(corpo.origem ?? "") ? corpo.origem! : ORIGENS[0];
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: URL_RETORNO,
      response_type: "code",
      scope: ESCOPOS,
      access_type: "offline",
      prompt: "consent",
      state: await criarEstado(userId, origem),
    }).toString();
    return Response.json({ url: url.toString() });
  }

  if (corpo.acao === "desconectar") {
    if (con) {
      try {
        await fetch("https://oauth2.googleapis.com/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token: await decifrar(con.refresh_token_cifrado) }),
        });
      } catch (e) {
        console.error("revogar no Google", e);
      }
      await admin.from("agenda_google").delete().eq("user_id", userId);
      tokens.delete(userId);
    }
    return Response.json({ ok: true });
  }

  if (!con) return erro(409, "Conecte sua conta Google primeiro.", { reconectar: true });

  let token: string;
  try {
    token = await acessoGoogle(con);
  } catch (e) {
    // invalid_grant: o acesso foi removido na conta Google ou venceu.
    if (e instanceof ErroGoogle && e.status === 400) {
      await admin.from("agenda_google").delete().eq("user_id", userId);
      return erro(409, "A conexão com o Google expirou. Conecte de novo.", { reconectar: true });
    }
    console.error("token do Google", e);
    return erro(502, "Não foi possível falar com o Google agora. Tente de novo em instantes.");
  }

  let ids = idsDa(con);
  const agendaDe = async (tipo: Tipo) => {
    if (!ids[tipo]) {
      ids = await garantirAgendas(token, ids);
      await salvarIds(admin, userId, ids);
    }
    return encodeURIComponent(ids[tipo]!);
  };

  try {
    if (corpo.acao === "listar") {
      if (!DATA.test(corpo.inicio ?? "") || !DATA.test(corpo.fim ?? "")) return erro(400, "Período inválido.");
      const params = new URLSearchParams({
        timeMin: `${corpo.inicio}T00:00:00-03:00`,
        timeMax: `${diaSeguinte(corpo.fim!)}T00:00:00-03:00`,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "2500",
        timeZone: FUSO,
      });
      const lista: Compromisso[] = [];
      for (const tipo of TIPOS) {
        try {
          const r = await google(token, "GET", `/calendars/${await agendaDe(tipo)}/events?${params}`);
          for (const e of r?.items ?? []) if (e.status !== "cancelled") lista.push(mapear(e, tipo));
        } catch (e) {
          // A agenda foi apagada no Google: recria vazia na próxima chamada.
          if (e instanceof ErroGoogle && (e.status === 404 || e.status === 410)) {
            ids[tipo] = null;
            await salvarIds(admin, userId, ids);
            continue;
          }
          throw e;
        }
      }
      lista.sort((a, b) => a.inicio.localeCompare(b.inicio));
      return Response.json({ email: con.google_email, compromissos: lista });
    }

    if (corpo.acao === "salvar") {
      const montado = montarEvento(corpo);
      if ("erro" in montado) return erro(400, montado.erro);
      const tipo = corpo.tipo as Tipo;
      let salvo;
      if (corpo.id) {
        const id = encodeURIComponent(corpo.id);
        const anterior = TIPOS.includes(corpo.tipoAnterior as Tipo) ? (corpo.tipoAnterior as Tipo) : tipo;
        if (anterior !== tipo) {
          await google(token, "POST", `/calendars/${await agendaDe(anterior)}/events/${id}/move?destination=${await agendaDe(tipo)}`);
        }
        salvo = await google(token, "PATCH", `/calendars/${await agendaDe(tipo)}/events/${id}`, montado.evento);
      } else {
        salvo = await google(token, "POST", `/calendars/${await agendaDe(tipo)}/events`, montado.evento);
      }
      return Response.json({ compromisso: mapear(salvo, tipo) });
    }

    if (corpo.acao === "excluir") {
      if (!corpo.id || !TIPOS.includes(corpo.tipo as Tipo)) return erro(400, "Requisição inválida.");
      try {
        await google(token, "DELETE", `/calendars/${await agendaDe(corpo.tipo as Tipo)}/events/${encodeURIComponent(corpo.id)}`);
      } catch (e) {
        if (!(e instanceof ErroGoogle && (e.status === 404 || e.status === 410))) throw e;
      }
      return Response.json({ ok: true });
    }
  } catch (e) {
    console.error("Google Agenda", e);
    if (e instanceof ErroGoogle && (e.status === 401 || e.status === 403)) {
      tokens.delete(userId);
      return erro(409, "O Google recusou o acesso. Conecte de novo.", { reconectar: true });
    }
    return erro(502, "O Google Agenda não respondeu. Tente de novo em instantes.");
  }

  return erro(400, "Ação desconhecida.");
});

export default {
  fetch(req: Request) {
    const url = new URL(req.url);
    if (req.method === "GET" && (url.searchParams.has("code") || url.searchParams.has("state"))) {
      return retornoGoogle(req);
    }
    return api(req);
  },
};
