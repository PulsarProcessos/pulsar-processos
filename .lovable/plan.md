## Objetivo

Permitir quitar a fatura do cartão de crédito com um clique, registrando uma transferência da conta bancária escolhida para o cartão, deixando a fatura em R$ 0,00.

## Contexto atual

- Cada cartão (ex.: Cartão Inter) tem um saldo calculado por `saldoBanco` somando lançamentos pagos + transferências.
- Para cartão, `fatura = -saldo` (ex.: saldo −216,21 → fatura 216,21 devendo).
- Hoje, para pagar a fatura, é preciso ir em "Nova Transferência" e escolher manualmente origem (Banco Inter) → destino (Cartão Inter). Não fica claro que essa é a forma correta, e a tendência foi inverter a direção, fazendo a fatura aumentar.

## Mudanças

### 1. Botão "Pagar fatura" no card do cartão
Em `src/routes/financeiro.lancamentos.tsx`, na grade de saldos (linhas ~346‑370), quando `b.tipo === "Cartao"` e a fatura for > 0, exibir um pequeno botão "Pagar fatura" abaixo do valor.

### 2. Diálogo de pagamento de fatura
Ao clicar, abrir um Dialog com:
- **Conta de origem** (Select de bancos `tipo === "Conta"`, default = primeira conta).
- **Valor** (pré-preenchido com o valor da fatura; permite editar para pagamento parcial).
- **Data** (default hoje).
- **Descrição** (default: "Pagamento fatura {nome do cartão}").
- Botões: Cancelar / Confirmar pagamento.

Ao confirmar: chama `addTransferencia({ data, bancoOrigemId, bancoDestinoId: cartão.id, valor, descricao })`.
Toast: "Fatura paga · Lançamento Salvo".
Fecha o diálogo e a fatura recalcula automaticamente (cai para 0 ou para o saldo restante).

### 3. Texto auxiliar no card
Trocar o subtítulo do cartão de `Fatura · venc. dia X` para algo mais claro quando há fatura aberta: `Fatura aberta · venc. dia X` e quando fatura = 0: `Fatura quitada · venc. dia X`.

## Não muda
- Modelo de dados (sem migration).
- Cálculo de `saldoBanco` (a lógica atual já está correta: transferência conta → cartão reduz a fatura).
- Fluxo de "Nova Transferência" existente continua funcionando.

## Observação
O comportamento "estava aumentando a fatura" provavelmente vinha de a transferência ter sido feita na direção inversa (Cartão → Inter). O botão dedicado elimina essa ambiguidade porque o destino é sempre o cartão.
