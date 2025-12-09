import React from 'react';
import { type IncentiveConfig } from '../../types';
import { Button, Input } from '../../components/ui';
import { ArrowLeft, Save } from 'lucide-react';
// import { produce } from 'immer'; // Removed as requested to avoid dep

// We'll implement a simple editor.
// For strict "Accordions", we can use details/summary or state.

interface Props {
  config: IncentiveConfig;
  onSave: (config: IncentiveConfig) => void;
  onBack: () => void;
}

export const IncentiveConfigGUI: React.FC<Props> = ({ config, onSave, onBack }) => {
  const [cfg, setCfg] = React.useState<IncentiveConfig>(JSON.parse(JSON.stringify(config))); // Deep copy
  const [activeTab, setActiveTab] = React.useState('SP');

  const handleChange = (path: string, val: any) => {
    // Basic deep set helper
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

  const renderTab = () => {
      if(activeTab === 'SP') {
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
      }
      if(activeTab === 'TB') {
          return (
              <div className="space-y-4">
                  <h4 className="font-bold text-green-600">Focus Models</h4>
                  {cfg.tb.focus.map((f, i) => (
                      <div key={i} className="flex gap-2">
                          <Input value={f.name} onChange={e => handleArrChange('tb.focus', i, 'name', e.target.value)} placeholder="Name" />
                          <Input type="number" value={f.rate} onChange={e => handleArrChange('tb.focus', i, 'rate', parseFloat(e.target.value))} placeholder="Rate" />
                      </div>
                  ))}
              </div>
          );
      }
      // Add other tabs similarly...
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
                {['SP','TB','WR','CP','NPC','Bundles'].map(t => (
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
