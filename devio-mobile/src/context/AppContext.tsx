import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Document, Payment, Progress, Unit, User } from '../types';
import {
  BubbleApiError,
  fetchRawDocuments,
  fetchRawInstallments,
  fetchRawPayments,
  fetchRawProgress,
  fetchRawProjects,
  fetchRawUnits,
  login as bubbleLogin,
  updateUserPushToken,
} from '../services/bubbleApi';
import {
  adaptBubbleDocuments,
  adaptBubbleInstallments,
  adaptBubblePayments,
  adaptBubbleProgress,
  adaptBubbleProperties,
  type AdaptedExecutedPayment,
  type AdaptedProgressUpdate,
} from '../services/bubbleAdapter';
import { registerForPushNotificationsAsync } from '../services/pushNotifications';
import {
  MOCK_DOCUMENTS,
  MOCK_EXECUTED_PAYMENTS,
  MOCK_PAYMENTS,
  MOCK_PROGRESS,
  MOCK_PROGRESS_HISTORY,
  MOCK_PROPERTIES,
  MOCK_USER,
} from '../services/mockData';

const SESSION_KEY = '@devio/session';

const USE_MOCK_DATA = process.env.EXPO_PUBLIC_USE_MOCK_DATA === 'true';

interface AppContextValue {
  user: User | null;
  userProperties: Unit[];
  selectedProperty: Unit | null;
  payments: Payment[];
  progress: Progress[];
  documents: Document[];
  executedPayments: AdaptedExecutedPayment[];
  progressHistory: AdaptedProgressUpdate[];
  isAuthenticated: boolean;
  isDemoMode: boolean;
  isRestoringSession: boolean;
  isLoading: boolean;
  dataLoading: boolean;
  login: (email: string, password: string, useMock?: boolean) => Promise<void>;
  logout: () => void;
  setSelectedProperty: (property: Unit) => void;
  loadUserProperties: (userId: string) => Promise<void>;
  loadPayments: (unitId: string) => Promise<void>;
  loadProgress: (unitId: string) => Promise<void>;
  loadDocuments: (unitId: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProperties, setUserProperties] = useState<Unit[]>([]);
  const [selectedProperty, setSelectedPropertyState] = useState<Unit | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [executedPayments, setExecutedPayments] = useState<AdaptedExecutedPayment[]>([]);
  const [progressHistory, setProgressHistory] = useState<AdaptedProgressUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [usedMockFallback, setUsedMockFallback] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  const pendingRequests = useRef(0);

  const isAuthenticated = user !== null;
  const isDemoMode = USE_MOCK_DATA || usedMockFallback;

  const setBusy = useCallback((delta: number) => {
    pendingRequests.current = Math.max(0, pendingRequests.current + delta);
    setDataLoading(pendingRequests.current > 0);
  }, []);

  const showDiagnostic = useCallback((error: unknown) => {
    if (USE_MOCK_DATA) return;
    const message =
      error instanceof BubbleApiError
        ? `Status: ${error.statusCode ?? 'N/A'}\n${error.message}`
        : error instanceof Error
          ? error.message
          : String(error);
    Alert.alert('Error de conexión con Bubble', message);
  }, []);

  const loadUserProperties = useCallback(
    async (userId: string) => {
      if (USE_MOCK_DATA) {
        setUserProperties(MOCK_PROPERTIES);
        setSelectedPropertyState((current) => current ?? MOCK_PROPERTIES[0] ?? null);
        return;
      }
      setBusy(1);
      try {
        const [rawUnits, rawProjects] = await Promise.all([
          fetchRawUnits(userId),
          fetchRawProjects(),
        ]);
        const properties = adaptBubbleProperties(rawUnits, rawProjects);
        if (properties.length > 0) {
          setUserProperties(properties);
          setSelectedPropertyState((current) => current ?? properties[0] ?? null);
          return;
        }
        setUserProperties(MOCK_PROPERTIES);
        setSelectedPropertyState((current) => current ?? MOCK_PROPERTIES[0] ?? null);
        setUsedMockFallback(true);
      } catch (error) {
        setUserProperties(MOCK_PROPERTIES);
        setSelectedPropertyState((current) => current ?? MOCK_PROPERTIES[0] ?? null);
        setUsedMockFallback(true);
        showDiagnostic(error);
      } finally {
        setBusy(-1);
      }
    },
    [setBusy, showDiagnostic],
  );

  const loadPayments = useCallback(
    async (unitId: string) => {
      if (USE_MOCK_DATA) {
        setPayments(MOCK_PAYMENTS);
        setExecutedPayments(MOCK_EXECUTED_PAYMENTS);
        return;
      }
      setBusy(1);
      try {
        const [rawInstallments, rawPagos] = await Promise.all([
          fetchRawInstallments(unitId),
          fetchRawPayments(unitId),
        ]);
        const installments = adaptBubbleInstallments(rawInstallments);
        const executed = adaptBubblePayments(rawPagos);
        setPayments(installments.length > 0 ? installments : MOCK_PAYMENTS);
        setExecutedPayments(executed.length > 0 ? executed : MOCK_EXECUTED_PAYMENTS);
        if (installments.length === 0 || executed.length === 0) {
          setUsedMockFallback(true);
        }
      } catch (error) {
        setPayments(MOCK_PAYMENTS);
        setExecutedPayments(MOCK_EXECUTED_PAYMENTS);
        setUsedMockFallback(true);
        showDiagnostic(error);
      } finally {
        setBusy(-1);
      }
    },
    [setBusy, showDiagnostic],
  );

