import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Preferences } from '@capacitor/preferences';
import { type AppState, type IncentiveConfig } from '../types';

export const INCENTIVE_DEFAULTS: IncentiveConfig = {
  sp: { slabs: [{min: 100000, rate: 700, label: ">= 100k"}, {min: 70000, rate: 600, label: "70k - 100k"}, {min: 40000, rate: 500, label: "40k - 70k"}, {min: 30000, rate: 300, label: "30k - 40k"}, {min: 20000, rate: 200, label: "20k - 30k"}, {min: 15000, rate: 100, label: "15k - 20k"}, {min: 10000, rate: 75, label: "10k - 15k"}, {min: 0, rate: 25, label: "< 10k"}], gates: { std: [{min: 40, p: 1.0}, {min: 35, p: 0.75}, {min: 30, p: 0.6}], sis: [{min: 40, p: 1.0}, {min: 35, p: 1.0}, {min: 30, p: 0.75}, {min: 25, p: 0.5}] }, fm_mult: 0.5, target_thresh: 0.8 },
  tb: { slabs: [{min:70000,rate:800,label:">= 70k"},{min:40000,rate:600,label:"40k - 70k"},{min:30000,rate:500,label:"30k - 40k"},{min:20000,rate:300,label:"20k - 30k"},{min:15000,rate:200,label:"15k - 20k"},{min:10000,rate:100,label:"10k - 15k"}], focus: [{name:"S11 Ultra", rate:1500, keys:"s11 ultra"},{name:"S11/S10+/FE+", rate:1000, keys:"s11,s10+,fe+"},{name:"S10 Lite", rate:750, keys:"s10 lite"},{name:"A11 Plus", rate:400, keys:"a11"}] },
  wr: [{name:"Watch Ultra / 8 Cls / 8", rate:1200, keys:"ultra,classic,watch8,watch 8"},{name:"Other Watches", rate:800, keys:"watch"},{name:"Buds3 Pro", rate:600, keys:"buds3 pro"},{name:"Buds3 / FE", rate:500, keys:"buds3,buds fe"},{name:"Other Buds", rate:400, keys:"buds"},{name:"Galaxy Ring", rate:0, keys:"ring"}],
  cp: { slabs: [{min:100000,rate:400,label:"> 1L"},{min:70000,rate:350,label:"70k - 1L"},{min:40000,rate:300,label:"40k - 70k"},{min:30000,rate:200,label:"30k - 40k"},{min:20000,rate:120,label:"20k - 30k"},{min:10000,rate:100,label:"10k - 20k"},{min:0,rate:50,label:"< 10k"}], kickers: { ff7:{l:400,h:600}, s25:{l:300,h:500} } },
  npc: [{name:"GB5 Pro / 360", rate:3000}, {name:"GB5 360 / GB4 Pro", rate:2500}, {name:"GB5 / GB3 360", rate:1750}, {name:"GB4 Edge / Go", rate:1250}, {name:"Other", rate:1000}],
  bun: { std: [{name:"Wr+Hr", rate:750}, {name:"Wearable", rate:400}, {name:"Hearable", rate:250}], excl: [{name:"Wr+Hr+Acc", rate:1000}, {name:"Wr+Hr", rate:750}, {name:"Wearable", rate:400}, {name:"Hearable", rate:250}, {name:"Acc", rate:100}] },
  acc: [{min:4, rate:3000}, {min:3, rate:2000}, {min:2, rate:1000}, {min:1, rate:500}],
  caps: { global:75000, tb:20000, npc:50000, bun:10000 }
};

// Capacitor Preferences Adapter for Zustand
const capacitorStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const { value } = await Preferences.get({ key: name });
    return value;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await Preferences.set({ key: name, value });
  },
  removeItem: async (name: string): Promise<void> => {
    await Preferences.remove({ key: name });
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      sales: {},
      queue: [],
      profile: { name: '', code: '', outlet: '' },
      pin: '1234',
      theme: 'light',
      incConfig: INCENTIVE_DEFAULTS,

      setTheme: (theme) => set({ theme }),
      setPin: (pin) => set({ pin }),
      updateProfile: (profile) => set((state) => ({ profile: { ...state.profile, ...profile } })),

      addSale: (date, item) => set((state) => ({ queue: [...state.queue, item] })), // Logic is simplified here, mostly adding to queue
      removeQueueItem: (index) => set((state) => ({ queue: state.queue.filter((_, i) => i !== index) })),
      clearQueue: () => set({ queue: [] }),

      saveQueueToSales: (date) => set((state) => {
        const currentSales = { ...state.sales };
        const entry = currentSales[date] || { models: '' };
        let log = "";

        state.queue.forEach(i => {
            const k = i.brand;
            entry[k] = (entry[k] || 0) + i.qty;
            entry[k+'Val'] = (entry[k+'Val'] || 0) + i.total;
            log += `[${date} ${new Date().toLocaleTimeString()}] ${i.brand} ${i.model} ${i.variant ? '('+i.variant+') ' : ''}- ${i.qty}u (Val: ${i.total})\n`;
        });

        entry.models = (entry.models || "") + log;
        currentSales[date] = entry;
        return { sales: currentSales, queue: [] };
      }),

      updateIncentiveConfig: (config) => set({ incConfig: config }),
      importSales: (data) => set({ sales: data }),
      clearAllData: () => set({
        sales: {},
        queue: [],
        profile: { name: '', code: '', outlet: '' },
        incConfig: INCENTIVE_DEFAULTS
      }),
    }),
    {
      name: 'sec-enterprise-storage',
      storage: createJSONStorage(() => capacitorStorage),
    }
  )
);
