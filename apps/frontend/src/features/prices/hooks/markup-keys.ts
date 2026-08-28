export const markupKeys = {
  all: ['markups'] as const,
  lists: () => [...markupKeys.all, 'list'] as const,
  simulations: () => [...markupKeys.all, 'simulation'] as const,
  simulation: (productId: string) => [...markupKeys.simulations(), productId] as const,
};
