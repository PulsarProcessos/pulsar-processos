# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Contexto

Pulsar é um sistema de gestão vendido para várias pessoas: React 19 + Vite (SPA estática na
Hostinger) + Supabase (banco, auth, Edge Functions). O dono do projeto (Alan) não é técnico:
**responda sempre em português do Brasil, em linguagem simples**, e mostre o resultado na prévia
antes de publicar. O e-mail dele para qualquer coisa do Pulsar é `alansilveira@pulsarprocessos.com.br`.

**Regra principal do produto: uma pessoa nunca pode ver nem receber nada de outra.** Toda mudança
em tabela, função, notificação ou cache precisa preservar isso.

## Comandos

```bash
npm run dev          # prévia em http://localhost:5173 (também a tarefa "Pulsar: abrir prévia" do editor)
npm run build        # gera dist/ e regenera src/routeTree.gen.ts
npm run typecheck    # tsc --noEmit — deve ficar com 0 erros
npx eslint <arquivos> --rule "prettier/prettier: off"
```

- Não há testes automatizados. Verifique com `typecheck`, `build` e testes reais: usuários
  temporários criados pela Admin API (sempre apagados no fim) e telas abertas no Edge invisível
  (puppeteer-core) em `http://localhost:5173`.
- `npm run lint` acusa erros antigos de formatação (CRLF/prettier) e `any` no projeto todo; rode o
  ESLint só nos arquivos alterados, desligando a regra do prettier.
- `http://localhost:5173/preview/celular.html` mostra o app numa moldura de celular (só no dev);
  o aparelho escolhido simula iPhone/Android pelo `sessionStorage`.
- Service worker e notificações só existem no build: para testá-los use `npx vite preview`.

## Arquitetura

### Rotas e módulos
- Roteamento por arquivos (TanStack Router): `src/routes/*.tsx`, `routeTree.gen.ts` é gerado (não editar).
  O plugin do Vite também reescreve o caminho em `createFileRoute(...)` quando um arquivo é renomeado.
- `/` é a tela Início (cartões dos módulos). Cada módulo tem uma rota de layout que envolve as filhas:
  `empreendedor.tsx` (`/empreendedor/...`), `pessoal.tsx` (`/pessoal/...`), `admin.tsx` (`/admin`).
- `src/components/modulo-layout.tsx` confere o acesso **antes** de montar o provider de dados do
  módulo, desenha menu lateral + cabeçalho e manda quem não é admin de volta ao Início sem mencionar
  a Administração. Menus, cores e títulos de tela vêm de `src/lib/modulos.ts`.
- Cada módulo segue uma **linha de raciocínio** (pedido do Alan: o sistema precisa dizer o que vem
  primeiro). O menu é feito de partes (`SecaoMenu`) nessa ordem: Empreendedor = Marketing (atrair) →
  Comercial (vender) → Financeiro (receber e ver o lucro), como grupos que abrem e fecham; Pessoal =
  Onde estou → Meu mês → Para onde vou, com os itens soltos. Sem números nem subtítulos no menu
  lateral (o Alan achou feio o menu todo aberto com "1, 2"); o caminho numerado aparece só nas telas
  de entrada (Visão geral e Meu caminho), com "O que fazer agora". As telas terminam com
  `<ProximoPasso>` apontando a seguinte. Tela nova entra na parte certa e ganha o seu próximo passo.
- Pontes entre as partes: lead "Convertido" cria oportunidade no funil; negócio que vai para uma etapa
  de venda ganha (`ehEtapaGanha`, em `data-store.tsx`) abre `ReceitaDoNegocio` para lançar a receita
  no Extrato. No Pessoal, a antiga tela Lançamentos foi juntada ao Dia a dia (`/pessoal/lancamentos`
  só redireciona).
- `src/components/auth-gate.tsx`: login, `useSessao()`, limpa o cache do React Query e volta ao
  Início quando muda a pessoa no aparelho, e descarta assinatura de push de outra pessoa.

### Dados no front
- Empreendedor: `src/lib/data-store.tsx` (Context, carrega todas as tabelas da empresa).
- Pessoal: `src/lib/pessoal-store.tsx` (Context). `linhasDoMes()`/`rendaDoMes()` são a regra única
  do mês (lançamentos + parcelas + contas fixas não pagas) usada por Movimentações e pelo Painel.
- Agenda, Administração e notificações usam React Query / chamadas diretas a Edge Functions
  (`src/lib/agenda.ts`, `src/lib/usuarios.ts`, `src/lib/notificacoes.ts`).
- Tabelas que não estão em `src/integrations/supabase/types.ts` são acessadas com
  `(supabase.from as any)("tabela")` — é o padrão do projeto.
- Datas do banco são colunas `date` e chegam como texto `AAAA-MM-DD`. Compare como texto e mostre com
  `formatarData()`; para "hoje" use `hojeISO()` (ambos em `pessoal-store.tsx`, funções puras). Não use
  `new Date("AAAA-MM-DD")` (lê em UTC e no Brasil vira o dia anterior) nem `toISOString().slice(0,10)`
  (depois das 21h dá o dia seguinte). O banco recusa `"25/11"`: formulários usam `<Input type="date">`.
- Dinheiro: `brl()` de `pessoal-store.tsx` (sempre 2 casas). `toLocaleString("pt-BR")` puro mostra
  "R$ 1.250,9".
