import { withSupabase } from "npm:@supabase/server@1.9.2";

// Lista usuários e troca senhas de outros usuários pela tela de Configurações.
// Administradores (app_metadata.role = "admin") veem todos e alteram a senha dos outros;
// os demais veem apenas a própria conta.
// A própria senha é trocada no app com auth.updateUser: pela rota de administrador o
// Supabase encerraria também a sessão de quem está trocando.

const SENHA_MIN = 8;
// Limite do bcrypt usado pelo Supabase Auth.
const SENHA_MAX = 72;

type Corpo = { acao?: string; user_id?: string; senha?: string };

function erro(status: number, mensagem: string) {
  return Response.json({ erro: mensagem }, { status });
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return erro(405, "Método não permitido.");

    const callerId = ctx.userClaims?.id;
    if (!callerId) return erro(401, "Sessão inválida. Entre novamente.");

    const admin = ctx.supabaseAdmin.auth.admin;
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
      return Response.json({
        admin: ehAdmin,
        usuarios: usuarios
          .map((u) => ({
            id: u.id,
            email: u.email ?? "",
            nome: (u.user_metadata?.full_name as string | undefined) ?? null,
            ultimo_acesso: u.last_sign_in_at ?? null,
          }))
          .sort((a, b) => a.email.localeCompare(b.email)),
      });
    }

    if (corpo.acao === "trocar_senha") {
      const { user_id, senha } = corpo;
      if (typeof user_id !== "string" || typeof senha !== "string") {
        return erro(400, "Requisição inválida.");
      }
      if (senha.length < SENHA_MIN) {
        return erro(400, `A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`);
      }
      if (senha.length > SENHA_MAX) {
        return erro(400, `A senha pode ter no máximo ${SENHA_MAX} caracteres.`);
      }
      if (user_id === callerId) {
        return erro(400, "Para alterar a sua própria senha, atualize a página e tente de novo.");
      }
      if (!ehAdmin) {
        return erro(403, "Apenas administradores podem alterar a senha de outros usuários.");
      }

      const { error } = await admin.updateUserById(user_id, { password: senha });
      if (error) {
        if (error.code === "weak_password") {
          return erro(400, "Senha fraca. Use letras, números e símbolos.");
        }
        if (error.code === "user_not_found") return erro(404, "Usuário não encontrado.");
        return erro(400, "Não foi possível alterar a senha.");
      }
      return Response.json({ ok: true });
    }

    return erro(400, "Ação desconhecida.");
  }),
};
