import { type IncentiveConfig } from '../../types';

export const calculateIncentive = (
  config: IncentiveConfig,
  rows: { sp: any[], tb: any[], wr: any[], cp: any[], npc: any[] },
  meta: { channel: string, status: string, target: number, k_ff7: number, t_ff7: string, k_s25: number, t_s25: string, accVal: number, accBase: number }
) => {
  const c = config;
  const m = meta;
  const logs: {c:string, n:string, v:number, pot?:number, missed?:boolean}[] = [];

  // --- SMARTPHONES ---
  let spQ=0, spRaw=0;
  rows.sp.forEach(r => {
    if(r.qty>0) {
      spQ += r.qty;
      spRaw += r.qty * (r.fm ? r.rate * c.sp.fm_mult : r.rate);
    }
  });

  const isExempt = (m.channel === 'sis_pro' || m.status === 'new_joinee');
  const gateSet = isExempt ? c.sp.gates.sis : c.sp.gates.std;

  let gateM = 0;
  let gateN = "Missed Gate";

  for(let g of gateSet) {
    if(spQ >= g.min) {
      gateM = g.p;
      gateN = "";
      break;
    }
  }

  // --- FIX: REMOVED < 80% TARGET GATE (Task 2) ---
  // We keep the Volume Gate Multiplier (gateM) but do not zero out if target missed.
  // Original logic checked (ach < target_thresh) -> spFin = 0. We deleted that.

  let spFin = spRaw * gateM;
  let spPot = spRaw * (gateM > 0 ? gateM : 1.0);

  // We still track 'missed' for UI indication, but it doesn't kill the payout
  const ach = m.target > 0 ? spQ / m.target : 0;
  let missed = false;
  if(!isExempt && m.channel === 'standard' && ach < c.sp.target_thresh) {
      missed = true;
      // gateN = `Missed Target (${spQ}/${m.target})`; // Optional: Keep note, but pay is valid
      // spFin = 0; // <--- DELETED THIS LINE
  }

  if(gateM === 0) {
    missed = true;
    gateN = `Missed Volume Gate (${spQ})`;
  }

  logs.push({ c: "Smartphones", n: gateN, v: spFin, pot: spPot, missed });

  // --- TABLETS ---
  let tbTot = 0;
  rows.tb.forEach(r => tbTot += (r.qty||0) * r.rate);
  let tbFin = Math.min(tbTot, c.caps.tb);
  logs.push({ c: "Tablets", n: tbTot > tbFin ? "Capped" : "", v: tbFin });

  // --- WEARABLES ---
  let wrTot = 0;
  rows.wr.forEach(r => wrTot += (r.qty||0) * r.rate);
  logs.push({ c: "Wearables", n: "", v: wrTot });

  // --- GLOBAL CAP CHECK ---
  let comb = spFin + wrTot;
  if (comb > c.caps.global) {
    comb = c.caps.global;
    logs.push({ c: "Global Cap", n: "Max 75k applied", v: 0 });
  }

  // --- CARE+ ---
  let cpTot = 0, cpQ = 0;
  rows.cp.forEach(r => { cpQ += r.qty; cpTot += (r.qty||0) * r.rate; });

  if (cpQ >= 8) cpTot *= 1.2;

  if (cpQ > 0 && cpQ < 3) {
    cpTot = 0;
    logs.push({ c: "Care+", n: "Gate < 3", v: 0 });
  } else {
    if (m.k_ff7 > 0) cpTot += m.k_ff7 * (m.t_ff7 === 'high' ? c.cp.kickers.ff7.h : c.cp.kickers.ff7.l);
    if (m.k_s25 > 0) cpTot += m.k_s25 * (m.t_s25 === 'high' ? c.cp.kickers.s25.h : c.cp.kickers.s25.l);
    logs.push({ c: "Care+", n: "", v: cpTot });
  }

  // --- NOTE PC ---
  let npcTot = 0;
  rows.npc.forEach(r => npcTot += (r.qty||0) * r.rate);
  let npcFin = Math.min(npcTot, c.caps.npc);
  logs.push({ c: "Note PC", n: npcTot > npcFin ? "Capped" : "", v: npcFin });

  // --- ACCESSORIES ---
  let accTot = 0;
  const ab = m.accBase || (spRaw * 25);
  if (ab > 0 && m.channel !== 'exclusive') {
    const pct = (m.accVal / ab) * 100;
    for (let t of c.acc) {
      if (pct >= t.min) {
        accTot = t.rate;
        break;
      }
    }
  }
  logs.push({ c: "Accessories", n: "", v: accTot });

  return {
    logs,
    partials: { comb, tbFin, npcFin, cpTot, accTot },
    spQ,
    ach: (ach * 100).toFixed(0)
  };
};
