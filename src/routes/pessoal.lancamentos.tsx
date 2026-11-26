import { createFileRoute, redirect } from "@tanstack/react-router";

// A antiga tela Lançamentos foi juntada ao Dia a dia (busca, edição e exclusão ficaram lá).
// O endereço continua existindo para quem tinha salvo o link.
export const Route = createFileRoute("/pessoal/lancamentos")({
  beforeLoad: () => {
    throw redirect({ to: "/pessoal/movimentacoes", replace: true });
  },
});
