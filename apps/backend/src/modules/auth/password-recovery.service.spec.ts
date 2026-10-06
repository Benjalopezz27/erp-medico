import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { DataSource } from 'typeorm';
import { PasswordRecoveryService } from './password-recovery.service';
import { UsersService } from '../users/users.service';
import { MailSendQueueService } from '../queue/services/mail-send.queue';
import { User } from '../users/entities/user.entity';

describe('PasswordRecoveryService', () => {
  let service: PasswordRecoveryService;
  let users: { findByEmail: jest.Mock };
  let queue: { enqueue: jest.Mock };
  let tokenRepo: {
    update: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    findOne: jest.Mock;
  };
  let manager: { getRepository: jest.Mock; update: jest.Mock };

  beforeEach(() => {
    users = { findByEmail: jest.fn() };
    queue = { enqueue: jest.fn() };
    tokenRepo = {
      update: jest.fn(),
      save: jest.fn(),
      create: jest.fn((v) => v),
      findOne: jest.fn(),
    };
    manager = {
      getRepository: jest.fn().mockReturnValue(tokenRepo),
      update: jest.fn(),
    };
    const dataSource = {
      transaction: jest.fn((cb) => cb(manager)),
    } as unknown as DataSource;
    service = new PasswordRecoveryService(
      users as unknown as UsersService,
      queue as unknown as MailSendQueueService,
      dataSource,
    );
  });

  describe('forgotPassword', () => {
    it('active user: invalidates old tokens, stores hash only, enqueues mail', async () => {
      users.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'a@erp.com',
        isActive: true,
      });

      const res = await service.forgotPassword('a@erp.com');

      expect(tokenRepo.update).toHaveBeenCalledTimes(1);
      const saved = tokenRepo.save.mock.calls[0][0];
      const { token } = queue.enqueue.mock.calls[0][0];
      expect(saved.tokenHash).toBe(
        createHash('sha256').update(token).digest('hex'),
      );
      expect(saved.tokenHash).not.toBe(token);
      const ttl = saved.expiresAt.getTime() - Date.now();
      expect(ttl).toBeGreaterThan(29 * 60 * 1000);
      expect(ttl).toBeLessThanOrEqual(30 * 60 * 1000);
      expect(queue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'password-reset', to: 'a@erp.com' }),
      );
      expect(res.message).toBeDefined();
    });

    it.each([
      ['unknown email', null],
      ['pending user', { id: 'u2', email: 'p@erp.com', isActive: false }],
    ])('%s: same response, no token, no mail', async (_n, user) => {
      users.findByEmail.mockResolvedValue(user);
      const active = await (async () => {
        users.findByEmail.mockResolvedValueOnce({
          id: 'u1',
          email: 'a@erp.com',
          isActive: true,
        });
        return service.forgotPassword('a@erp.com');
      })();
      queue.enqueue.mockClear();
      tokenRepo.save.mockClear();

      const res = await service.forgotPassword('x@erp.com');

      expect(res).toEqual(active);
      expect(tokenRepo.save).not.toHaveBeenCalled();
      expect(queue.enqueue).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('valid token: updates hash (cost 12), marks tokens used', async () => {
      tokenRepo.findOne.mockResolvedValue({ id: 't1', userId: 'u1' });

      await service.resetPassword('tok', 'NewPassword1!');

      const [entity, id, patch] = manager.update.mock.calls[0];
      expect(entity).toBe(User);
      expect(id).toBe('u1');
      expect(bcrypt.getRounds(patch.passwordHash)).toBe(12);
      expect(await bcrypt.compare('NewPassword1!', patch.passwordHash)).toBe(
        true,
      );
      expect(tokenRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1' }),
        expect.objectContaining({ usedAt: expect.any(Date) }),
      );
    });

    it('expired, used or unknown token: 400 and password untouched', async () => {
      tokenRepo.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword('bad', 'NewPassword1!'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(manager.update).not.toHaveBeenCalled();
    });
  });
});
