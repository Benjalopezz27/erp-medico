import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isValidCuit } from '@erp/shared-types';

@ValidatorConstraint({ name: 'isValidCuit', async: false })
export class IsValidCuitConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    return isValidCuit(value);
  }

  defaultMessage(): string {
    return 'El CUIT ingresado no es válido. Debe contener 11 dígitos con prefijo y dígito verificador válidos (Módulo 11)';
  }
}

export function IsValidCuit(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidCuitConstraint,
    });
  };
}
