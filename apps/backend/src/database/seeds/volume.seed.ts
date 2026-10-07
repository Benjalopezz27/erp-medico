import { DataSource } from 'typeorm';

export interface VolumeSeedOptions {
  products?: number;
  customers?: number;
  sales?: number;
  /** Id del usuario dueño de las ventas sembradas. */
  userId: string;
}

export interface VolumeSeedResult {
  products: number;
  customers: number;
  sales: number;
}

/** Prefijos propios: el seed es idempotente y no choca con datos reales/de test. */
export const VOLUME_PRODUCT_PREFIX = 'VOL-P-';
export const VOLUME_CUSTOMER_CUIT_BASE = 30800000000;
export const VOLUME_SALE_PREFIX = 'VOL-V-';
/** Punto de venta reservado: no compite con la numeración fiscal de los e2e (PV 1). */
export const VOLUME_POINT_OF_SALE = 99;

/**
 * Volumen reproducible y sin datos reales (todo derivado de generate_series).
 * Una sola sentencia SQL por tabla: miles de filas en segundos.
 */
export async function runVolumeSeed(
  ds: DataSource,
  {
    products = 5000,
    customers = 2000,
    sales = 5000,
    userId,
  }: VolumeSeedOptions,
): Promise<VolumeSeedResult> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('El seed de volumen no corre en producción.');
  }

  await ds.transaction(async (m) => {
    await m.query(`
      INSERT INTO categories (name, description)
      VALUES ('Volumen', 'Categoría de seed de volumen')
      ON CONFLICT DO NOTHING`);
    await m.query(`
      INSERT INTO units (name, symbol)
      VALUES ('Volumen unidad', 'vol')
      ON CONFLICT DO NOTHING`);

    await m.query(
      `INSERT INTO products (internal_code, name, category_id, base_unit_id,
          cost_net, suggested_price_net, active_price_net, tax_treatment,
          iva_percentage, status)
       SELECT $1 || LPAD(g::text, 6, '0'), 'Producto volumen ' || g,
          (SELECT id FROM categories WHERE name = 'Volumen'),
          (SELECT id FROM units WHERE name = 'Volumen unidad'),
          50 + (g % 100), 100 + (g % 100), 100 + (g % 100), 'GRAVADO', 21, 'ACTIVE'
       FROM generate_series(1, $2) g
       ON CONFLICT DO NOTHING`,
      [VOLUME_PRODUCT_PREFIX, products],
    );
    await m.query(
      `INSERT INTO stocks (product_id, current_base_stock)
       SELECT id, 1000 FROM products WHERE internal_code LIKE $1 || '%'
       ON CONFLICT (product_id) DO NOTHING`,
      [VOLUME_PRODUCT_PREFIX],
    );

    await m.query(
      `INSERT INTO customers (business_name, document_type, cuit_or_dni,
          tax_condition, credit_limit, is_active)
       SELECT 'Cliente volumen ' || g, 'CUIT', ($1::bigint + g)::text,
          'RESPONSABLE_INSCRIPTO', 100000, true
       FROM generate_series(1, $2) g
       ON CONFLICT DO NOTHING`,
      [VOLUME_CUSTOMER_CUIT_BASE, customers],
    );

    // Venta confirmada de 1 unidad ($100 neto + 21% IVA) con su Factura B emitida.
    await m.query(
      `INSERT INTO sales (sale_number, customer_id, status, is_credit_sale, requires_fiscal_invoice,
          payment_method, total_net, taxable_net, exempt_amount, non_taxed_amount,
          iva_total, total_gross, user_id)
       SELECT $1 || LPAD(g::text, 8, '0'),
          (SELECT id FROM customers WHERE cuit_or_dni = ($4::bigint + (g % $5) + 1)::text),
          'CONFIRMADA', false, true, 'EFECTIVO', 100, 100, 0, 0, 21, 121, $3
       FROM generate_series(1, $2) g
       ON CONFLICT DO NOTHING`,
      [VOLUME_SALE_PREFIX, sales, userId, VOLUME_CUSTOMER_CUIT_BASE, customers],
    );
    await m.query(
      `INSERT INTO sale_items (sale_id, product_id, item_index, quantity_base,
          catalog_price_net, pricing_rule_applied, discount_amount_net, unit_price_net,
          subtotal_net, tax_treatment, iva_percentage, iva_amount, subtotal_gross)
       SELECT s.id, p.id, 0, 1, 100, 'CATALOG_PRICE', 0, 100, 100, 'GRAVADO', 21, 21, 121
       FROM sales s
       JOIN products p ON p.internal_code = $1 || LPAD(((substr(s.sale_number, 7)::int % $3) + 1)::text, 6, '0')
       WHERE s.sale_number LIKE $2 || '%'
       ON CONFLICT DO NOTHING`,
      [VOLUME_PRODUCT_PREFIX, VOLUME_SALE_PREFIX, products],
    );
    await m.query(
      `INSERT INTO fiscal_documents (sale_id, document_type, point_of_sale,
          document_number, cae, cae_expiration_date, arca_status, issued_at)
       SELECT s.id, 'FACTURA_B', $2, substr(s.sale_number, 7)::int,
          '99999999999999', CURRENT_DATE + 10, 'EMITIDO', now()
       FROM sales s WHERE s.sale_number LIKE $1 || '%'
       ON CONFLICT DO NOTHING`,
      [VOLUME_SALE_PREFIX, VOLUME_POINT_OF_SALE],
    );
  });

  const [{ p, c, s }] = await ds.query(
    `SELECT
       (SELECT count(*)::int FROM products WHERE internal_code LIKE $1 || '%') AS p,
       (SELECT count(*)::int FROM customers WHERE cuit_or_dni::bigint BETWEEN $2 AND $2 + 9999999) AS c,
       (SELECT count(*)::int FROM sales WHERE sale_number LIKE $3 || '%') AS s`,
    [VOLUME_PRODUCT_PREFIX, VOLUME_CUSTOMER_CUIT_BASE, VOLUME_SALE_PREFIX],
  );
  return { products: p, customers: c, sales: s };
}
