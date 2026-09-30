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

## Supabase (Authentication > URL Configuration)

- **Site URL**: o domínio da Hostinger (ex.: `https://seudominio.com.br`).
- **Redirect URLs**: adicione o mesmo domínio e `http://localhost:5173` para desenvolvimento.
- Login com Google: em **Authentication > Providers > Google**, informe o Client ID e o
  Client Secret criados no Google Cloud Console. No Google, a URL de retorno autorizada é
  `https://<id-do-projeto>.supabase.co/auth/v1/callback`.

## Estrutura

- `src/routes/` — telas (cada arquivo é uma rota; `routeTree.gen.ts` é gerado automaticamente).
- `src/lib/data-store.tsx` — carregamento e gravação dos dados no Supabase.
- `supabase/migrations/` — histórico do schema do banco.
- `docs/` — anotações de planejamento.
