export interface User {
  _id: string;
  email: string;
  name: string;
  role: string;
  token: string;
}

export type PropertyStatus = 'Disponible' | 'Reservada' | 'Apartada' | 'Vendida' | 'Entregada';

export interface Unit {
  _id: string;
  name: string;
  unitCode: string;
  surfaceM2: number;
  bedrooms: number;
  bathrooms: number;
  image: string;
  status: PropertyStatus | string;
  estimatedDeliveryDate: string;
  generalProgress: number;
}

export type PaymentStatus = 'Pagado' | 'Parcial' | 'Pendiente';

export interface Payment {
  _id: string;
  unitId: string;
  amount: number;
  interest: number;
  status: PaymentStatus;
  dueDate: string;
  paidAmount: number;
  pendingAmount: number;
}

export interface Progress {
  _id: string;
  unitId: string;
  specialtyName: string;
  percentage: number;
  lastUpdate: string;
  images: string[];
}

export interface Document {
  _id: string;
  title: string;
  category: string;
  fileUrl: string;
  createdDate: string;
}

export interface FinancialSummary {
  totalPrice: number;
  totalPaid: number;
  pendingBalance: number;
  overdueBalance: number;
  paidPercentage: number;
}
