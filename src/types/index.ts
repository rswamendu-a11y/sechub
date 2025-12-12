export interface IncentiveConfig {
  sp: {
    slabs: { min: number; rate: number; label: string }[];
    gates: {
      std: { min: number; p: number }[];
      sis: { min: number; p: number }[];
    };
    fm_mult: number;
    target_thresh: number;
  };
  tb: {
    slabs: { min: number; rate: number; label: string }[];
    focus: { name: string; rate: number; keys: string }[];
  };
  wr: { name: string; rate: number; keys: string }[];
  cp: {
    slabs: { min: number; rate: number; label: string }[];
    kickers: {
      ff7: { l: number; h: number };
      s25: { l: number; h: number };
    };
  };
  npc: { name: string; rate: number }[];
  bun: {
    std: { name: string; rate: number }[];
    excl: { name: string; rate: number }[];
  };
  acc: { min: number; rate: number }[];
  caps: { global: number; tb: number; npc: number; bun: number };
}

export interface Profile {
  name: string;
  code: string;
  outlet: string;
}

export interface SalesRecord {
  models: string; // Log text
  [key: string]: any; // Dynamic brand keys
}

export interface QueueItem {
  brand: string;
  model: string;
  variant: string;
  qty: number;
  price: number;
  total: number;
}

export interface AppState {
  sales: Record<string, SalesRecord>;
  queue: QueueItem[];
  profile: Profile;
  pin: string;
  theme: 'light' | 'dark';
  incConfig: IncentiveConfig;

  // Actions
  setTheme: (theme: 'light' | 'dark') => void;
  setPin: (pin: string) => void;
  updateProfile: (profile: Partial<Profile>) => void;
  addSale: (date: string, item: QueueItem) => void;
  removeQueueItem: (index: number) => void;
  clearQueue: () => void;
  saveQueueToSales: (date: string) => void;
  updateIncentiveConfig: (config: IncentiveConfig) => void;
  importSales: (data: Record<string, SalesRecord>) => void;
  clearAllData: () => void;
}