- Gráficos (recharts 2): `Bar`, `Line` e `Pie` não apareciam com a animação de entrada (só eixos e
  legenda), no dev e no build; use `isAnimationActive={false}`. As `Area` do Painel Pessoal funcionam.

### Celular
- Padrão das listas: no celular (`md:hidden`) um cartão por linha com situação, valor e botões à vista;
  a `<Table>` fica em `hidden md:block`. Partes da linha desenhadas uma vez e usadas nos dois (ex.:
  `acoes(l)` em Movimentações, `itens` no Extrato). Colunas secundárias: `hidden sm:table-cell` e o dado
  vai para baixo do nome.
- Margem dos cartões vem de `--card-pad` (`styles.css`): 1rem no celular, 1.5rem do `sm` para cima.
- Linhas dentro de cartões que ficam lado a lado no computador usam consulta de contêiner
  (`@container` + `@lg:`), não `sm:`/`md:` (ex.: Dinheiro e Contas).
- Tabelas largas de propósito (Demonstrativo, DRE do Painel) rolam de lado com a 1ª coluna `sticky`.
- Filhos de `grid` com tabela precisam de `min-w-0`, senão empurram a página além da tela.

### Banco (Supabase) e isolamento
- Migrations em `supabase/migrations/`. A `20261124120000_modulos_e_isolamento.sql` define o modelo:
  - toda tabela tem RLS `to authenticated` com `(select auth.uid()) = user_id` **e**
    `(select private.tem_modulo('<empreendedor|pessoal>'))` (bloqueio de conta vale na hora);
  - ligações entre tabelas são FKs compostas `(x_id, user_id) → (id, user_id)`; para `set null` use
    `on delete set null (coluna)`;
  - `user_id` referencia `auth.users` com `on delete cascade`; `anon` não tem permissão em nada.
  - Tabela nova: siga o mesmo padrão (RLS, 4 políticas, FK composta, índice em `user_id`,
    revogar `anon`). Tabelas só de servidor (`agenda_google`) ficam sem políticas.
- Tabelas antigas da empresa exigem `user_id` explícito no insert; as `pessoal_*`, `push_assinaturas`
  e `modulos_usuario` têm `default auth.uid()`.
- Dívidas: `pessoal_salvar_divida()` (security invoker) gera as parcelas como linhas em
  `pessoal_lancamentos`; editar recalcula todas as parcelas mantendo o status de pago.
- Admin = `app_metadata.role = "admin"` (nunca `user_metadata`). Módulos liberados em `modulos_usuario`.

### Edge Functions (`supabase/functions/`, usam `npm:@supabase/server@1.9.2`)
- `usuarios` (verify_jwt true): módulo Administração. Trocar a **própria** senha é no front com
  `auth.updateUser` — pela rota de admin o Supabase derruba também a sessão de quem troca.
- `agenda` (verify_jwt false; GET é o retorno OAuth com `state` assinado): Google Agenda com escopo
  `calendar.app.created`; os compromissos ficam só no Google; exige o módulo Empreendedor.
- `notificacoes` (verify_jwt false): Web Push (`web-push@3.6.7`); `{acao:"teste"}` com login e
  `{acao:"diario"}` via `pg_cron` às 11h UTC com cabeçalho `x-pulsar-cron`. `public/push-sw.js` entra no
  service worker por `workbox.importScripts`.
- Segredos das funções: `AGENDA_CHAVE`, `GOOGLE_CLIENT_ID/SECRET`, `VAPID_PUBLIC_KEY/PRIVATE_KEY`,
  `NOTIFICACOES_TOKEN` (+ Vault `pulsar_notificacoes_token`). Não regenere chaves já em uso.

### PWA
- `vite-plugin-pwa` com `registerType: "prompt"`: o app avisa "Nova versão disponível"
  (`atualizacao-app.tsx`). Páginas soltas em `public/` (ex. `privacidade.html`) precisam entrar em
  `navigateFallbackDenylist`.

## Banco e publicação na prática

- O conector MCP do Supabase pode não estar disponível, e o `apply_migration` dele recusa SQL com
  `delete`/`revoke`. Com o OK do Alan, aplique pela Management API
  (`POST /v1/projects/bhugzynquxcmkvfvenla/database/query`, token em `SUPABASE_ACCESS_TOKEN`) dentro de
  `begin; ... commit;` e registre a versão em `supabase_migrations.schema_migrations`. Funções:
  `POST /v1/projects/<ref>/functions/deploy?slug=<nome>` (multipart).
- Chamadas à Admin API pelo PowerShell precisam de `-UserAgent` próprio (o padrão parece navegador e a
  chave secreta é recusada). Corpos com acento: envie bytes UTF-8.
- Publicar: `npm run build`, empacotar **todo** o `dist/` (listando os itens, sem a entrada `.`),
  enviar por `scp`/`ssh` para o host `hostinger-devalor`, pasta
  `domains/devalorepulsar.com.br/public_html/pulsar`. Ordem: `assets/`, demais arquivos, `sw.js`,
  `index.html` por último; depois `chmod 755` nas pastas e só então apagar arquivos antigos.
- O `.htaccess` da pasta-pai tem um CSP com `connect-src 'none'`; o `public/.htaccess` do Pulsar usa
  `Header set` (não `always set`) para sobrescrevê-lo. Ao chamar um domínio novo, inclua-o no CSP.
- Commits vão direto na `main`, em português; publicar e commitar só com o OK do Alan.
