import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { PlusCircle, ShoppingCart, Trash2, Calendar, Database } from 'lucide-react';

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
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [queue, setQueue] = useState([]);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [variant, setVariant] = useState('');
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState('');

  const { sales, addSale, clearDate } = useAppStore();
  const entry = sales[date] || { models: '' };

  const addToQueue = () => {
    if (!brand || !model) return alert("Please select Brand and Model");
    const qVal = parseInt(qty) || 1;
    const pVal = parseInt(price) || 0;

    setQueue([...queue, { brand, model, variant, qty: qVal, price: pVal, total: qVal * pVal }]);
    // Reset fields except Date
    setModel(''); setVariant(''); setQty(1); setPrice('');
  };

  const removeFromQueue = (index) => {
    const newQ = [...queue];
    newQ.splice(index, 1);
    setQueue(newQ);
  };

  const saveQueue = () => {
    queue.forEach(item => addSale(date, item));
    setQueue([]);
    alert("Saved successfully!");
  };

  const handleClearDate = () => {
    if (confirm("Are you sure you want to clear the selected date's data?")) {
      clearDate(date);
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
        <button onClick={handleClearDate} className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">Clear</button>
      </div>

      {/* Add Card */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
        <h3 className="font-bold mb-4 flex items-center gap-2 dark:text-white"><PlusCircle size={20} /> Add Sale</h3>
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
          <button onClick={addToQueue} className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-3 rounded-xl font-bold mt-2 hover:opacity-90 transition">Add to Queue</button>
        </div>
      </div>

      {/* Queue */}
      {queue.length > 0 && (
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

      {/* Quick Log View */}
      {entry.models && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Logs for {date}</h4>
          <div className="text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap pl-2 border-l-2 border-slate-200">
            {entry.models}
          </div>
        </div>
      )}
    </div>
  );
};

export default Tracker;
