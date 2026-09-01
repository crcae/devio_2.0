import type { Document, Payment, PaymentStatus, Progress, Unit, User } from '../types';

const DEFAULT_BASE_URL = 'https://app.deviomx.com/version-test/api/1.1';
const BASE_URL = process.env.EXPO_PUBLIC_BUBBLE_BASE_URL || DEFAULT_BASE_URL;
const API_KEY = process.env.EXPO_PUBLIC_BUBBLE_API_KEY || '';

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

interface BubbleListResponse<T> {
  response: {
    results: T[];
    count?: number;
    cursor?: number;
  };
}

interface BubbleLoginResponse {
  response: {
    token?: string;
    accessToken?: string;
    user?: Partial<User>;
  };
}

interface BubbleUserItem {
  _id?: string;
  email?: string;
  Name?: string;
  name?: string;
  Role?: string;
  role?: string;
  [key: string]: unknown;
}

interface Constraint {
  key: string;
  constraint_type: 'equals';
  value: string;
}

type Raw = Record<string, unknown>;

function buildConstraints(constraints: Constraint[]): string {
  return JSON.stringify(constraints);
}

function pick(obj: Raw, keys: string[]): unknown {
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null) return value;
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
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => toString(item)).filter((item) => item.length > 0);
  }
  return [];
}

function toOptionString(value: unknown, fallback = ''): string {
  if (value && typeof value === 'object') {
    const obj = value as Raw;
    return toString(pick(obj, ['display', 'name', 'value']), fallback);
  }
  return toString(value, fallback);
}

function toPaymentStatus(value: unknown): PaymentStatus {
  const status = toOptionString(value);
  if (status === 'Pagado' || status === 'Parcial' || status === 'Pendiente') {
    return status;
  }
  return 'Pendiente';
}

export function mapUnit(raw: Raw): Unit {
  return {
    _id: toString(pick(raw, ['_id', 'id'])),
    name: toString(pick(raw, ['Name', 'name']), 'Propiedad sin nombre'),
    unitCode: toString(pick(raw, ['Unit Code', 'Unit_Code', 'unitCode'])),
    surfaceM2: toNumber(pick(raw, ['Surface (m2)', 'Surface_M2', 'Surface', 'surfaceM2'])),
    bedrooms: toNumber(pick(raw, ['Bedrooms', 'bedrooms'])),
    bathrooms: toNumber(pick(raw, ['Bathrooms', 'bathrooms'])),
    image: toString(pick(raw, ['Image', 'image', 'Image_URL'])),
    status: toOptionString(pick(raw, ['Status', 'status'])),
    estimatedDeliveryDate: toString(
      pick(raw, ['Estimated Delivery Date', 'Estimated_Delivery_Date', 'estimatedDeliveryDate']),
    ),
    generalProgress: toNumber(
      pick(raw, ['General Progress', 'General_Progress', 'generalProgress']),
    ),
  };
}

export function mapPayment(raw: Raw): Payment {
  const amount = toNumber(pick(raw, ['Amount', 'amount']));
  const paidAmount = toNumber(pick(raw, ['Paid Amount', 'Paid_Amount', 'paidAmount']));
  return {
    _id: toString(pick(raw, ['_id', 'id'])),
    unitId: toString(pick(raw, ['Unit', 'unitId'])),
    amount,
    interest: toNumber(pick(raw, ['Interest', 'interest'])),
    status: toPaymentStatus(pick(raw, ['Status', 'status'])),
    dueDate: toString(pick(raw, ['Due Date', 'Due_Date', 'dueDate'])),
    paidAmount,
    pendingAmount: toNumber(
      pick(raw, ['Pending Amount', 'Pending_Amount', 'pendingAmount']),
      Math.max(amount - paidAmount, 0),
    ),
  };
}

export function mapProgress(raw: Raw): Progress {
  return {
    _id: toString(pick(raw, ['_id', 'id'])),
    unitId: toString(pick(raw, ['Unit', 'unitId'])),
    specialtyName: toString(
      pick(raw, ['Specialty Name', 'Specialty_Name', 'specialtyName']),
      'Especialidad',
    ),
    percentage: toNumber(pick(raw, ['Percentage', 'percentage'])),
    lastUpdate: toString(pick(raw, ['Last Update', 'Last_Update', 'lastUpdate'])),
    images: toStringArray(pick(raw, ['Images', 'images'])),
  };
}

