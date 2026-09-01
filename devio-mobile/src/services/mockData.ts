import type { Document, Payment, Progress, Unit, User } from '../types';

export const MOCK_USER: User = {
  _id: 'mock-user-001',
  email: 'cliente@devio.mx',
  name: 'Carlos Mendoza',
  role: 'Inversionista',
  token: 'mock-token',
};

export const MOCK_PROPERTIES: Unit[] = [
  {
    _id: 'mock-solea-1a',
    name: 'Solea Residencial | 1A',
    unitCode: 'S-1A',
    surfaceM2: 76,
    bedrooms: 1,
    bathrooms: 1,
    image: '',
    status: 'En construcción',
    estimatedDeliveryDate: '2027-03-01',
    generalProgress: 62,
  },
  {
    _id: 'mock-solea-1b',
    name: 'Solea Residencial | 1B',
    unitCode: 'S-1B',
    surfaceM2: 88,
    bedrooms: 2,
    bathrooms: 2,
    image: '',
    status: 'Apartada',
    estimatedDeliveryDate: '2027-06-01',
    generalProgress: 45,
  },
  {
    _id: 'mock-solea-2a',
    name: 'Solea Residencial | 2A',
    unitCode: 'S-2A',
    surfaceM2: 102,
    bedrooms: 3,
    bathrooms: 2,
    image: '',
    status: 'Reservada',
    estimatedDeliveryDate: '2027-09-01',
    generalProgress: 28,
  },
];

export const MOCK_PAYMENTS: Payment[] = [
  {
    _id: 'mock-pay-1',
    unitId: 'mock-solea-1a',
    amount: 612500,
    interest: 0,
    status: 'Pagado',
    dueDate: '2026-03-15',
    paidAmount: 612500,
    pendingAmount: 0,
  },
  {
    _id: 'mock-pay-2',
    unitId: 'mock-solea-1a',
    amount: 612500,
    interest: 0,
    status: 'Pagado',
    dueDate: '2026-06-15',
    paidAmount: 612500,
    pendingAmount: 0,
  },
  {
    _id: 'mock-pay-3',
    unitId: 'mock-solea-1a',
    amount: 612500,
    interest: 0,
    status: 'Parcial',
    dueDate: '2026-09-15',
    paidAmount: 366250,
    pendingAmount: 246250,
  },
  {
    _id: 'mock-pay-4',
    unitId: 'mock-solea-1a',
    amount: 612500,
    interest: 0,
    status: 'Pendiente',
    dueDate: '2026-12-15',
    paidAmount: 0,
    pendingAmount: 612500,
  },
];

export const MOCK_PROGRESS: Progress[] = [
  {
    _id: 'mock-prog-1',
    unitId: 'mock-solea-1a',
    specialtyName: 'Estructura y Cimentación',
    percentage: 100,
    lastUpdate: '2026-08-10',
    images: [],
  },
  {
    _id: 'mock-prog-2',
    unitId: 'mock-solea-1a',
    specialtyName: 'Instalaciones Eléctricas',
    percentage: 85,
    lastUpdate: '2026-08-10',
    images: [],
  },
  {
    _id: 'mock-prog-3',
    unitId: 'mock-solea-1a',
    specialtyName: 'Acabados y Pintura',
    percentage: 60,
    lastUpdate: '2026-08-05',
    images: [],
  },
  {
    _id: 'mock-prog-4',
    unitId: 'mock-solea-1a',
    specialtyName: 'Carpintería y Pisos',
    percentage: 40,
    lastUpdate: '2026-07-28',
    images: [],
  },
];

export interface MockDocumentItem extends Document {
  size: string;
}

export const MOCK_DOCUMENTS: MockDocumentItem[] = [
  { _id: 'mock-doc-1', title: 'Contrato de Compraventa.pdf', category: 'Contratos', fileUrl: '', createdDate: '2026-03-20', size: '2.4 MB' },
  { _id: 'mock-doc-2', title: 'Pagaré de Enganche.pdf', category: 'Contratos', fileUrl: '', createdDate: '2026-03-20', size: '1.1 MB' },
  { _id: 'mock-doc-3', title: 'Recibo Pago 2.pdf', category: 'Recibos', fileUrl: '', createdDate: '2026-06-15', size: '620 KB' },
  { _id: 'mock-doc-4', title: 'Recibo Pago 3.pdf', category: 'Recibos', fileUrl: '', createdDate: '2026-09-15', size: '640 KB' },
  { _id: 'mock-doc-5', title: 'Plano Arquitectónico.pdf', category: 'Planos', fileUrl: '', createdDate: '2026-01-10', size: '8.2 MB' },
  { _id: 'mock-doc-6', title: 'Plano Eléctrico.pdf', category: 'Planos', fileUrl: '', createdDate: '2026-02-12', size: '5.6 MB' },
];

export const MOCK_PAYMENT_CONCEPTS: Record<string, string> = {
  'mock-pay-1': 'Enganche (Contado)',
  'mock-pay-2': 'Pago 2 - Mensualidad',
  'mock-pay-3': 'Pago 3 - Mensualidad',
  'mock-pay-4': 'Pago 4 - Mensualidad',
};