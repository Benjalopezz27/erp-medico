import { useMutation } from '@tanstack/react-query';
import { forgotPasswordRequest, resetPasswordRequest } from '../api/auth.api';

export function useForgotPasswordMutation() {
  return useMutation({ mutationFn: forgotPasswordRequest });
}

export function useResetPasswordMutation() {
  return useMutation({ mutationFn: resetPasswordRequest });
}
