// Estrutura preparada para o próximo módulo (cadastro de veículos).
// Cada veículo será vinculado a um cliente através de `clienteId`.
export interface Veiculo {
  id: string;
  clienteId: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: string;
}

export function getVeiculosDoCliente(_clienteId: string): Veiculo[] {
  return [];
}
