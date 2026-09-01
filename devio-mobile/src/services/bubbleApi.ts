import type { User } from '../types';

const TEST_BASE_URL = 'https://app.deviomx.com/version-test/api/1.1';
const LIVE_BASE_URL = 'https://app.deviomx.com/api/1.1';
const API_KEY = process.env.EXPO_PUBLIC_BUBBLE_API_KEY || '';

const BASE_URL =
  process.env.EXPO_PUBLIC_BUBBLE_BASE_URL ||
  (process.env.EXPO_PUBLIC_BUBBLE_ENV === 'live' ? LIVE_BASE_URL : TEST_BASE_URL);

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

export function filterRawByValue(rawList: Raw[], keys: string[], value: string): Raw[] {
  if (!value) return [];
  const targetNorms = keys.map(normKey);
  return rawList.filter((row) => {
    const rowEntries = Object.entries(row);
    return targetNorms.some((target) => {
      const match = rowEntries.find(([k]) => normKey(k) === target);
      return match !== undefined && String(match[1]) === value;
    });
  });
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_KEY) {
    throw new BubbleApiError(
      'Bubble API credentials are missing. Add EXPO_PUBLIC_BUBBLE_API_KEY to your .env file.',
    );
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
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

  return (await response.json()) as T;
}

async function fetchList(candidates: string[]): Promise<Raw[]> {
  let lastError: BubbleApiError | null = null;
  for (const path of candidates) {
    try {
      const data = await request<BubbleListResponse>(path);
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

const UNIT_PATH = ['/unit', '/obj/Unit'];
const PROJECT_PATH = ['/project', '/obj/Project'];
const INSTALLMENT_PATH = ['/installment', '/obj/Installment', '/obj/Installments'];
const PAYMENT_PATH = ['/pago', '/payments', '/obj/Payment', '/obj/Payments'];
const PROGRESS_PATH = ['/constructionupdate', '/progress', '/obj/ConstructionUpdate', '/obj/Progress'];
const DOCUMENT_PATH = ['/document', '/obj/Document'];
const USER_PATH = ['/user', '/obj/User'];

const USER_KEYS = ['Cliente', 'Client', 'Cliente ID', 'Client ID'];
const UNIT_KEYS = ['Unidad', 'Unit', 'Unidad ID', 'Unit ID', 'Project', 'project', 'Proyecto', 'Proyecto ID'];
const EMAIL_KEYS = ['Email', 'Correo', 'Correo Electronico'];

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

export async function fetchRawUnits(userId?: string): Promise<Raw[]> {
  const rows = await fetchList(UNIT_PATH);
  if (!userId) {
    return rows;
  }
  const direct = filterRawByValue(rows, USER_KEYS, userId);
  if (direct.length > 0) {
    return direct;
  }
  try {
    const users = await fetchList(USER_PATH);
    const currentUser = users.find((user) => String(user._id) === userId);
    if (currentUser) {
      const assigned = extractRefIds(
        currentUser['Proyectos Asignados'] ?? currentUser['proyectos_asignados'],
      );
      if (assigned.length > 0) {
        const filtered = rows.filter((row) =>
          assigned.some((projectId) =>
            Object.values(row).some((value) => String(value) === projectId),
          ),
        );
        return filtered;
      }
    }
  } catch {
    // Fall through to an empty result; mock data will take over.
  }
  return [];
}

export async function fetchRawProjects(): Promise<Raw[]> {
  return fetchList(PROJECT_PATH);
}

export async function fetchRawInstallments(unitId?: string): Promise<Raw[]> {
  const rows = await fetchList(INSTALLMENT_PATH);
  return unitId ? filterRawByValue(rows, UNIT_KEYS, unitId) : rows;
}

export async function fetchRawPayments(unitId?: string): Promise<Raw[]> {
  const rows = await fetchList(PAYMENT_PATH);
  return unitId ? filterRawByValue(rows, UNIT_KEYS, unitId) : rows;
}

export async function fetchRawProgress(unitId?: string): Promise<Raw[]> {
  const rows = await fetchList(PROGRESS_PATH);
  return unitId ? filterRawByValue(rows, UNIT_KEYS, unitId) : rows;
}

export async function fetchRawDocuments(unitId?: string): Promise<Raw[]> {
  const rows = await fetchList(DOCUMENT_PATH);
  return unitId ? filterRawByValue(rows, UNIT_KEYS, unitId) : rows;
}

export async function login(email: string, password: string): Promise<User> {
  const loginCandidates: Array<{ path: string; body: { email: string; password: string } }> = [
    { path: '/wf/login', body: { email, password } },
    { path: '/obj/user/login', body: { email, password } },
  ];

  let lastError: unknown = null;
  for (const candidate of loginCandidates) {
    try {
      const data = await request<BubbleLoginResponse>(candidate.path, {
        method: 'POST',
        body: JSON.stringify(candidate.body),
      });
      const token = data?.response?.token ?? data?.response?.accessToken;
      if (token || data?.response?.user) {
        const user = data?.response?.user ?? {};
        return {
          _id: toString(user._id),
          email: toString(user.email, email),
          name: toString(user.name),
          role: toString(user.role, 'Client'),
          token: toString(token),
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
    }
  }

  const userRow = await findUserByEmail(email);
  if (userRow) {
    return {
      _id: toString(userRow._id),
      email: toString(userRow.email, email),
      name: toString(userRow.Name ?? userRow.name ?? userRow.Nombre),
      role: toString(userRow.Role ?? userRow.role ?? userRow.Rol, 'Client'),
      token: 'bubble-session-token',
    };
  }

  if (lastError instanceof BubbleApiError && lastError.statusCode === 401) {
    throw new BubbleApiError('Credenciales incorrectas', 401, lastError.details);
  }
  throw new BubbleApiError('Credenciales incorrectas');
}

async function findUserByEmail(email: string): Promise<Raw | null> {
  try {
    const rows = await fetchList(USER_PATH);
    const targetNorms = EMAIL_KEYS.map(normKey);
    const match = rows.find((row) =>
      Object.entries(row).some(
        ([k, v]) => targetNorms.includes(normKey(k)) && String(v) === email,
      ),
    );
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

export { buildConstraints };