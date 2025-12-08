import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Card, Button } from '../../components/ui';
import { FileSpreadsheet, FileText, UploadCloud, Database } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { FilesystemService } from '../../services/filesystem';

const BRANDS = [
    {k:'samsung', l:'Samsung'}, {k:'iphone', l:'Apple'},
    {k:'oppo', l:'Oppo'}, {k:'vivo', l:'Vivo'},
    {k:'realme', l:'Realme'}, {k:'mi', l:'Xiaomi'},
    {k:'moto', l:'Moto'}, {k:'other', l:'Others'}
];

export const TrackerData: React.FC = () => {
  const { sales, importSales } = useAppStore();

  const handleExport = async (type: 'xlsx' | 'pdf') => {
      // Prepare Data
      const head = ["Date", "Variant"];
      BRANDS.forEach(b => { head.push(b.l + " Qty"); head.push(b.l + " Val"); });
      head.push("Total Qty", "Total Val", "Logs");

      const rows: any[] = [];
      const dataRows = Object.entries(sales).sort();

      dataRows.forEach(([d, v]) => {
          const r: any[] = [d, ""];
          let tQ=0, tV=0;
          BRANDS.forEach(b => {
              const q = v[b.k]||0;
              const val = v[b.k+'Val']||0;
              r.push(q); r.push(val);
              tQ+=q; tV+=val;
          });
          r.push(tQ, tV, v.models||"");
          rows.push(r);
      });

      try {
        if(type === 'xlsx') {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([head, ...rows]);
            // Helper to set column widths roughly
            ws['!cols'] = [{wch:12}, {wch:15}, ...BRANDS.map(_=>[{wch:6},{wch:8}]).flat(), {wch:8}, {wch:10}, {wch:50}];
            XLSX.utils.book_append_sheet(wb, ws, "Sales Report");

            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
            const fileName = `SEC_Sales_${new Date().toISOString().split('T')[0]}.xlsx`;

            await FilesystemService.saveFile(fileName, wbout);
            await FilesystemService.shareFile(fileName);
        } else {
            const doc = new jsPDF('l');
            doc.text("Sales Report", 14, 15);
            // @ts-ignore
            doc.autoTable({
                head: [head],
                body: rows,
                startY: 20,
                styles: { fontSize: 6, cellPadding: 1 },
                columnStyles: { [head.length-1]: { cellWidth: 50 } } // Log column width
            });

            const pdfOutput = doc.output('datauristring').split(',')[1]; // Get base64 only
            const fileName = `SEC_Sales_${new Date().toISOString().split('T')[0]}.pdf`;

            await FilesystemService.saveFile(fileName, pdfOutput);
            await FilesystemService.shareFile(fileName);
        }
      } catch (e) {
          console.error(e);
          alert("Error exporting file. Check permissions.");
      }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if(!f) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const bstr = evt.target?.result;
              const wb = XLSX.read(bstr, {type:'binary'});
              const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header:1}) as any[][];

              // Find header
              const hIdx = rows.findIndex(r => r.map(c=>String(c).toLowerCase()).includes('date'));
              if(hIdx < 0) return alert("Invalid Format: No 'Date' column found.");

              const head = rows[hIdx].map(c=>String(c).toLowerCase().trim());
              const newSales: any = {};
              let count = 0;

              for(let i=hIdx+1; i<rows.length; i++) {
                  const row = rows[i];
                  if(!row[0]) continue;

                  // Date parsing
                  let dateStr: string = String(row[head.indexOf('date')]);
                  const dateNum = row[head.indexOf('date')];
                  if(typeof dateNum === 'number') {
                      // Excel date to JS date
                      dateStr = new Date(Math.round((dateNum - 25569)*86400*1000)).toISOString().split('T')[0];
                  }

                  const ent: any = { models: row[head.indexOf('logs')]||"" };
                  BRANDS.forEach(b => {
                      const qIdx = head.indexOf(b.l.toLowerCase() + " qty");
                      const vIdx = head.indexOf(b.l.toLowerCase() + " val");
                      if(qIdx > -1) ent[b.k] = parseInt(row[qIdx])||0;
                      if(vIdx > -1) ent[b.k+'Val'] = parseInt(row[vIdx])||0;
                  });
                  newSales[dateStr] = ent;
                  count++;
              }
              importSales(newSales);
              alert(`Successfully restored ${count} records.`);
          } catch(err) {
              console.error(err);
              alert("Import Failed");
          }
      };
      reader.readAsBinaryString(f);
  };

  return (
    <div className="space-y-6 fade-in">
        <div className="bg-slate-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-3"><Database /> Data Mgmt</h2>
            <p className="text-slate-400 text-sm">Export, Backup & Restore</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
            <Button variant="secondary" onClick={() => handleExport('xlsx')} className="justify-between p-6 h-auto">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><FileSpreadsheet size={24} /></div>
                    <div className="text-left">
                        <h4 className="font-bold text-slate-800 dark:text-white">Excel Report</h4>
                        <p className="text-xs text-slate-400 font-normal">Detailed columns for Enterprise</p>
                    </div>
                </div>
            </Button>

            <Button variant="secondary" onClick={() => handleExport('pdf')} className="justify-between p-6 h-auto">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl"><FileText size={24} /></div>
                    <div className="text-left">
                        <h4 className="font-bold text-slate-800 dark:text-white">PDF Summary</h4>
                        <p className="text-xs text-slate-400 font-normal">Printable format</p>
                    </div>
                </div>
            </Button>

            <Card className="text-center">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-800 dark:text-white">Restore Data</h4>
                </div>
                <label className="w-full py-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 font-bold text-xs border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 flex items-center justify-center gap-2 cursor-pointer border-dashed border-2">
                    <input type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
                    <UploadCloud size={20} /> Select Excel Backup File
                </label>
            </Card>
        </div>
    </div>
  );
};
