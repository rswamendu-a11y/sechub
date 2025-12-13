import React from 'react';
import { type IncentiveConfig } from '../../types';
import { Button, Input } from '../../components/ui';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';

interface Props {
  config: IncentiveConfig;
  onSave: (config: IncentiveConfig) => void;
  onBack: () => void;
}

export const IncentiveConfigGUI: React.FC<Props> = ({ config, onSave, onBack }) => {
  const [cfg, setCfg] = React.useState<IncentiveConfig>(JSON.parse(JSON.stringify(config))); // Deep copy
  const [activeTab, setActiveTab] = React.useState('SP');

  // Helper to deep set values
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

  // Helper to update array item field
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

  // Helper to add item to array
  const addArrItem = (path: string, item: any) => {
    const keys = path.split('.');
    setCfg(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        let ref = next;
        for(let k of keys) ref = ref[k];
        if(Array.isArray(ref)) ref.push(item);
        return next;
    });
  };

  // Helper to remove item from array
  const removeArrItem = (path: string, index: number) => {
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
      switch(activeTab) {
          case 'SP':
              return (
                  <div className="space-y-4">
                      <h4 className="font-bold text-blue-600">Slabs</h4>
                      {cfg.sp.slabs.map((s, i) => (
                          <div key={i} className="flex gap-2">
                              <Input type="number" value={s.min} onChange={e => handleArrChange('sp.slabs', i, 'min', parseFloat(e.target.value))} placeholder="Min" />
                              <Input type="number" value={s.rate} onChange={e => handleArrChange('sp.slabs', i, 'rate', parseFloat(e.target.value))} placeholder="Rate" />
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
          case 'TB':
              return (
                  <div className="space-y-4">
                      <div className="flex justify-between items-center">
                          <h4 className="font-bold text-green-600">Focus Models</h4>
                          <Button variant="secondary" className="p-1 h-auto" onClick={() => addArrItem('tb.focus', {name:'', rate:0, keys:''})}><Plus size={14}/></Button>
                      </div>
                      {cfg.tb.focus.map((f, i) => (
                          <div key={i} className="flex gap-2 items-center">
                              <Input value={f.name} onChange={e => handleArrChange('tb.focus', i, 'name', e.target.value)} placeholder="Name" />
                              <Input type="number" value={f.rate} onChange={e => handleArrChange('tb.focus', i, 'rate', parseFloat(e.target.value))} placeholder="Rate" className="w-24" />
                              <button onClick={() => removeArrItem('tb.focus', i)} className="text-red-400 p-1"><Trash2 size={16}/></button>
                          </div>
                      ))}
                  </div>
              );
          case 'WR':
              return (
                  <div className="space-y-4">
                      <div className="flex justify-between items-center">
                          <h4 className="font-bold text-purple-600">Wearables</h4>
                          <Button variant="secondary" className="p-1 h-auto" onClick={() => addArrItem('wr', {name:'', rate:0, keys:''})}><Plus size={14}/></Button>
                      </div>
                      {cfg.wr.map((w, i) => (
                          <div key={i} className="flex gap-2 items-center">
                              <Input value={w.name} onChange={e => handleArrChange('wr', i, 'name', e.target.value)} placeholder="Name" />
                              <Input type="number" value={w.rate} onChange={e => handleArrChange('wr', i, 'rate', parseFloat(e.target.value))} placeholder="Rate" className="w-24" />
                              <button onClick={() => removeArrItem('wr', i)} className="text-red-400 p-1"><Trash2 size={16}/></button>
                          </div>
                      ))}
                  </div>
              );
          case 'CP':
              return (
                  <div className="space-y-4">
                      <div className="flex justify-between items-center">
                          <h4 className="font-bold text-red-600">Care+ Slabs</h4>
                          <Button variant="secondary" className="p-1 h-auto" onClick={() => addArrItem('cp.slabs', {min:0, rate:0, label:''})}><Plus size={14}/></Button>
                      </div>
                      {cfg.cp.slabs.map((s, i) => (
                          <div key={i} className="flex gap-2 items-center">
                              <Input value={s.label} onChange={e => handleArrChange('cp.slabs', i, 'label', e.target.value)} placeholder="Label" />
                              <Input type="number" value={s.min} onChange={e => handleArrChange('cp.slabs', i, 'min', parseFloat(e.target.value))} placeholder="Min" className="w-24" />
                              <Input type="number" value={s.rate} onChange={e => handleArrChange('cp.slabs', i, 'rate', parseFloat(e.target.value))} placeholder="Rate" className="w-24" />
                              <button onClick={() => removeArrItem('cp.slabs', i)} className="text-red-400 p-1"><Trash2 size={16}/></button>
                          </div>
                      ))}
                  </div>
              );
          case 'NPC':
              return (
                  <div className="space-y-4">
                       <div className="flex justify-between items-center">
                          <h4 className="font-bold text-indigo-600">Note PC</h4>
                          <Button variant="secondary" className="p-1 h-auto" onClick={() => addArrItem('npc', {name:'', rate:0})}><Plus size={14}/></Button>
                      </div>
                      {cfg.npc.map((n, i) => (
                          <div key={i} className="flex gap-2 items-center">
                              <Input value={n.name} onChange={e => handleArrChange('npc', i, 'name', e.target.value)} placeholder="Name" />
                              <Input type="number" value={n.rate} onChange={e => handleArrChange('npc', i, 'rate', parseFloat(e.target.value))} placeholder="Rate" className="w-24" />
                              <button onClick={() => removeArrItem('npc', i)} className="text-red-400 p-1"><Trash2 size={16}/></button>
                          </div>
                      ))}
                  </div>
              );
          case 'Bundles':
              return (
                  <div className="space-y-4">
                      {/* Standard Bundles */}
                      <div className="flex justify-between items-center">
                          <h4 className="font-bold text-orange-600">Standard Bundles</h4>
                          <Button variant="secondary" className="p-1 h-auto" onClick={() => addArrItem('bun.std', {name:'', rate:0})}><Plus size={14}/></Button>
                      </div>
                      {cfg.bun.std.map((b, i) => (
                          <div key={i} className="flex gap-2 items-center">
                              <Input value={b.name} onChange={e => handleArrChange('bun.std', i, 'name', e.target.value)} placeholder="Name" />
                              <Input type="number" value={b.rate} onChange={e => handleArrChange('bun.std', i, 'rate', parseFloat(e.target.value))} placeholder="Rate" className="w-24" />
                              <button onClick={() => removeArrItem('bun.std', i)} className="text-red-400 p-1"><Trash2 size={16}/></button>
                          </div>
                      ))}

                      {/* Exclusive Bundles */}
                      <div className="flex justify-between items-center mt-4">
                          <h4 className="font-bold text-orange-600">Exclusive Bundles</h4>
                          <Button variant="secondary" className="p-1 h-auto" onClick={() => addArrItem('bun.excl', {name:'', rate:0})}><Plus size={14}/></Button>
                      </div>
                      {cfg.bun.excl.map((b, i) => (
                          <div key={i} className="flex gap-2 items-center">
                              <Input value={b.name} onChange={e => handleArrChange('bun.excl', i, 'name', e.target.value)} placeholder="Name" />
                              <Input type="number" value={b.rate} onChange={e => handleArrChange('bun.excl', i, 'rate', parseFloat(e.target.value))} placeholder="Rate" className="w-24" />
                              <button onClick={() => removeArrItem('bun.excl', i)} className="text-red-400 p-1"><Trash2 size={16}/></button>
                          </div>
                      ))}
                  </div>
              );
           case 'Acc':
               return (
                   <div className="space-y-4">
                       <div className="flex justify-between items-center">
                          <h4 className="font-bold text-teal-600">Accessories Slabs</h4>
                          <Button variant="secondary" className="p-1 h-auto" onClick={() => addArrItem('acc', {min:0, rate:0})}><Plus size={14}/></Button>
                      </div>
                       <p className="text-xs text-slate-500 mb-2">Define payout per Achievement % of base.</p>
                       {cfg.acc.map((a, i) => (
                           <div key={i} className="flex gap-2 items-center">
                               <Input type="number" value={a.min} onChange={e => handleArrChange('acc', i, 'min', parseFloat(e.target.value))} placeholder="Min %" />
                               <Input type="number" value={a.rate} onChange={e => handleArrChange('acc', i, 'rate', parseFloat(e.target.value))} placeholder="Incentive" />
                               <button onClick={() => removeArrItem('acc', i)} className="text-red-400 p-1"><Trash2 size={16}/></button>
                           </div>
                       ))}
                   </div>
               );
          default:
              return <div>Select a category above to edit rates.</div>;
      }
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
