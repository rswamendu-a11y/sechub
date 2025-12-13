import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const INCENTIVE_DEFAULTS = {
    sp: { slabs: [{min: 100000, rate: 700, label: ">= 100k"}, {min: 70000, rate: 600, label: "70k - 100k"}, {min: 40000, rate: 500, label: "40k - 70k"}, {min: 30000, rate: 300, label: "30k - 40k"}, {min: 20000, rate: 200, label: "20k - 30k"}, {min: 15000, rate: 100, label: "15k - 20k"}, {min: 10000, rate: 75, label: "10k - 15k"}, {min: 0, rate: 25, label: "< 10k"}], gates: { std: [{min: 40, p: 1.0}, {min: 35, p: 0.75}, {min: 30, p: 0.6}], sis: [{min: 40, p: 1.0}, {min: 35, p: 1.0}, {min: 30, p: 0.75}, {min: 25, p: 0.5}] }, fm_mult: 0.5, target_thresh: 0.8 },
    tb: { slabs: [{min:70000,rate:800,label:">= 70k"},{min:40000,rate:600,label:"40k - 70k"},{min:30000,rate:500,label:"30k - 40k"},{min:20000,rate:300,label:"20k - 30k"},{min:15000,rate:200,label:"15k - 20k"},{min:10000,rate:100,label:"10k - 15k"}], focus: [{name:"S11 Ultra", rate:1500, keys:"s11 ultra"},{name:"S11/S10+/FE+", rate:1000, keys:"s11,s10+,fe+"},{name:"S10 Lite", rate:750, keys:"s10 lite"},{name:"A11 Plus", rate:400, keys:"a11"}] },
    wearables: { models: [{name:"Watch Ultra / 8 Cls / 8", amount:1200, keys:"ultra,classic,watch8,watch 8"},{name:"Other Watches", amount:800, keys:"watch"},{name:"Buds3 Pro", amount:600, keys:"buds3 pro"},{name:"Buds3 / FE", amount:500, keys:"buds3,buds fe"},{name:"Other Buds", amount:400, keys:"buds"},{name:"Galaxy Ring", amount:0, keys:"ring"}], slabs: [] },
    carePlus: { slabs: [{name:"> 1L", amount:400, min:100000},{name:"70k - 1L", amount:350, min:70000},{name:"40k - 70k", amount:300, min:40000},{name:"30k - 40k", amount:200, min:30000},{name:"20k - 30k", amount:120, min:20000},{name:"10k - 20k", amount:100, min:10000},{name:"< 10k", amount:50, min:0}], kickers: { ff7:{l:400,h:600}, s25:{l:300,h:500} } },
    notePC: { models: [{name:"GB5 Pro / 360", amount:3000}, {name:"GB5 360 / GB4 Pro", amount:2500}, {name:"GB5 / GB3 360", amount:1750}, {name:"GB4 Edge / Go", amount:1250}, {name:"Other", amount:1000}], slabs: [] },
    bundles: { items: [{name:"Wr+Hr", amount:750}, {name:"Wearable", amount:400}, {name:"Hearable", amount:250}, {name:"Wr+Hr+Acc", amount:1000}, {name:"Acc", amount:100}], slabs: [] },
    accessories: { items: [{min:4, rate:3000}, {min:3, rate:2000}, {min:2, rate:1000}, {min:1, rate:500}], achieved: 0 },
    misc: { amount: 0 },
    caps: { global:75000, tb:20000, npc:50000, bun:10000 }
};

