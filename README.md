# Sistema Pulsar

Painel de gestão (Financeiro, Comercial e Marketing) em React + TanStack Router + Supabase.
O site é estático (SPA) e fica hospedado na Hostinger. Banco e autenticação ficam no Supabase.

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

O `.htaccess` faz as rotas internas (ex.: `/financeiro/cartoes`) abrirem direto
pelo link ou após recarregar a página.

## Aplicativo (PWA)

O sistema pode ser instalado como aplicativo (Android, iPhone e computador) a partir do
próprio site. A configuração fica no `VitePWA` do `vite.config.ts`, e os ícones em `public/`.

- Cada `npm run build` gera um `sw.js` novo. Quem estiver com o app aberto recebe o aviso
  "Nova versão do Pulsar disponível" e atualiza com um clique (`src/components/atualizacao-app.tsx`).
- Ao publicar, envie **todo** o conteúdo de `dist/` (inclui `sw.js`, `manifest.webmanifest`,
  `workbox-*.js` e os ícones). Envie o `index.html` por último.
- Os dados do Supabase não ficam em cache no aparelho; só a tela do sistema.

## Supabase (Authentication > URL Configuration)

- **Site URL**: o domínio da Hostinger (ex.: `https://seudominio.com.br`).
- **Redirect URLs**: adicione o mesmo domínio e `http://localhost:5173` para desenvolvimento.
- O acesso é só por e-mail e senha, sem cadastro pelo site. O login com Google e o
  cadastro foram retirados de propósito: mantenha o provedor Google desligado em
  **Authentication > Providers** e "Allow new users to sign up" desligado em
  **Authentication > Sign In / Providers**. Usuários novos são criados em
  **Authentication > Users > Add user**.
- A tela **Configurações > Usuários** troca senhas pela Edge Function `usuarios`.
  Quem tem `"role": "admin"` no `app_metadata` vê e altera todos os usuários; os demais,
  só a própria senha. Para publicar a função: `supabase functions deploy usuarios`.

## Estrutura

- `src/routes/` — telas (cada arquivo é uma rota; `routeTree.gen.ts` é gerado automaticamente).
- `src/lib/data-store.tsx` — carregamento e gravação dos dados no Supabase.
- `supabase/migrations/` — histórico do schema do banco.
- `supabase/functions/` — Edge Functions (rodam no Supabase, não na Hostinger).
- `docs/` — anotações de planejamento.
