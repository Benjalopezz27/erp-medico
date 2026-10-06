import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { MailSendQueueService } from '../queue/services/mail-send.queue';
import { PasswordResetToken } from './entities/password-reset-token.entity';

export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
export const FORGOT_PASSWORD_MESSAGE =
  'If the email exists, we sent a reset link';

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class PasswordRecoveryService {
  constructor(
    private readonly usersService: UsersService,
    private readonly mailQueue: MailSendQueueService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /** Same response whether or not the email belongs to an active user. */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (user?.isActive) {
      const token = randomBytes(32).toString('base64url');
      await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(PasswordResetToken);
        await repo.update(
          { userId: user.id, usedAt: IsNull() },
          { usedAt: new Date() },
        );
        await repo.save(
          repo.create({
            userId: user.id,
            tokenHash: hashToken(token),
            expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
          }),
        );
      });
      await this.mailQueue.enqueue({
        type: 'password-reset',
        to: user.email,
        token,
      });
    }
    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PasswordResetToken);
      const record = await repo.findOne({
        where: {
          tokenHash: hashToken(token),
          usedAt: IsNull(),
          expiresAt: MoreThan(new Date()),
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!record) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      await manager.update(User, record.userId, { passwordHash });
      await repo.update(
        { userId: record.userId, usedAt: IsNull() },
        { usedAt: new Date() },
      );
    });

    return { message: 'Password updated' };
  }
}