export const useAppStore = create(
  persist(
    (set, get) => ({
      sales: {},
      date: new Date().toISOString().split('T')[0], // Global Persistent Date
      profile: { name: "", code: "", outlet: "" },
      pin: "1234",
      theme: "light",
      incConfig: INCENTIVE_DEFAULTS,

      // Actions
      setDate: (date) => set({ date }),
      setSales: (sales) => set({ sales }),

      addSale: (date, saleItem) => set((state) => {
        const ent = state.sales[date] || { entries: [], models: '' };

        // Ensure entries array exists (migration)
        if (!ent.entries) ent.entries = [];

        const k = saleItem.brand;
        const newEntry = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            ...saleItem,
            timestamp: new Date().toISOString()
        };

        // Update entries
        ent.entries.push(newEntry);

        // Update Aggregates (Keep for compatibility)
        ent[k] = (ent[k] || 0) + saleItem.qty;
        ent[k+'Val'] = (ent[k+'Val'] || 0) + saleItem.total;

        // Update Log String (Keep for compatibility)
        const log = `[${new Date().toLocaleTimeString()}] ${saleItem.brand} ${saleItem.model} ${saleItem.variant ? '('+saleItem.variant+') ' : ''}- ${saleItem.qty}u (Val: ${saleItem.total})\n`;
        ent.models = (ent.models || "") + log;

        return { sales: { ...state.sales, [date]: { ...ent } } }; // spread ent to trigger update
      }),

      deleteSale: (date, entryId) => set((state) => {
        const ent = state.sales[date];
        if(!ent || !ent.entries) return state;

        const targetIndex = ent.entries.findIndex(e => e.id === entryId);
        if(targetIndex === -1) return state;

        const target = ent.entries[targetIndex];

        // Decrement Aggregates
        const k = target.brand;
        ent[k] = Math.max(0, (ent[k] || 0) - target.qty);
        ent[k+'Val'] = Math.max(0, (ent[k+'Val'] || 0) - target.total);

        // Remove from entries
        ent.entries.splice(targetIndex, 1);

        // Rebuild Log String from remaining entries (Cleanest way to sync log)
        ent.models = ent.entries.map(e => `[${new Date(e.timestamp).toLocaleTimeString()}] ${e.brand} ${e.model} ${e.variant ? '('+e.variant+') ' : ''}- ${e.qty}u (Val: ${e.total})\n`).join('');

        return { sales: { ...state.sales, [date]: { ...ent } } };
      }),

      updateSale: (date, entryId, newDetails) => set((state) => {
          // This is a complex operation: easiest is Delete then Add, but that changes ID/Timestamp order.
          // Better: Adjust diffs.
          const ent = state.sales[date];
          if(!ent || !ent.entries) return state;

          const index = ent.entries.findIndex(e => e.id === entryId);
          if(index === -1) return state;

          const oldEntry = ent.entries[index];
          const newEntry = { ...oldEntry, ...newDetails };

          // Adjust aggregates
          const oldK = oldEntry.brand;
          const newK = newEntry.brand;

          // Remove old stats
          ent[oldK] = (ent[oldK] || 0) - oldEntry.qty;
          ent[oldK+'Val'] = (ent[oldK+'Val'] || 0) - oldEntry.total;

          // Add new stats
          ent[newK] = (ent[newK] || 0) + newEntry.qty;
          ent[newK+'Val'] = (ent[newK+'Val'] || 0) + newEntry.total;

          // Update entry
          ent.entries[index] = newEntry;

          // Rebuild Log
          ent.models = ent.entries.map(e => `[${new Date(e.timestamp).toLocaleTimeString()}] ${e.brand} ${e.model} ${e.variant ? '('+e.variant+') ' : ''}- ${e.qty}u (Val: ${e.total})\n`).join('');

          return { sales: { ...state.sales, [date]: { ...ent } } };
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
      importData: (data, mode = 'replace') => set((state) => {
          if (mode === 'replace') {
              return { ...data };
          } else {
              // Merge Mode
              // Strategy: Merge Sales day by day. Keep existing Profile/Pin if not in data?
              // Usually backup has everything. Let's overwrite Profile/Config but MERGE Sales.
              const mergedSales = { ...state.sales };

              Object.keys(data.sales || {}).forEach(date => {
                  const incomeDay = data.sales[date];
                  const existingDay = mergedSales[date];

                  if (!existingDay) {
                      mergedSales[date] = incomeDay;
                  } else {
                      // Both have data for this day. Merge entries.
                      const incomeEntries = incomeDay.entries || [];
                      const existingEntries = existingDay.entries || [];

                      // Avoid duplicates by ID
                      const existingIds = new Set(existingEntries.map(e => e.id));
                      const uniqueNewEntries = incomeEntries.filter(e => !existingIds.has(e.id));

                      existingDay.entries = [...existingEntries, ...uniqueNewEntries];

                      // Re-calc aggregates for this day
                      const brands = ['samsung','iphone','oppo','vivo','realme','mi','moto','other'];
                      brands.forEach(b => { existingDay[b] = 0; existingDay[b+'Val'] = 0; });

                      existingDay.entries.forEach(e => {
                          const k = e.brand;
                          existingDay[k] = (existingDay[k] || 0) + e.qty;
                          existingDay[k+'Val'] = (existingDay[k+'Val'] || 0) + e.total;
                      });

                      // Rebuild Log
                      existingDay.models = existingDay.entries.map(e => `[${new Date(e.timestamp).toLocaleTimeString()}] ${e.brand} ${e.model} ${e.variant ? '('+e.variant+') ' : ''}- ${e.qty}u (Val: ${e.total})\n`).join('');
                  }
              });

              return {
                  ...state,
                  profile: data.profile || state.profile, // Overwrite profile? Maybe
                  incConfig: data.incConfig || state.incConfig,
                  sales: mergedSales
              };
          }
      }),

      wipeData: () => set({ sales: {}, profile: { name: "", code: "", outlet: "" }, pin: "1234", incConfig: INCENTIVE_DEFAULTS }),
    }),
    {
      name: 'sec-unified-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
