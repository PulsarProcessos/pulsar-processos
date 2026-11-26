// Cores dos destinos da divisão da renda (paleta categórica validada para daltonismo, nesta ordem
// fixa). A cor segue o destino pela posição na divisão (ordem), nunca pelo tamanho; a mesma em
// todas as telas. Do 9º destino em diante, cinza.
export const CORES_DESTINOS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
export const COR_SEM_DESTINO = "#9a9a96";
export const corDoDestino = (posicao: number) => CORES_DESTINOS[posicao] ?? COR_SEM_DESTINO;
