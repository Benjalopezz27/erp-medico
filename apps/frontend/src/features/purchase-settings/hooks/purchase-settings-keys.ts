export const purchaseSettingsKeys = {
  all: ['purchase-settings'] as const,
  detail: () => [...purchaseSettingsKeys.all, 'detail'] as const,
};
