import type { User } from '../types';
import { formatImageUrl, matchUnitsToUser } from './bubbleAdapter';

const TEST_BASE_URL = 'https://app.deviomx.com/version-test/api/1.1';
const LIVE_BASE_URL = 'https://app.deviomx.com/api/1.1';
const API_KEY = process.env.EXPO_PUBLIC_BUBBLE_API_KEY || '';

const BASE_URL =
  process.env.EXPO_PUBLIC_BUBBLE_BASE_URL ||
  (process.env.EXPO_PUBLIC_BUBBLE_ENV === 'live' ? LIVE_BASE_URL : TEST_BASE_URL);

let activeBaseUrl: string = BASE_URL;

export function getActiveBaseUrl(): string {
  return activeBaseUrl;
}

export function setActiveBaseUrl(baseUrl: string): void {
  activeBaseUrl = baseUrl || BASE_URL;
}

export class BubbleApiError extends Error {
  statusCode?: number;
  details?: unknown;

  constructor(message: string, statusCode?: number, details?: unknown) {
    super(message);
    this.name = 'BubbleApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export type Raw = Record<string, unknown>;

interface BubbleListResponse {
  response?: {
    results?: Raw[];
    count?: number;
  };
}

interface BubbleLoginResponse {
  response?: {
    token?: string;
    accessToken?: string;
    user?: Partial<User>;
  };
}

interface Constraint {
  key: string;
  constraint_type: 'equals';
  value: string;
}

function buildConstraints(constraints: Constraint[]): string {
  return JSON.stringify(constraints);
}

function normKey(key: string): string {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_]+/g, '');
}

function toString(value: unknown, fallback = ''): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

export function filterRawByValue(rawList: Raw[], keys: string[], values: string[]): Raw[] {
  const activeValues = values.filter((value) => value && value.length > 0);
  if (activeValues.length === 0) return [];
  const targetNorms = keys.map(normKey);
  return rawList.filter((row) => {
    const rowEntries = Object.entries(row);
    return targetNorms.some((target) => {
      const match = rowEntries.find(([k]) => normKey(k) === target);
      return match !== undefined && activeValues.some((value) => String(match[1]) === value);
    });
  });
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  baseUrl: string = activeBaseUrl,
): Promise<T> {
  if (!API_KEY) {
    throw new BubbleApiError(
      'Bubble API credentials are missing. Add EXPO_PUBLIC_BUBBLE_API_KEY to your .env file.',
    );
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch (error) {
    throw new BubbleApiError(
      'Error de conexión con Bubble',
      undefined,
      error instanceof Error ? error.message : String(error),
    );
  }

  if (__DEV__) {
    console.log(`[BubbleAPI] ${options.method ?? 'GET'} ${path} -> ${response.status} ${response.ok ? 'OK' : ''}`);
  }

  if (!response.ok) {
    let message =
      response.status === 401
        ? '401 Unauthorized'
        : response.status === 404
          ? `Endpoint no encontrado (404): ${path}`
          : `Bubble API request failed (${response.status})`;
    let details: unknown;
    try {
      const body = (await response.json()) as { message?: string; error?: string };
      message = body.message || body.error || message;
      details = body;
    } catch {
      // Ignore: body is not valid JSON
    }
    throw new BubbleApiError(message, response.status, details);
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined as T;
  }
}

async function fetchList(candidates: string[], baseUrl: string = activeBaseUrl): Promise<Raw[]> {
  let lastError: BubbleApiError | null = null;
  for (const path of candidates) {
    try {
      const data = await request<BubbleListResponse>(path, {}, baseUrl);
      return data.response?.results ?? [];
    } catch (error) {
      if (error instanceof BubbleApiError && error.statusCode === 404) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  throw lastError ?? new BubbleApiError('No API endpoints available');
}

const UNIT_PATH = ['/obj/Unit', '/obj/Project'];
const PROJECT_PATH = ['/obj/Project'];
const INSTALLMENT_PATH = ['/obj/Installment'];
const PAYMENT_PATH = ['/obj/Payments', '/obj/Pago'];
const PROGRESS_PATH = ['/obj/ConstructionUpdate', '/obj/Progress'];
const DOCUMENT_PATH = ['/obj/Document'];
const USER_PATH = ['/obj/User'];
const SALES_PATH = ['/obj/sales', '/obj/Sales'];

const EMAIL_KEYS = ['email', 'Correo', 'Mail', 'User Email'];

const INSTALLMENT_FILTER_KEYS = ['Unidad', 'Unit', 'Unidad ID', 'Unit ID', 'User', 'Usuario', 'Cliente', 'unit', 'user', 'cotizacion', 'Venta', 'Sale'];
const PAYMENT_FILTER_KEYS = ['Unidad', 'Unit', 'Unidad ID', 'Unit ID', 'User', 'Usuario', 'Cliente', 'Client', 'unit', 'user', 'cotizacion', 'Venta', 'Sale'];
const PROGRESS_FILTER_KEYS = ['Unidad', 'Unit', 'Unidad ID', 'Unit ID', 'Project', 'project', 'Proyecto', 'Proyecto ID', 'User', 'Usuario', 'cotizacion', 'Venta', 'Sale'];
const DOCUMENT_FILTER_KEYS = ['Unidad', 'Unit', 'Unidad ID', 'Unit ID', 'User', 'Usuario', 'Cliente', 'Client', 'unit', 'user', 'cotizacion', 'Venta', 'Sale'];
const SALE_USER_KEYS = ['client', 'Client', 'Cliente', 'user', 'User', 'Usuario', 'comprador', 'Comprador', 'Correo'];

function extractRefIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === 'object') {
          const obj = item as Raw;
          return String(obj._id ?? obj.id ?? '');
        }
        return String(item);
      })
      .filter((id) => id.length > 0);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }
  return [];
}

