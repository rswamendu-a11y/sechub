import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Settings, Trash2, PlusCircle, Save, RotateCcw, Download, ChevronRight, X, Info, BarChart2, ShieldCheck, Tablet, Smartphone } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import Config from './Config';

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

  // Local state for calculation inputs (Rows)
  const [rows, setRows] = useState({ sp: [], tb: [], wr: [], cp: [], npc: [], bun: [] });
  const [meta, setMeta] = useState({
      // General
      target: 35, channel: 'standard', status: 'existing', pli: 0,

      // Accessories
      accVal: 0, accBaseOverride: '',

      // Wearables
      ringVol: 0,

      // Care+ Kickers (Dynamic)
      // Map index -> { qty, tier: 'low'|'high' }
      kickers: {}
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
                cp: [{ qty: 1, rate: 0, fm: false, pm: false }], // pm = ProtectMax
                npc: [{ qty: 1, rate: 0, fm: false }],
                bun: [{ qty: 1, rate: 0, fm: false }]
            });
        }
    } catch(e) { console.error(e); }
  }, []);

  // Sync Calc Logic
  useEffect(() => {
    calculate();
    calculateSamsungIncentive();
  }, [rows, meta, incConfig, sales]);

  // Auto-populate rows from Sales Data (Dealer Price Logic)
  useEffect(() => {
      calculateAutoIncentives();
  }, [sales]);

  const getPerUnitIncentive = (price, type = 'sp') => {
      const slabs = type === 'tb' ? (incConfig.tb?.slabs || []) : (incConfig.sp?.slabs || []);
      if (!slabs || slabs.length === 0) return 0;

      const sortedSlabs = [...slabs].sort((a, b) => b.min - a.min);
      for (let s of sortedSlabs) {
          if (price >= s.min) {
              return s.rate;
          }
      }
      return 0;
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
                                 addToRows(tbRows, getPerUnitIncentive(price, 'tb'));
                             } else {
                                 addToRows(spRows, getPerUnitIncentive(price, 'sp'));
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

          // Basic PLI logic (could be configurable too, but hardcoded for now per prototype)
          let slabInc = 0;
          if (totalVal < 600000) slabInc = 0;
          else if (totalVal < 800000) slabInc = 1500;
          else if (totalVal < 1000000) slabInc = 2500;
          else if (totalVal < 1200000) slabInc = 4000;
          else if (totalVal < 1500000) slabInc = 6000;
          else if (totalVal < 2000000) slabInc = 9000;
          else slabInc = 12000;

          setSamsungIncentive({ totalVal, slabInc, totalInc: slabInc });
      } catch (error) {
          setSamsungIncentive({ totalVal: 0, slabInc: 0, totalInc: 0 });
      }
  };

  const addRow = (key) => {
        setRows({ ...rows, [key]: [...(rows[key] || []), { qty: 1, rate: 0, fm: false, pm: false }] });
  };

  const delRow = (key, idx) => {
        const newRows = [...(rows[key] || [])];
        newRows.splice(idx, 1);
        setRows({ ...rows, [key]: newRows });
  };

  const updRow = (key, idx, field, val) => {
        const newRows = [...(rows[key] || [])];
        if (newRows[idx]) {
            newRows[idx][field] = (field === 'rate' || field === 'qty') ? parseFloat(val) || 0 : val;
            setRows({ ...rows, [key]: newRows });
        }
  };

  const calculateAccessoryPayout = (achieved) => {
      if(!incConfig?.accessories?.items) return 0;
      let rate = 0;
      // Find the highest bracket achieved
      for (let item of incConfig.accessories.items) {
          if (achieved >= item.min) {
              rate = item.rate;
              break;
          }
      }
      return rate;
  };

  const calculateRingPayout = (count) => {
      if (!incConfig?.wearables?.ring?.slabs) return 0;
      let rate = 0;
      for (let s of incConfig.wearables.ring.slabs) {
          if (count >= s.min) {
              rate = s.rate;
              break;
          }
      }
      return count * rate;
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

          let spFin = spRaw;
          let spPot = spRaw;
          const ach = meta.target > 0 ? spQ/meta.target : 0;
          let missed = gateM === 0;
          if(missed) gateN = `Missed Volume Gate (${spQ}) - (Ignored)`;

          logs.push({c:"Smartphones", n:gateN, v:spFin, pot:spPot, missed});

          // --- Tablets (Updated for Focus Models) ---
          let tbTot=0;
          (rows.tb || []).forEach(r => tbTot += (r.qty||0)*r.rate);
          let tbFin = Math.min(tbTot, c.caps?.tb || 15000);
          logs.push({c:"Tablets", n:tbTot>tbFin?"Capped":"", v:tbFin});

          // --- Wearables ---
          let wrTot=0; (rows.wr || []).forEach(r => wrTot += (r.qty||0)*r.rate);
          const ringPayout = calculateRingPayout(meta.ringVol || 0);
          wrTot += ringPayout;
          if (meta.ringVol > 0) logs.push({c:"Rings", n:`${meta.ringVol} Units`, v:ringPayout});
          logs.push({c:"Wearables", n:"(Incl. Rings)", v:wrTot});

          let comb = spFin + wrTot;
          if(comb > (c.caps?.global || 75000)) { comb = c.caps.global; logs.push({c:"Global Cap", n:"Max 75k applied", v:0}); }

          // --- Care+ (With ProtectMax and Kickers) ---
          let cpTot=0, cpQ=0;
          (rows.cp || []).forEach(r => {
              cpQ+=r.qty;
              let rVal = (r.qty||0)*r.rate;
              if (r.pm) rVal = rVal * 1.25; // ProtectMax 1.25x
              cpTot += rVal;
          });

          let kickTot = 0;
          // Dynamic Kickers
          const kickersList = c.carePlus?.customKickers || [];
          kickersList.forEach((k, i) => {
              const input = meta.kickers?.[i] || { qty: 0, tier: 'low' };
              if (input.qty > 0) {
                  const rate = input.tier === 'high' ? k.h_rate : k.l_rate;
                  kickTot += input.qty * rate;
              }
          });

          // Legacy Kicker Fallback (if no dynamic kickers but old config exists)
          if (kickersList.length === 0 && c.carePlus?.kickers) {
               // ... (Legacy code omitted for cleanliness, assuming migration)
          }

          // Volume Kicker
          let cpVol = cpTot;
          const volGateMin = c.carePlus?.volGate?.min || 8;
          const volGateMult = c.carePlus?.volGate?.mult || 1.2;

          let volKickerApplied = false;
          if(cpQ >= volGateMin) {
              cpVol *= volGateMult;
              volKickerApplied = true;
          }

          if(cpQ>0 && cpQ<3) { cpVol=0; logs.push({c:"Care+", n:"Gate < 3", v:0}); }

          let cpFinal = cpVol + kickTot;
          logs.push({c:"Care+", n:`Vol: ${cpQ}, Kickers: ${kickTot}${volKickerApplied ? ', Vol Kicker Applied' : ''}`, v:cpFinal});

          // --- Note PC ---
          let npcTot=0; (rows.npc || []).forEach(r => npcTot += (r.qty||0)*r.rate);
          let npcFin = Math.min(npcTot, c.caps?.npc || 10000);
          logs.push({c:"Note PC", n:npcTot>npcFin?"Capped":"", v:npcFin});

          // --- Bundles ---
          let bunTot = 0; (rows.bun || []).forEach(r => bunTot += (r.qty||0)*r.rate);
          let bunFin = Math.min(bunTot, c.caps?.bun || 5000);
          logs.push({c:"Bundles", n:bunTot>bunFin?"Capped":"", v:bunFin});

          // --- Accessories ---
          let accTot = 0;
          // Priority: 1. Manual Override, 2. Config Base Target, 3. Auto (25x SP)
          let ab = 0;
          if (meta.accBaseOverride !== undefined && meta.accBaseOverride !== '') {
              ab = parseFloat(meta.accBaseOverride);
          } else if (c.accessories?.baseTarget) {
              ab = parseFloat(c.accessories.baseTarget);
          } else {
              ab = (spRaw * 25);
          }

          let accPct = 0;
          if(ab > 0 && meta.channel!=='exclusive' && c.accessories?.items) {
              accPct = (meta.accVal/ab)*100;
              accTot = calculateAccessoryPayout(accPct);
          }
          logs.push({c:"Accessories", n:`Base: ${ab.toFixed(0)} (${accPct.toFixed(1)}%)`, v:accTot});

          // --- Misc ---
          if (c.misc?.amount) {
              logs.push({c:"Misc", n:"", v:c.misc.amount});
          }

          const tentPLI = samsungIncentive.slabInc || 0;
          const pliAdj = meta.pli || 0;

          // --- TOTAL ---
          const totalPayout =
            (Number(tentPLI) || 0) +
            (Number(pliAdj) || 0) +
            (Number(spFin) || 0) +
            (Number(tbFin) || 0) +
            (Number(wrTot) || 0) +
            (Number(cpFinal) || 0) +
            (Number(npcFin) || 0) +
            (Number(bunFin) || 0) +
            (Number(accTot) || 0) +
            (Number(c.misc?.amount) || 0);

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

  if (view === 'config') return <Config onBack={() => setView('calc')} />;

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

        {/* Smartphones */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border-l-4 border-l-blue-600 shadow-sm p-3">
             <div className="flex justify-between items-center mb-2">
                 <span className="font-bold text-sm dark:text-white flex items-center gap-2"><Smartphone size={16}/> Smartphones</span>
                 <button onClick={() => addRow('sp')} className="text-xs bg-slate-100 dark:bg-slate-700 dark:text-white p-1 rounded">+ Add</button>
             </div>
             {(rows.sp || []).map((r, i) => (
                 <div key={i} className="flex gap-2 mb-2 items-center">
                     <select value={r.rate} onChange={(e)=>updRow('sp', i, 'rate', e.target.value)} className="flex-1 text-xs p-2 rounded border dark:bg-slate-900 dark:text-white">
                         <option value="0">Select Slab</option>
                         {(incConfig.sp?.slabs || []).map((s, idx) => <option key={idx} value={s.rate}>₹{s.min/1000}k - ₹{s.max ? s.max/1000 + 'k' : 'Max'} ({s.rate})</option>)}
                     </select>
                     <input type="number" value={r.qty} onChange={(e)=>updRow('sp', i, 'qty', e.target.value)} className="w-14 text-center text-xs p-2 rounded border dark:bg-slate-900 dark:text-white" />
                     <button onClick={() => delRow('sp', i)} className="text-red-400"><Trash2 size={14}/></button>
                 </div>
             ))}
        </div>

        {/* Tablets (With Focus Models) */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border-l-4 border-l-purple-600 shadow-sm p-3">
             <div className="flex justify-between items-center mb-2">
                 <span className="font-bold text-sm dark:text-white flex items-center gap-2"><Tablet size={16}/> Tablets</span>
                 <button onClick={() => addRow('tb')} className="text-xs bg-slate-100 dark:bg-slate-700 dark:text-white p-1 rounded">+ Add</button>
             </div>
             {(rows.tb || []).map((r, i) => (
                 <div key={i} className="flex gap-2 mb-2 items-center">
                     <select value={r.rate} onChange={(e)=>updRow('tb', i, 'rate', e.target.value)} className="flex-1 text-xs p-2 rounded border dark:bg-slate-900 dark:text-white">
                         <option value="0">Select Incentive</option>
                         <optgroup label="Price Slabs">
                            {(incConfig.tb?.slabs || []).map((s, idx) => <option key={'s'+idx} value={s.rate}>₹{s.min/1000}k+ ({s.rate})</option>)}
                         </optgroup>
                         <optgroup label="Focus Models">
                            {(incConfig.tb?.focus || []).map((f, idx) => <option key={'f'+idx} value={f.rate}>{f.name} ({f.rate})</option>)}
                         </optgroup>
                     </select>
                     <input type="number" value={r.qty} onChange={(e)=>updRow('tb', i, 'qty', e.target.value)} className="w-14 text-center text-xs p-2 rounded border dark:bg-slate-900 dark:text-white" />
                     <button onClick={() => delRow('tb', i)} className="text-red-400"><Trash2 size={14}/></button>
                 </div>
             ))}
        </div>

        {/* Wearables */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border-l-4 border-l-pink-500 shadow-sm p-3">
             <div className="flex justify-between items-center mb-2">
                 <span className="font-bold text-sm dark:text-white flex items-center gap-2"><Watch size={16}/> Wearables</span>
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
             <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                 <label className="text-xs text-slate-400 font-bold">Galaxy Ring (Units)</label>
                 <div className="flex justify-between items-center">
                    <input type="number" value={meta.ringVol} onChange={(e)=>setMeta({...meta, ringVol: parseInt(e.target.value)||0})} className="w-24 p-2 border rounded text-sm font-bold dark:bg-slate-900 dark:text-white" />
                    <span className="text-emerald-600 text-xs font-bold">Payout: ₹{calculateRingPayout(meta.ringVol).toLocaleString()}</span>
                 </div>
             </div>
        </div>

        {/* Care+ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border-l-4 border-l-indigo-600 shadow-sm p-3">
             <div className="flex justify-between items-center mb-2">
                 <span className="font-bold text-sm dark:text-white flex items-center gap-2"><ShieldCheck size={16}/> Care+</span>
                 <button onClick={() => addRow('cp')} className="text-xs bg-slate-100 dark:bg-slate-700 dark:text-white p-1 rounded">+ Add</button>
             </div>
             {(rows.cp || []).map((r, i) => (
                 <div key={i} className="flex gap-2 mb-2 items-center">
                     <select value={r.rate} onChange={(e)=>updRow('cp', i, 'rate', e.target.value)} className="flex-1 text-xs p-2 rounded border dark:bg-slate-900 dark:text-white">
                         <option value="0">Select Slab</option>
                         {(incConfig.carePlus?.slabs || []).map((s, idx) => <option key={idx} value={s.amount}>{s.name} ({s.amount})</option>)}
                     </select>
                     <div className="flex flex-col items-center">
                        <input type="number" value={r.qty} onChange={(e)=>updRow('cp', i, 'qty', e.target.value)} className="w-14 text-center text-xs p-2 rounded border dark:bg-slate-900 dark:text-white" />
                     </div>
                     <button
                         onClick={() => updRow('cp', i, 'pm', !r.pm)}
                         className={`p-2 rounded ${r.pm ? 'bg-indigo-100 text-indigo-600' : 'text-slate-300'}`}
                         title="Protect Max (1.25x)"
                     >
                        <ShieldCheck size={16}/>
                     </button>
                     <button onClick={() => delRow('cp', i)} className="text-red-400"><Trash2 size={14}/></button>
                 </div>
             ))}

             {/* Dynamic Kickers */}
             <div className="mt-2 grid grid-cols-2 gap-2">
                {(incConfig.carePlus?.customKickers || []).map((kicker, i) => (
                     <div key={i} className="bg-slate-50 dark:bg-slate-900 p-2 rounded">
                        <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">{kicker.name}</label>
                        <div className="flex items-center gap-1 mb-1">
                            <input
                                type="number"
                                placeholder="Qty"
                                value={meta.kickers?.[i]?.qty || 0}
                                onChange={(e)=> {
                                    const val = parseInt(e.target.value) || 0;
                                    setMeta(prev => ({ ...prev, kickers: { ...prev.kickers, [i]: { ...(prev.kickers?.[i] || {tier:'low'}), qty: val } } }));
                                }}
                                className="w-10 text-xs p-1 rounded border"
                            />
                            <span className="text-[10px] text-slate-400">Qty</span>
                        </div>
                        <select
                            value={meta.kickers?.[i]?.tier || 'low'}
                            onChange={(e)=> {
                                const val = e.target.value;
                                setMeta(prev => ({ ...prev, kickers: { ...prev.kickers, [i]: { ...(prev.kickers?.[i] || {qty:0}), tier: val } } }));
                            }}
                            className="w-full text-[10px] p-1 rounded border"
                        >
                            <option value="low">Low (&lt;{kicker.l_thresh}%)</option>
                            <option value="high">High (&ge;{kicker.l_thresh}%)</option>
                        </select>
                     </div>
                ))}
             </div>
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
                 <div>
                     <label className="text-xs text-slate-400">Base Target (Override)</label>
                     <input
                        type="number"
                        placeholder={incConfig.accessories?.baseTarget ? `Config: ${incConfig.accessories.baseTarget}` : `Auto: ${(result.spQ * 25).toFixed(0)}`}
                        value={meta.accBaseOverride}
                        onChange={(e)=>setMeta({...meta, accBaseOverride: e.target.value})}
                        className="w-full p-2 border rounded text-sm font-bold dark:bg-slate-900 dark:text-white"
                     />
                 </div>
                 <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
                     <span>Payout</span>
                     <span className="text-emerald-600 font-bold">₹{Math.floor(result.logs.find(l=>l.c==='Accessories')?.v || 0)}</span>
                 </div>
                 <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
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
