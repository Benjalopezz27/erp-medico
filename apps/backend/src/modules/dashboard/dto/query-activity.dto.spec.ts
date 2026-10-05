import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { QueryActivityDto } from './query-activity.dto';

const errorsFor = (plain: Record<string, unknown>) =>
  validateSync(plainToInstance(QueryActivityDto, plain));

describe('QueryActivityDto', () => {
  it('defaults the limit to 15', () => {
    expect(plainToInstance(QueryActivityDto, {}).limit).toBe(15);
  });

  it.each(['1', '15', '50'])('accepts limit=%s', (limit) => {
    expect(errorsFor({ limit })).toHaveLength(0);
  });

  it.each(['0', '51', '500', 'abc', '1.5'])('rejects limit=%s', (limit) => {
    expect(errorsFor({ limit })).not.toHaveLength(0);
  });
});