function extractSaleUnitIds(sales: Raw[]): string[] {
  const ids: string[] = [];
  for (const sale of sales) {
    const ref =
      sale['unidad'] ?? sale['unit'] ?? sale['Unit'] ?? sale['Unidad'] ?? sale['property'] ?? sale['Property'];
    if (ref === undefined || ref === null) continue;
    let id = '';
    if (typeof ref === 'object') {
      id = String((ref as Raw)._id ?? (ref as Raw).id ?? '');
    } else {
      id = String(ref);
    }
    if (id) ids.push(id);
  }
  return ids;
}

export function buildSaleIdsByUnit(sales: Raw[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const sale of sales) {
    const ref =
      sale['unidad'] ?? sale['unit'] ?? sale['Unit'] ?? sale['Unidad'] ?? sale['property'] ?? sale['Property'];
    if (ref === undefined || ref === null) continue;
    let unitId = '';
    if (typeof ref === 'object') {
      unitId = String((ref as Raw)._id ?? (ref as Raw).id ?? '');
    } else {
      unitId = String(ref);
    }
    if (!unitId) continue;
    const saleId = String(sale._id ?? sale.id ?? '');
    if (!saleId) continue;
    (map[unitId] = map[unitId] || []).push(saleId);
  }
  return map;
}

export async function fetchRawSalesForUser(userId?: string): Promise<Raw[]> {
  const rows = await fetchList(SALES_PATH);
  if (!userId) {
    return rows;
  }
  const byUser = filterRawByValue(rows, SALE_USER_KEYS, [userId]);
  return byUser.filter((sale) => {
    const visible = sale['visible'] ?? sale['Visible'] ?? sale['activo'] ?? sale['Activo'];
    if (visible === undefined || visible === null) return true;
    return String(visible).toLowerCase() !== 'false' && String(visible) !== '0';
  });
}

async function constraintQueryUnit(key: string, value: string): Promise<Raw[]> {
  try {
    const constraints = encodeURIComponent(
      JSON.stringify([{ key, constraint_type: 'equals', value }]),
    );
    return await fetchList(
      UNIT_PATH.map((path) => `${path}?constraints=${constraints}&limit=100`),
    );
  } catch {
    return [];
  }
}

