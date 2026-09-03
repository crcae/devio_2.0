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
  dateCard: string;
  overall: number;
  parts: AdaptedProgressPart[];
  photos: AdaptedProgressPhoto[];
}

export type AdaptedProperty = Unit & {
  totalPrice: number;
  totalPaid: number;
  heroImageUrl: string;
  projectId?: string;
  desarrolladoraId?: string;
  saleIds?: string[];
  tipo?: string;
  location?: string;
  projectName?: string;
  images?: string[];
  parking?: number;
  floor?: number;
  notes?: string;
  constructionArea?: number;
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
    .replace(/[.]+/g, '')
    .replace(/[\s_]+/g, '');
}

export function formatImageUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  return trimmed;
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
    const match = cleaned.match(/-?\d+(\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  }
  return fallback;
}

function toUrlArray(value: unknown): AdaptedProgressPhoto[] {
  if (Array.isArray(value)) {
    return value
      .map((item, index) => ({ id: `photo-${index}`, url: formatImageUrl(toString(item)) ?? '' }))
      .filter((photo) => photo.url);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return [{ id: 'photo-0', url: formatImageUrl(value) ?? '' }];
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
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
}

const EN_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatCardDate(raw: string): string {
  const date = parseDate(raw);
  if (!date) return raw || '';
  return `${EN_MONTHS_SHORT[date.getMonth()]} ${String(date.getDate()).padStart(2, '0')}, ${String(date.getFullYear()).slice(2)}`;
}

function formatPaymentDate(raw: string): string {
  const date = parseDate(raw);
  if (!date) return raw || '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
}

function toPaymentStatus(value: unknown): PaymentStatus {
  const raw = toString(value).toLowerCase();
  if (raw === 'paid' || raw.includes('pagad')) return 'Pagado';
  if (raw === 'partial' || raw.includes('parcial')) return 'Parcial';
  return 'Pendiente';
}

function isActivePayment(raw: Raw): boolean {
  const value = raw['activo'] ?? raw['Activo'] ?? raw['active'] ?? raw['Active'];
  if (value === undefined || value === null) return true;
  const normalized = String(value).toLowerCase();
  return normalized === 'yes' || normalized === 'true' || normalized === 'si' || normalized === '1';
}

const SPECIALTY_FIELDS: Array<{ name: string; variants: string[] }> = [
  { name: 'Cimentación', variants: ['Cimentación%', 'Cimentacion%', 'Cimentación', 'Cimentacion'] },
  { name: 'Estructura', variants: ['Estructura%', 'Estructura'] },
  { name: 'Instalaciones', variants: ['Instalaciones%', 'Instalaciones Eléctricas', 'Instalaciones Electricas', 'Instalaciones'] },
  { name: 'Acabados', variants: ['Acabados%', 'Acabados'] },
];

export function adaptBubbleProperty(
  rawUnit: Raw,
  rawProject?: Raw,
  saleIds: string[] = [],
): AdaptedProperty {
  const projectName = rawProject
    ? toString(getField(rawProject, ['name', 'Nombre', 'Name', 'Proyecto']), '')
    : '';
  const projectLocation = rawProject
    ? toString(getField(rawProject, ['location', 'Location', 'Ubicación', 'Ubicacion', 'Dirección', 'Direccion']))
    : '';

  // Project / unit image sources (array or single).
  const projectMedia = rawProject
    ? getField(rawProject, ['fotos', 'Fotos', 'photos', 'Photos', 'imagen', 'Imagen', 'Imagen Principal', 'Hero Image', 'Image'])
    : undefined;
  const unitMedia = getField(rawUnit, ['imagen', 'Imagen', 'Foto', 'Image', 'Fotos']);
  const images: string[] = [];
  const mediaSources = [
    ...(Array.isArray(projectMedia) ? (projectMedia as unknown[]) : projectMedia !== undefined ? [projectMedia] : []),
    ...(Array.isArray(unitMedia) ? (unitMedia as unknown[]) : unitMedia !== undefined ? [unitMedia] : []),
  ];
  for (const source of mediaSources) {
    const url = formatImageUrl(toString(source));
    if (url && !images.includes(url)) {
      images.push(url);
    }
  }
  const heroImageUrl = images[0] ?? '';

  const totalPrice = toNumber(
    getField(rawUnit, ['Precio de Venta', 'Precio', 'Price', 'Total Price']),
    rawProject ? toNumber(getField(rawProject, ['Precio', 'Precio de Venta', 'Price'])) : 0,
  );
  const totalPaid = toNumber(getField(rawUnit, ['Total Pagado', 'Pagado', 'Paid', 'Total Paid']));

  const unitLabel = toString(
    getField(rawUnit, ['Nombre', 'name', 'Name', 'Nombre de Unidad', '# Unidad', 'Numero', 'Número', 'Unit Code', 'Código de Unidad', 'Codigo de Unidad']),
  );
  const displayName = [projectName, unitLabel].filter(Boolean).join(' | ') || unitLabel || projectName || 'Propiedad';

  return {
    _id: toString(getField(rawUnit, ['_id', 'id'])),
    name: displayName,
    unitCode: unitLabel,
    surfaceM2: toNumber(getField(rawUnit, ['Superficie (m²)', 'Superficie (m2)', 'Superficie', 'Área total de construcción. m²', 'Área total de construcción m²', 'Área', 'Area', 'm2', 'Surface'])),
    bedrooms: toNumber(getField(rawUnit, ['Número de recámaras.', 'Numero de recamaras.', 'Número de recámaras', 'Numero de recamaras', 'Cuartos', 'cuartos', 'recamaras', 'recámaras', 'Recámaras', 'dormitorios', 'Bedrooms', 'bedrooms'])),
    bathrooms: toNumber(getField(rawUnit, ['Número de baños.', 'Numero de banos.', 'Número de baños', 'Numero de banos', 'Banos', 'baños', 'banos', 'Baños', 'Bathrooms', 'bathrooms'])),
    image: heroImageUrl,
    status: toString(getField(rawUnit, ['Estatus', 'Status', 'Estado', 'status'])),
    estimatedDeliveryDate: toString(
      getField(rawUnit, ['Fecha de entrega', 'Fecha de Entrega', 'Entrega Estimada', 'Estimated Delivery Date', 'Entrega']),
    ),
    generalProgress: toNumber(getField(rawUnit, ['Avance General', 'Avance Obra General', 'Progreso General', 'General Progress', 'Progreso'])),
    totalPrice,
    totalPaid,
    heroImageUrl,
    projectId: toString(getField(rawUnit, ['project', 'Project', 'Proyecto', 'Proyecto ID', 'Project ID'])),
    desarrolladoraId: toString(getField(rawUnit, ['desarrolladora', 'Desarrolladora', 'desarrolladora_id', 'Desarrolladora ID', 'Desarrolladora Id'])),
    saleIds,
    tipo: toString(getField(rawUnit, ['Tipo', 'tipo', 'Tipo de Unidad'])),
    location: projectLocation,
    projectName,
    images,
    parking: toNumber(getField(rawUnit, ['Cajones de estacionamiento.', 'Cajones de estacionamiento', 'Cajón de estacionamiento', 'Cajones', 'Estacionamientos', 'estacionamiento', 'parking', 'Parking'])),
    floor: toNumber(getField(rawUnit, ['Piso / Nivel.', 'Piso / Nivel', 'Piso', 'Nivel', 'floor', 'Floor'])),
    notes: toString(getField(rawUnit, ['Notas / descripción corta', 'Notas / descripcion corta', 'Notas', 'notes', 'Notas / descripción'])),
    constructionArea: toNumber(getField(rawUnit, ['Área total de construcción. m²', 'Área total de construcción m²', 'Área de construcción', 'constructionArea', 'Área construida'])),
  };
}

export function adaptBubbleProperties(
  rawUnits: Raw[],
  rawProjects: Raw[] = [],
  saleIdsByUnit: Record<string, string[]> = {},
): AdaptedProperty[] {
  return rawUnits.map((rawUnit) => {
    const projectRef = toString(getField(rawUnit, ['Proyecto', 'Project', 'Proyecto ID', 'Project ID']));
    const rawProject = rawProjects.find((p) =>
      projectRef
        ? Object.values(p).some((v) => String(v) === projectRef)
        : toString(getField(p, ['_id', 'id'])) === projectRef,
    );
    const unitId = toString(getField(rawUnit, ['_id', 'id']));
    return adaptBubbleProperty(rawUnit, rawProject, saleIdsByUnit[unitId] ?? []);
  });
}

export function adaptBubbleInstallments(rawList: Raw[]): Payment[] {
  return rawList
    .filter(isActivePayment)
    .map((raw, index) => {
      const amount = toNumber(getField(raw, ['Monto programado', 'Cantidad', 'Monto', 'amount', 'Amount', 'Cantidad Total']));
      const paid = toNumber(getField(raw, ['Monto pagado', 'Monto Pagado', 'Ya Pagado', 'Pagado', 'Paid Amount', 'Abonado', 'paid_amount']));
      const pendingRaw = getField(raw, ['restante', 'Restante', 'Falta por Pagar', 'Pendiente', 'Pending Amount']);
      const hasPending = pendingRaw !== undefined && pendingRaw !== null;
      // `restante` is authoritative (a real 0 = fully paid); only compute
      // amount - paid when the field is missing.
      const pendingAmount = hasPending ? toNumber(pendingRaw) : Math.max(amount - paid, 0);
      const paidAmount = paid || Math.max(amount - pendingAmount, 0);
      return {
        _id: toString(getField(raw, ['_id', 'id']), `installment-${index}`),
        unitId: toString(getField(raw, ['Unidad', 'Unit', 'Unidad ID', 'Unit ID', 'project', 'Project'])),
        amount,
        interest: toNumber(getField(raw, ['interes_restante', 'Interes Restante', 'Intereses', 'Interest'])),
        status: toPaymentStatus(getField(raw, ['Estatus', 'Status', 'status'])),
        dueDate: toString(getField(raw, ['Fecha programada', 'due_date', 'Fecha Límite', 'Fecha Limite', 'Due Date', 'Fecha'])),
        paidAmount,
        pendingAmount,
      };
    });
}

export function adaptBubblePayments(rawList: Raw[]): AdaptedExecutedPayment[] {
  return rawList
    .filter(isActivePayment)
    .map((raw, index) => ({
      id: toString(getField(raw, ['_id', 'id']), `pago-${index}`),
      date: formatPaymentDate(toString(getField(raw, ['Fecha pago', 'Fecha Pago', 'Fecha programada', 'Fecha', 'paid_date', 'Date']))),
      method: toString(getField(raw, ['Metodo pago', 'Metodo de Pago', 'Método de Pago', 'Método', 'Metodo', 'Method']), 'Transferencia'),
      amount: toNumber(getField(raw, ['Monto programado', 'Monto', 'amount', 'Amount'])),
      receiptUrl: formatImageUrl(toString(getField(raw, ['Recibo', 'Comprobante', 'comprobante', 'comprobante_t', 'Comprobante t', 'Documento', 'Receipt', 'Archivo', 'file']))) ?? '',
    }));
}

export function adaptBubbleProgress(rawList: Raw[]): {
  specialties: Progress[];
  history: AdaptedProgressUpdate[];
} {
  const history: AdaptedProgressUpdate[] = rawList
    .map((raw, index) => {
      const overall = toNumber(getField(raw, ['Avance Obra General%', 'Avance General%', 'Avance Obra General', 'Avance General', 'Progreso General', 'Progreso', 'Overall Progress', 'general_progress']));
      const dateRaw = toString(getField(raw, ['fecha', 'Fecha', 'Fecha de Actualización', 'Fecha de Actualizacion', 'Date', 'Last Update', 'timestamp']));
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
        dateCard: formatCardDate(dateRaw),
        sortDate: parseDate(dateRaw)?.getTime() ?? 0,
        overall,
        parts,
        photos,
      };
    })
    .sort((a, b) => b.sortDate - a.sortDate)
    .map(({ sortDate: _sortDate, ...rest }) => rest);

  const latest = history.length > 0 ? history[0] : null;
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

function isVisibleRecord(raw: Raw): boolean {
  const value =
    raw['client visible'] ??
    raw['Client visible'] ?? // eslint-disable-line dot-notation
    raw['Visible'] ??
    raw['visible'] ??
    raw['Activo'] ??
    raw['activo'];
  if (value === undefined || value === null) return true;
  const normalized = String(value).toLowerCase();
  return normalized === 'yes' || normalized === 'true' || normalized === 'si' || normalized === '1';
}

export function adaptBubbleDocuments(rawList: Raw[]): Document[] {
  return rawList
    .filter(isVisibleRecord)
    .map((raw, index) => ({
      _id: toString(getField(raw, ['_id', 'id']), `doc-${index}`),
      title: toString(getField(raw, ['Título', 'Titulo', 'Title', 'Nombre', 'name']), 'Documento'),
      category: toString(getField(raw, ['Categoría', 'Categoria', 'Category', 'Tipo']), 'General'),
      fileUrl: formatImageUrl(toString(getField(raw, ['URL', 'Url', 'File URL', 'Archivo', 'Archivo URL', 'file']))) ?? '',
      createdDate: toString(getField(raw, ['Modified Date', 'Created Date', 'Fecha', 'Fecha de Creación', 'Fecha de Creacion'])),
    }));
}

export interface NextPayment {
  amount: number;
  dueDate: string;
  daysRemaining: number;
}

export function calculateSalePrice(payments: Payment[], fallback = 0): number {
  // Contract/unit price is authoritative; never add unverified amounts on top.
  if (fallback > 0) {
    return Math.round(fallback);
  }
  return Math.round(payments.reduce((total, payment) => total + (payment.amount ?? 0), 0));
}

export function calculateTotalPaid(payments: Payment[]): number {
  return Math.round(payments.reduce((sum, payment) => sum + (payment.paidAmount ?? 0), 0));
}

export function calculatePendingBalance(payments: Payment[], fallback = 0): number {
  const salePrice = calculateSalePrice(payments, fallback);
  const totalPaid = calculateTotalPaid(payments);
  if (salePrice > 0) {
    return Math.max(salePrice - totalPaid, 0);
  }
  return Math.round(payments.reduce((sum, payment) => sum + (payment.pendingAmount ?? 0), 0));
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function calculateOverdueBalance(payments: Payment[]): number {
  const today = startOfDay(new Date());
  return Math.round(
    payments
      .filter((payment) => {
        if (payment.pendingAmount <= 0 || !payment.dueDate) return false;
        const due = new Date(payment.dueDate);
        if (Number.isNaN(due.getTime())) return false;
        // Strictly past: scheduled calendar date is before today.
        return startOfDay(due) < today;
      })
      .reduce((sum, payment) => sum + (payment.pendingAmount ?? 0), 0),
  );
}

export function calculatePaidPercentage(payments: Payment[], fallback = 0): number {
  const salePrice = calculateSalePrice(payments, fallback);
  if (salePrice <= 0) return 0;
  return Math.round((calculateTotalPaid(payments) / salePrice) * 100);
}

export function getNextPayment(payments: Payment[]): NextPayment | null {
  const now = new Date();
  const upcoming = payments
    .filter((payment) => payment.status !== 'Pagado' && payment.dueDate && new Date(payment.dueDate) > now)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const next = upcoming[0];
  if (!next) return null;
  const due = new Date(next.dueDate);
  const daysRemaining = Math.max(0, Math.ceil((due.getTime() - now.getTime()) / 86400000));
  return {
    // Scheduled installment amount (Monto programado), not the partial unpaid balance.
    amount: next.amount,
    dueDate: next.dueDate,
    daysRemaining,
  };
}

export function formatCurrencyMXN(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

export function formatCompactMXN(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded >= 1_000_000) {
    return `$${(rounded / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}M`;
  }
  if (rounded >= 1_000) {
    return `$${(rounded / 1_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}K`;
  }
  return `$${rounded.toLocaleString('en-US')}`;
}

export { formatLongDate, formatShortDate, formatPaymentDate };

const USER_UNIT_LINK_KEYS = [
  'Unidades', 'Units', 'Unidad', 'Propiedades', 'Propiedad', 'assigned_units', 'Asignadas',
  'Proyectos Asignados', 'proyectos_asignados', 'Proyecto', 'Proyectos', 'Projects',
];
const UNIT_USER_LINK_KEYS = [
  'Cliente', 'Client', 'User', 'Usuario', 'Comprador', 'Propietario', 'Email', 'user_id', 'user', 'Cliente ID', 'Client ID',
];
const INACTIVE_STATUSES = ['baja', 'cancelada', 'inactiva', 'inactivo', 'suspendido'];

const EXCLUDED_META_KEYS = new Set([
  'Historial User',
  'Created By',
  'Modified By',
  'Created Date',
  'Modified Date',
  'user_signed_up',
  'authentication',
  'Lista de Permisos',
]);

/**
 * Deep, recursive property inspection: returns true if ANY string value (at any
 * nesting depth) in the record equals the user id or email (case-insensitive).
 * Audit/meta keys are excluded to avoid false positives.
 */
export function recordReferencesUser(
  record: Raw,
  userId: string,
  userEmail: string,
): boolean {
  const targets = [userId, userEmail]
    .filter((value) => value && value.length > 0)
    .map((value) => value.trim().toLowerCase());
  if (targets.length === 0) return false;

  const stack: Array<[unknown, string | null]> = [[record, null]];
  while (stack.length > 0) {
    const [value, key] = stack.pop() as [unknown, string | null];
    if (value === null || value === undefined) continue;
    if (key !== null && EXCLUDED_META_KEYS.has(key)) continue;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (targets.includes(normalized)) return true;
    } else if (Array.isArray(value)) {
      for (const item of value) {
        stack.push([item, key]);
      }
    } else if (typeof value === 'object') {
      for (const [childKey, childValue] of Object.entries(value as Raw)) {
        stack.push([childValue, childKey]);
      }
    }
  }
  return false;
}

function extractLinkedRefs(user: Raw | null): string[] {
  if (!user) return [];
  const refs: string[] = [];
  for (const field of USER_UNIT_LINK_KEYS) {
    const value = user[field];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === 'object') {
          const obj = item as Raw;
          refs.push(toString(obj._id ?? obj.id));
        } else {
          refs.push(String(item));
        }
      }
    } else if (typeof value === 'string') {
      refs.push(
        ...value
          .split(',')
          .map((part) => part.trim())
          .filter((part) => part.length > 0),
      );
    } else if (typeof value === 'number') {
      refs.push(String(value));
    }
  }
  return refs.filter((ref) => ref.length > 0);
}

