import { ValidationError } from '@nestjs/common';
import { validationExceptionFactory } from './validation-exception-factory';

function buildError(
  property: string,
  constraints: Record<string, string>,
  children: ValidationError[] = [],
): ValidationError {
  return { property, constraints, children, target: {}, value: undefined };
}

describe('validationExceptionFactory', () => {
  it('flattens multiple invalid top-level fields into field-level details', () => {
    const errors = [
      buildError('email', { isEmail: 'email must be an email' }),
      buildError('quantity', { isPositive: 'quantity must be positive' }),
    ];

    const exception = validationExceptionFactory(errors);
    const response = exception.getResponse() as {
      code: string;
      details: Array<{ field: string; constraints: string[] }>;
    };

    expect(response.code).toBe('VALIDATION_ERROR');
    expect(response.details).toEqual([
      { field: 'email', constraints: ['email must be an email'] },
      { field: 'quantity', constraints: ['quantity must be positive'] },
    ]);
  });

  it('flattens nested validation errors with dotted field paths', () => {
    const errors = [
      buildError('address', {}, [
        buildError('zip', { isNotEmpty: 'zip should not be empty' }),
      ]),
    ];

    const exception = validationExceptionFactory(errors);
    const response = exception.getResponse() as {
      details: Array<{ field: string; constraints: string[] }>;
    };

    expect(response.details).toEqual([
      { field: 'address.zip', constraints: ['zip should not be empty'] },
    ]);
  });
});
