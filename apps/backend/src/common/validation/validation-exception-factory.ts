import { BadRequestException } from '@nestjs/common';
import { ValidationError } from '@nestjs/common';
import { ApiFieldError } from '@erp/shared-types';

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): ApiFieldError[] {
  return errors.flatMap((error) => {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    const ownConstraints = error.constraints
      ? Object.values(error.constraints)
      : [];
    const ownError = ownConstraints.length
      ? [{ field, constraints: ownConstraints }]
      : [];

    const childErrors = error.children?.length
      ? flattenValidationErrors(error.children, field)
      : [];

    return [...ownError, ...childErrors];
  });
}

export function validationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  const details = flattenValidationErrors(errors);

  return new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    details,
  });
}
