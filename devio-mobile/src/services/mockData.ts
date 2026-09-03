import type { Payment, Progress, Unit, User } from '../types';
import { COLORS } from '../constants/theme';
import type { AdaptedExecutedPayment, AdaptedProgressUpdate } from './bubbleAdapter';

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

export const MOCK_PAYMENT_CONCEPTS: Record<string, string> = {
  'mock-pay-1': 'Enganche (Contado)',
  'mock-pay-2': 'Pago 2 - Mensualidad',
  'mock-pay-3': 'Pago 3 - Mensualidad',
  'mock-pay-4': 'Pago 4 - Mensualidad',
};

export const MOCK_EXECUTED_PAYMENTS: AdaptedExecutedPayment[] = [
  { id: 'mock-x1', date: '21 Ago 26', method: 'Transferencia', amount: 300000 },
  { id: 'mock-x2', date: '15 Mar 26', method: 'Transferencia', amount: 612500 },
];

export const MOCK_PROGRESS_HISTORY: AdaptedProgressUpdate[] = [
  {
    id: 'hist-1',
    title: 'Primer Avance',
    date: 'Agosto 10, 2026',
    dateShort: '8/10/26',
    dateCard: 'Ago 10, 26',
    overall: 21,
    parts: [
      { id: 'h1p1', name: 'Cimentación', percentage: 4 },
      { id: 'h1p2', name: 'Estructura', percentage: 10 },
      { id: 'h1p3', name: 'Instalaciones', percentage: 10 },
      { id: 'h1p4', name: 'Acabados', percentage: 23 },
    ],
    photos: [
      { id: 'h1-ph-1', tone: COLORS.primary },
      { id: 'h1-ph-2', tone: '#274565' },
      { id: 'h1-ph-3', tone: '#314F6E' },
    ],
  },
  {
    id: 'hist-2',
    title: 'Segundo Avance',
    date: 'Septiembre 15, 2026',
    dateShort: '9/15/26',
    dateCard: 'Sep 15, 26',
    overall: 45,
    parts: [
      { id: 'h2p1', name: 'Cimentación', percentage: 45 },
      { id: 'h2p2', name: 'Estructura', percentage: 30 },
      { id: 'h2p3', name: 'Instalaciones', percentage: 25 },
      { id: 'h2p4', name: 'Acabados', percentage: 12 },
    ],
    photos: [
      { id: 'h2-ph-1', tone: '#3A5A7C' },
      { id: 'h2-ph-2', tone: COLORS.primary },
    ],
  },
];