async function fetchUnitById(unitId: string): Promise<Raw | null> {
  try {
    const data = await request<BubbleListResponse>(`/obj/Unit/${unitId}`);
    const response = data.response;
    if (!response) return null;
    if (Array.isArray((response as { results?: Raw[] }).results)) {
      return (response as { results: Raw[] }).results[0] ?? null;
    }
    if (typeof response === 'object') {
      return response as Raw;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchRawUnits(userId?: string): Promise<Raw[]> {
  const rows = await fetchList(UNIT_PATH);
  if (!userId) {
    return rows;
  }

  const matched = new Map<string, Raw>();

  // 1) Strategy A: direct constraint queries (client, then cliente, then usuario/user).
  for (const key of ['client', 'cliente', 'usuario', 'user']) {
    const byConstraint = await constraintQueryUnit(key, userId);
    if (byConstraint.length > 0) {
      byConstraint.forEach((unit) => matched.set(String(unit._id), unit));
      break;
    }
  }

  // 2) Strategy B: user's own unit arrays (unidades / units / unidad).
  let rawUser: Raw | null = null;
  try {
    const users = await fetchList(USER_PATH);
    rawUser = users.find((user) => String(user._id) === userId) ?? null;
  } catch {
    rawUser = null;
  }
  const unitRefs = extractRefIds(rawUser?.['unidades'] ?? rawUser?.['units'] ?? rawUser?.['Unidades'] ?? rawUser?.['Units'] ?? rawUser?.['unidad'] ?? rawUser?.['Unidad'] ?? rawUser?.['assigned_units']);
  for (const ref of unitRefs) {
    const byId = await fetchUnitById(ref);
    if (byId) {
      matched.set(String(byId._id), byId);
    }
    const byValue = rows.find((unit) => Object.values(unit).some((v) => String(v) === ref));
    if (byValue) {
      matched.set(String(byValue._id), byValue);
    }
  }

  // 3) Sales join table (client -> unidad).
  try {
    const sales = await fetchRawSalesForUser(userId);
    const saleUnitIds = extractSaleUnitIds(sales);
    rows
      .filter((unit) => saleUnitIds.includes(String(unit._id)))
      .forEach((unit) => matched.set(String(unit._id), unit));
  } catch {
    // Best-effort; continue with other strategies.
  }

  // 4) Final fallback: dual-direction User <-> Unit matching (incl. admin inventory).
  if (matched.size === 0) {
    const userEmail = rawUser ? (nestedAuthEmail(rawUser) || findUserEmail(rawUser)) : '';
    matchUnitsToUser(rows, rawUser, userId, userEmail).forEach((unit) =>
      matched.set(String(unit._id), unit),
    );
  }

  if (__DEV__) {
    console.log(
      `[BubbleAuth] User ID: ${userId} | User Email: ${rawUser ? (nestedAuthEmail(rawUser) || findUserEmail(rawUser)) : 'N/A'} | Linked Unit Count: ${matched.size}`,
    );
  }
  return Array.from(matched.values());
}

export async function fetchRawProjects(): Promise<Raw[]> {
  return fetchList(PROJECT_PATH);
}

export async function fetchRawInstallments(filterValues: string[] = []): Promise<Raw[]> {
  const rows = await fetchList(INSTALLMENT_PATH);
  return filterRawByValue(rows, INSTALLMENT_FILTER_KEYS, filterValues);
}

export async function fetchRawPayments(filterValues: string[] = []): Promise<Raw[]> {
  const rows = await fetchList(PAYMENT_PATH);
  return filterRawByValue(rows, PAYMENT_FILTER_KEYS, filterValues);
}

export async function fetchRawProgress(filterValues: string[] = []): Promise<Raw[]> {
  const rows = await fetchList(PROGRESS_PATH);
  return filterRawByValue(rows, PROGRESS_FILTER_KEYS, filterValues);
}

export async function fetchRawDocuments(filterValues: string[] = []): Promise<Raw[]> {
  const rows = await fetchList(DOCUMENT_PATH);
  return filterRawByValue(rows, DOCUMENT_FILTER_KEYS, filterValues);
}

export async function login(email: string, password: string): Promise<User> {
  // Try the configured environment first, then automatically fall back to the
  // alternate Live/Development environment so credentials for either backend
  // authenticate seamlessly.
  const baseCandidates: string[] = [BASE_URL];
  const alternateBase = BASE_URL === LIVE_BASE_URL ? TEST_BASE_URL : LIVE_BASE_URL;
  if (alternateBase && alternateBase !== BASE_URL) {
    baseCandidates.push(alternateBase);
  }

  let lastError: unknown = null;
  for (const baseUrl of baseCandidates) {
    try {
      const user = await authenticateAgainst(email, password, baseUrl);
      activeBaseUrl = baseUrl;
      if (__DEV__ && baseUrl !== BASE_URL) {
        console.log(`[BubbleEnv] Authenticated against alternate environment: ${baseUrl}`);
      }
      return user;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new BubbleApiError('Credenciales incorrectas');
}

async function authenticateAgainst(email: string, password: string, baseUrl: string): Promise<User> {
  // 1) Attempt password validation workflows first (if configured in Bubble).
  const workflowCandidates: Array<{ path: string; body: { email: string; password: string } }> = [
    { path: '/wf/login', body: { email, password } },
    { path: '/wf/mobile_login', body: { email, password } },
    { path: '/obj/user/login', body: { email, password } },
  ];

  let lastError: unknown = null;
  for (const candidate of workflowCandidates) {
    try {
      const data = await request<BubbleLoginResponse>(
        candidate.path,
        {
          method: 'POST',
          body: JSON.stringify(candidate.body),
        },
        baseUrl,
      );
      const token = data?.response?.token ?? data?.response?.accessToken;
      if (token || data?.response?.user) {
        const rawUser = (data?.response?.user ?? {}) as Raw;
        return {
          _id: toString(rawUser._id),
          email: toString(rawUser.email, email),
          name: toString(rawUser.name ?? rawUser.Nombre),
          role: toString(rawUser.role ?? rawUser.Role ?? rawUser.Rol, 'Client'),
          token: toString(token),
          assignedProperties: extractRefIds(
            rawUser['Proyectos Asignados'] ?? rawUser['Unidades'] ?? rawUser.assignedProperties,
          ),
          photoUrl: formatImageUrl(toString(rawUser['foto de perfil'] ?? rawUser.avatar ?? rawUser.Avatar)) ?? '',
        };
      }
    } catch (error) {
      lastError = error;
      if (error instanceof BubbleApiError && error.statusCode === 404) {
        continue;
      }
      if (error instanceof BubbleApiError && error.statusCode === 401) {
        throw new BubbleApiError('Credenciales incorrectas', 401, error.details);
      }
      if (error instanceof BubbleApiError && error.statusCode === undefined) {
        throw error;
      }
      // 5xx or other server errors: fall through to Data API verification.
    }
  }

  // 2) Verify the user profile exists via Data API email lookup.
  const userRow = await queryUserByEmail(email, baseUrl);
  if (!userRow) {
    if (lastError instanceof BubbleApiError && lastError.statusCode === 401) {
      throw new BubbleApiError('Credenciales incorrectas', 401, lastError.details);
    }
    throw new BubbleApiError('Credenciales incorrectas');
  }
  if (!isUserActive(userRow)) {
    throw new BubbleApiError('Tu cuenta está inactiva. Contacta a tu asesor DEVIO.');
  }

  return {
    _id: toString(userRow._id),
    email: findUserEmail(userRow) || email,
    name: toString(userRow.Nombre ?? userRow.name ?? userRow.Name),
    role: toString(userRow.role ?? userRow.Role ?? userRow.Rol, 'Client'),
    token: 'bubble-session-token',
    assignedProperties: extractRefIds(
      userRow['Proyectos Asignados'] ?? userRow['Unidades'] ?? userRow.proyectos_asignados,
    ),
    photoUrl: formatImageUrl(toString(userRow['foto de perfil'] ?? userRow.avatar ?? userRow.Avatar)) ?? '',
  };
}

function buildEmailConstraint(key: string, email: string): string {
  return JSON.stringify([{ key, exact_match: true, value: email }]);
}

function nestedAuthEmail(row: Raw): string {
  const auth = row['authentication'];
  if (auth && typeof auth === 'object') {
    const authObj = auth as Raw;
    const emailObj = authObj['email'];
    if (emailObj && typeof emailObj === 'object') {
      const emailValue = (emailObj as Raw)['email'];
      if (typeof emailValue === 'string') {
        return emailValue;
      }
    }
    const emailValue = authObj['email'];
    if (typeof emailValue === 'string') {
      return emailValue;
    }
  }
  return '';
}

function emailFieldValue(row: Raw, target: string): string {
  const found = Object.entries(row).find(
    ([k, v]) => EMAIL_KEYS.some((key) => normKey(key) === normKey(k)) && typeof v === 'string',
  );
  const direct = found ? String(found[1]).trim().toLowerCase() : '';
  if (direct) {
    return direct;
  }
  return nestedAuthEmail(row).trim().toLowerCase();
}

function findUserEmail(row: Raw): string {
  const found = Object.entries(row).find(
    ([k, v]) => EMAIL_KEYS.some((key) => normKey(key) === normKey(k)) && typeof v === 'string',
  );
  if (found) {
    return String(found[1]);
  }
  return nestedAuthEmail(row);
}

function isUserActive(row: Raw): boolean {
  const value = row['Activo'] ?? row['Active'] ?? row['Estatus'] ?? row['status'] ?? row['Baja'];
  if (value === undefined || value === null) return true;
  const normalized = String(value).toLowerCase();
  return !(
    normalized === 'false' ||
    normalized === '0' ||
    normalized === 'inactivo' ||
    normalized === 'inactiva' ||
    normalized === 'baja' ||
    normalized === 'disabled' ||
    normalized === 'suspendido'
  );
}

async function queryUserByEmail(email: string, baseUrl: string = BASE_URL): Promise<Raw | null> {
  const target = email.trim().toLowerCase();

  // 1) Single constraint-based lookup on the primary `email` field.
  try {
    const constraints = buildEmailConstraint('email', email.trim());
    const rows = await fetchList(
      USER_PATH.map((path) => `${path}?constraints=${encodeURIComponent(constraints)}&limit=5`),
      baseUrl,
    );
    const match = rows.find((row) => emailFieldValue(row, target) === target);
    if (match) {
      return match;
    }
  } catch {
    // Fall through to the client-side scan below.
  }

  // 2) Client-side case-insensitive scan across all email field variants
  //    (email, Correo, Mail, User Email) plus Bubble's nested
  //    authentication.email.email structure.
  try {
    const rows = await fetchList(USER_PATH, baseUrl);
    const match = rows.find((row) => emailFieldValue(row, target) === target);
    return match ?? null;
  } catch {
    return null;
  }
}

export async function updateUserPushToken(userId: string, pushToken: string): Promise<void> {
  if (!userId || !pushToken) {
    return;
  }
  await request<void>(`/obj/User/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      'Push notification token': pushToken,
    }),
  });
}

export interface ProfileUpdates {
  name?: string;
  photoUrl?: string;
}

export async function updateUserProfile(userId: string, updates: ProfileUpdates): Promise<void> {
  if (!userId) {
    throw new BubbleApiError('No se puede actualizar: falta el ID de usuario.');
  }
  const body: Raw = {};
  if (updates.name !== undefined && updates.name.trim() !== '') {
    body['Nombre'] = updates.name.trim();
  }
  if (updates.photoUrl !== undefined) {
    const normalized = formatImageUrl(updates.photoUrl) ?? '';
    body['foto de perfil'] = normalized;
  }
  if (Object.keys(body).length === 0) {
    return;
  }
  await request<void>(`/obj/User/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export { buildConstraints };