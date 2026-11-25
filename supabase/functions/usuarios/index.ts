import { withSupabase } from "npm:@supabase/server@1.9.2";

// Módulo Administração: criar pessoas (login e senha), liberar módulos, trocar senha, bloquear
// e excluir. Só administradores (app_metadata.role = "admin") fazem isso; quem não é
// administrador só consegue listar a própria conta.
// A própria senha é trocada no app com auth.updateUser: pela rota de administrador o Supabase
// encerraria também a sessão de quem está trocando.
// O administrador não vê os dados das pessoas (lançamentos etc.): as regras do banco valem para
// ele também. Aqui ele só enxerga e-mail, nome, módulos e situação da conta.

const SENHA_MIN = 8;
// Limite do bcrypt usado pelo Supabase Auth.
const SENHA_MAX = 72;
const MODULOS = ["empreendedor", "pessoal"] as const;
type Modulo = (typeof MODULOS)[number];
const BLOQUEIO = "876000h"; // ~100 anos: bloqueado até ser desbloqueado.

type Corpo = {
  acao?: string;
  user_id?: string;
  senha?: string;
  email?: string;
  nome?: string;
  modulos?: unknown;
  bloquear?: boolean;
};

function erro(status: number, mensagem: string) {
  return Response.json({ erro: mensagem }, { status });
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
        user_metadata: { full_name: nome },
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
      return Response.json({ ok: true, id: data.user.id });
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
      const { error } = await admin.updateUserById(alvo, { password: corpo.senha as string });
      if (error) {
        if (error.code === "weak_password") return erro(400, "Senha fraca. Use letras, números e símbolos.");
        return erro(400, "Não foi possível alterar a senha.");
      }
      return Response.json({ ok: true });
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
