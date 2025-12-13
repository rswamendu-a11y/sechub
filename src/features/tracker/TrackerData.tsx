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

  // Helper to parse logs
  const parseLogsToRows = (filterMonth: string | null) => {
      const rows: any[] = [];
      Object.entries(sales).forEach(([date, data]) => {
          // Filter by Month (YYYY-MM)
          if(filterMonth && !date.startsWith(filterMonth)) return;

          const logs = data.models || "";
          const lines = logs.split('\n');
          lines.forEach((line: string) => {
              if(!line.trim()) return;
              // Regex to parse: [Date Time] Brand Model (Variant) - Qty u (Val: Total)
              // Note: Variant is optional and enclosed in ()
              const match = line.match(/\[(.*?)\]\s+(.*?)\s+(.*?)\s+(?:\((.*?)\)\s+)?-\s+(\d+)u\s+\(Val:\s+(\d+)\)/);
              if(match) {
                  const [_, dateTime, brand, model, variant, qtyStr, totalStr] = match;
                  const qty = parseInt(qtyStr) || 0;
                  const total = parseInt(totalStr) || 0;
                  const price = qty > 0 ? Math.round(total / qty) : 0;

                  // Clean up date (remove time)
                  const d = dateTime.split(' ')[0] || date;

                  rows.push({
                      Date: d,
                      Brand: brand,
                      Model: model,
                      Variant: variant || "-",
                      Price: price,
                      Qty: qty,
                      Total: total
                  });
              }
          });
      });
      return rows;
  };

  const handleExport = async (type: 'xlsx' | 'pdf') => {
      // MTD Filter
      const currentMonth = new Date().toISOString().slice(0, 7);

      const parsedRows = parseLogsToRows(currentMonth);

      if(parsedRows.length === 0) {
          alert("No data found for the current month.");
          return;
      }

      try {
        const fileName = `SEC_Sales_MTD_${currentMonth}.${type}`;

        if(type === 'xlsx') {
            const ws = XLSX.utils.json_to_sheet(parsedRows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "MTD Sales");
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
            await FilesystemService.saveFile(fileName, wbout);
            await FilesystemService.shareFile(fileName);
        } else {
            const doc = new jsPDF('l');
            doc.text(`Sales Report - ${currentMonth}`, 14, 15);

            const tableRows = parsedRows.map(r => [r.Date, r.Brand, r.Model, r.Variant, r.Price, r.Qty, r.Total]);

            // @ts-ignore
            doc.autoTable({
                head: [["Date", "Brand", "Model", "Variant", "Price", "Qty", "Total"]],
                body: tableRows,
                startY: 20,
                styles: { fontSize: 8, cellPadding: 2 }
            });

            const pdfOutput = doc.output('datauristring').split(',')[1];
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
                        <h4 className="font-bold text-slate-800 dark:text-white">Excel Report (MTD)</h4>
                        <p className="text-xs text-slate-400 font-normal">Current Month Detailed</p>
                    </div>
                </div>
            </Button>

            <Button variant="secondary" onClick={() => handleExport('pdf')} className="justify-between p-6 h-auto">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl"><FileText size={24} /></div>
                    <div className="text-left">
                        <h4 className="font-bold text-slate-800 dark:text-white">PDF Summary (MTD)</h4>
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
