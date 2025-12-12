import React from 'react';
import { type IncentiveConfig } from '../../types';
import { Button, Input } from '../../components/ui';
import { ArrowLeft, Save, Trash2, Plus } from 'lucide-react';

interface Props {
  config: IncentiveConfig;
  onSave: (config: IncentiveConfig) => void;
  onBack: () => void;
}

export const IncentiveConfigGUI: React.FC<Props> = ({ config, onSave, onBack }) => {
  const [cfg, setCfg] = React.useState<IncentiveConfig>(JSON.parse(JSON.stringify(config))); // Deep copy
  const [activeTab, setActiveTab] = React.useState('SP');

  const handleChange = (path: string, val: any) => {
    const keys = path.split('.');
    setCfg(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        let ref = next;
        for(let i=0; i<keys.length-1; i++) ref = ref[keys[i]];
        ref[keys[keys.length-1]] = val;
        return next;
    });
  };

  const handleArrChange = (path: string, index: number, field: string, val: any) => {
    const keys = path.split('.');
    setCfg(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        let ref = next;
        for(let k of keys) ref = ref[k];
        ref[index][field] = val;
        return next;
    });
  };

  const addItem = (path: string, item: any) => {
    const keys = path.split('.');
    setCfg(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        let ref = next;
        for(let k of keys) ref = ref[k];
        if(Array.isArray(ref)) ref.push(item);
        return next;
    });
  };

  const removeItem = (path: string, index: number) => {
    const keys = path.split('.');
    setCfg(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        let ref = next;
        for(let k of keys) ref = ref[k];
        if(Array.isArray(ref)) ref.splice(index, 1);
        return next;
    });
  };

  const renderTab = () => {
      if(activeTab === 'SP') {
          return (
              <div className="space-y-4">
                  <div className="flex justify-between items-center">
                      <h4 className="font-bold text-blue-600">Slabs (Smartphones)</h4>
                      <button onClick={() => addItem('sp.slabs', {min:0, rate:0, label:''})} className="text-blue-600"><Plus size={16}/></button>
                  </div>
                  {cfg.sp.slabs.map((s, i) => (
                      <div key={i} className="flex gap-2 items-center">
                          <Input type="number" value={s.min} onChange={e => handleArrChange('sp.slabs', i, 'min', parseFloat(e.target.value))} placeholder="Min" />
                          <Input type="number" value={s.rate} onChange={e => handleArrChange('sp.slabs', i, 'rate', parseFloat(e.target.value))} placeholder="Rate" />
                          <Input value={s.label} onChange={e => handleArrChange('sp.slabs', i, 'label', e.target.value)} placeholder="Label" />
                          <button onClick={() => removeItem('sp.slabs', i)} className="text-red-400"><Trash2 size={16}/></button>
                      </div>
                  ))}
                  <h4 className="font-bold text-blue-600 mt-4">Gates (Std)</h4>
                  {cfg.sp.gates.std.map((g, i) => (
                      <div key={i} className="flex gap-2">
                          <Input type="number" value={g.min} onChange={e => handleArrChange('sp.gates.std', i, 'min', parseFloat(e.target.value))} placeholder="Min %" />
                          <Input type="number" value={g.p} onChange={e => handleArrChange('sp.gates.std', i, 'p', parseFloat(e.target.value))} placeholder="Mult" />
                      </div>
                  ))}
              </div>
          );
      }
      if(activeTab === 'TB') {
          return (
              <div className="space-y-4">
                  <div className="flex justify-between items-center">
                      <h4 className="font-bold text-green-600">Focus Models</h4>
                      <button onClick={() => addItem('tb.focus', {name:'New', rate:0, keys:''})} className="text-green-600"><Plus size={16}/></button>
                  </div>
                  {cfg.tb.focus.map((f, i) => (
                      <div key={i} className="flex gap-2 items-center">
                          <Input value={f.name} onChange={e => handleArrChange('tb.focus', i, 'name', e.target.value)} placeholder="Name" />
                          <Input type="number" value={f.rate} onChange={e => handleArrChange('tb.focus', i, 'rate', parseFloat(e.target.value))} placeholder="Rate" />
                          <button onClick={() => removeItem('tb.focus', i)} className="text-red-400"><Trash2 size={16}/></button>
                      </div>
                  ))}
                  <div className="flex justify-between items-center mt-4">
                      <h4 className="font-bold text-green-600">Slabs</h4>
                      <button onClick={() => addItem('tb.slabs', {min:0, rate:0, label:''})} className="text-green-600"><Plus size={16}/></button>
                  </div>
                   {cfg.tb.slabs.map((s, i) => (
                      <div key={i} className="flex gap-2 items-center">
                          <Input type="number" value={s.min} onChange={e => handleArrChange('tb.slabs', i, 'min', parseFloat(e.target.value))} placeholder="Min" />
                          <Input type="number" value={s.rate} onChange={e => handleArrChange('tb.slabs', i, 'rate', parseFloat(e.target.value))} placeholder="Rate" />
                          <button onClick={() => removeItem('tb.slabs', i)} className="text-red-400"><Trash2 size={16}/></button>
                      </div>
                  ))}
              </div>
          );
      }
      if(activeTab === 'WR') {
           return (
              <div className="space-y-4">
                  <div className="flex justify-between items-center">
                      <h4 className="font-bold text-purple-600">Wearables</h4>
                      <button onClick={() => addItem('wr', {name:'New', rate:0, keys:''})} className="text-purple-600"><Plus size={16}/></button>
                  </div>
                  {cfg.wr.map((w, i) => (
                      <div key={i} className="flex gap-2 items-center">
                          <Input value={w.name} onChange={e => handleArrChange('wr', i, 'name', e.target.value)} placeholder="Name" />
                          <Input type="number" value={w.rate} onChange={e => handleArrChange('wr', i, 'rate', parseFloat(e.target.value))} placeholder="Rate" />
                          <button onClick={() => removeItem('wr', i)} className="text-red-400"><Trash2 size={16}/></button>
                      </div>
                  ))}
              </div>
          );
      }
      if(activeTab === 'CP') {
           return (
              <div className="space-y-4">
                  <div className="flex justify-between items-center">
                      <h4 className="font-bold text-red-600">Care+ Slabs</h4>
                      <button onClick={() => addItem('cp.slabs', {min:0, rate:0, label:''})} className="text-red-600"><Plus size={16}/></button>
                  </div>
                  {cfg.cp.slabs.map((s, i) => (
                      <div key={i} className="flex gap-2 items-center">
                          <Input type="number" value={s.min} onChange={e => handleArrChange('cp.slabs', i, 'min', parseFloat(e.target.value))} placeholder="Min" />
                          <Input type="number" value={s.rate} onChange={e => handleArrChange('cp.slabs', i, 'rate', parseFloat(e.target.value))} placeholder="Rate" />
                          <button onClick={() => removeItem('cp.slabs', i)} className="text-red-400"><Trash2 size={16}/></button>
                      </div>
                  ))}

                  <h4 className="font-bold text-red-600 mt-6">Kickers</h4>
                  <div className="p-3 bg-red-50 dark:bg-slate-800 rounded-xl space-y-3 border border-red-100 dark:border-slate-700">
                      <div>
                          <label className="text-xs font-bold text-slate-500">FF7 Series</label>
                          <div className="flex gap-2 mt-1">
                              <Input type="number" value={cfg.cp.kickers.ff7.l} onChange={e => handleChange('cp.kickers.ff7.l', parseFloat(e.target.value))} placeholder="Low" />
                              <Input type="number" value={cfg.cp.kickers.ff7.h} onChange={e => handleChange('cp.kickers.ff7.h', parseFloat(e.target.value))} placeholder="High" />
                          </div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500">S25 Series</label>
                          <div className="flex gap-2 mt-1">
                              <Input type="number" value={cfg.cp.kickers.s25.l} onChange={e => handleChange('cp.kickers.s25.l', parseFloat(e.target.value))} placeholder="Low" />
                              <Input type="number" value={cfg.cp.kickers.s25.h} onChange={e => handleChange('cp.kickers.s25.h', parseFloat(e.target.value))} placeholder="High" />
                          </div>
                      </div>
                  </div>
              </div>
          );
      }
      if(activeTab === 'NPC') {
           return (
              <div className="space-y-4">
                  <div className="flex justify-between items-center">
                      <h4 className="font-bold text-indigo-600">Note PC</h4>
                      <button onClick={() => addItem('npc', {name:'New', rate:0})} className="text-indigo-600"><Plus size={16}/></button>
                  </div>
                  {cfg.npc.map((n, i) => (
                      <div key={i} className="flex gap-2 items-center">
                          <Input value={n.name} onChange={e => handleArrChange('npc', i, 'name', e.target.value)} placeholder="Name" />
                          <Input type="number" value={n.rate} onChange={e => handleArrChange('npc', i, 'rate', parseFloat(e.target.value))} placeholder="Rate" />
                          <button onClick={() => removeItem('npc', i)} className="text-red-400"><Trash2 size={16}/></button>
                      </div>
                  ))}
              </div>
          );
      }
      if(activeTab === 'Bundles') {
           return (
              <div className="space-y-4">
                  <div className="flex justify-between items-center">
                      <h4 className="font-bold text-orange-600">Bundles (Standard)</h4>
                      <button onClick={() => addItem('bun.std', {name:'New', rate:0})} className="text-orange-600"><Plus size={16}/></button>
                  </div>
                  {cfg.bun.std.map((b, i) => (
                      <div key={i} className="flex gap-2 items-center">
                          <Input value={b.name} onChange={e => handleArrChange('bun.std', i, 'name', e.target.value)} placeholder="Name" />
                          <Input type="number" value={b.rate} onChange={e => handleArrChange('bun.std', i, 'rate', parseFloat(e.target.value))} placeholder="Rate" />
                          <button onClick={() => removeItem('bun.std', i)} className="text-red-400"><Trash2 size={16}/></button>
                      </div>
                  ))}

                  <div className="flex justify-between items-center mt-6">
                      <h4 className="font-bold text-orange-600">Bundles (Exclusive)</h4>
                      <button onClick={() => addItem('bun.excl', {name:'New', rate:0})} className="text-orange-600"><Plus size={16}/></button>
                  </div>
                  {cfg.bun.excl.map((b, i) => (
                      <div key={i} className="flex gap-2 items-center">
                          <Input value={b.name} onChange={e => handleArrChange('bun.excl', i, 'name', e.target.value)} placeholder="Name" />
                          <Input type="number" value={b.rate} onChange={e => handleArrChange('bun.excl', i, 'rate', parseFloat(e.target.value))} placeholder="Rate" />
                          <button onClick={() => removeItem('bun.excl', i)} className="text-red-400"><Trash2 size={16}/></button>
                      </div>
                  ))}
              </div>
          );
      }
      if(activeTab === 'Acc') {
           return (
              <div className="space-y-4">
                  <div className="flex justify-between items-center">
                      <h4 className="font-bold text-pink-600">Accessories</h4>
                      <button onClick={() => addItem('acc', {min:0, rate:0})} className="text-pink-600"><Plus size={16}/></button>
                  </div>
                  <div className="text-xs text-slate-400 mb-2">Define achievement brackets (Min %) and their fixed incentive (Rate).</div>
                  {cfg.acc.map((a, i) => (
                      <div key={i} className="flex gap-2 items-center">
                          <Input type="number" value={a.min} onChange={e => handleArrChange('acc', i, 'min', parseFloat(e.target.value))} placeholder="Min %" />
                          <Input type="number" value={a.rate} onChange={e => handleArrChange('acc', i, 'rate', parseFloat(e.target.value))} placeholder="Rate" />
                          <button onClick={() => removeItem('acc', i)} className="text-red-400"><Trash2 size={16}/></button>
                      </div>
                  ))}
              </div>
          );
      }

      return <div>Select a category above to edit rates.</div>;
  };

  return (
    <div className="bg-white dark:bg-slate-900 absolute inset-0 z-50 overflow-y-auto pb-20 fade-in">
        <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-4 border-b dark:border-slate-800 flex justify-between items-center z-10">
            <div className="flex items-center gap-2">
                <button onClick={onBack}><ArrowLeft /></button>
                <h3 className="font-bold text-lg dark:text-white">Configuration</h3>
            </div>
            <Button onClick={() => onSave(cfg)} className="py-2 px-4 text-xs"><Save size={16}/> Save</Button>
        </div>

        <div className="p-4">
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
                {['SP','TB','WR','CP','NPC','Bundles','Acc'].map(t => (
                    <button
                      key={t}
                      onClick={() => setActiveTab(t)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${activeTab===t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {renderTab()}

            <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-500 text-center">
                Advanced JSON editing can be added if needed, but GUI covers main rates.
            </div>
        </div>
    </div>
  );
};
