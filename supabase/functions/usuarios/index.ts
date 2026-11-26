import { withSupabase } from "npm:@supabase/server@1.9.2";
import nodemailer from "npm:nodemailer@6.9.16";

// Módulo Administração: criar pessoas (login e senha), liberar módulos, trocar senha, bloquear
// e excluir. Só administradores (app_metadata.role = "admin") fazem isso; quem não é
// administrador só consegue listar a própria conta.
// A própria senha é trocada no app com auth.updateUser: pela rota de administrador o Supabase
// encerraria também a sessão de quem está trocando.
// O administrador não vê os dados das pessoas (lançamentos etc.): as regras do banco valem para
// ele também. Aqui ele só enxerga e-mail, nome, módulos e situação da conta.
//
// Senha definida pelo administrador é provisória: user_metadata.trocar_senha = true faz o app
// pedir uma senha nova no próximo acesso. Ela pode ir por e-mail (login, senha e link), pelo
// SMTP dos segredos SMTP_HOST, SMTP_PORT (465: as Edge Functions não saem pelas portas 25 e
// 587), SMTP_USER, SMTP_PASS e SMTP_REMETENTE.

const SENHA_MIN = 8;
// Limite do bcrypt usado pelo Supabase Auth.
const SENHA_MAX = 72;
const MODULOS = ["empreendedor", "pessoal"] as const;
type Modulo = (typeof MODULOS)[number];
const BLOQUEIO = "876000h"; // ~100 anos: bloqueado até ser desbloqueado.
// O link do e-mail aponta sempre para o site publicado (nunca para a prévia de quem cadastrou).
const SITE = Deno.env.get("SITE_URL") ?? "https://pulsar.devalorepulsar.com.br";

type Corpo = {
  acao?: string;
  user_id?: string;
  senha?: string;
  email?: string;
  nome?: string;
  modulos?: unknown;
  bloquear?: boolean;
  enviar_email?: boolean;
};

function erro(status: number, mensagem: string) {
  return Response.json({ erro: mensagem }, { status });
}