/**
 * Dual-direction relational matching between a Bubble User and the Unit table.
 * Direction A: User -> Units (via Unidades/Units/Proyectos Asignados/Propiedades).
 * Direction B: Unit -> User (via Cliente/Client/User/Comprador/Propietario/Email).
 * Direction C: Admin/dev users without an explicit link get the active inventory (never mocks).
 */
export function matchUnitsToUser(
  rawUnits: Raw[],
  rawUser: Raw | null,
  userId: string,
  userEmail: string,
): Raw[] {
  if (rawUnits.length === 0) {
    return [];
  }

  // Direction A: user record lists its assigned units/properties/projects.
  const refs = extractLinkedRefs(rawUser);
  if (rawUser && refs.length > 0) {
    const refSet = new Set(refs);
    const matchedA = rawUnits.filter((unit) =>
      Object.values(unit).some((value) => refSet.has(String(value))),
    );
    if (matchedA.length > 0) {
      return matchedA;
    }
  }

  // Direction B: unit records reference the buyer/owner user (id or email).
  const targetValues = new Set<string>();
  if (userId) targetValues.add(userId);
  if (userEmail) targetValues.add(userEmail.trim().toLowerCase());

  const matchedB = rawUnits.filter((unit) =>
    UNIT_USER_LINK_KEYS.some((key) => {
      const value = getField(unit, [key]);
      if (value === undefined) return false;
      const normalized = String(value).trim().toLowerCase();
      return targetValues.has(normalized) || targetValues.has(String(value));
    }),
  );
  if (matchedB.length > 0) {
    return matchedB;
  }

  // Direction C: admin / dev users without explicit links see the active inventory.
  const role = rawUser ? toString(getField(rawUser, ['role', 'Rol', 'Role'])).toLowerCase() : '';
  const isAdmin = /admin|super|director|gerente/.test(role);
  if (isAdmin) {
    const active = rawUnits.filter((unit) => {
      const status = toString(getField(unit, ['Estado', 'Estatus', 'Status', 'status'])).toLowerCase();
      return !INACTIVE_STATUSES.includes(status);
    });
    return active.length > 0 ? active : rawUnits;
  }

  return [];
}