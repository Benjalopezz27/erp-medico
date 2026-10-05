// PROVISIONAL (needs:client): contenido base; los pasos exactos se completan con el cliente.
export interface HelpSection {
  id: string;
  title: string;
  body: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'primeros-pasos',
    title: 'Primeros pasos',
    body: [
      'Ingresá con tu correo y contraseña. Si te registraste vos mismo, un administrador debe aprobar tu cuenta antes del primer acceso.',
      'Desde "Mi cuenta" (clic en tu nombre, abajo en el menú lateral) podés cambiar tu nombre y tu contraseña.',
    ],
  },
  {
    id: 'ventas',
    title: 'Ventas',
    body: ['Desde "Ventas" podés ver el historial y registrar una venta nueva con "Nueva venta".'],
  },
  {
    id: 'stock',
    title: 'Stock',
    body: [
      '"Stock" muestra las existencias por producto y alerta cuando hay productos bajo el mínimo.',
    ],
  },
  {
    id: 'compras',
    title: 'Compras (administradores)',
    body: ['"Compras" permite gestionar órdenes de compra, recepciones y facturas de proveedores.'],
  },
  {
    id: 'tesoreria',
    title: 'Tesorería (administradores)',
    body: ['"Tesorería" reúne la caja diaria y la gestión de cheques.'],
  },
];

export const FAQ: FaqItem[] = [
  {
    question: '¿Qué rol puede hacer cada cosa?',
    answer:
      'Los administradores acceden a todos los módulos. Los vendedores operan ventas, productos, stock y clientes.',
  },
  {
    question: '¿Cómo cambio mi contraseña?',
    answer: 'Entrá a "Mi cuenta" y completá la tarjeta "Cambiar contraseña".',
  },
  {
    question: '¿Cómo cambio mi correo o mi rol?',
    answer: 'Solo un administrador puede hacerlo desde "Usuarios".',
  },
  {
    question: '¿A quién escribo si algo falla?',
    answer: 'Usá los datos de la sección "Contacto" de esta página.',
  },
];
