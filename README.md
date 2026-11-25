# Sistema Pulsar

Sistema de gestão em React + TanStack Router + Supabase, usado por várias pessoas.
O site é estático (SPA) e fica hospedado na Hostinger. Banco e autenticação ficam no Supabase.

## Módulos e acesso

Depois do login, a tela **Início** mostra um cartão para cada módulo liberado para a pessoa:

| Módulo | Rotas | Conteúdo |
|---|---|---|
| Empreendedor | `/empreendedor/...` | Visão geral, Agenda, Financeiro, Comercial, Marketing |
| Pessoal | `/pessoal/...` | Painel (DRE do ano, evolução de entradas e gastos, 5 maiores gastos), Movimentações, Lançamentos, Dinheiro e Contas, Dívidas, Categorias |
| Administração | `/admin` | Usuários: criar login e senha, liberar módulos, bloquear, excluir |

- Os módulos de cada pessoa ficam em `modulos_usuario`; menus e cores em `src/lib/modulos.ts`.
- Cada módulo tem uma moldura (`src/components/modulo-layout.tsx`) que confere o acesso antes de
  carregar qualquer dado. Administração é para quem tem `"role": "admin"` no `app_metadata`.
- **Isolamento entre pessoas** (migration `modulos_e_isolamento`): toda tabela exige
  `user_id = auth.uid()` **e** o módulo liberado (`private.tem_modulo`); usuário bloqueado perde
  o acesso na hora; ligações entre tabelas incluem o dono (`(id, user_id)`), então o banco recusa
  apontar para registro de outra pessoa; excluir uma pessoa apaga todos os dados dela.
  Nem o administrador enxerga os dados das outras pessoas.
- Trocar de pessoa no mesmo aparelho limpa a memória do app (`src/components/auth-gate.tsx`).

## Rodar localmente

```bash
cp .env.example .env   # preencha com os dados do Supabase
npm install
npm run dev
```

## Publicar na Hostinger

1. `npm run build` gera a pasta `dist/`.
2. No hPanel, abra **Gerenciador de Arquivos** do domínio e entre em `public_html/`.
3. Apague o conteúdo antigo e envie **o conteúdo** de `dist/` (não a pasta em si),
   incluindo o arquivo oculto `.htaccess`.
4. Ative o SSL do domínio no hPanel (o `.htaccess` já redireciona para HTTPS).

O `.htaccess` faz as rotas internas (ex.: `/empreendedor/financeiro/cartoes`) abrirem direto
pelo link ou após recarregar a página.

## Aplicativo (PWA)

O sistema pode ser instalado como aplicativo (Android, iPhone e computador) a partir do
próprio site. A configuração fica no `VitePWA` do `vite.config.ts`, e os ícones em `public/`.

- Cada `npm run build` gera um `sw.js` novo. Quem estiver com o app aberto recebe o aviso
  "Nova versão do Pulsar disponível" e atualiza com um clique (`src/components/atualizacao-app.tsx`).
- Ao publicar, envie **todo** o conteúdo de `dist/` (inclui `sw.js`, `manifest.webmanifest`,
  `workbox-*.js` e os ícones). Envie o `index.html` por último.
- Os dados do Supabase não ficam em cache no aparelho; só a tela do sistema.
- **Usar no celular** (menu da conta e tela Início): passo a passo para instalar e para ligar
  as notificações (`src/components/guia-celular.tsx`).

## Notificações (Web Push)

- Cada aparelho que liga as notificações fica em `push_assinaturas` (só a própria pessoa vê).
- O `public/push-sw.js` é incluído no service worker (`workbox.importScripts`) e mostra os avisos.
- A Edge Function `notificacoes` envia: o teste (com login) e o aviso diário, chamado pelo
  `pg_cron` às 8h de Brasília com o cabeçalho `x-pulsar-cron` (token no Vault
  `pulsar_notificacoes_token` e no segredo `NOTIFICACOES_TOKEN`). Avisa o que vence no dia,
  só dos módulos liberados e nunca para conta bloqueada.
- Chaves VAPID: a pública está em `src/lib/notificacoes.ts`; a privada só no segredo
  `VAPID_PRIVATE_KEY` das funções. Trocar as chaves obriga todos a ativar de novo.
- Aparelho com mais de uma pessoa: ao sair, as notificações do aparelho são desligadas; ao
  entrar, uma assinatura de outra pessoa é descartada. No iPhone, só funciona com o app instalado.

## Supabase (Authentication > URL Configuration)

- **Site URL**: o domínio da Hostinger (ex.: `https://seudominio.com.br`).
- **Redirect URLs**: adicione o mesmo domínio e `http://localhost:5173` para desenvolvimento.
- O acesso é só por e-mail e senha, sem cadastro pelo site. O login com Google e o
  cadastro foram retirados de propósito: mantenha o provedor Google desligado em
  **Authentication > Providers** e "Allow new users to sign up" desligado em
  **Authentication > Sign In / Providers**. Usuários novos são criados no módulo
  **Administração** do próprio sistema.
- O módulo Administração usa a Edge Function `usuarios` (criar, liberar módulos, trocar senha,
  bloquear, excluir). Cada pessoa troca a própria senha pelo menu da conta (bolinha com as
  iniciais). Para publicar a função: `supabase functions deploy usuarios`.

## Estrutura

- `src/routes/` — telas (cada arquivo é uma rota; `routeTree.gen.ts` é gerado automaticamente).
- `src/lib/data-store.tsx` — carregamento e gravação dos dados no Supabase.
- `supabase/migrations/` — histórico do schema do banco.
- `supabase/functions/` — Edge Functions (rodam no Supabase, não na Hostinger).
- `docs/` — anotações de planejamento.
