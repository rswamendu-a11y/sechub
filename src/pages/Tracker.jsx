import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { PlusCircle, ShoppingCart, Trash2, Calendar, Edit2, BarChart2, X, Check, Download, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const BRANDS = [
  { k: 'samsung', l: 'Samsung', c: 'bg-blue-500' },
  { k: 'iphone', l: 'Apple', c: 'bg-slate-600' },
  { k: 'oppo', l: 'Oppo', c: 'bg-emerald-500' },
  { k: 'vivo', l: 'Vivo', c: 'bg-cyan-500' },
  { k: 'realme', l: 'Realme', c: 'bg-yellow-500' },
  { k: 'mi', l: 'Xiaomi', c: 'bg-orange-500' },
  { k: 'moto', l: 'Moto', c: 'bg-indigo-500' },
  { k: 'other', l: 'Others', c: 'bg-gray-400' }
];

const Tracker = () => {
  const { sales, addSale, deleteSale, updateSale, clearDate, date, setDate, profile } = useAppStore();
  const [queue, setQueue] = useState([]);

  // Form State
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [variant, setVariant] = useState('');
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState('');

  // UI State
  const [editId, setEditId] = useState(null);
  const [showMtd, setShowMtd] = useState(false);
  const [mtdMonth, setMtdMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const dayData = sales[date] || { entries: [] };
  const entries = dayData.entries || [];

  const addToQueue = () => {
    if (!brand || !model) return alert("Please select Brand and Model");
    const qVal = parseInt(qty) || 1;
    const pVal = parseInt(price) || 0;

    if (editId) {
        // Update Mode
        updateSale(date, editId, { brand, model, variant, qty: qVal, price: pVal, total: qVal * pVal });
        setEditId(null);
        resetForm();
    } else {
        // Queue Mode
        setQueue([...queue, { brand, model, variant, qty: qVal, price: pVal, total: qVal * pVal }]);
        resetForm();
    }
  };

  const resetForm = () => {
      setModel(''); setVariant(''); setQty(1); setPrice(''); setBrand('');
  };

  const removeFromQueue = (index) => {
    const newQ = [...queue];
    newQ.splice(index, 1);
    setQueue(newQ);
  };

  const saveQueue = () => {
    queue.forEach(item => addSale(date, item));
    setQueue([]);
  };

  const handleEdit = (entry) => {
      setEditId(entry.id);
      setBrand(entry.brand);
      setModel(entry.model);
      setVariant(entry.variant || '');
      setQty(entry.qty);
      setPrice(entry.price);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
      if(confirm("Delete this entry?")) {
          deleteSale(date, id);
      }
  };

  // MTD Calculation
  const mtdStats = useMemo(() => {
      if (!showMtd) return [];
      const stats = {};
      BRANDS.forEach(b => stats[b.k] = { qty: 0, val: 0 });

      Object.keys(sales).forEach(d => {
          if(d.startsWith(mtdMonth)) {
              const day = sales[d];
              if(day.entries) {
                  day.entries.forEach(e => {
                      if(stats[e.brand]) {
                          stats[e.brand].qty += e.qty;
                          stats[e.brand].val += e.total;
                      }
                  });
              }
          }
      });
      return stats;
  }, [sales, mtdMonth, showMtd]);

  const exportMonthData = async (monthPrefix) => {
      const data = [];
      Object.keys(sales).forEach(d => {
          if(d.startsWith(monthPrefix)) {
              const day = sales[d];
              if(day.entries) {
                  day.entries.forEach(e => {
                      data.push({
                          Date: d,
                          Brand: e.brand,
                          Model: e.model,
                          Variant: e.variant,
                          Qty: e.qty,
                          Price: e.price,
                          Total: e.total,
                          Time: new Date(e.timestamp).toLocaleTimeString()
                      });
                  });
              }
          }
      });

      if(data.length === 0) return alert("No data to export for " + monthPrefix);

      // Calculate Sums for Grand Total
      const totalQty = data.reduce((a,c) => a + (c.Qty || 0), 0);
      const totalVal = data.reduce((a,c) => a + (c.Total || 0), 0);

      // Append Grand Total Row
      data.push({
          Date: 'GRAND TOTAL',
          Brand: '',
          Model: '',
          Variant: '',
          Qty: totalQty,
          Price: '',
          Total: totalVal,
          Time: ''
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "Sales Log");

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
      const fileName = `Sales_MTD_${monthPrefix}.xlsx`;

      try {
          await Filesystem.writeFile({
              path: fileName,
              data: wbout,
              directory: Directory.Cache
          });
          const uriResult = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
          await Share.share({ title: 'Export MTD Sales', url: uriResult.uri });
      } catch(e) {
          alert("Export Error: " + e.message);
      }
  };

  const exportMonthPDF = async (monthPrefix) => {
      const doc = new jsPDF('l', 'mm', 'a4');
      doc.setFontSize(18);
      doc.text(`Sales Report - ${profile?.name || ''} ${profile?.outlet || ''}`, 14, 15);

      const tableRows = [];
      const header = [
          'Date',
          'Samsung\nQty', 'Samsung\nVal',
          'Apple\nQty', 'Apple\nVal',
          'Oppo\nQty', 'Oppo\nVal',
          'Vivo\nQty', 'Vivo\nVal',
          'Realme\nQty', 'Realme\nVal',
          'Xiaomi\nQty', 'Xiaomi\nVal',
          'Moto\nQty', 'Moto\nVal',
          'Others\nQty', 'Others\nVal',
          'Total\nQty', 'Total\nVal',
          'Logs',
          'Brand Summary'
      ];

      // Calculate Total by Brand for Summary
      const brandTotals = {};
      BRANDS.forEach(b => brandTotals[b.k] = { l: b.l, qty: 0, val: 0 });
      brandTotals['other'] = { l: 'Others', qty: 0, val: 0 }; // Ensure other exists

      const dates = Object.keys(sales).filter(d => d.startsWith(monthPrefix)).sort();

      dates.forEach(dateStr => {
          const day = sales[dateStr];
          const entries = day.entries || [];

          const brandStats = {
              samsung: {qty:0, val:0},
              iphone: {qty:0, val:0},
              oppo: {qty:0, val:0},
              vivo: {qty:0, val:0},
              realme: {qty:0, val:0},
              mi: {qty:0, val:0},
              moto: {qty:0, val:0},
              other: {qty:0, val:0}
          };
          let dayTotalQty = 0;
          let dayTotalVal = 0;

          entries.forEach(e => {
              const b = e.brand || 'other';
              const k = BRANDS.find(br => br.k === b) ? b : 'other';

              if(brandStats[k]) {
                  brandStats[k].qty += e.qty;
                  brandStats[k].val += e.total;

                  // Add to Grand Summary
                  if(brandTotals[k]) {
                      brandTotals[k].qty += e.qty;
                      brandTotals[k].val += e.total;
                  }
              } else {
                  // Fallback if brand key mismatch
                  brandStats['other'].qty += e.qty;
                  brandStats['other'].val += e.total;

                  // Add to Grand Summary
                  brandTotals['other'].qty += e.qty;
                  brandTotals['other'].val += e.total;
              }

              dayTotalQty += e.qty;
              dayTotalVal += e.total;
          });

          const logLines = entries.map(e => {
            let logPart = `${e.brand} ${e.model}`;
            if(e.variant) logPart += ` (${e.variant})`;
            logPart += ` - ${e.qty}u (Val: ${e.total})`;
            return logPart;
          }).join('\n');

          const brandSummary = BRANDS.map(b => {
             const stat = brandStats[b.k];
             if (stat && stat.qty > 0) {
                 return `${b.l}: ${stat.qty}u (₹${stat.val.toLocaleString()})`;
             }
             return null;
          }).filter(Boolean).join('\n');

          const row = [
              dateStr,
              brandStats.samsung.qty, brandStats.samsung.val,
              brandStats.iphone.qty, brandStats.iphone.val,
              brandStats.oppo.qty, brandStats.oppo.val,
              brandStats.vivo.qty, brandStats.vivo.val,
              brandStats.realme.qty, brandStats.realme.val,
              brandStats.mi.qty, brandStats.mi.val,
              brandStats.moto.qty, brandStats.moto.val,
              brandStats.other.qty, brandStats.other.val,
              dayTotalQty, dayTotalVal,
              logLines,
              brandSummary
          ];
          tableRows.push(row);
      });

      if(tableRows.length === 0) return alert("No data to export for " + monthPrefix);

      // --- BRAND SUMMARY TABLE INJECTION ---
      // We insert rows *before* the Grand Total
      tableRows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']); // Spacer
      tableRows.push(['BRAND SUMMARY', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']); // Header

      Object.values(brandTotals).forEach(bt => {
          if (bt.qty > 0) {
              const summaryRow = [
                  `${bt.l} Total:`,
                  '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', // Spacers
                  bt.qty, bt.val, // Align with Total columns (roughly, or just use first columns)
                  '', ''
              ];
              // Hack: Put text in first column, Qty in 17, Val in 18
              // Actually, user wants "Samsung Total: 10 units, 2.4L" in a row.
              // Let's formatting it into the first few columns
              const text = `${bt.l}: ${bt.qty} units, ₹${bt.val.toLocaleString()}`;
              tableRows.push([text, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
          }
      });
      tableRows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']); // Spacer

      // Grand Total Calculation for PDF
      // Indexes: 17=TotalQty, 18=TotalVal
      // Note: We must filter out our summary rows calculation!
      // The original rows are indices 0 to dates.length-1.
      // Let's recalculate grand total from brandTotals to be safe and clean.
      const grandTotalQty = Object.values(brandTotals).reduce((a, c) => a + c.qty, 0);
      const grandTotalVal = Object.values(brandTotals).reduce((a, c) => a + c.val, 0);

      // Add Grand Total Row
      const grandTotalRow = [
          'GRAND TOTAL',
          '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', // Empty brand columns
          grandTotalQty, grandTotalVal,
          '', ''
      ];
      tableRows.push(grandTotalRow);

      doc.autoTable({
          head: [header],
          body: tableRows,
          didParseCell: (data) => {
              if (data.row.index === tableRows.length - 1) {
                  data.cell.styles.fontStyle = 'bold';
                  data.cell.styles.fillColor = [220, 252, 231]; // Light Emerald
              }
          },
          startY: 20,
          margin: { top: 20, left: 10, right: 10 },
          styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak', valign: 'middle' },
          columnStyles: {
              0: { cellWidth: 15 }, // Date
              // Re-indexed Brand Columns (Shifted -1)
              1: { cellWidth: 6 }, 2: { cellWidth: 10 }, // Samsung
              3: { cellWidth: 6 }, 4: { cellWidth: 10 }, // Apple
              5: { cellWidth: 6 }, 6: { cellWidth: 10 }, // Oppo
              7: { cellWidth: 6 }, 8: { cellWidth: 10 }, // Vivo
              9: { cellWidth: 6 }, 10: { cellWidth: 10 }, // Realme
              11: { cellWidth: 6 }, 12: { cellWidth: 10 }, // Xiaomi
              13: { cellWidth: 6 }, 14: { cellWidth: 10 }, // Moto
              15: { cellWidth: 6 }, 16: { cellWidth: 10 }, // Others
              17: { cellWidth: 8 }, 18: { cellWidth: 12 }, // Total
              19: { cellWidth: 40 }, // Logs
              20: { cellWidth: 'auto' } // Summary
          },
          theme: 'grid',
          headStyles: {
              fillColor: [59, 130, 246],
              fontSize: 7,
              halign: 'center',
              valign: 'middle'
          }
      });

      const fileName = `Sales_Report_${monthPrefix}.pdf`;

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
              title: 'Export Sales Report',
              url: uriResult.uri
          });
      } catch (e) {
          console.error(e);
          doc.save(fileName);
      }
  };

  return (
    <div className="fade-in space-y-6 pb-24">
      {/* Date Header */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm flex justify-between items-center border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-50 dark:bg-indigo-900/50 p-2 rounded-lg text-indigo-600"><Calendar size={20} /></div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent font-bold dark:text-white outline-none"
          />
        </div>
        <div className="flex gap-2">
            <button onClick={() => exportMonthData(date.slice(0, 7))} className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg"><Download size={20}/></button>
            <button onClick={() => setShowMtd(true)} className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg"><BarChart2 size={20}/></button>
            <button onClick={() => { if(confirm("Clear Date?")) clearDate(date); }} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg"><Trash2 size={20}/></button>
        </div>
      </div>

      {/* Add / Edit Card */}
      <div className={`p-6 rounded-3xl shadow-lg border relative overflow-hidden transition-colors ${editId ? 'bg-amber-50 border-amber-200 dark:bg-slate-800 dark:border-amber-900' : 'bg-white border-slate-100 dark:bg-slate-800 dark:border-slate-700'}`}>
        <div className={`absolute top-0 left-0 w-full h-1 ${editId ? 'bg-amber-500' : 'bg-indigo-500'}`}></div>
        <h3 className="font-bold mb-4 flex items-center gap-2 dark:text-white">
            {editId ? <Edit2 size={20} className="text-amber-500"/> : <PlusCircle size={20} />}
            {editId ? 'Edit Entry' : 'Add Sale'}
        </h3>

        <div className="space-y-3">
          <select value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-700 dark:text-white font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Select Brand</option>
            {BRANDS.map(b => <option key={b.k} value={b.k}>{b.l}</option>)}
          </select>
          <div className="grid grid-cols-3 gap-3">
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Model" className="col-span-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700 dark:text-white font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500" />
            <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700 dark:text-white font-bold text-sm text-center border-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input value={variant} onChange={(e) => setVariant(e.target.value)} placeholder="Variant (8/128)" className="col-span-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700 dark:text-white font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500" />
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" className="col-span-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-700 dark:text-white font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div className="flex gap-2">
            {editId && <button onClick={() => { setEditId(null); resetForm(); }} className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-bold mt-2">Cancel</button>}
            <button onClick={addToQueue} className={`flex-1 text-white py-3 rounded-xl font-bold mt-2 hover:opacity-90 transition ${editId ? 'bg-amber-500' : 'bg-slate-900 dark:bg-indigo-600'}`}>
                {editId ? 'Update Entry' : 'Add to Queue'}
            </button>
          </div>
        </div>
      </div>

      {/* Queue (Only in Add Mode) */}
      {!editId && queue.length > 0 && (
        <div className="bg-slate-800 rounded-3xl p-5 text-white shadow-xl">
          <div className="flex justify-between items-center mb-4 border-b border-slate-600 pb-3">
            <h4 className="font-bold flex items-center gap-2"><ShoppingCart size={18} /> Queue ({queue.length})</h4>
          </div>
          <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
            {queue.map((item, i) => (
              <div key={i} className="flex justify-between items-center bg-white/10 p-3 rounded-xl">
                <div>
                  <div className="font-bold text-sm">{item.brand} {item.model} {item.variant}</div>
                  <div className="text-xs text-slate-400">{item.qty} x {item.price}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-emerald-400">{item.total}</span>
                  <button onClick={() => removeFromQueue(i)}><Trash2 className="text-red-400 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={saveQueue} className="w-full py-3 bg-emerald-500 rounded-xl font-bold text-sm shadow-lg shadow-emerald-900/20">Confirm & Save</button>
        </div>
      )}

      {/* Daily Entries List */}
      <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase ml-2">Sales Log ({entries.length})</h4>
          {entries.length === 0 ? (
              <div className="text-center p-8 text-slate-400 text-sm bg-slate-50 dark:bg-slate-800/50 rounded-2xl">No sales recorded today.</div>
          ) : (
              entries.slice().reverse().map((e) => (
                  <div key={e.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                      <div>
                          <div className="font-bold text-sm dark:text-white">{e.brand} {e.model} <span className="text-slate-400 font-normal">{e.variant}</span></div>
                          <div className="text-xs text-slate-500 mt-1 flex gap-2">
                              <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{e.qty} Units</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-mono">₹{e.total}</span>
                          </div>
                      </div>
                      <div className="flex gap-1">
                          <button onClick={() => handleEdit(e)} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"><Edit2 size={16}/></button>
                          <button onClick={() => handleDelete(e.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                  </div>
              ))
          )}
      </div>

      {/* MTD Modal */}
      {showMtd && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl p-6 relative">
                  <button onClick={() => setShowMtd(false)} className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20}/></button>
                  <h3 className="font-bold text-xl mb-4 dark:text-white flex items-center gap-2"><BarChart2 className="text-indigo-500"/> MTD Report</h3>

                  <input type="month" value={mtdMonth} onChange={(e) => setMtdMonth(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl mb-4 font-bold dark:text-white" />

                  <div className="flex justify-end mb-4 gap-2">
                      <button
                          onClick={() => exportMonthPDF(mtdMonth)}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all"
                      >
                          <FileText size={18} /> PDF
                      </button>
                      <button
                          onClick={() => exportMonthData(mtdMonth)}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all"
                      >
                          <Download size={18} /> Excel
                      </button>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800">
                              <tr>
                                  <th className="px-3 py-3 rounded-l-lg">Brand</th>
                                  <th className="px-3 py-3">Qty</th>
                                  <th className="px-3 py-3 rounded-r-lg">Val</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {BRANDS.map(b => (
                                  <tr key={b.k}>
                                      <td className="px-3 py-3 font-bold dark:text-slate-300">{b.l}</td>
                                      <td className="px-3 py-3 dark:text-slate-400">{mtdStats[b.k].qty}</td>
                                      <td className="px-3 py-3 font-mono text-emerald-600 dark:text-emerald-400">{mtdStats[b.k].val.toLocaleString()}</td>
                                  </tr>
                              ))}
                              <tr className="bg-slate-50 dark:bg-slate-800 font-bold">
                                  <td className="px-3 py-3">TOTAL</td>
                                  <td className="px-3 py-3">{Object.values(mtdStats).reduce((a,c) => a+c.qty, 0)}</td>
                                  <td className="px-3 py-3 text-emerald-600">{Object.values(mtdStats).reduce((a,c) => a+c.val, 0).toLocaleString()}</td>
                              </tr>
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Tracker;
