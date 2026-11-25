import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { abertoComoApp, detectarPlataforma } from "@/lib/instalar-app";

// Notificações do próprio Pulsar (Web Push). O aparelho fica registrado em push_assinaturas e
// a Edge Function "notificacoes" envia os avisos (todo dia às 8h, e o teste).
//
// Aparelho usado por mais de uma pessoa: a assinatura do aparelho é de quem a ativou. Quem sai
// desliga as notificações daquele aparelho, e quem entra não herda a assinatura de outra pessoa
// (limparAssinaturaDeOutraPessoa). Assim um aviso nunca chega para a pessoa errada.

// Chave pública VAPID. A privada fica só nos segredos da Edge Function.
const CHAVE_PUBLICA = "BG8Lf_h0YME_-u7CY4evrQpFPTcGZZ_Ho0QseKrybSXMh1Rawn90v3o2D1XHgBrbmritanGu8hDwt8GzWUzwuKc";

export type EstadoNotificacoes =
  | "sem-suporte" // o navegador não recebe notificações
  | "so-no-app-publicado" // prévia de desenvolvimento: não há service worker
  | "instalar-primeiro" // iPhone: só funciona com o Pulsar instalado na tela de início
  | "bloqueado" // a pessoa recusou; precisa liberar nas configurações do aparelho
  | "desligado" // pode ativar
  | "ligado"; // este aparelho recebe os avisos

function temSuporte() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function paraBytes(base64url: string) {
  const b64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function descricaoAparelho() {
  const p = detectarPlataforma();
  const tipo = p === "ios" ? "iPhone/iPad" : p === "android" ? "Android" : "Computador";
  return `${tipo}${abertoComoApp() ? " (app)" : " (navegador)"}`;
}

async function assinaturaAtual() {
  if (!temSuporte()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** A assinatura do aparelho é da pessoa conectada? (as regras do banco só mostram as dela) */
async function ehMinha(endpoint: string) {
  const { data } = await (supabase.from as any)("push_assinaturas").select("id").eq("endpoint", endpoint).maybeSingle();
  return !!data;
}

export async function estadoNotificacoes(): Promise<EstadoNotificacoes> {
  if (detectarPlataforma() === "ios" && !abertoComoApp()) return "instalar-primeiro";
  if (!temSuporte()) return "sem-suporte";
  if (!(await navigator.serviceWorker.getRegistration())) return "so-no-app-publicado";
  if (Notification.permission === "denied") return "bloqueado";
  const sub = await assinaturaAtual();
  if (!sub || Notification.permission !== "granted") return "desligado";
  return (await ehMinha(sub.endpoint)) ? "ligado" : "desligado";
}

export async function ativarNotificacoes() {
  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") {
    throw new Error("As notificações não foram permitidas. Veja como liberar nas configurações do aparelho.");
  }
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) throw new Error("As notificações funcionam no Pulsar publicado, não na prévia.");

  let sub = await reg.pushManager.getSubscription();
  if (sub && !(await ehMinha(sub.endpoint))) {
    // Era de outra pessoa (ou ficou sem registro): descarta e cria uma nova, só desta pessoa.
    await sub.unsubscribe();
    sub = null;
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: paraBytes(CHAVE_PUBLICA) });
    const j = sub.toJSON();
    const { error } = await (supabase.from as any)("push_assinaturas").insert({
      endpoint: sub.endpoint,
      p256dh: j.keys?.p256dh,
      auth: j.keys?.auth,
      aparelho: descricaoAparelho(),
    });
    if (error) {
      await sub.unsubscribe();
      throw new Error("Não foi possível registrar este aparelho. Tente de novo.");
    }
  }
}

/** Desliga as notificações deste aparelho (também usado ao sair da conta). */
export async function desativarNotificacoes() {
  const sub = await assinaturaAtual();
  if (!sub) return;
  await (supabase.from as any)("push_assinaturas").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

/** Ao entrar: se o aparelho estava recebendo avisos de outra pessoa, para de receber. */
export async function limparAssinaturaDeOutraPessoa() {
  try {
    const sub = await assinaturaAtual();
    if (sub && !(await ehMinha(sub.endpoint))) await sub.unsubscribe();
  } catch (e) {
    console.error("conferir notificações do aparelho", e);
  }
}

export async function enviarTeste() {
  const { data, error } = await supabase.functions.invoke("notificacoes", { body: { acao: "teste" } });
  if (error) {
    let mensagem = "Não foi possível enviar o teste.";
    if (error instanceof FunctionsHttpError) {
      const corpo = await error.context.json().catch(() => null);
      if (corpo?.erro) mensagem = corpo.erro;
    }
    throw new Error(mensagem);
  }
  const r = data as { enviados: number; removidas: number };
  if (r.enviados === 0) {
    throw new Error("O aviso não foi entregue a nenhum aparelho. Desative e ative as notificações de novo.");
  }
  return r;
}
