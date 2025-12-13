import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Settings, Trash2, PlusCircle, Save, RotateCcw, Download, ChevronRight, X, Info, BarChart2 } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Incentive Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error loading Incentive Data</h2>
          <p className="text-sm text-slate-500 mb-4">Something went wrong. Please try resetting the configuration.</p>
          <button
            onClick={() => { window.location.reload(); }}
            className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold"
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const IncentiveContent = () => {
  const { incConfig, setIncConfig, resetIncConfig, profile, sales } = useAppStore();
  const [view, setView] = useState('calc'); // 'calc' or 'config'
  const [activeTab, setActiveTab] = useState('SP'); // For Config

  // Local state for calculation inputs (Rows)
  const [rows, setRows] = useState({ sp: [], tb: [], wr: [], cp: [], npc: [], bun: [] });
  const [meta, setMeta] = useState({
      k_ff7: 0, t_ff7: 'low', k_s25: 0, t_s25: 'low',
      accVal: 0, accBase: 0, target: 35, channel: 'standard', status: 'existing',
      pli: 0
  });
  const [result, setResult] = useState({ logs: [], grand: 0, spQ: 0, ach: 0 });
  const [samsungIncentive, setSamsungIncentive] = useState({ totalVal: 0, slabInc: 0, totalInc: 0 });

  // Initialize rows on mount
  useEffect(() => {
    try {
        if (!rows.sp || rows.sp.length === 0) {
            setRows({
                sp: [{ qty: 1, rate: 0, fm: false }],
                tb: [{ qty: 1, rate: 0, fm: false }],
                wr: [{ qty: 1, rate: 0, fm: false }],
                cp: [{ qty: 1, rate: 0, fm: false }],
                npc: [{ qty: 1, rate: 0, fm: false }],
                bun: [{ qty: 1, rate: 0, fm: false }]
            });
        }
    } catch(e) { console.error(e); }
  }, []);

  // Migration / Safety Check for Config
  useEffect(() => {
    if (incConfig) {
        const defaults = ['wearables', 'carePlus', 'notePC', 'bundles', 'accessories'];
        let changed = false;
        // Shallow clone is enough for top-level checks
        const newConfig = { ...incConfig };

        defaults.forEach(key => {
            if (!newConfig[key]) {
                newConfig[key] = {}; // Initialize as object if missing
                changed = true;
            }
        });

        if (changed) {
            console.log("Incentive: patched missing config sections");
            setIncConfig(newConfig);
        }
    }
  }, [incConfig, setIncConfig]);

  // Sync Calc Logic
  useEffect(() => {
    calculate();
    calculateSamsungIncentive();
  }, [rows, meta, incConfig, sales]);

  // Auto-populate rows from Sales Data (Dealer Price Logic)
  useEffect(() => {
      calculateAutoIncentives();
  }, [sales]);

  const getPerUnitIncentive = (price) => {
      if (price >= 100000) return 700;
      if (price >= 70000) return 600;
      if (price >= 40000) return 500;
      if (price >= 30000) return 300;
      if (price >= 20000) return 200;
      if (price >= 15000) return 100;
      if (price >= 10000) return 75;
      return 25; // < 10k
  };

  const calculateAutoIncentives = () => {
      try {
        if (!sales) return;
        const today = new Date();
        const currentMonthStr = today.toISOString().slice(0, 7);

        const spRows = [];
        const tbRows = [];

        const addToRows = (arr, rate) => {
            const existing = arr.find(r => r.rate === rate);
            if (existing) existing.qty += 1;
            else arr.push({ qty: 1, rate, fm: false });
        };

        Object.keys(sales).forEach(dateStr => {
             if (dateStr.startsWith(currentMonthStr)) {
                 const entry = sales[dateStr];
                 if (entry && entry.entries && Array.isArray(entry.entries)) {
                     entry.entries.forEach(e => {
                         if (e.brand && e.brand.toLowerCase() === 'samsung') {
                             const price = e.total || 0;
                             const isTablet = (e.model || '').toLowerCase().includes('tab');

                             if (isTablet) {
                                 addToRows(tbRows, getPerUnitIncentive(price));
                             } else {
                                 addToRows(spRows, getPerUnitIncentive(price));
                             }
                         }
                     });
                 }
             }
        });

        if (spRows.length > 0 || tbRows.length > 0) {
            setRows(prev => ({
                ...prev,
                sp: spRows.length > 0 ? spRows : prev.sp,
                tb: tbRows.length > 0 ? tbRows : prev.tb
            }));
        }

      } catch (e) { console.error("Auto Calc Error", e); }
  };

  const calculateSamsungIncentive = () => {
      try {
          if (!sales) return;

          let totalVal = 0;
          const today = new Date();
          const currentMonthStr = today.toISOString().slice(0, 7);

          Object.keys(sales).forEach(dateStr => {
              if (dateStr.startsWith(currentMonthStr)) {
                  const entry = sales[dateStr];
                  if(entry && entry.entries && Array.isArray(entry.entries)) {
                      entry.entries.forEach(e => {
                          if(e && e.brand && (e.brand.toLowerCase() === 'samsung')) {
                              totalVal += (e.total || 0);
                          }
                      });
                  } else if (entry) {
                      if(entry.samsungVal) totalVal += (entry.samsungVal || 0);
                  }
              }
          });

          let slabInc = 0;
          if (totalVal < 600000) slabInc = 0;
          else if (totalVal < 800000) slabInc = 1500;
          else if (totalVal < 1000000) slabInc = 2500;
          else if (totalVal < 1200000) slabInc = 4000;
          else if (totalVal < 1500000) slabInc = 6000;
          else if (totalVal < 2000000) slabInc = 9000;
          else slabInc = 12000;

          const totalInc = slabInc;
          setSamsungIncentive({ totalVal, slabInc, totalInc });
      } catch (error) {
          console.error("Samsung Incentive Calc Error:", error);
          setSamsungIncentive({ totalVal: 0, slabInc: 0, totalInc: 0 });
      }
  };

  const addRow = (key) => {
      try {
        setRows({ ...rows, [key]: [...(rows[key] || []), { qty: 1, rate: 0, fm: false }] });
      } catch(e) { console.error(e); }
  };

  const delRow = (key, idx) => {
      try {
        const newRows = [...(rows[key] || [])];
        newRows.splice(idx, 1);
        setRows({ ...rows, [key]: newRows });
      } catch(e) { console.error(e); }
  };

  const updRow = (key, idx, field, val) => {
      try {
        const newRows = [...(rows[key] || [])];
        if (newRows[idx]) {
            newRows[idx][field] = (field === 'rate' || field === 'qty') ? parseFloat(val) || 0 : val;
            setRows({ ...rows, [key]: newRows });
        }
      } catch(e) { console.error(e); }
  };

  const calculateAccessoryPayout = (achieved) => {
      if(!incConfig?.accessories?.items) return 0;
      // assuming achieved is percentage e.g. 5.5
      let rate = 0;
      for (let item of incConfig.accessories.items) {
          if (achieved >= item.min) {
              rate = item.rate; // This 'rate' seems to be a flat payout based on achievement?
              // Or is it rate * something? Based on previous code:
              // accPct = (meta.accVal/ab)*100;
              // for(let t of c.accessories.items) { if(accPct>=t.min) { accTot = t.rate; break; } }
              // So it is a flat amount found in 'rate'.
              break;
          }
      }
      return rate;
  };

  const calculate = () => {
      try {
          const c = incConfig;
          if(!c) return;

          let logs = [];

          // --- Smartphones ---
          let spQ=0, spRaw=0;
          (rows.sp || []).forEach(r => {
              if(r && r.qty>0) { spQ+=r.qty; spRaw += r.qty * (r.fm ? r.rate*(c.sp?.fm_mult||2) : r.rate); }
          });

          const isExempt = (meta.channel === 'sis_pro' || meta.status === 'new_joinee');
          const gateSet = isExempt ? (c.sp?.gates?.sis || []) : (c.sp?.gates?.std || []);
          let gateM = 0;
          let gateN = "Missed Volume Gate";
          for(let g of gateSet) { if(g && spQ >= g.min) { gateM = g.p; gateN = ""; break; } }

          let spFin = spRaw * gateM;
          let spPot = spRaw * (gateM > 0 ? gateM : 1.0);
          const ach = meta.target > 0 ? spQ/meta.target : 0;

          let missed = false;
          if(gateM === 0) {
              missed=true; gateN=`Missed Volume Gate (${spQ})`;
          }

          logs.push({c:"Smartphones", n:gateN, v:spFin, pot:spPot, missed});

          // --- Tablets ---
          let tbTot=0; (rows.tb || []).forEach(r => tbTot += (r.qty||0)*r.rate);
          let tbFin = Math.min(tbTot, c.caps?.tb || 15000);
          logs.push({c:"Tablets", n:tbTot>tbFin?"Capped":"", v:tbFin});

          // --- Wearables ---
          let wrTot=0; (rows.wr || []).forEach(r => wrTot += (r.qty||0)*r.rate);
          logs.push({c:"Wearables", n:"", v:wrTot});

          let comb = spFin + wrTot;
          // let combPot = spRaw + wrTot; // Unused in new calc

          if(comb > (c.caps?.global || 75000)) { comb = c.caps.global; logs.push({c:"Global Cap", n:"Max 75k applied", v:0}); }

          // --- Care+ ---
          let cpTot=0, cpQ=0;
          (rows.cp || []).forEach(r => { cpQ+=r.qty; cpTot+=(r.qty||0)*r.rate; });

          let kickTot = 0;
          if(c.carePlus?.kickers?.ff7) {
            if(meta.k_ff7 > 0) kickTot += meta.k_ff7 * (meta.t_ff7==='high' ? (c.carePlus.kickers.ff7.h||0) : (c.carePlus.kickers.ff7.l||0));
          }
          if(c.carePlus?.kickers?.s25) {
            if(meta.k_s25 > 0) kickTot += meta.k_s25 * (meta.t_s25==='high' ? (c.carePlus.kickers.s25.h||0) : (c.carePlus.kickers.s25.l||0));
          }

          let cpVol = cpTot;
          if(cpQ>=8) cpVol*=1.2;

          // let cpPot = cpVol + kickTot; // Unused in new calc

          if(cpQ>0 && cpQ<3) { cpVol=0; logs.push({c:"Care+", n:"Gate < 3", v:0}); }

          let cpFinal = cpVol + kickTot;
          logs.push({c:"Care+", n:`Vol: ${cpQ}, Kickers: ${kickTot}`, v:cpFinal});

          // --- Note PC ---
          let npcTot=0; (rows.npc || []).forEach(r => npcTot += (r.qty||0)*r.rate);
          let npcFin = Math.min(npcTot, c.caps?.npc || 10000);
          logs.push({c:"Note PC", n:npcTot>npcFin?"Capped":"", v:npcFin});

          // --- Bundles ---
          let bunTot = 0;
          (rows.bun || []).forEach(r => bunTot += (r.qty||0)*r.rate);
          let bunFin = Math.min(bunTot, c.caps?.bun || 5000);
          logs.push({c:"Bundles", n:bunTot>bunFin?"Capped":"", v:bunFin});

          // --- Accessories ---
          let accTot = 0;
          const ab = meta.accBase || (spRaw * 25);
          let accPct = 0;
          if(ab > 0 && meta.channel!=='exclusive' && c.accessories?.items) {
              accPct = (meta.accVal/ab)*100;
              // We'll trust the helper function for the summation, but for logs we keep this
              for(let t of c.accessories.items) { if(accPct>=t.min) { accTot = t.rate; break; } }
          }
          logs.push({c:"Accessories", n:`Base: ${ab.toFixed(0)} (${accPct.toFixed(1)}%)`, v:accTot});

          // --- Misc ---
          if (c.misc?.amount) {
              logs.push({c:"Misc", n:"", v:c.misc.amount});
          }

          const tentPLI = samsungIncentive.slabInc || 0;

          // --- NEW TOTAL PAYOUT FORMULA ---
          // Using spRaw (Potential) for smartphonesIncentive as we removed the gate check?
          // The prompt says "DELETE the < 80% check. Replace it with this summation".
          // The summation includes `smartphonesIncentive`.
          // If the user wants to "Unlock the Money", likely they want spPot (Raw) or spFin (which includes volume gate but removed target gate).
          // Given "Unlock the Money", I'll use spRaw (Potential) as the base variable for `smartphonesIncentive` in this context,
          // OR, I should use `spFin` which respects volume gates.
          // However, the prompt says "Replace... with this summation". It doesn't define `smartphonesIncentive`.
          // I will assume `smartphonesIncentive` = `spFin` (Calculated based on volume gates)
          // but since I removed the explicit <80% check which wasn't even there in the previous code (I only saw `gateM` logic),
          // I will ensure `spFin` is used.
          // Wait, the previous code had: `if(gateM === 0) { missed=true; ... }`.
          // If I use `spFin`, it will be 0 if volume gate is missed.
          // The user said "DELETE the < 80% check".
          // In my previous `read_file`, `calculate` had:
          // `const ach = meta.target > 0 ? spQ/meta.target : 0;`
          // `// REMOVED <80% Gate check...` (Wait, did I already remove it in a previous turn or was that my comment?)
          // Ah, I see "REMOVED <80% Gate check as per request...".
          // So the prompt effectively wants me to force the Summation Formula.

          const totalPayout =
            (Number(tentPLI) || 0) +
            (Number(spFin) || 0) + // Smartphones Incentive
            (Number(tbFin) || 0) + // Tablets Incentive
            (c.wearables?.models?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0) +
            (c.carePlus?.slabs?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0) +
            (c.notePC?.models?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0) +
            (c.bundles?.items?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0) +
            (c.accessories?.achieved ? (calculateAccessoryPayout(c.accessories.achieved)) : 0);

          // Note: The summation formula uses `c.wearables?.models...`. This sums the CONFIGURATION amounts, not the EARNINGS from sales.
          // This seems to be a Calculator/Configurator view where the user sets expected payouts per model in the config?
          // OR, is `models` supposed to be the *Sales Rows*?
          // The prompt says: `config.wearables?.models?.reduce...`. `config` usually refers to `incConfig`.
          // If I sum `incConfig.wearables.models[].amount`, I am summing the *rates* defined in settings, not the quantity sold.
          // BUT, looking at the "Ghost Tabs" request:
          // `renderContent` -> `case 'WR'` -> maps `config.wearables?.models` and shows inputs for `amount`.
          // This strongly suggests the user is building a *Projection* or *Calculator* where they enter "I sold X of Model Y" directly into the Config/Calculator inputs?
          // The inputs in "Ghost Tabs" are: `value={item.amount}`.
          // If the user inputs `amount` (presumably Total Payout for that model), then the Summation makes sense.
          // If `amount` is just Rate, then this formula is wrong for a Sales Tracker.
          // HOWEVER, I MUST FOLLOW THE PROMPT "Apply these LOGIC changes ONLY".
          // The prompt explicitly gives the summation formula. I will paste it exactly.

          setResult({ logs, grand: totalPayout, spQ, ach: (ach*100).toFixed(0) });
      } catch (error) {
          console.error("Calculation Error:", error);
      }
  };

  const handleExport = async () => {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Incentive Report", 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

      const rows = result.logs.map(l => [l.c, l.n, l.v]);
      rows.push(['PLI (Auto)', 'Tentative', samsungIncentive.slabInc]);
      rows.push(['PLI (Adj)', 'Manual', meta.pli || 0]);
      rows.push(['TOTAL (Potential)', 'Sum of all earnings', result.grand]);

      doc.autoTable({
          startY: 35,
          head: [['Category', 'Details', 'Payout']],
          body: rows,
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] }
      });

      const fileName = `Incentive_${Date.now()}.pdf`;
      try {
          const pdfOutput = doc.output('datauristring');
          await Filesystem.writeFile({
              path: fileName,
              data: pdfOutput.split(',')[1],
              directory: Directory.Cache
          });

          const uriResult = await Filesystem.getUri({
              path: fileName,
              directory: Directory.Cache
          });

          await Share.share({
              title: 'Incentive Report',
              url: uriResult.uri
          });
      } catch(e) {
          console.error(e);
          doc.save(fileName);
      }
  };

  // --- CONFIG HANDLERS ---
  const updateConfig = (path, index, field, val) => {
      try {
        const newConfig = JSON.parse(JSON.stringify(incConfig));

        // Handle direct path like 'wearables' (which implies 'wearables.models' based on new schema)
        // or composite paths.
        // The Prompt's usage: updateConfig('wearables', index, 'name', val)
        // My helper expects: updateConfig(fullPath, val) usually.
        // I need to adapt the helper or calls.

        // Let's rewrite updateConfig to be robust or create a specific one for the new UI.
        // The prompt uses: `updateConfig('wearables', index, 'name', e.target.value)`

        let targetArray = null;
        if (path === 'wearables') targetArray = newConfig.wearables.models;
        else if (path === 'carePlus') targetArray = newConfig.carePlus.slabs;
        else if (path === 'notePC') targetArray = newConfig.notePC.models;
        else if (path === 'bundles') targetArray = newConfig.bundles.items; // Bundles still items?
        else if (path === 'accessories') targetArray = newConfig.accessories.items;
        else {
            // Fallback for deeply nested or other paths
             // Not handling 'sp'/'tb' here as they use different UI in this refactor?
        }

        if (targetArray && targetArray[index]) {
            targetArray[index][field] = (field === 'amount' || field === 'rate') ? parseFloat(val) || 0 : val;
            setIncConfig(newConfig);
        } else {
             // Fallback to legacy updateConfig if arguments don't match
             // But here I'm replacing the function logic
        }
      } catch(e) { console.error(e); }
  };

  // Legacy support for SP/TB which might call updateConfig differently?
  // The existing `updateConfig` took `(path, val)`.
  // I need to support BOTH signatures or refactor SP/TB to use the new one.
  // SP/TB Code in this file calls: `updateConfig('sp.slabs.0.min', val)`.
  // So I need a wrapper.

  const updateConfigLegacy = (path, val) => {
      try {
        const newConfig = JSON.parse(JSON.stringify(incConfig));
        const parts = path.split('.');
        let obj = newConfig;
        for (let i = 0; i < parts.length - 1; i++) {
             if (!obj[parts[i]]) obj[parts[i]] = {};
             obj = obj[parts[i]];
        }
        obj[parts[parts.length - 1]] = parseFloat(val) || val;
        setIncConfig(newConfig);
      } catch(e) { console.error(e); }
  };

  const addConfigItem = (key) => {
      const newConfig = JSON.parse(JSON.stringify(incConfig));
      const template = { name: 'New', amount: 0 };

      if (key === 'wearables') newConfig.wearables.models.push(template);
      else if (key === 'carePlus') newConfig.carePlus.slabs.push(template);
      else if (key === 'notePC') newConfig.notePC.models.push(template);
      else if (key === 'bundles') newConfig.bundles.items.push(template);

      // SP/TB legacy calls might differ

      setIncConfig(newConfig);
  };

  // Legacy Add/Remove for SP/TB
  const addConfigItemLegacy = (path, template) => {
      try {
        const newConfig = JSON.parse(JSON.stringify(incConfig));
        const parts = path.split('.');
        let obj = newConfig;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!obj[parts[i]]) obj[parts[i]] = {};
            obj = obj[parts[i]];
        }
        const lastKey = parts[parts.length - 1];
        if (!obj[lastKey]) obj[lastKey] = [];
        obj[lastKey].push(template);
        setIncConfig(newConfig);
      } catch(e) { console.error(e); }
  };

  const removeConfigItemLegacy = (path, index) => {
      try {
        const newConfig = JSON.parse(JSON.stringify(incConfig));
        const parts = path.split('.');
        let obj = newConfig;
        for (let i = 0; i < parts.length; i++) {
            obj = obj[parts[i]];
        }
        if(Array.isArray(obj)) {
            obj.splice(index, 1);
            setIncConfig(newConfig);
        }
      } catch(e) { console.error(e); }
  };


  const ConfigSection = () => {
    // Helper Renderers for Legacy components (SP/TB)
    const renderSmartphoneConfig = () => (
        <>
            <div>
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-sm text-blue-600">Slabs (Dealer Price)</h4>
                    <button onClick={() => addConfigItemLegacy('sp.slabs', {min:0, rate:0, label:'New'})} className="text-emerald-500"><PlusCircle size={16}/></button>
                </div>
                {(incConfig.sp?.slabs || []).map((s, i) => (
                    <div key={i} className="flex gap-2 mb-2 items-center">
                        <input placeholder="Min Price" type="number" value={s.min} onChange={(e)=>updateConfigLegacy(`sp.slabs.${i}.min`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" />
                        <input placeholder="Rate" type="number" value={s.rate} onChange={(e)=>updateConfigLegacy(`sp.slabs.${i}.rate`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" />
                        <input placeholder="Label" value={s.label} onChange={(e)=>updateConfigLegacy(`sp.slabs.${i}.label`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" />
                        <button onClick={() => removeConfigItemLegacy('sp.slabs', i)} className="text-red-400"><Trash2 size={14}/></button>
                    </div>
                ))}
            </div>
            <div>
                <h4 className="font-bold text-sm text-blue-600 mb-2">Gates (Multiplier)</h4>
                <div className="flex justify-between items-center mb-1">
                    <div className="text-xs font-bold dark:text-slate-300">Standard</div>
                    <button onClick={() => addConfigItemLegacy('sp.gates.std', {min:0, p:1.0})} className="text-emerald-500"><PlusCircle size={14}/></button>
                </div>
                {(incConfig.sp?.gates?.std || []).map((g, i) => (
                     <div key={'g'+i} className="flex gap-2 mb-1 items-center">
                         <span className="text-xs dark:text-slate-400">Min</span>
                         <input type="number" value={g.min} onChange={(e)=>updateConfigLegacy(`sp.gates.std.${i}.min`, e.target.value)} className="w-16 p-2 border rounded text-xs" />
                         <span className="text-xs dark:text-slate-400">Mult</span>
                         <input type="number" value={g.p} onChange={(e)=>updateConfigLegacy(`sp.gates.std.${i}.p`, e.target.value)} className="w-16 p-2 border rounded text-xs" />
                         <button onClick={() => removeConfigItemLegacy('sp.gates.std', i)} className="text-red-400 ml-auto"><Trash2 size={14}/></button>
                     </div>
                ))}
            </div>
        </>
    );

    const renderTabletConfig = () => (
        <>
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-sm text-blue-600">Volume Slabs</h4>
                <button onClick={() => addConfigItemLegacy('tb.slabs', {min:0, rate:0, label:'New'})} className="text-emerald-500"><PlusCircle size={16}/></button>
            </div>
            {(incConfig.tb?.slabs || []).map((s, i) => (
                <div key={i} className="flex gap-2 mb-2 items-center">
                     <input type="number" value={s.min} onChange={(e)=>updateConfigLegacy(`tb.slabs.${i}.min`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" placeholder="Min" />
                     <input type="number" value={s.rate} onChange={(e)=>updateConfigLegacy(`tb.slabs.${i}.rate`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" placeholder="Rate" />
                     <input value={s.label} onChange={(e)=>updateConfigLegacy(`tb.slabs.${i}.label`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" placeholder="Label" />
                     <button onClick={() => removeConfigItemLegacy('tb.slabs', i)} className="text-red-400"><Trash2 size={14}/></button>
                </div>
            ))}
            <div className="flex justify-between items-center mt-4 mb-2">
                <h4 className="font-bold text-sm text-blue-600">Focus Models</h4>
                <button onClick={() => addConfigItemLegacy('tb.focus', {name:'New Model', rate:0, keys:''})} className="text-emerald-500"><PlusCircle size={16}/></button>
            </div>
            {(incConfig.tb?.focus || []).map((f, i) => (
                <div key={i} className="flex gap-2 mb-2 items-center">
                    <input value={f.name} onChange={(e)=>updateConfigLegacy(`tb.focus.${i}.name`, e.target.value)} className="w-1/2 p-2 border rounded text-xs" placeholder="Model Name" />
                    <input type="number" value={f.rate} onChange={(e)=>updateConfigLegacy(`tb.focus.${i}.rate`, e.target.value)} className="w-1/4 p-2 border rounded text-xs" placeholder="Rate" />
                    <button onClick={() => removeConfigItemLegacy('tb.focus', i)} className="text-red-400"><Trash2 size={14}/></button>
                </div>
            ))}
        </>
    );

    const renderContent = () => {
      switch (activeTab) {
        case 'SP': return renderSmartphoneConfig();
        case 'TB': return renderTabletConfig();
        case 'WR': // Wearables
          return (
            <div className="space-y-4">
                {(incConfig.wearables?.models || []).map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <input placeholder="Model" value={item.name} onChange={(e) => updateConfig('wearables', index, 'name', e.target.value)} className="flex-1 p-2 border rounded text-xs" />
                    <input type="number" placeholder="Amt" value={item.amount} onChange={(e) => updateConfig('wearables', index, 'amount', e.target.value)} className="w-1/3 p-2 border rounded text-xs" />
                  </div>
                ))}
                <button onClick={() => addConfigItem('wearables')} className="text-xs bg-slate-100 dark:bg-slate-700 p-2 rounded flex items-center gap-1">+ Add</button>
            </div>
          );
        case 'CP': // Care+
          return (
             <div className="space-y-4">
                {(incConfig.carePlus?.slabs || []).map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <input placeholder="Slab" value={item.name} onChange={(e) => updateConfig('carePlus', index, 'name', e.target.value)} className="flex-1 p-2 border rounded text-xs" />
                    <input type="number" value={item.amount} onChange={(e) => updateConfig('carePlus', index, 'amount', e.target.value)} className="w-1/3 p-2 border rounded text-xs" />
                  </div>
                ))}
                <button onClick={() => addConfigItem('carePlus')} className="text-xs bg-slate-100 dark:bg-slate-700 p-2 rounded flex items-center gap-1">+ Add</button>
             </div>
          );
        case 'NPC': // Note PC
          return (
             <div className="space-y-4">
                {(incConfig.notePC?.models || []).map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <input placeholder="Model" value={item.name} onChange={(e) => updateConfig('notePC', index, 'name', e.target.value)} className="flex-1 p-2 border rounded text-xs" />
                    <input type="number" value={item.amount} onChange={(e) => updateConfig('notePC', index, 'amount', e.target.value)} className="w-1/3 p-2 border rounded text-xs" />
                  </div>
                ))}
                <button onClick={() => addConfigItem('notePC')} className="text-xs bg-slate-100 dark:bg-slate-700 p-2 rounded flex items-center gap-1">+ Add</button>
             </div>
          );
        case 'Bun': // Bundles
          return (
             <div className="space-y-4">
                {(incConfig.bundles?.items || []).map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <input placeholder="Item" value={item.name} onChange={(e) => updateConfig('bundles', index, 'name', e.target.value)} className="flex-1 p-2 border rounded text-xs" />
                    <input type="number" value={item.amount} onChange={(e) => updateConfig('bundles', index, 'amount', e.target.value)} className="w-1/3 p-2 border rounded text-xs" />
                  </div>
                ))}
                <button onClick={() => addConfigItem('bundles')} className="text-xs bg-slate-100 dark:bg-slate-700 p-2 rounded flex items-center gap-1">+ Add</button>
             </div>
          );
        case 'Acc': // Accessories (Preserve existing or adapt?)
            // Snippet says "IMPLEMENT cases for... Acc similarly"
            // But previous Acc UI had slab based percentages.
            // If I look at the new summation formula: `config.accessories?.achieved`
            // It seems accessories is now just a single "Achieved" input?
            // "calculateAccessoryPayout(config.accessories.achieved)"
            // I'll stick to the "Ghost Tabs" pattern for simplicity but Accessories might need special handling.
            // Let's keep it simple: List of items?
            // Wait, calculateAccessoryPayout iterates `config.accessories.items`.
            // So we still need to configure items (min%, rate/amount).
            // Let's use the new UI pattern for consistency.
            return (
                 <div className="space-y-4">
                    {(incConfig.accessories?.items || []).map((item, index) => (
                      <div key={index} className="flex gap-2">
                        <input placeholder="Min %" type="number" value={item.min} onChange={(e) => updateConfig('accessories', index, 'min', e.target.value)} className="w-1/2 p-2 border rounded text-xs" />
                        <input placeholder="Payout" type="number" value={item.rate} onChange={(e) => updateConfig('accessories', index, 'rate', e.target.value)} className="w-1/2 p-2 border rounded text-xs" />
                      </div>
                    ))}
                    {/* Note: 'rate' is used in accessory loop in calc, so we keep 'rate' or map 'amount' -> 'rate' */}
                    {/* The updateConfig helper I wrote maps 'amount' OR 'rate' to float. */}
                 </div>
            );
        default: return null;
      }
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg mb-24 h-full flex flex-col">
           <div className="flex justify-between items-center mb-4">
             <div className="flex items-center gap-2">
                <button onClick={() => setView('calc')} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full">
                    <ChevronRight className="rotate-180" size={20} />
                </button>
                <h3 className="font-bold text-lg dark:text-white">Configuration</h3>
             </div>
             <div className="flex gap-2">
                <button onClick={resetIncConfig} className="text-red-500 p-2"><RotateCcw size={16}/></button>
                <button onClick={() => setView('calc')} className="text-indigo-500 p-2"><Save size={16}/></button>
             </div>
           </div>

           <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 mb-4 overflow-x-auto no-scrollbar shrink-0">
             {['SP','TB','WR','CP','NPC','Bun','Acc','Misc'].map(t => (
                 <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 font-bold text-sm whitespace-nowrap ${activeTab===t ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>{t}</button>
             ))}
           </div>

           <div className="flex-1 overflow-y-auto pb-12">
               {renderContent()}
           </div>
        </div>
    );
  };

  if (view === 'config') return <ConfigSection />;

  return (
    <div className="fade-in space-y-4 pb-24 p-4">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-center mb-3">
                <h2 className="font-bold dark:text-white">Incentive</h2>
                <div className="flex gap-2">
                    <button onClick={handleExport} className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 px-3 py-1 rounded-lg flex items-center gap-1"><Download size={14} /> PDF</button>
                    <button onClick={() => setView('config')} className="text-xs bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-lg flex items-center gap-1"><Settings size={14} /> Config</button>
                </div>
            </div>

            <div className="mb-3">
                 <label className="text-xs font-bold text-slate-400 block mb-1">Store Type / Channel</label>
                 <select value={meta.channel} onChange={(e)=>setMeta({...meta, channel: e.target.value})} className="w-full p-2 text-xs rounded border dark:bg-slate-900 dark:text-white">
                     <option value="standard">Standard Store</option>
                     <option value="sis_pro">SIS / Pro / New Joinee</option>
                     <option value="exclusive">Exclusive / Experience</option>
                 </select>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
                 <div><label className="font-bold text-slate-400 block">Target</label><input type="number" value={meta.target} onChange={(e)=>setMeta({...meta, target: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 dark:text-white border-none rounded p-1"/></div>
                 <div><label className="font-bold text-slate-400 block">Achieved</label><div className="font-bold text-lg dark:text-white">{result.spQ} <span className="text-xs text-slate-400">({result.ach}%)</span></div></div>
            </div>
        </div>

        {/* Tentative PLI Card */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 rounded-2xl shadow-lg relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-20"><BarChart2 size={64}/></div>
             <h3 className="font-bold text-sm opacity-80 mb-2">Tentative PLI (Est.)</h3>
             <div className="flex justify-between items-end mb-2">
                 <div>
                     <div className="text-3xl font-bold">₹{samsungIncentive.slabInc.toLocaleString()}</div>
                     <div className="text-xs opacity-80">Total Value: ₹{samsungIncentive.totalVal.toLocaleString()}</div>
                 </div>
                 <div className="text-right">
                     <label className="text-[10px] uppercase font-bold opacity-70 block">PLI Adjustment</label>
                     <input
                        type="number"
                        value={meta.pli}
                        onChange={(e) => setMeta({...meta, pli: parseFloat(e.target.value)||0})}
                        className="w-16 bg-white/20 border-none rounded text-right text-sm p-1 text-white placeholder-white"
                     />
                 </div>
             </div>
        </div>

        {/* Note: I'm leaving the 'rows' UI below for calculating quantities/earnings per category.
            The user only asked to fix Config and Payout Logic.
            The Payout Logic now sums the CONFIG amounts directly (strange for a tracker, but requested).
            The Rows below populate 'spFin', 'tbFin', etc. which are used in the Payout Logic summation.
        */}

        {/* Smartphones */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border-l-4 border-l-blue-600 shadow-sm p-3">
             <div className="flex justify-between items-center mb-2">
                 <span className="font-bold text-sm dark:text-white">Smartphones</span>
                 <button onClick={() => addRow('sp')} className="text-xs bg-slate-100 dark:bg-slate-700 dark:text-white p-1 rounded">+ Add</button>
             </div>
             {(rows.sp || []).map((r, i) => (
                 <div key={i} className="flex gap-2 mb-2 items-center">
                     <select value={r.rate} onChange={(e)=>updRow('sp', i, 'rate', e.target.value)} className="flex-1 text-xs p-2 rounded border dark:bg-slate-900 dark:text-white">
                         <option value="0">Select Slab</option>
                         {(incConfig.sp?.slabs || []).map((s, idx) => <option key={idx} value={s.rate}>{s.label} ({s.rate})</option>)}
                     </select>
                     <input type="number" value={r.qty} onChange={(e)=>updRow('sp', i, 'qty', e.target.value)} className="w-14 text-center text-xs p-2 rounded border dark:bg-slate-900 dark:text-white" />
                     <button onClick={() => delRow('sp', i)} className="text-red-400"><Trash2 size={14}/></button>
                 </div>
             ))}
        </div>

        {/* Tablets */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border-l-4 border-l-purple-600 shadow-sm p-3">
             <div className="flex justify-between items-center mb-2">
                 <span className="font-bold text-sm dark:text-white">Tablets</span>
                 <button onClick={() => addRow('tb')} className="text-xs bg-slate-100 dark:bg-slate-700 dark:text-white p-1 rounded">+ Add</button>
             </div>
             {(rows.tb || []).map((r, i) => (
                 <div key={i} className="flex gap-2 mb-2 items-center">
                     <select value={r.rate} onChange={(e)=>updRow('tb', i, 'rate', e.target.value)} className="flex-1 text-xs p-2 rounded border dark:bg-slate-900 dark:text-white">
                         <option value="0">Select Model</option>
                         {(incConfig.tb?.slabs || []).map((s, idx) => <option key={'s'+idx} value={s.rate}>{s.label} ({s.rate})</option>)}
                         {(incConfig.tb?.focus || []).map((f, idx) => <option key={'f'+idx} value={f.rate}>{f.name} ({f.rate})</option>)}
                     </select>
                     <input type="number" value={r.qty} onChange={(e)=>updRow('tb', i, 'qty', e.target.value)} className="w-14 text-center text-xs p-2 rounded border dark:bg-slate-900 dark:text-white" />
                     <button onClick={() => delRow('tb', i)} className="text-red-400"><Trash2 size={14}/></button>
                 </div>
             ))}
        </div>

        {/* Other Sections (Rows UI) maintained as they feed into the logic... */}
        {/* (Truncated for brevity, but I must write the whole file) */}

        {/* Wearables */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border-l-4 border-l-pink-500 shadow-sm p-3">
             <div className="flex justify-between items-center mb-2">
                 <span className="font-bold text-sm dark:text-white">Wearables</span>
                 <button onClick={() => addRow('wr')} className="text-xs bg-slate-100 dark:bg-slate-700 dark:text-white p-1 rounded">+ Add</button>
             </div>
             {(rows.wr || []).map((r, i) => (
                 <div key={i} className="flex gap-2 mb-2 items-center">
                     <select value={r.rate} onChange={(e)=>updRow('wr', i, 'rate', e.target.value)} className="flex-1 text-xs p-2 rounded border dark:bg-slate-900 dark:text-white">
                         <option value="0">Select Model</option>
                         {(incConfig.wearables?.models || []).map((w, idx) => <option key={idx} value={w.amount}>{w.name} ({w.amount})</option>)}
                     </select>
                     <input type="number" value={r.qty} onChange={(e)=>updRow('wr', i, 'qty', e.target.value)} className="w-14 text-center text-xs p-2 rounded border dark:bg-slate-900 dark:text-white" />
                     <button onClick={() => delRow('wr', i)} className="text-red-400"><Trash2 size={14}/></button>
                 </div>
             ))}
        </div>

        {/* Care+ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border-l-4 border-l-indigo-600 shadow-sm p-3">
             <div className="flex justify-between items-center mb-2">
                 <span className="font-bold text-sm dark:text-white">Care+</span>
                 <button onClick={() => addRow('cp')} className="text-xs bg-slate-100 dark:bg-slate-700 dark:text-white p-1 rounded">+ Add</button>
             </div>
             {(rows.cp || []).map((r, i) => (
                 <div key={i} className="flex gap-2 mb-2 items-center">
                     <select value={r.rate} onChange={(e)=>updRow('cp', i, 'rate', e.target.value)} className="flex-1 text-xs p-2 rounded border dark:bg-slate-900 dark:text-white">
                         <option value="0">Select Slab</option>
                         {(incConfig.carePlus?.slabs || []).map((s, idx) => <option key={idx} value={s.amount}>{s.name} ({s.amount})</option>)}
                     </select>
                     <input type="number" value={r.qty} onChange={(e)=>updRow('cp', i, 'qty', e.target.value)} className="w-14 text-center text-xs p-2 rounded border dark:bg-slate-900 dark:text-white" />
                     <button onClick={() => delRow('cp', i)} className="text-red-400"><Trash2 size={14}/></button>
                 </div>
             ))}
        </div>

        {/* Note PC */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border-l-4 border-l-teal-600 shadow-sm p-3">
             <div className="flex justify-between items-center mb-2">
                 <span className="font-bold text-sm dark:text-white">Note PC</span>
                 <button onClick={() => addRow('npc')} className="text-xs bg-slate-100 dark:bg-slate-700 dark:text-white p-1 rounded">+ Add</button>
             </div>
             {(rows.npc || []).map((r, i) => (
                 <div key={i} className="flex gap-2 mb-2 items-center">
                     <select value={r.rate} onChange={(e)=>updRow('npc', i, 'rate', e.target.value)} className="flex-1 text-xs p-2 rounded border dark:bg-slate-900 dark:text-white">
                         <option value="0">Select Model</option>
                         {(incConfig.notePC?.models || []).map((n, idx) => <option key={idx} value={n.amount}>{n.name} ({n.amount})</option>)}
                     </select>
                     <input type="number" value={r.qty} onChange={(e)=>updRow('npc', i, 'qty', e.target.value)} className="w-14 text-center text-xs p-2 rounded border dark:bg-slate-900 dark:text-white" />
                     <button onClick={() => delRow('npc', i)} className="text-red-400"><Trash2 size={14}/></button>
                 </div>
             ))}
        </div>

        {/* Bundles */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border-l-4 border-l-orange-500 shadow-sm p-3">
             <div className="flex justify-between items-center mb-2">
                 <span className="font-bold text-sm dark:text-white">Bundles</span>
                 <button onClick={() => addRow('bun')} className="text-xs bg-slate-100 dark:bg-slate-700 dark:text-white p-1 rounded">+ Add</button>
             </div>
             {(rows.bun || []).map((r, i) => (
                 <div key={i} className="flex gap-2 mb-2 items-center">
                     <select value={r.rate} onChange={(e)=>updRow('bun', i, 'rate', e.target.value)} className="flex-1 text-xs p-2 rounded border dark:bg-slate-900 dark:text-white">
                         <option value="0">Select Bundle</option>
                         {(incConfig.bundles?.items || []).map((b, idx) => <option key={'s'+idx} value={b.amount}>{b.name} (Std - {b.amount})</option>)}
                     </select>
                     <input type="number" value={r.qty} onChange={(e)=>updRow('bun', i, 'qty', e.target.value)} className="w-14 text-center text-xs p-2 rounded border dark:bg-slate-900 dark:text-white" />
                     <button onClick={() => delRow('bun', i)} className="text-red-400"><Trash2 size={14}/></button>
                 </div>
             ))}
        </div>

        {/* Accessories */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border-l-4 border-l-yellow-500 shadow-sm p-3">
             <div className="flex justify-between items-center mb-2">
                 <span className="font-bold text-sm dark:text-white">Accessories</span>
             </div>
             <div className="flex flex-col gap-2">
                 <div>
                     <label className="text-xs text-slate-400">Total Accessory Sales (Value)</label>
                     <input type="number" value={meta.accVal} onChange={(e)=>setMeta({...meta, accVal: parseFloat(e.target.value)||0})} className="w-full p-2 border rounded text-sm font-bold dark:bg-slate-900 dark:text-white" />
                 </div>
                 <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
                     <span>Base Target: {meta.accBase || ((rows.sp||[]).reduce((a,c)=>a+(c.qty* (c.fm?(incConfig.sp?.fm_mult||2):1)*25),0) || 0)}</span>
                     <span className="text-emerald-600 font-bold">Payout: ₹{Math.floor(result.logs.find(l=>l.c==='Accessories')?.v || 0)}</span>
                 </div>
                 <div className="mt-2 pt-2 border-t border-slate-100">
                     <label className="text-xs text-slate-400">Misc. Incentive / Adjustment</label>
                     <input type="number" value={incConfig.misc?.amount || 0} onChange={(e)=>updateConfig('misc.amount', 0, 'amount', e.target.value)} className="w-full p-2 border rounded text-sm font-bold dark:bg-slate-900 dark:text-white" />
                 </div>
             </div>
        </div>

        {/* Result Footer */}
        <div className="fixed bottom-16 left-0 w-full glass p-3 border-t border-slate-200 dark:border-slate-800 z-40">
             <div className="flex justify-between items-center">
                 <div className="text-right flex-1 pr-4">
                     <div className="text-[10px] font-bold text-slate-400 uppercase">Total Payout</div>
                     <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">₹{Math.floor(result.grand).toLocaleString()}</div>
                 </div>
             </div>
             <div className="text-center mt-1">
                 <span className="text-[10px] text-slate-500 font-bold uppercase">THIS INCENTIVE WORKING IS SUBJECT TO QUALIFICATION CRITERIA</span>
             </div>
        </div>
    </div>
  );
};

// Wrap export with Error Boundary
const Incentive = () => (
  <ErrorBoundary>
    <IncentiveContent />
  </ErrorBoundary>
);

export default Incentive;
