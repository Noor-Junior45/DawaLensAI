export interface MedicineHistory {
  id: string;
  medicineId: string;
  userId: string;
  timestamp: number;
  actionType: 'CREATE' | 'EDIT' | 'MARK_TAKEN' | 'MARK_NOT_TAKEN' | 'DELETE';
  details: string;
}

export type MedicineForm = 'tablet' | 'capsule' | 'syrup' | 'ampule' | 'powder' | 'tape' | 'liquid' | 'other';

export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  expirationDate: string;
  usageInstructions: string;
  schedule?: string; // New field for medication schedule
  createdAt: number;
  capturedImage?: string; // Keep for backward compatibility or temporary storage
  imageUrl?: string; // New field for Firebase Storage URL
  userId: string;
  taken?: boolean;
  quantity?: number;
  isDeleted?: boolean;
  deletedAt?: number;
  form?: MedicineForm;
  liked?: boolean;
  category?: string; // Medicine category e.g., 'Heart', 'Vitamins', 'Pain Relief'
  tags?: string[]; // Custom tags e.g., ['Daily', 'Blood Pressure', 'Morning']
  enableLowStockAlert?: boolean; // toggle low stock alert per individual medicine
  lowStockThreshold?: number; // custom threshold per medicine if specified
  enableEmailExpiryAlert?: boolean; // toggle email alert when expiring
  enableEmailLowStockAlert?: boolean; // toggle email alert on low stock
  // Dynamic Cryptographic E2EE fields
  isEncrypted?: boolean;
  ivMap?: { [key: string]: string };
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  provider?: AIProvider;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  lastMessageAt: number;
  provider?: AIProvider;
}

export type AIProvider = 'gemini' | 'slm';

export interface SlmKnowledgeItem {
  id: string;
  userId: string;
  type: 'user_profile' | 'learned_task' | 'allergy' | 'chronic_condition' | 'preference';
  topic: string;
  content: string;
  source: 'slm_extracted' | 'gemini_distilled';
  queryPattern?: string;
  createdAt: number;
  updatedAt: number;
}