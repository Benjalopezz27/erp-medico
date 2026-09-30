export const paymentsKeys = {
  all: ['payments'] as const,
  receipt: (id: string) => [...paymentsKeys.all, 'receipt', id] as const,
};