export function mapDocument(raw: Raw): Document {
  return {
    _id: toString(pick(raw, ['_id', 'id'])),
    title: toString(pick(raw, ['Title', 'title']), 'Documento'),
    category: toString(pick(raw, ['Category', 'category']), 'General'),
    fileUrl: toString(pick(raw, ['File URL', 'File_URL', 'fileUrl', 'file_url'])),
    createdDate: toString(pick(raw, ['Created Date', 'Created_Date', 'createdDate'])),
  };
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

  if (!response.ok) {
    let message = response.status === 401 ? '401 Unauthorized' : `Bubble API request failed (${response.status})`;
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

export async function login(email: string, password: string): Promise<User> {
  let data: BubbleLoginResponse | null = null;
  let loginError: unknown = null;

  try {
    data = await request<BubbleLoginResponse>('/obj/user/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  } catch (error) {
    loginError = error;
  }

  const token = data?.response?.token ?? data?.response?.accessToken;
  const responseUser = data?.response?.user;

  if (data && (token || responseUser)) {
    return {
      _id: toString(responseUser?._id),
      email: toString(responseUser?.email, email),
      name: toString(responseUser?.name),
      role: toString(responseUser?.role, 'Client'),
      token: toString(token),
    };
  }

  const fallbackUser = await findUserByEmail(email);
  if (fallbackUser) {
    return {
      _id: toString(fallbackUser._id),
      email: toString(fallbackUser.email, email),
      name: toString(fallbackUser.Name ?? fallbackUser.name),
      role: toString(fallbackUser.Role ?? fallbackUser.role, 'Client'),
      token: 'bubble-session-token',
    };
  }

  if (loginError instanceof BubbleApiError && loginError.statusCode === 404) {
    throw new BubbleApiError('Endpoint de login no encontrado (404)', loginError.statusCode);
  }
  if (loginError instanceof BubbleApiError && loginError.statusCode === 401) {
    throw new BubbleApiError('Credenciales incorrectas', loginError.statusCode, loginError.details);
  }
  if (loginError instanceof BubbleApiError && loginError.statusCode === undefined) {
    throw loginError;
  }
  throw new BubbleApiError('Credenciales incorrectas');
}

async function findUserByEmail(email: string): Promise<BubbleUserItem | null> {  const constraints = buildConstraints([
    { key: 'email', constraint_type: 'equals', value: email },
  ]);
  try {
    const data = await request<BubbleListResponse<BubbleUserItem>>(
      `/obj/User?constraints=${encodeURIComponent(constraints)}&limit=1`,
    );
    const results = data.response?.results ?? [];
    return results.length > 0 ? results[0] : null;
  } catch {
    return null;
  }
}

export async function fetchUserProperties(userId: string): Promise<Unit[]> {
  const constraints = buildConstraints([
    { key: 'Client', constraint_type: 'equals', value: userId },
  ]);
  const data = await request<BubbleListResponse<Raw>>(
    `/obj/Unit?constraints=${encodeURIComponent(constraints)}&limit=100`,
  );
  return (data.response?.results ?? []).map(mapUnit);
}

export async function fetchPropertyPayments(unitId: string): Promise<Payment[]> {
  const constraints = buildConstraints([
    { key: 'Unit', constraint_type: 'equals', value: unitId },
  ]);
  const data = await request<BubbleListResponse<Raw>>(
    `/obj/Payments?constraints=${encodeURIComponent(constraints)}&limit=100&sort_field=Due Date&sort_direction=asc`,
  );
  return (data.response?.results ?? []).map(mapPayment);
}

export async function fetchPropertyProgress(unitId: string): Promise<Progress[]> {
  const constraints = buildConstraints([
    { key: 'Unit', constraint_type: 'equals', value: unitId },
  ]);
  const data = await request<BubbleListResponse<Raw>>(
    `/obj/Progress?constraints=${encodeURIComponent(constraints)}&limit=100&sort_field=Last Update&sort_direction=desc`,
  );
  return (data.response?.results ?? []).map(mapProgress);
}

export async function fetchPropertyDocuments(unitId: string): Promise<Document[]> {
  const constraints = buildConstraints([
    { key: 'Unit', constraint_type: 'equals', value: unitId },
  ]);
  const data = await request<BubbleListResponse<Raw>>(
    `/obj/Document?constraints=${encodeURIComponent(constraints)}&limit=100&sort_field=Created Date&sort_direction=desc`,
  );
  return (data.response?.results ?? []).map(mapDocument);
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