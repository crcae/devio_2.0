import type { Document, Payment, PaymentStatus, Progress, Unit } from '../types';
import { type Raw } from './bubbleApi';

export interface AdaptedExecutedPayment {
  id: string;
  date: string;
  method: string;
  amount: number;
  receiptUrl?: string;
}

export interface AdaptedProgressPart {
  id: string;
  name: string;
  percentage: number;
}

export interface AdaptedProgressPhoto {
  id: string;
  tone?: string;
  url?: string;
}

export interface AdaptedProgressUpdate {
  id: string;
  title: string;
  date: string;
  dateShort: string;
  overall: number;
  parts: AdaptedProgressPart[];
  photos: AdaptedProgressPhoto[];
}

export type AdaptedProperty = Unit & {
  totalPrice: number;
  totalPaid: number;
  heroImageUrl: string;
};

const SPANISH_MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const SPANISH_MONTHS_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

function normKey(key: string): string {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[²³¹]/g, (c) => ({ '²': '2', '³': '3', '¹': '1' })[c] ?? c)
    .replace(/[\s_]+/g, '');
}

export function getField(raw: Raw, variants: string[]): unknown {
  const entries = Object.entries(raw).map(([k, v]) => ({ k, n: normKey(k), v }));
  for (const variant of variants) {
    const target = normKey(variant);
    const hit = entries.find((entry) => entry.n === target);
    if (hit && hit.v !== undefined && hit.v !== null) {
      return hit.v;
    }
  }
  return undefined;
}

