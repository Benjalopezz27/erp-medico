import { useMutation } from '@tanstack/react-query';
import { postResolveUnknownSkuApi } from '../api/importer.api';
import type { IResolveUnknownSkuPayload } from '../types/importer.types';

export function useResolveUnknownSkuMutation() {
  return useMutation<any, Error, IResolveUnknownSkuPayload>({
    mutationFn: (payload) => postResolveUnknownSkuApi(payload),
  });
}
