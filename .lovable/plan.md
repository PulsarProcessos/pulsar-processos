## Diagnóstico

Encontrei os problemas:

1. **Usuários no banco** — A tabela `auth.users` é gerenciada automaticamente pelo Lovable Cloud (não aparece como tabela normal, mas existe). Seu cadastro via Google está lá. O que falta é uma tabela `profiles` para armazenar dados extras do usuário (nome, avatar etc).

2. **Dados não salvam no banco** — Esse é o problema central. O `data-store.tsx` atual salva **tudo no localStorage do navegador**, não no banco. As tabelas existem no banco (categorias, contatos, lançamentos etc), mas o código nunca conversa com elas. Por isso nada aparece no banco.

3. **Tabelas faltando no banco** — `bancos`, `produtos` e `etapas` (do pipeline) ainda não existem como tabelas no banco. Vou criá-las.

4. **Transferências** — Funcionalidade nova: lançar saída de um banco e entrada em outro de forma atômica.

5. **Sidebar recolhida** — Logo e textos precisam se adaptar quando o sidebar está em modo `collapsed=icon`.

## Plano

### 1. Banco de dados (migração)
- Criar tabela **`profiles`** (id, user_id, display_name, avatar_url) + trigger para popular automaticamente no signup.
- Criar tabela **`bancos`** (nome, agência, conta, saldo_inicial).
- Criar tabela **`produtos`** (nome, preço, descrição).
- Criar tabela **`etapas_pipeline`** (nome, ordem) por usuário.
- Criar tabela **`transferencias`** (banco_origem_id, banco_destino_id, valor, data, descrição).
- Adicionar colunas que faltam em `lancamentos` (`banco_id`) e `deals` (`produto_id`).
- Todas com RLS por `user_id` (mesmo padrão das existentes).

### 2. Refazer `data-store.tsx`
Substituir o backend localStorage por chamadas Supabase reais usando React Query:
- Cada entidade vira hooks `useQuery` + `useMutation`.
- Carregamento inicial busca do banco filtrado por `auth.uid()`.
- Inserts/updates/deletes vão direto pro banco.
- Mantém a mesma API (`addContato`, `updateLancamento` etc) para não quebrar as telas.

### 3. Transferências
- Adicionar item "Transferências" na tela de Lançamentos com um botão "Nova Transferência".
- Modal pedindo: banco origem, banco destino, valor, data, descrição.
- Ao salvar: cria 1 registro em `transferencias` e atualiza saldo dos dois bancos automaticamente (via cálculo, igual ao `saldoBanco` atual).
- Listar transferências junto com lançamentos ou em aba separada.

### 4. Sidebar responsiva
- Ajustar `app-sidebar.tsx`: quando `collapsed`, reduzir o container do logo (de `h-10 w-10` para `h-7 w-7`), centralizar, esconder o bloco de texto suavemente.
- Garantir que os ícones do menu fiquem centralizados sem padding extra no estado recolhido.

## Observações técnicas
- Toda escrita/leitura passa a respeitar RLS — só o usuário logado vê os próprios dados.
- A migração de localStorage para o banco significa que dados antigos salvos só no navegador **não migram automaticamente** (o localStorage atual fica órfão). Posso adicionar um botão de "importar dados locais" se quiser, mas por padrão começaremos limpo no banco.
- Vou usar `@tanstack/react-query` que já está no projeto para cache.

Posso prosseguir?