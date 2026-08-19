import { useMutation } from '@tanstack/react-query';
import { loginRequest } from '../api/auth.api';

export function useLoginMutation() {
  return useMutation({ mutationFn: loginRequest });
}
