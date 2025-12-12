import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { calculateIncentive } from './utils';
import { Card, Button, Input, Select } from '../../components/ui';
import { Settings, Trash2, Plus, FileSpreadsheet, FileText } from 'lucide-react';
import { IncentiveConfigGUI } from './IncentiveConfigGUI';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { FilesystemService } from '../../services/filesystem';

// Initial Row State Helper
const initRow = (rate=0, qty=1) => ({ qty, rate, fm: false });

export const IncentiveView: React.FC = () => {
  const { incConfig, updateIncentiveConfig, sales } = useAppStore();
  const [showConfig, setShowConfig] = useState(false);

  // Local State for Calculation
  const [rows, setRows] = useState({
    sp: [] as any[], tb: [] as any[], wr: [] as any[], cp: [] as any[], npc: [] as any[]
  });

  const [meta, setMeta] = useState({
    channel: 'standard', status: 'existing', target: 50,
    k_ff7: 0, t_ff7: 'low', k_s25: 0, t_s25: 'low',
    accVal: 0, accBase: 0
  });

  const [bundles, setBundles] = useState<Record<string, number>>({});

  // --- AUTO-INCENTIVE BRIDGE ---
  // On mount (or when sales change?), if rows are empty, populate from Sales Log
  useEffect(() => {
    if(rows.sp.length > 0) return; // Don't overwrite if already has data (or user edited)

    const dateStr = new Date().toISOString().slice(0, 7); // YYYY-MM
    const spMap = new Map<number, number>(); // Rate -> Qty
    const tbMap = new Map<number, number>();

    Object.entries(sales).forEach(([date, dayData]: [string, any]) => {
        if(!date.startsWith(dateStr)) return;

        // We must parse the Logs to get individual unit prices
        // Log Format: ... Samsung Model (Var) - Xu (Val: Y) ...
        // Regex to capture Brand, Qty, Val
        // But the log format in TrackerEntry is: `[Date Time] Brand Model (Variant) - Qu (Val: Total)`
        // Example: `[2023-10-27 ...] Samsung S23 - 1u (Val: 75000)`

        const logs = dayData.models || "";
        const lines = logs.split('\n');
        lines.forEach((line: string) => {
            if(!line.includes('Samsung')) return;

            // Extract Qty and Val
            const match = line.match(/-\s(\d+)u\s\(Val:\s(\d+)\)/);
            if(match) {
                const qty = parseInt(match[1]);
                const val = parseInt(match[2]);
                if(qty > 0 && val > 0) {
                    const unitPrice = val / qty;

                    // Determine if Tablet or SP based on Model name?
                    // Tracker doesn't explicitly save 'Type'.
                    // HEURISTIC: Check if Model name contains 'Tab'.
                    // If strict type is needed, we'd need Tracker update.
                    // For now, assume everything is SP unless it says 'Tab'.
                    const isTab = line.toLowerCase().includes('tab');

                    const targetMap = isTab ? tbMap : spMap;
                    const slabs = isTab ? incConfig.tb.slabs : incConfig.sp.slabs;

                    // Find Slab
                    // Slabs are sorted desc usually? min 100000, min 70000...
                    // Find first slab where unitPrice >= min
                    const slab = slabs.find(s => unitPrice >= s.min);
                    const rate = slab ? slab.rate : 0;

                    if(rate > 0) {
                        targetMap.set(rate, (targetMap.get(rate)||0) + qty);
                    }
                }
            }
        });
    });

    const newSP = Array.from(spMap.entries()).map(([rate, qty]) => initRow(rate, qty));
    const newTB = Array.from(tbMap.entries()).map(([rate, qty]) => initRow(rate, qty));

    if(newSP.length > 0 || newTB.length > 0) {
        setRows(prev => ({
            ...prev,
            sp: newSP.length ? newSP : [initRow()],
            tb: newTB.length ? newTB : [initRow()],
            wr: prev.wr.length ? prev.wr : [initRow()] // Preserve or init
        }));
    } else {
        // Init empty if nothing found
         setRows(prev => ({
            ...prev,
            sp: [initRow()],
            tb: [initRow()],
            wr: [initRow()]
        }));
    }

  }, [sales, incConfig]); // Re-run if sales update? Maybe just on mount is safer to avoid overwriting edits.
  // But usually users want real-time. Let's stick to "If empty".
  // If user clears rows, it might re-pop. That's acceptable.

  // Calculation
  const result = calculateIncentive(incConfig, rows, meta);

  // Calculate Bundles Total
  let bunTot = 0;
  const bundleList = meta.channel === 'exclusive' ? incConfig.bun.excl : incConfig.bun.std;
  Object.entries(bundles).forEach(([name, qty]) => {
     const item = bundleList.find(b => b.name === name);
     if(item) bunTot += qty * item.rate;
  });
  if(meta.channel !== 'exclusive') bunTot = Math.min(bunTot, incConfig.caps.bun);

  const grandTotal = result.partials.comb + result.partials.tbFin + result.partials.npcFin + result.partials.cpTot + result.partials.accTot + bunTot;
  const logs = [...result.logs, { c: "Bundles", n: "", v: bunTot }];

  // Handlers
  const addRow = (key: keyof typeof rows) => setRows(p => ({ ...p, [key]: [...p[key], initRow()] }));
  const delRow = (key: keyof typeof rows, i: number) => setRows(p => ({ ...p, [key]: p[key].filter((_, idx) => idx !== i) }));
  const updRow = (key: keyof typeof rows, i: number, field: string, val: any) => {
    setRows(p => {
        const n = [...p[key]];
        n[i] = { ...n[i], [field]: val };
        return { ...p, [key]: n };
    });
  };

  const handleExport = async (type: 'xlsx'|'pdf') => {
      const dataRows = logs.map(l => [l.c, l.n + (l.missed?` (Pot: ${Math.floor(l.pot||0)})`:''), Math.floor(l.v)]);
      dataRows.push(["TOTAL", "", Math.floor(grandTotal)]);

      const fileName = `Incentive_${new Date().toISOString().split('T')[0]}`;

      if(type === 'xlsx') {
         const wb = XLSX.utils.book_new();
         const ws = XLSX.utils.aoa_to_sheet([['Category','Note','Amount'], ...dataRows]);
         XLSX.utils.book_append_sheet(wb, ws, "Incentive");
         const out = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
         await FilesystemService.saveFile(fileName+'.xlsx', out);
         await FilesystemService.shareFile(fileName+'.xlsx');
      } else {
         const doc = new jsPDF();
         doc.text("Incentive Statement", 14, 20);
         // @ts-ignore
         doc.autoTable({ startY:30, head:[['Category','Note','Amount']], body:dataRows });
         const out = doc.output('datauristring').split(',')[1];
         await FilesystemService.saveFile(fileName+'.pdf', out);
         await FilesystemService.shareFile(fileName+'.pdf');
      }
  };

  if(showConfig) return <IncentiveConfigGUI config={incConfig} onSave={(c) => { updateIncentiveConfig(c); setShowConfig(false); }} onBack={() => setShowConfig(false)} />;

  return (
    <div className="pb-24 fade-in space-y-4">
       {/* Dashboard Header */}
       <Card>
          <div className="flex justify-between items-center mb-4">
             <h2 className="font-bold dark:text-white text-xl">Dashboard</h2>
             <Button variant="secondary" onClick={() => setShowConfig(true)} className="py-2 px-3 text-xs"><Settings size={16} /> Config</Button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs mb-2">
             <div>
                <label className="font-bold text-slate-400 block mb-1">Channel</label>
                <Select value={meta.channel} onChange={e => setMeta({...meta, channel: e.target.value})}>
                   <option value="standard">Standard</option>
                   <option value="sis_pro">SIS Pro</option>
                   <option value="exclusive">Exclusive</option>
                </Select>
             </div>
             <div>
                <label className="font-bold text-slate-400 block mb-1">Status</label>
                <Select value={meta.status} onChange={e => setMeta({...meta, status: e.target.value})}>
                   <option value="existing">Existing</option>
                   <option value="new_joinee">New Joinee</option>
                </Select>
             </div>
             <div>
                <label className="font-bold text-slate-400 block mb-1">Target</label>
                <Input type="number" value={meta.target} onChange={e => setMeta({...meta, target: parseFloat(e.target.value)||0})} />
             </div>
             <div>
                <label className="font-bold text-slate-400 block mb-1">Achieved</label>
                <div className="font-bold text-lg dark:text-white p-2">{result.spQ} <span className="text-xs text-slate-400">({result.ach}%)</span></div>
             </div>
          </div>
       </Card>

       {/* Sections */}
       <Section title="Smartphones" color="blue" onAdd={() => addRow('sp')}>
          {rows.sp.map((r, i) => (
             <Row key={i} onDelete={() => delRow('sp', i)}>
                <Select value={r.rate} onChange={e => updRow('sp', i, 'rate', parseFloat(e.target.value))} className="flex-1 min-w-[120px]">
                   <optgroup label="Standard">{incConfig.sp.slabs.map(s => <option key={s.rate} value={s.rate}>{s.label} ({s.rate})</option>)}</optgroup>
                </Select>
                <Input type="number" value={r.qty} onChange={e => updRow('sp', i, 'qty', parseFloat(e.target.value))} className="w-16 text-center" />
                <div className="flex items-center px-2 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                   <input type="checkbox" checked={r.fm} onChange={e => updRow('sp', i, 'fm', e.target.checked)} />
                   <span className="text-[10px] ml-1 font-bold">FM</span>
                </div>
             </Row>
          ))}
       </Section>

       <Section title="Tablets" color="green" onAdd={() => addRow('tb')}>
           {rows.tb.map((r, i) => (
             <Row key={i} onDelete={() => delRow('tb', i)}>
                <Select value={r.rate} onChange={e => updRow('tb', i, 'rate', parseFloat(e.target.value))} className="flex-1">
                   <optgroup label="Focus">{incConfig.tb.focus.map(f => <option key={f.name} value={f.rate}>{f.name} ({f.rate})</option>)}</optgroup>
                   <optgroup label="Slabs">{incConfig.tb.slabs.map(s => <option key={s.rate} value={s.rate}>{s.label} ({s.rate})</option>)}</optgroup>
                </Select>
                <Input type="number" value={r.qty} onChange={e => updRow('tb', i, 'qty', parseFloat(e.target.value))} className="w-16 text-center" />
             </Row>
          ))}
       </Section>

       <Section title="Wearables" color="purple" onAdd={() => addRow('wr')}>
           {rows.wr.map((r, i) => (
             <Row key={i} onDelete={() => delRow('wr', i)}>
                <Select value={r.rate} onChange={e => updRow('wr', i, 'rate', parseFloat(e.target.value))} className="flex-1">
                   {incConfig.wr.map(w => <option key={w.name} value={w.rate}>{w.name} ({w.rate})</option>)}
                </Select>
                <Input type="number" value={r.qty} onChange={e => updRow('wr', i, 'qty', parseFloat(e.target.value))} className="w-16 text-center" />
             </Row>
          ))}
       </Section>

       {/* Kickers / Care+ */}
       <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-3xl border border-red-100 dark:border-red-900/30 flex gap-4">
          <div className="flex-1">
             <label className="text-[10px] font-bold text-red-800 dark:text-red-200 block mb-1">FF7 Kicker</label>
             <div className="flex gap-1">
                <Input placeholder="Qty" type="number" value={meta.k_ff7||''} onChange={e => setMeta({...meta, k_ff7: parseFloat(e.target.value)||0})} className="h-8 text-xs" />
                <Select value={meta.t_ff7} onChange={e => setMeta({...meta, t_ff7: e.target.value})} className="h-8 py-0 text-xs">
                   <option value="low">Low</option><option value="high">High</option>
                </Select>
             </div>
          </div>
          <div className="flex-1">
             <label className="text-[10px] font-bold text-red-800 dark:text-red-200 block mb-1">S25 Kicker</label>
             <div className="flex gap-1">
                <Input placeholder="Qty" type="number" value={meta.k_s25||''} onChange={e => setMeta({...meta, k_s25: parseFloat(e.target.value)||0})} className="h-8 text-xs" />
                <Select value={meta.t_s25} onChange={e => setMeta({...meta, t_s25: e.target.value})} className="h-8 py-0 text-xs">
                   <option value="low">Low</option><option value="high">High</option>
                </Select>
             </div>
          </div>
       </div>

       {/* Bundles */}
       <div className="bg-white dark:bg-slate-800 rounded-xl border-l-4 border-l-orange-500 shadow-sm p-4">
           <h3 className="font-bold text-sm text-orange-700 dark:text-orange-400 mb-2">Bundles & Acc</h3>
           <div className="grid grid-cols-3 gap-2 mb-3">
               {bundleList.map((b) => (
                   <div key={b.name} className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded text-center border border-orange-100 dark:border-orange-800/30">
                       <div className="text-[9px] font-bold uppercase truncate dark:text-orange-200">{b.name}</div>
                       <input
                         type="number"
                         className="w-full mt-1 text-center text-xs p-1 rounded border-none shadow-sm bg-white dark:bg-slate-900 dark:text-white"
                         placeholder="Qty"
                         value={bundles[b.name]||''}
                         onChange={(e) => setBundles({...bundles, [b.name]: parseInt(e.target.value)||0})}
                       />
                   </div>
               ))}
           </div>
           <div className="border-t dark:border-slate-700 pt-2 flex gap-2">
               <Input placeholder="Acc Val" type="number" className="text-xs h-8" value={meta.accVal||''} onChange={e => setMeta({...meta, accVal: parseFloat(e.target.value)||0})} />
               <Input placeholder="Acc Base" type="number" className="text-xs h-8" value={meta.accBase||''} onChange={e => setMeta({...meta, accBase: parseFloat(e.target.value)||0})} />
           </div>
       </div>

       {/* Footer */}
       <div className="fixed bottom-20 left-0 w-full glass p-3 border-t border-slate-200 dark:border-slate-800 flex flex-col items-center z-40 max-w-xl mx-auto shadow-lg">
            <div className="flex justify-between items-center w-full mb-2">
                <div className="text-right flex-1 pr-4">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Total Payout</div>
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">₹{Math.floor(grandTotal).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => handleExport('xlsx')} className="p-3 rounded-xl"><FileSpreadsheet size={20} /></Button>
                    <Button variant="danger" onClick={() => handleExport('pdf')} className="p-3 rounded-xl"><FileText size={20} /></Button>
                </div>
            </div>
            <div className="text-[10px] font-extrabold text-slate-800 dark:text-slate-300 text-center uppercase tracking-wide w-full border-t border-slate-100 dark:border-slate-700 pt-2">THIS INCENTIVE WORKING IS SUBJECT TO QUALIFICATION CRITERIA</div>
       </div>
    </div>
  );
};

// Sub-components
const Section: React.FC<{title:string, color:string, children: React.ReactNode, onAdd:()=>void}> = ({title, color, children, onAdd}) => (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border-l-4 border-${color}-600 shadow-sm overflow-hidden`}>
        <div className={`px-3 py-2 bg-${color}-50 dark:bg-slate-700/50 flex justify-between items-center`}>
            <span className="font-bold text-sm dark:text-white">{title}</span>
            <button onClick={onAdd} className="text-xs bg-white dark:bg-slate-600 px-2 py-1 rounded shadow-sm hover:bg-slate-50 dark:hover:bg-slate-500 dark:text-white flex items-center gap-1"><Plus size={12}/> Add</button>
        </div>
        <div className="p-3 space-y-2">{children}</div>
    </div>
);

const Row: React.FC<{children: React.ReactNode, onDelete:()=>void}> = ({children, onDelete}) => (
    <div className="flex gap-2 items-center">
        {children}
        <button onClick={onDelete} className="text-red-400 p-2"><Trash2 size={16} /></button>
    </div>
);
