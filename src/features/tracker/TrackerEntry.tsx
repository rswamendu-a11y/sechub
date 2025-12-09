import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Card, Button, Input, Select } from '../../components/ui';
import { PlusCircle, Trash2, ShoppingCart, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const BRANDS = [
  {k:'samsung', l:'Samsung'}, {k:'iphone', l:'Apple'},
  {k:'oppo', l:'Oppo'}, {k:'vivo', l:'Vivo'},
  {k:'realme', l:'Realme'}, {k:'mi', l:'Xiaomi'},
  {k:'moto', l:'Moto'}, {k:'other', l:'Others'}
];

export const TrackerEntry: React.FC = () => {
  const { queue, addSale, removeQueueItem, saveQueueToSales, clearQueue } = useAppStore();

  // Local state for form
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [variant, setVariant] = useState('');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');

  const handleAdd = () => {
    if (!brand || !model) return alert("Please select Brand and Model");

    // Auto-parse volume logic "A36 2 units"
    let q = parseInt(qty) || 1;
    const match = model.match(/(\d+)\s*(?:units?|pcs?)/i);
    if(match) q = parseInt(match[1]);

    const p = parseFloat(price) || 0;

    addSale(date, {
      brand,
      model,
      variant,
      qty: q,
      price: p,
      total: q * p
    });

    // Reset fields except date/brand? user might want continuous entry
    setModel('');
    setVariant('');
    setPrice('');
    setQty('1');
  };

  const handleSave = () => {
    if (queue.length === 0) return;
    saveQueueToSales(date);
    alert("Saved successfully!");
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Date Header */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm flex justify-between items-center border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-50 dark:bg-indigo-900/50 p-2 rounded-lg text-indigo-600"><Calendar size={20} /></div>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-transparent font-bold dark:text-white outline-none"
          />
        </div>
      </div>

      {/* Entry Card */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
        <h3 className="font-bold mb-4 flex items-center gap-2 dark:text-white"><PlusCircle size={20} /> Add Sale</h3>
        <div className="space-y-3">
          <Select value={brand} onChange={e => setBrand(e.target.value)}>
            <option value="">Select Brand</option>
            {BRANDS.map(b => <option key={b.k} value={b.k}>{b.l}</option>)}
          </Select>

          <div className="grid grid-cols-3 gap-3">
            <Input
              className="col-span-2"
              placeholder="Model (e.g. A36)"
              value={model}
              onChange={e => setModel(e.target.value)}
            />
            <Input
              className="col-span-1 text-center"
              type="number"
              value={qty}
              onChange={e => setQty(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              className="col-span-2"
              placeholder="Variant (e.g. 8/128)"
              value={variant}
              onChange={e => setVariant(e.target.value)}
            />
            <Input
              className="col-span-1"
              type="number"
              placeholder="Price"
              value={price}
              onChange={e => setPrice(e.target.value)}
            />
          </div>

          <Button onClick={handleAdd} className="w-full mt-2">Add to Queue</Button>
        </div>
      </Card>

      {/* Queue */}
      {queue.length > 0 && (
        <div className="bg-slate-800 rounded-3xl p-5 text-white shadow-xl">
           <div className="flex justify-between items-center mb-4 border-b border-slate-600 pb-3">
              <h4 className="font-bold flex items-center gap-2"><ShoppingCart size={18} /> Queue ({queue.length})</h4>
              <button onClick={clearQueue} className="text-xs text-red-400">Clear</button>
           </div>
           <div className="space-y-3 mb-4 max-h-48 overflow-y-auto custom-scrollbar">
              {queue.map((item, i) => (
                <div key={i} className="flex justify-between items-center bg-white/10 p-3 rounded-xl">
                    <div>
                      <div className="font-bold text-sm">{item.brand} {item.model} {item.variant}</div>
                      <div className="text-xs text-slate-400">{item.qty} x {item.price}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-emerald-400">{item.total}</span>
                      <button onClick={() => removeQueueItem(i)}><Trash2 size={16} className="text-red-400" /></button>
                    </div>
                </div>
              ))}
           </div>
           <button onClick={handleSave} className="w-full py-3 bg-emerald-500 rounded-xl font-bold text-sm shadow-lg shadow-emerald-900/20 hover:bg-emerald-600 transition">Confirm & Save</button>
        </div>
      )}
    </div>
  );
};