function toString(value: unknown, fallback = ''): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[$,\s]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toUrlArray(value: unknown): AdaptedProgressPhoto[] {
  if (Array.isArray(value)) {
    return value.map((item, index) => ({ id: `photo-${index}`, url: toString(item) })).filter((p) => p.url);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return [{ id: 'photo-0', url: value }];
  }
  return [];
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatLongDate(raw: string): string {
  const date = parseDate(raw);
  if (!date) return raw || '';
  return `${SPANISH_MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatShortDate(raw: string): string {
  const date = parseDate(raw);
  if (!date) return raw || '';
  return `${date.getMonth() + 1}/${date.getDate()}/${String(date.getFullYear()).slice(2)}`;
}

function formatPaymentDate(raw: string): string {
  const date = parseDate(raw);
  if (!date) return raw || '';
  return `${date.getDate()} ${SPANISH_MONTHS_SHORT[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`;
}

function toPaymentStatus(value: unknown): PaymentStatus {
  const raw = toString(value).toLowerCase();
  if (raw === 'paid' || raw.includes('pagad')) return 'Pagado';
  if (raw === 'partial' || raw.includes('parcial')) return 'Parcial';
  return 'Pendiente';
}

const SPECIALTY_FIELDS: Array<{ name: string; variants: string[] }> = [
  { name: 'Cimentación', variants: ['Cimentación', 'Cimentacion'] },
  { name: 'Estructura', variants: ['Estructura'] },
  { name: 'Instalaciones', variants: ['Instalaciones', 'Instalaciones Eléctricas', 'Instalaciones Electricas'] },
  { name: 'Acabados', variants: ['Acabados'] },
];

export function adaptBubbleProperty(rawUnit: Raw, rawProject?: Raw): AdaptedProperty {
  const heroImage = toString(getField(rawUnit, ['Imagen', 'Foto', 'Image', 'Imagen Principal', 'Hero Image']));
  const projectImage = rawProject
    ? toString(getField(rawProject, ['Imagen', 'Imagen Principal', 'Hero Image', 'Image']))
    : '';
  const totalPrice = toNumber(
    getField(rawUnit, ['Precio de Venta', 'Precio', 'Price', 'Total Price']),
    rawProject ? toNumber(getField(rawProject, ['Precio', 'Precio de Venta', 'Price'])) : 0,
  );
  const totalPaid = toNumber(getField(rawUnit, ['Total Pagado', 'Pagado', 'Paid', 'Total Paid']));

  return {
    _id: toString(getField(rawUnit, ['_id', 'id'])),
    name: toString(
      getField(rawUnit, ['Nombre', 'Name', 'Nombre de Unidad']),
      rawProject ? toString(getField(rawProject, ['Nombre', 'Name']), 'Propiedad') : 'Propiedad',
    ),
    unitCode: toString(getField(rawUnit, ['# Unidad', 'Numero', 'Número', 'Código de Unidad', 'Codigo de Unidad', 'Unit Code', 'Código', 'Codigo'])),
    surfaceM2: toNumber(getField(rawUnit, ['Superficie (m²)', 'Superficie (m2)', 'Superficie', 'Área', 'Area', 'm2', 'Surface'])),
    bedrooms: toNumber(getField(rawUnit, ['Recámaras', 'Recamaras', 'Cuartos', 'Bedrooms'])),
    bathrooms: toNumber(getField(rawUnit, ['Baños', 'Banos', 'Bathrooms'])),
    image: heroImage || projectImage,
    status: toString(getField(rawUnit, ['Estatus', 'Status', 'Estado', 'status'])),
    estimatedDeliveryDate: toString(
      getField(rawUnit, ['Fecha de entrega', 'Fecha de Entrega', 'Entrega Estimada', 'Estimated Delivery Date', 'Entrega']),
    ),
    generalProgress: toNumber(getField(rawUnit, ['Avance General', 'Progreso General', 'General Progress', 'Progreso'])),
    totalPrice,
    totalPaid,
    heroImageUrl: heroImage || projectImage,
  };
}

export function adaptBubbleProperties(rawUnits: Raw[], rawProjects: Raw[] = []): AdaptedProperty[] {
  return rawUnits.map((rawUnit) => {
    const projectRef = toString(getField(rawUnit, ['Proyecto', 'Project', 'Proyecto ID', 'Project ID']));
    const rawProject = rawProjects.find((p) =>
      projectRef
        ? Object.values(p).some((v) => String(v) === projectRef)
        : toString(getField(p, ['_id', 'id'])) === projectRef,
    );
    return adaptBubbleProperty(rawUnit, rawProject);
  });
}

export function adaptBubbleInstallments(rawList: Raw[]): Payment[] {
  return rawList.map((raw, index) => {
    const amount = toNumber(getField(raw, ['Monto programado', 'Cantidad', 'Monto', 'amount', 'Amount', 'Cantidad Total']));
    const paid = toNumber(getField(raw, ['Ya Pagado', 'Pagado', 'Paid Amount', 'Abonado', 'paid_amount']));
    const pending = toNumber(getField(raw, ['Falta por Pagar', 'Pendiente', 'Pending Amount', 'restante']));
    return {
      _id: toString(getField(raw, ['_id', 'id']), `installment-${index}`),
      unitId: toString(getField(raw, ['Unidad', 'Unit', 'Unidad ID', 'Unit ID', 'project', 'Project'])),
      amount,
      interest: toNumber(getField(raw, ['Intereses', 'Interest'])),
      status: toPaymentStatus(getField(raw, ['Estatus', 'Status', 'status'])),
      dueDate: toString(getField(raw, ['due_date', 'Fecha Límite', 'Fecha Limite', 'Due Date', 'Fecha programada', 'Fecha'])),
      paidAmount: paid || (pending > 0 ? Math.min(amount, Math.max(amount - pending, 0)) : 0),
      pendingAmount: pending || Math.max(amount - paid, 0),
    };
  });
}

export function adaptBubblePayments(rawList: Raw[]): AdaptedExecutedPayment[] {
  return rawList.map((raw, index) => ({
    id: toString(getField(raw, ['_id', 'id']), `pago-${index}`),
    date: formatPaymentDate(toString(getField(raw, ['Fecha Pago', 'Fecha programada', 'Fecha', 'paid_date', 'Date']))),
    method: toString(getField(raw, ['Método de Pago', 'Metodo de Pago', 'Método', 'Metodo', 'Method']), 'Transferencia'),
    amount: toNumber(getField(raw, ['Monto programado', 'Monto', 'amount', 'Amount'])),
    receiptUrl: toString(getField(raw, ['Recibo', 'Comprobante', 'Documento', 'Receipt', 'Archivo', 'file'])),
  }));
}

export function adaptBubbleProgress(rawList: Raw[]): {
  specialties: Progress[];
  history: AdaptedProgressUpdate[];
} {
  const history: AdaptedProgressUpdate[] = rawList.map((raw, index) => {
    const overall = toNumber(getField(raw, ['Avance General', 'Progreso General', 'Progreso', 'Overall Progress', 'general_progress']));
    const dateRaw = toString(getField(raw, ['Fecha', 'Fecha de Actualización', 'Fecha de Actualizacion', 'Date', 'Last Update', 'timestamp']));
    const parts = SPECIALTY_FIELDS.map((specialty, partIndex) => ({
      id: `${index}-${partIndex}`,
      name: specialty.name,
      percentage: toNumber(getField(raw, specialty.variants)),
    }));
    const photos = toUrlArray(getField(raw, ['Fotos', 'Imágenes', 'Imagenes', 'Images', 'Photos', 'photo']));
    return {
      id: toString(getField(raw, ['_id', 'id']), `update-${index}`),
      title: toString(getField(raw, ['Título', 'Titulo', 'Title', 'description']), `Avance ${index + 1}`),
      date: formatLongDate(dateRaw),
      dateShort: formatShortDate(dateRaw),
      overall,
      parts,
      photos,
    };
  });

  const latest = history.length > 0 ? history[history.length - 1] : null;
  const specialties: Progress[] = SPECIALTY_FIELDS.map((specialty, index) => ({
    _id: `spec-${index}`,
    unitId: '',
    specialtyName: specialty.name,
    percentage: latest?.parts[index]?.percentage ?? 0,
    lastUpdate: latest?.date ?? '',
    images: latest?.photos.map((photo) => photo.url ?? '') ?? [],
  }));

  return { specialties, history };
}

export function adaptBubbleDocuments(rawList: Raw[]): Document[] {
  return rawList.map((raw, index) => ({
    _id: toString(getField(raw, ['_id', 'id']), `doc-${index}`),
    title: toString(getField(raw, ['Título', 'Titulo', 'Title', 'Nombre', 'name']), 'Documento'),
    category: toString(getField(raw, ['Categoría', 'Categoria', 'Category', 'Tipo']), 'General'),
    fileUrl: toString(getField(raw, ['URL', 'Url', 'File URL', 'Archivo', 'Archivo URL', 'file'])),
    createdDate: toString(getField(raw, ['Created Date', 'Fecha', 'Fecha de Creación', 'Fecha de Creacion'])),
  }));
}