// ============ E-MAIL DE ACESSO ============
const smtpConfigurado = () =>
  !!(Deno.env.get("SMTP_HOST") && Deno.env.get("SMTP_USER") && Deno.env.get("SMTP_PASS"));

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Envia login, senha provisória e o link do sistema. Devolve a mensagem de erro, ou null se foi. */
async function enviarAcesso(p: { email: string; nome: string; senha: string; novo: boolean }): Promise<string | null> {
  if (!smtpConfigurado()) return "O envio de e-mail ainda não foi configurado.";
  const porta = Number(Deno.env.get("SMTP_PORT") ?? "465");
  const usuario = Deno.env.get("SMTP_USER")!;
  const transporte = nodemailer.createTransport({
    host: Deno.env.get("SMTP_HOST"),
    port: porta,
    secure: porta === 465,
    auth: { user: usuario, pass: Deno.env.get("SMTP_PASS") },
  });
  const primeiroNome = p.nome.trim().split(/\s+/)[0] || "";
  const assunto = p.novo ? "Seu acesso ao Pulsar" : "Sua nova senha do Pulsar";
  const abertura = p.novo ? "Seu acesso ao Pulsar está pronto." : "Sua senha do Pulsar foi trocada.";
  const texto = [
    `Olá${primeiroNome ? `, ${primeiroNome}` : ""}!`,
    "",
    abertura,
    "",
    `Login: ${p.email}`,
    `Senha provisória: ${p.senha}`,
    "",
    `Acesse: ${SITE}`,
    "",
    "No primeiro acesso, o Pulsar vai pedir para você criar a sua própria senha.",
    "Se você não esperava este e-mail, pode ignorá-lo.",
  ].join("\n");
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f4f2;font-family:Arial,Helvetica,sans-serif;color:#1a1a19">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f2;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:28px">
<tr><td style="font-size:22px;font-weight:bold;letter-spacing:3px;padding-bottom:16px">PULS<span style="color:#F57C00">AR</span></td></tr>
<tr><td style="font-size:16px;line-height:1.5;padding-bottom:8px">Olá${primeiroNome ? `, ${escapar(primeiroNome)}` : ""}!</td></tr>
<tr><td style="font-size:16px;line-height:1.5;padding-bottom:20px">${abertura}</td></tr>
<tr><td style="background:#f4f4f2;border-radius:8px;padding:16px;font-size:15px;line-height:1.8">
<div><span style="color:#6b6b66">Login:</span> <strong>${escapar(p.email)}</strong></div>
<div><span style="color:#6b6b66">Senha provisória:</span> <strong style="font-family:Consolas,monospace;font-size:16px">${escapar(p.senha)}</strong></div>
</td></tr>
<tr><td align="center" style="padding:24px 0">
<a href="${SITE}" style="display:inline-block;background:#F57C00;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 28px;border-radius:8px">Acessar o Pulsar</a>
</td></tr>
<tr><td style="font-size:14px;line-height:1.5;color:#52514e">No primeiro acesso, o Pulsar vai pedir para você criar a sua própria senha.</td></tr>
<tr><td style="font-size:12px;line-height:1.5;color:#8a8a84;padding-top:16px">Se o botão não abrir, copie este endereço no navegador: ${SITE}<br>Se você não esperava este e-mail, pode ignorá-lo.</td></tr>
</table></td></tr></table></body></html>`;
  try {
    await transporte.sendMail({
      from: { name: "Pulsar", address: Deno.env.get("SMTP_REMETENTE") ?? usuario },
      to: p.email,
      subject: assunto,
      text: texto,
      html,
    });
    return null;
  } catch (e) {
    console.error("envio de e-mail falhou", e);
    return "O servidor de e-mail recusou o envio.";
  }
}

function validarSenha(senha: unknown): string | null {
  if (typeof senha !== "string") return "Informe a senha.";
  if (senha.length < SENHA_MIN) return `A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`;
  if (senha.length > SENHA_MAX) return `A senha pode ter no máximo ${SENHA_MAX} caracteres.`;
  return null;
}

function lerModulos(valor: unknown): Modulo[] | null {
  if (!Array.isArray(valor)) return null;
  if (!valor.every((m) => MODULOS.includes(m))) return null;
  return [...new Set(valor as Modulo[])];
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return erro(405, "Método não permitido.");

    const callerId = ctx.userClaims?.id;
    if (!callerId) return erro(401, "Sessão inválida. Entre novamente.");

    const db = ctx.supabaseAdmin;
    const admin = db.auth.admin;
    // Lê o cadastro atual em vez de confiar no JWT, que pode estar desatualizado.
    const { data: atual, error: atualErr } = await admin.getUserById(callerId);
    if (atualErr || !atual.user) return erro(401, "Sessão inválida. Entre novamente.");
    const ehAdmin = atual.user.app_metadata?.role === "admin";

    let corpo: Corpo;
    try {
      corpo = await req.json();
    } catch {
      return erro(400, "Requisição inválida.");
    }

    if (corpo.acao === "listar") {
      let usuarios = [atual.user];
      if (ehAdmin) {
        const { data, error } = await admin.listUsers({ perPage: 1000 });
        if (error) return erro(500, "Não foi possível carregar os usuários.");
        usuarios = data.users;
      }
      const ids = usuarios.map((u) => u.id);
      const { data: mods, error: modsErr } = await db.from("modulos_usuario").select("user_id, modulo").in("user_id", ids);
      if (modsErr) return erro(500, "Não foi possível carregar os módulos.");
      const agora = Date.now();
      return Response.json({
        admin: ehAdmin,
        email_configurado: ehAdmin && smtpConfigurado(),
        usuarios: usuarios
          .map((u) => ({
            id: u.id,
            email: u.email ?? "",
            nome: (u.user_metadata?.full_name as string | undefined) ?? null,
            ultimo_acesso: u.last_sign_in_at ?? null,
            criado_em: u.created_at,
            admin: u.app_metadata?.role === "admin",
            bloqueado: !!u.banned_until && new Date(u.banned_until).getTime() > agora,
            modulos: (mods ?? []).filter((m) => m.user_id === u.id).map((m) => m.modulo),
          }))
          .sort((a, b) => a.email.localeCompare(b.email)),
      });
    }

    // Tudo daqui para baixo é só para administradores.
    if (!ehAdmin) return erro(403, "Apenas administradores podem fazer isso.");

    if (corpo.acao === "criar") {
      const email = (corpo.email ?? "").trim().toLowerCase();
      const nome = (corpo.nome ?? "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erro(400, "E-mail inválido.");
      if (!nome) return erro(400, "Informe o nome.");
      const senhaErr = validarSenha(corpo.senha);
      if (senhaErr) return erro(400, senhaErr);
      const modulos = lerModulos(corpo.modulos);
      if (!modulos) return erro(400, "Módulos inválidos.");

      const { data, error } = await admin.createUser({
        email,
        password: corpo.senha as string,
        email_confirm: true,
        user_metadata: { full_name: nome, trocar_senha: true },
      });
      if (error || !data.user) {
        if (error?.code === "email_exists") return erro(409, "Já existe um usuário com esse e-mail.");
        if (error?.code === "weak_password") return erro(400, "Senha fraca. Use letras, números e símbolos.");
        return erro(400, "Não foi possível criar o usuário.");
      }
      if (modulos.length > 0) {
        const { error: modErr } = await db.from("modulos_usuario")
          .insert(modulos.map((modulo) => ({ user_id: data.user.id, modulo })));
        if (modErr) {
          // Sem os módulos a conta ficaria pela metade: desfaz.
          await admin.deleteUser(data.user.id);
          return erro(500, "Não foi possível liberar os módulos. O usuário não foi criado.");
        }
      }
      // A conta fica criada mesmo se o e-mail falhar: o administrador ainda pode copiar os dados.
      const emailErro = corpo.enviar_email
        ? await enviarAcesso({ email, nome, senha: corpo.senha as string, novo: true })
        : null;
      return Response.json({
        ok: true, id: data.user.id, email_enviado: !!corpo.enviar_email && !emailErro, email_erro: emailErro,
      });
    }

    // As ações abaixo agem sobre uma conta existente.
    const alvo = corpo.user_id;
    if (typeof alvo !== "string") return erro(400, "Requisição inválida.");
    const { data: alvoDados, error: alvoErr } = await admin.getUserById(alvo);
    if (alvoErr || !alvoDados.user) return erro(404, "Usuário não encontrado.");

    if (corpo.acao === "modulos") {
      const modulos = lerModulos(corpo.modulos);
      if (!modulos) return erro(400, "Módulos inválidos.");
      const tirar = MODULOS.filter((m) => !modulos.includes(m));
      if (tirar.length > 0) {
        const { error } = await db.from("modulos_usuario").delete().eq("user_id", alvo).in("modulo", tirar);
        if (error) return erro(500, "Não foi possível alterar os módulos.");
      }
      if (modulos.length > 0) {
        const { error } = await db.from("modulos_usuario")
          .upsert(modulos.map((modulo) => ({ user_id: alvo, modulo })), { ignoreDuplicates: true });
        if (error) return erro(500, "Não foi possível alterar os módulos.");
      }
      return Response.json({ ok: true });
    }

    if (corpo.acao === "trocar_senha") {
      if (alvo === callerId) {
        return erro(400, "Para alterar a sua própria senha, use o menu do seu usuário.");
      }
      const senhaErr = validarSenha(corpo.senha);
      if (senhaErr) return erro(400, senhaErr);
      // Senha dada pelo administrador é provisória: a pessoa cria a dela no próximo acesso.
      const { error } = await admin.updateUserById(alvo, {
        password: corpo.senha as string,
        user_metadata: { trocar_senha: true },
      });
      if (error) {
        if (error.code === "weak_password") return erro(400, "Senha fraca. Use letras, números e símbolos.");
        return erro(400, "Não foi possível alterar a senha.");
      }
      const emailErro = corpo.enviar_email
        ? await enviarAcesso({
          email: alvoDados.user.email ?? "",
          nome: (alvoDados.user.user_metadata?.full_name as string | undefined) ?? "",
          senha: corpo.senha as string,
          novo: false,
        })
        : null;
      return Response.json({ ok: true, email_enviado: !!corpo.enviar_email && !emailErro, email_erro: emailErro });
    }

    if (corpo.acao === "bloquear") {
      if (alvo === callerId) return erro(400, "Você não pode bloquear a sua própria conta.");
      const { error } = await admin.updateUserById(alvo, { ban_duration: corpo.bloquear ? BLOQUEIO : "none" });
      if (error) return erro(400, "Não foi possível alterar o bloqueio.");
      return Response.json({ ok: true });
    }

    if (corpo.acao === "excluir") {
      if (alvo === callerId) return erro(400, "Você não pode excluir a sua própria conta.");
      if (alvoDados.user.app_metadata?.role === "admin") return erro(400, "Não é possível excluir um administrador.");
      // Os dados da pessoa saem junto (user_id ligado a auth.users com cascade).
      const { error } = await admin.deleteUser(alvo);
      if (error) return erro(400, "Não foi possível excluir o usuário.");
      return Response.json({ ok: true });
    }

    return erro(400, "Ação desconhecida.");
  }),
};
