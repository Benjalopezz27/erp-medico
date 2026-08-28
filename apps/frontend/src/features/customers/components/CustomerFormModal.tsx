import { useEffect } from 'react';
import Decimal from 'decimal.js';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import {
  CustomerDocumentType,
  sanitizeCustomerDocument,
  TaxCondition,
  UserRole,
} from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { useAuthStore } from '@/stores/authStore';
import {
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
} from '../hooks/use-customer-mutations';
import {
  customerFormSchema,
  type CustomerFormOutput,
  type CustomerFormValues,
} from '../schemas/customers.schema';
import type {
  CreateCustomerPayload,
  ICustomer,
  UpdateCustomerPayload,
} from '../types/customers.types';
import { formatCustomerDocument } from '../utils/customer-document.utils';
import { parseCustomerError } from '../utils/customers.errors';
import { taxConditionLabel } from './CustomerBadges';

export function CustomerFormModal({
  isOpen,
  mode,
  customer,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  mode: 'create' | 'edit';
  customer: ICustomer | null;
  onClose: () => void;
  onSuccess: (customer: ICustomer) => void;
}) {
  const isAdmin = useAuthStore((state) => state.user?.role === UserRole.ADMINISTRADOR);
  const createMutation = useCreateCustomerMutation();
  const updateMutation = useUpdateCustomerMutation();
  const pending = createMutation.isPending || updateMutation.isPending;
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: emptyValues(),
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(
      mode === 'edit' && customer
        ? {
            businessName: customer.businessName,
            documentType: customer.documentType,
            cuitOrDni: formatCustomerDocument(customer.documentType, customer.cuitOrDni),
            taxCondition: customer.taxCondition,
            email: customer.email ?? '',
            phone: customer.phone ?? '',
            address: customer.address ?? '',
            creditLimit: customer.creditLimit,
          }
        : emptyValues(),
    );
  }, [customer, isOpen, mode, reset]);

  const submit = async (rawValues: CustomerFormValues) => {
    const values = customerFormSchema.parse(rawValues);
    try {
      if (mode === 'create') {
        const document = sanitizeCustomerDocument(values.documentType, values.cuitOrDni)!;
        const payload: CreateCustomerPayload = {
          businessName: values.businessName,
          documentType: values.documentType,
          cuitOrDni: document,
          taxCondition: values.taxCondition,
          email: values.email,
          phone: values.phone,
          address: values.address,
          ...(isAdmin ? { creditLimit: values.creditLimit } : {}),
        };
        onSuccess(await createMutation.mutateAsync(payload));
      } else if (customer) {
        const payload = buildUpdatePayload(customer, values, isAdmin);
        if (!payload) {
          setError('root', { message: 'No se detectaron cambios para guardar.' });
          return;
        }
        onSuccess(await updateMutation.mutateAsync({ id: customer.id, payload }));
      }
      onClose();
    } catch (cause) {
      const parsed = parseCustomerError(cause);
      if (parsed.documentDuplicate) {
        setError('cuitOrDni', { message: parsed.message });
      } else {
        setError('root', { message: parsed.message });
      }
    }
  };

  const showSensitiveInputs = mode === 'create' || isAdmin;
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !pending && onClose()}
      title={mode === 'create' ? 'Nuevo cliente' : 'Editar cliente'}
      description="Datos fiscales, contacto y condiciones comerciales"
      className="max-w-2xl"
    >
      <form
        className="space-y-4"
        onSubmit={handleSubmit((values) => void submit(values))}
        noValidate
      >
        {errors.root?.message && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            {errors.root.message}
          </div>
        )}
        <Field
          label="Nombre o razón social"
          id="customer-business-name"
          error={errors.businessName?.message}
          required
        >
          <Input
            id="customer-business-name"
            {...register('businessName')}
            disabled={pending}
            aria-invalid={Boolean(errors.businessName)}
          />
        </Field>

        {showSensitiveInputs ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Tipo de documento"
              id="customer-document-type"
              error={errors.documentType?.message}
              required
            >
              <Select id="customer-document-type" {...register('documentType')} disabled={pending}>
                <option value={CustomerDocumentType.DNI}>DNI</option>
                <option value={CustomerDocumentType.CUIT}>CUIT</option>
              </Select>
            </Field>
            <Field
              label="DNI o CUIT"
              id="customer-document"
              error={errors.cuitOrDni?.message}
              required
            >
              <Input
                id="customer-document"
                {...register('cuitOrDni')}
                disabled={pending}
                aria-invalid={Boolean(errors.cuitOrDni)}
              />
            </Field>
            <Field
              label="Condición fiscal"
              id="customer-tax-condition"
              error={errors.taxCondition?.message}
              required
            >
              <Select id="customer-tax-condition" {...register('taxCondition')} disabled={pending}>
                {Object.values(TaxCondition).map((condition) => (
                  <option key={condition} value={condition}>
                    {taxConditionLabel(condition)}
                  </option>
                ))}
              </Select>
            </Field>
            {isAdmin && (
              <Field
                label="Límite de crédito autorizado"
                id="customer-credit-limit"
                error={errors.creditLimit?.message}
              >
                <Input
                  id="customer-credit-limit"
                  inputMode="decimal"
                  {...register('creditLimit')}
                  disabled={pending}
                  aria-invalid={Boolean(errors.creditLimit)}
                />
              </Field>
            )}
          </div>
        ) : customer ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Los datos fiscales y el límite de crédito son de solo lectura para vendedores.
            Documento:{' '}
            <strong>{formatCustomerDocument(customer.documentType, customer.cuitOrDni)}</strong> ·{' '}
            {taxConditionLabel(customer.taxCondition)}.
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email" id="customer-email" error={errors.email?.message}>
            <Input
              id="customer-email"
              type="email"
              {...register('email')}
              disabled={pending}
              aria-invalid={Boolean(errors.email)}
            />
          </Field>
          <Field label="Teléfono" id="customer-phone" error={errors.phone?.message}>
            <Input
              id="customer-phone"
              {...register('phone')}
              disabled={pending}
              aria-invalid={Boolean(errors.phone)}
            />
          </Field>
        </div>
        <Field label="Dirección" id="customer-address" error={errors.address?.message}>
          <Input
            id="customer-address"
            {...register('address')}
            disabled={pending}
            aria-invalid={Boolean(errors.address)}
          />
        </Field>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={pending}>
            {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Crear cliente' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function emptyValues(): CustomerFormValues {
  return {
    businessName: '',
    documentType: CustomerDocumentType.DNI,
    cuitOrDni: '',
    taxCondition: TaxCondition.CONSUMIDOR_FINAL,
    email: '',
    phone: '',
    address: '',
    creditLimit: '0.00',
  };
}

function buildUpdatePayload(
  customer: ICustomer,
  values: CustomerFormOutput,
  isAdmin: boolean,
): UpdateCustomerPayload | null {
  const payload: UpdateCustomerPayload = {};
  if (values.businessName !== customer.businessName) payload.businessName = values.businessName;
  if (values.email !== customer.email) payload.email = values.email;
  if (values.phone !== customer.phone) payload.phone = values.phone;
  if (values.address !== customer.address) payload.address = values.address;
  if (isAdmin) {
    const document = sanitizeCustomerDocument(values.documentType, values.cuitOrDni)!;
    if (values.documentType !== customer.documentType) payload.documentType = values.documentType;
    if (document !== customer.cuitOrDni) payload.cuitOrDni = document;
    if (values.taxCondition !== customer.taxCondition) payload.taxCondition = values.taxCondition;
    if (!new Decimal(values.creditLimit).eq(customer.creditLimit))
      payload.creditLimit = values.creditLimit;
  }
  return Object.keys(payload).length ? payload : null;
}

function Field({
  label,
  id,
  error,
  required,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
      >
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
