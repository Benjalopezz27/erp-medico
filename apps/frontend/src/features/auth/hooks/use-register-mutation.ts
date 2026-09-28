import { useMutation } from '@tanstack/react-query';
import { registerRequest } from '../api/auth.api';

export function useRegisterMutation() {
  return useMutation({ mutationFn: registerRequest });
}
