## Objetivo

Criar uma seção dedicada **Cartões** em `/financeiro/cartoes` que mostre a fatura mensal de cada cartão por ciclo de fechamento (igual à imagem de referência), com botão **Informar pagamento** que de fato quita a fatura — separando claramente do conceito de "transferência para liberar limite".

## Conceitos

- **Transferência** (`transferencias`): movimentação genérica entre bancos. A partir de agora, transferências **Conta → Cartão** **não abatem mais a fatura** — servem apenas para registrar o movimento financeiro da conta de origem.
- **Pagamento de fatura** (novo): registro dedicado que (a) sai da conta de origem como despesa e (b) abate a fatura do cartão.
- **Histórico antigo preservado**: transferências já existentes continuam abatendo a fatura (via flag `afeta_fatura=true` no backfill), para não bagunçar os saldos atuais.

## Mudanças no banco (migration)

1. `ALTER TABLE transferencias ADD COLUMN afeta_fatura boolean NOT NULL DEFAULT false` — novas transferências não afetam fatura.
2. `UPDATE transferencias SET afeta_fatura = true` — backfill: tudo que já existe continua contando.
3. Nova tabela `pagamentos_fatura`:
   - `cartao_id` (FK bancos), `conta_origem_id` (FK bancos), `data` (date), `valor` (numeric>0), `descricao` (text, opcional), `competencia_ref` (date — primeiro dia do ciclo, para agrupar à fatura).
   - GRANT para `authenticated` e `service_role`; RLS por `user_id = auth.uid()`; trigger `update_updated_at_column`.

## Mudanças em `src/lib/data-store.tsx`

- `saldoBanco`: ao somar transferências para um cartão, ignorar registros com `afeta_fatura=false`. Pagamentos de fatura entram como: saída na conta origem, entrada (abatimento) no cartão.
- Tipos e CRUD novos: `PagamentoFatura`, `addPagamentoFatura`, `removePagamentoFatura`, `pagamentosFatura` no estado.
- Carregar `pagamentos_fatura` no `loadAll`.
- Helper `ciclosCartao(cartaoId)` que gera lista de ciclos `{ fechamento, vencimento, lancamentos[], pagamentos[], transferencias[], saldoAnterior, totalFatura, statusPago }` a partir de `fechamentoDia`/`vencimentoDia` do cartão e dos lançamentos com `bancoId=cartao`.

## Nova rota `src/routes/financeiro.cartoes.tsx`

Layout inspirado na imagem:

- Topo: `Select` de cartão + botão "Editar conta" (link para cadastros).
- Barra de ações: **Informar pagamento** (verde), **Adicionar lançamento** (azul, abre o dialog já existente pré-filtrado para o cartão), navegador de mês ◀ Mês/Ano ▶.
- 3 cards de resumo: **Saldo anterior** + data de fechamento · **Vencimento** · **Valor da fatura**.
- Tabela de lançamentos do ciclo agrupada por dia, com linha "Saldo final do dia" igual à referência (Data · Descrição · Categoria · Parcela · Valor).
- Abaixo, duas seções colapsáveis:
  - **Pagamentos da fatura** (data, conta origem, valor, descrição, botão remover).
  - **Transferências do ciclo** (lista informativa: origem → destino, valor, descrição; tag indicando se afeta fatura — para registros antigos).

## Dialog "Informar pagamento"

Campos: conta origem (Select de `tipo=Conta`), valor (default = fatura aberta do ciclo atual), data (default hoje), descrição (default "Pagamento fatura {cartão} – {mês/ano}"). Confirmar chama `addPagamentoFatura({ cartaoId, contaOrigemId, valor, data, descricao, competenciaRef })`.

## Menu lateral

Adicionar item **Cartões** em `src/components/app-sidebar.tsx` dentro do grupo Financeiro, com ícone `CreditCard` apontando para `/financeiro/cartoes`.

## Tela atual de Lançamentos

- Remover o botão "Pagar fatura" do card do cartão (substituído pela nova tela).
- Texto do subtítulo do cartão volta a "Fatura · venc. dia X" (sem mais "quitada").

## Não muda

- Conceito de Lançamento, Categorias, Conta corrente.
- Saldos das contas (apenas cartão passa a ignorar transferências novas).
- Histórico de transferências antigas (todas marcadas `afeta_fatura=true`).