  const loadProgress = useCallback(
    async (unitId: string) => {
      if (USE_MOCK_DATA) {
        setProgress(MOCK_PROGRESS);
        setProgressHistory(MOCK_PROGRESS_HISTORY);
        return;
      }
      setBusy(1);
      try {
        const rawUpdates = await fetchRawProgress(unitId);
        const { specialties, history } = adaptBubbleProgress(rawUpdates);
        setProgress(specialties.length > 0 ? specialties : MOCK_PROGRESS);
        setProgressHistory(history.length > 0 ? history : MOCK_PROGRESS_HISTORY);
        if (history.length === 0) {
          setUsedMockFallback(true);
        }
      } catch (error) {
        setProgress(MOCK_PROGRESS);
        setProgressHistory(MOCK_PROGRESS_HISTORY);
        setUsedMockFallback(true);
        showDiagnostic(error);
      } finally {
        setBusy(-1);
      }
    },
    [setBusy, showDiagnostic],
  );

  const loadDocuments = useCallback(
    async (unitId: string) => {
      if (USE_MOCK_DATA) {
        setDocuments(MOCK_DOCUMENTS);
        return;
      }
      setBusy(1);
      try {
        const rawDocs = await fetchRawDocuments(unitId);
        const docs = adaptBubbleDocuments(rawDocs);
        if (docs.length > 0) {
          setDocuments(docs);
          return;
        }
        setDocuments(MOCK_DOCUMENTS);
        setUsedMockFallback(true);
      } catch (error) {
        setDocuments(MOCK_DOCUMENTS);
        setUsedMockFallback(true);
        showDiagnostic(error);
      } finally {
        setBusy(-1);
      }
    },
    [setBusy, showDiagnostic],
  );

  const registerUserPushToken = useCallback(async (userId: string) => {
    if (USE_MOCK_DATA || !userId) return;
    try {
      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken) {
        await updateUserPushToken(userId, pushToken);
      }
    } catch {
      // Push registration is best-effort and must not block the app.
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string, useMock = false) => {
      setIsLoading(true);
      setUsedMockFallback(false);
      try {
        if (USE_MOCK_DATA || useMock) {
          const mockUser: User = { ...MOCK_USER, email, token: 'mock-token' };
          setUser(mockUser);
          setUserProperties(MOCK_PROPERTIES);
          setSelectedPropertyState((current) => current ?? MOCK_PROPERTIES[0] ?? null);
          setUsedMockFallback(true);
          await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ user: mockUser }));
          return;
        }

        const loggedUser = await bubbleLogin(email, password);
        setUser(loggedUser);
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ user: loggedUser }));
        await loadUserProperties(loggedUser._id);
        void registerUserPushToken(loggedUser._id);
      } finally {
        setIsLoading(false);
      }
    },
    [loadUserProperties, registerUserPushToken],
  );

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    setUser(null);
    setUserProperties([]);
    setSelectedPropertyState(null);
    setPayments([]);
    setProgress([]);
    setDocuments([]);
    setExecutedPayments([]);
    setProgressHistory([]);
    setUsedMockFallback(false);
  }, []);

  const setSelectedProperty = useCallback((property: Unit) => {
    setSelectedPropertyState(property);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { user?: User };
          if (parsed?.user) {
            setUser(parsed.user);
            if (USE_MOCK_DATA) {
              setUserProperties(MOCK_PROPERTIES);
              setSelectedPropertyState(MOCK_PROPERTIES[0] ?? null);
              setPayments(MOCK_PAYMENTS);
              setProgress(MOCK_PROGRESS);
              setDocuments(MOCK_DOCUMENTS);
              setUsedMockFallback(true);
            } else {
              await loadUserProperties(parsed.user._id);
              void registerUserPushToken(parsed.user._id);
            }
          }
        }
      } catch {
        await AsyncStorage.removeItem(SESSION_KEY);
      } finally {
        if (!cancelled) {
          setIsRestoringSession(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadUserProperties, registerUserPushToken]);

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      userProperties,
      selectedProperty,
      payments,
      progress,
      documents,
      executedPayments,
      progressHistory,
      isAuthenticated,
      isDemoMode,
      isRestoringSession,
      isLoading,
      dataLoading,
      login,
      logout,
      setSelectedProperty,
      loadUserProperties,
      loadPayments,
      loadProgress,
      loadDocuments,
    }),
    [
      user,
      userProperties,
      selectedProperty,
      payments,
      progress,
      documents,
      executedPayments,
      progressHistory,
      isAuthenticated,
      isDemoMode,
      isRestoringSession,
      isLoading,
      dataLoading,
      login,
      logout,
      setSelectedProperty,
      loadUserProperties,
      loadPayments,
      loadProgress,
      loadDocuments,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}