import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../constants/auth.constants';

/** Opts a route out of the global JWT guard. Everything else requires a valid token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
