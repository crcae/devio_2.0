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
  buildSaleIdsByUnit,
  fetchRawDocuments,
  fetchRawInstallments,
  fetchRawPayments,
  fetchRawProgress,
  fetchRawProjects,
  fetchRawSalesForUser,
  fetchRawUnits,
  getActiveBaseUrl,
  login as bubbleLogin,
  setActiveBaseUrl,
  updateUserProfile,
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
  type AdaptedProperty,
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
const API_ENV_KEY = '@devio/api_env';

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
  updateProfile: (updates: { name?: string; photoUrl?: string }) => Promise<void>;
  setSelectedProperty: (property: Unit) => void;
  loadUserProperties: (userId: string) => Promise<Unit[]>;
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
  const [forceLive, setForceLive] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  const pendingRequests = useRef(0);
  const isHydratingRef = useRef(false);
  const hasHydratedRef = useRef<string | null>(null);
  const userRef = useRef<User | null>(null);
  const selectedPropertyRef = useRef<Unit | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    selectedPropertyRef.current = selectedProperty;
  }, [selectedProperty]);

  const isAuthenticated = user !== null;
  const isLiveMode = !USE_MOCK_DATA || forceLive;
  const isDemoMode = !isLiveMode;

  const setBusy = useCallback((delta: number) => {
    pendingRequests.current = Math.max(0, pendingRequests.current + delta);
    setDataLoading(pendingRequests.current > 0);
  }, []);

  const showDiagnostic = useCallback((error: unknown) => {
    if (!isLiveMode) return;
    const message =
      error instanceof BubbleApiError
        ? `Status: ${error.statusCode ?? 'N/A'}\n${error.message}`
        : error instanceof Error
          ? error.message
          : String(error);
    Alert.alert('Error de conexión con Bubble', message);
  }, [isLiveMode]);

  const buildFilterValues = useCallback((unitId: string): string[] => {
    const property = selectedPropertyRef.current as (AdaptedProperty & Unit) | null;
    return [
      unitId,
      property?.projectId ?? '',
      ...(property?.saleIds ?? []),
      userRef.current?._id ?? '',
    ].filter((value): value is string => value.length > 0);
  }, []);

  const loadUserProperties = useCallback(
    async (userId: string): Promise<Unit[]> => {
      if (!isLiveMode) {
        setUserProperties(MOCK_PROPERTIES);
        setSelectedPropertyState((current) => current ?? MOCK_PROPERTIES[0] ?? null);
        return MOCK_PROPERTIES;
      }
      setBusy(1);
      try {
        const [rawUnits, rawProjects, rawSales] = await Promise.all([
          fetchRawUnits(userId),
          fetchRawProjects(),
          fetchRawSalesForUser(userId),
        ]);
        const saleIdsByUnit = buildSaleIdsByUnit(rawSales);
        const properties = adaptBubbleProperties(rawUnits, rawProjects, saleIdsByUnit);
        if (properties.length > 0) {
          setUserProperties(properties);
          setSelectedPropertyState((current) => current ?? properties[0] ?? null);
          return properties;
        }
        setUserProperties([]);
        return [];
      } catch (error) {
        showDiagnostic(error);
        return [];
      } finally {
        setBusy(-1);
      }
    },
    [isLiveMode, setBusy, showDiagnostic],
  );

  const loadPayments = useCallback(
    async (unitId: string) => {
      if (!isLiveMode) {
        setPayments(MOCK_PAYMENTS);
        setExecutedPayments(MOCK_EXECUTED_PAYMENTS);
        return;
      }
      setBusy(1);
      try {
        const filterValues = buildFilterValues(unitId);
        const [rawInstallments, rawPagos] = await Promise.all([
          fetchRawInstallments(filterValues),
          fetchRawPayments(filterValues),
        ]);
        const installments = adaptBubbleInstallments(rawInstallments);
        const executed = adaptBubblePayments(rawPagos);
        setPayments(installments);
        setExecutedPayments(executed);
      } catch (error) {
        showDiagnostic(error);
      } finally {
        setBusy(-1);
      }
    },
    [isLiveMode, buildFilterValues, setBusy, showDiagnostic],
  );

  const loadProgress = useCallback(
    async (unitId: string) => {
      if (!isLiveMode) {
        setProgress(MOCK_PROGRESS);
        setProgressHistory(MOCK_PROGRESS_HISTORY);
        return;
      }
      setBusy(1);
      try {
        const rawUpdates = await fetchRawProgress(buildFilterValues(unitId));
        const { specialties, history } = adaptBubbleProgress(rawUpdates);
        setProgress(specialties);
        setProgressHistory(history);
      } catch (error) {
        showDiagnostic(error);
      } finally {
        setBusy(-1);
      }
    },
    [isLiveMode, buildFilterValues, setBusy, showDiagnostic],
  );

  const loadDocuments = useCallback(
    async (unitId: string) => {
      if (!isLiveMode) {
        setDocuments(MOCK_DOCUMENTS);
        return;
      }
      setBusy(1);
      try {
        const rawDocs = await fetchRawDocuments(buildFilterValues(unitId));
        const docs = adaptBubbleDocuments(rawDocs);
        setDocuments(docs);
      } catch (error) {
        showDiagnostic(error);
      } finally {
        setBusy(-1);
      }
    },
    [buildFilterValues, setBusy, showDiagnostic],
  );

  const registerUserPushToken = useCallback(async (userId: string) => {
    if (!isLiveMode || !userId) return;
    try {
      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken) {
        await updateUserPushToken(userId, pushToken);
      }
    } catch {
      // Push registration is best-effort and must not block the app.
    }
  }, [isLiveMode]);

  const hydrateUserData = useCallback(
    async (userId: string, unitId?: string) => {
      if (isHydratingRef.current || hasHydratedRef.current === userId) {
        return;
      }
      isHydratingRef.current = true;
      setBusy(1);
      try {
        const properties = await loadUserProperties(userId);
        if (__DEV__) {
          console.log(
            `[BubbleAuth] User ID: ${userId} | User Email: ${userRef.current?.email ?? 'N/A'} | Linked Unit Count: ${properties.length}`,
          );
        }
        if (properties.length > 0) {
          setSelectedPropertyState((current) => current ?? properties[0] ?? null);
        }
        const targetUnitId = unitId ?? properties[0]?._id;
        if (targetUnitId) {
          await Promise.all([
            loadPayments(targetUnitId),
            loadProgress(targetUnitId),
            loadDocuments(targetUnitId),
          ]);
        }
      } catch (error) {
        showDiagnostic(error);
      } finally {
        isHydratingRef.current = false;
        hasHydratedRef.current = userId;
        setBusy(-1);
      }
    },
    [loadUserProperties, loadPayments, loadProgress, loadDocuments, setBusy, showDiagnostic],
  );

  const login = useCallback(
    async (email: string, password: string, useMock = false) => {
      setIsLoading(true);
      try {
        if (USE_MOCK_DATA || useMock) {
          const mockUser: User = { ...MOCK_USER, email, token: 'mock-token' };
          setForceLive(false);
          setUser(mockUser);
          setUserProperties(MOCK_PROPERTIES);
          setSelectedPropertyState((current) => current ?? MOCK_PROPERTIES[0] ?? null);
          await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ user: mockUser }));
          return;
        }

        const loggedUser = await bubbleLogin(email, password);
        setForceLive(true);
        setUser(loggedUser);
        hasHydratedRef.current = null;
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ user: loggedUser }));
        await AsyncStorage.setItem(API_ENV_KEY, getActiveBaseUrl());
        await hydrateUserData(loggedUser._id, loggedUser.assignedProperties?.[0]);
        void registerUserPushToken(loggedUser._id);
      } finally {
        setIsLoading(false);
      }
    },
    [hydrateUserData, registerUserPushToken],
  );

  const updateProfile = useCallback(
    async (updates: { name?: string; photoUrl?: string }) => {
      if (!user) {
        throw new Error('No hay sesión activa.');
      }
      const result = await updateUserProfile(user._id, updates);
      const nextUser: User = {
        ...user,
        name: updates.name !== undefined && updates.name.trim() !== '' ? updates.name.trim() : user.name,
        photoUrl: result.photoUrl ?? updates.photoUrl ?? user.photoUrl,
      };
      setUser(nextUser);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ user: nextUser }));
    },
    [user],
  );

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    isHydratingRef.current = false;
    hasHydratedRef.current = null;
    setForceLive(false);
    setUser(null);
    setUserProperties([]);
    setSelectedPropertyState(null);
    setPayments([]);
    setProgress([]);
    setDocuments([]);
    setExecutedPayments([]);
    setProgressHistory([]);
  }, []);

  const setSelectedProperty = useCallback((property: Unit) => {
    setSelectedPropertyState(property);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const savedEnv = await AsyncStorage.getItem(API_ENV_KEY);
        if (savedEnv) {
          setActiveBaseUrl(savedEnv);
        }
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { user?: User };
          if (parsed?.user) {
            setUser(parsed.user);
            const isMockSession = parsed.user.token === 'mock-token';
            setForceLive(!isMockSession && !USE_MOCK_DATA);
            if (isMockSession || USE_MOCK_DATA) {
              setUserProperties(MOCK_PROPERTIES);
              setSelectedPropertyState(MOCK_PROPERTIES[0] ?? null);
              setPayments(MOCK_PAYMENTS);
              setProgress(MOCK_PROGRESS);
              setDocuments(MOCK_DOCUMENTS);
            } else {
              await hydrateUserData(parsed.user._id, parsed.user.assignedProperties?.[0]);
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
  }, [hydrateUserData, registerUserPushToken]);

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
      updateProfile,
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
      updateProfile,
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