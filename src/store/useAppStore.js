import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const INCENTIVE_DEFAULTS = {
    sp: { slabs: [{min: 100000, rate: 700, label: ">= 100k"}, {min: 70000, rate: 600, label: "70k - 100k"}, {min: 40000, rate: 500, label: "40k - 70k"}, {min: 30000, rate: 300, label: "30k - 40k"}, {min: 20000, rate: 200, label: "20k - 30k"}, {min: 15000, rate: 100, label: "15k - 20k"}, {min: 10000, rate: 75, label: "10k - 15k"}, {min: 0, rate: 25, label: "< 10k"}], gates: { std: [{min: 40, p: 1.0}, {min: 35, p: 0.75}, {min: 30, p: 0.6}], sis: [{min: 40, p: 1.0}, {min: 35, p: 1.0}, {min: 30, p: 0.75}, {min: 25, p: 0.5}] }, fm_mult: 0.5, target_thresh: 0.8 },
    tb: { slabs: [{min:70000,rate:800,label:">= 70k"},{min:40000,rate:600,label:"40k - 70k"},{min:30000,rate:500,label:"30k - 40k"},{min:20000,rate:300,label:"20k - 30k"},{min:15000,rate:200,label:"15k - 20k"},{min:10000,rate:100,label:"10k - 15k"}], focus: [{name:"S11 Ultra", rate:1500, keys:"s11 ultra"},{name:"S11/S10+/FE+", rate:1000, keys:"s11,s10+,fe+"},{name:"S10 Lite", rate:750, keys:"s10 lite"},{name:"A11 Plus", rate:400, keys:"a11"}] },
    wr: [{name:"Watch Ultra / 8 Cls / 8", rate:1200, keys:"ultra,classic,watch8,watch 8"},{name:"Other Watches", rate:800, keys:"watch"},{name:"Buds3 Pro", rate:600, keys:"buds3 pro"},{name:"Buds3 / FE", rate:500, keys:"buds3,buds fe"},{name:"Other Buds", rate:400, keys:"buds"},{name:"Galaxy Ring", rate:0, keys:"ring"}],
    cp: { slabs: [{min:100000,rate:400,label:"> 1L"},{min:70000,rate:350,label:"70k - 1L"},{min:40000,rate:300,label:"40k - 70k"},{min:30000,rate:200,label:"30k - 40k"},{min:20000,rate:120,label:"20k - 30k"},{min:10000,rate:100,label:"10k - 20k"},{min:0,rate:50,label:"< 10k"}], kickers: { ff7:{l:400,h:600}, s25:{l:300,h:500} } },
    npc: [{name:"GB5 Pro / 360", rate:3000}, {name:"GB5 360 / GB4 Pro", rate:2500}, {name:"GB5 / GB3 360", rate:1750}, {name:"GB4 Edge / Go", rate:1250}, {name:"Other", rate:1000}],
    bun: { std: [{name:"Wr+Hr", rate:750}, {name:"Wearable", rate:400}, {name:"Hearable", rate:250}], excl: [{name:"Wr+Hr+Acc", rate:1000}, {name:"Wr+Hr", rate:750}, {name:"Wearable", rate:400}, {name:"Hearable", rate:250}, {name:"Acc", rate:100}] },
    acc: [{min:4, rate:3000}, {min:3, rate:2000}, {min:2, rate:1000}, {min:1, rate:500}],
    caps: { global:75000, tb:20000, npc:50000, bun:10000 }
};

export const useAppStore = create(
  persist(
    (set, get) => ({
      sales: {},
      profile: { name: "", code: "", outlet: "" },
      pin: "1234",
      theme: "light",
      incConfig: INCENTIVE_DEFAULTS,

      // Actions
      setSales: (sales) => set({ sales }),
      addSale: (date, saleItem) => set((state) => {
        const ent = state.sales[date] || { models: '' };
        const k = saleItem.brand;
        ent[k] = (ent[k] || 0) + saleItem.qty;
        ent[k+'Val'] = (ent[k+'Val'] || 0) + saleItem.total;

        // Log Format
        const log = `[${new Date().toLocaleTimeString()}] ${saleItem.brand} ${saleItem.model} ${saleItem.variant ? '('+saleItem.variant+') ' : ''}- ${saleItem.qty}u (Val: ${saleItem.total})\n`;
        ent.models = (ent.models || "") + log;

        return { sales: { ...state.sales, [date]: ent } };
      }),
      clearDate: (date) => set((state) => {
        const newSales = { ...state.sales };
        delete newSales[date];
        return { sales: newSales };
      }),
      setProfile: (profile) => set({ profile }),
      setPin: (pin) => set({ pin }),
      setTheme: (theme) => set({ theme }),
      setIncConfig: (incConfig) => set({ incConfig }),
      resetIncConfig: () => set({ incConfig: INCENTIVE_DEFAULTS }),

      // Master Actions
      importData: (data) => set(data),
      wipeData: () => set({ sales: {}, profile: { name: "", code: "", outlet: "" }, pin: "1234", incConfig: INCENTIVE_DEFAULTS }),
    }),
    {
      name: 'sec-unified-storage',
      storage: createJSONStorage(() => localStorage), // Using localStorage for now as it persists well in WebViews too.
    }
  )
);
