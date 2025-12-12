import React, { useState, useEffect } from 'react';
import { FilesystemService } from '../../services/filesystem';
import { Card } from '../../components/ui';
import { FolderLock, UploadCloud, FileText, Image, Eye, Trash2, X } from 'lucide-react';

export const LockerView: React.FC = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [preview, setPreview] = useState<{data:string, type:string}|null>(null);

  const loadFiles = async () => {
      const list = await FilesystemService.listFiles();
      // Filter interesting files (pdf, img)
      setFiles(list.filter(f => f.name.match(/\.(pdf|png|jpg|jpeg|webp)$/i)));
  };

  useEffect(() => { loadFiles(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if(!f) return;

      const reader = new FileReader();
      reader.onload = async (evt) => {
          const b64 = (evt.target?.result as string).split(',')[1]; // Remove data: header for write
          // OR keep header if using dataURL?
          // Filesystem.writeFile data expects string. If valid Base64, it writes binary.
          // Wait, 'data' option: "If the data is a string, it will be written using utf8... To write a base64 string..."
          // We need to pass the Base64 part only usually for binary.

          await FilesystemService.saveFile(f.name, b64);
          loadFiles();
      };
      reader.readAsDataURL(f);
  };

  const handleView = async (file: any) => {
      try {
        const data = await FilesystemService.readFile(file.name);
        // data is string. if binary saved as base64, it returns base64 string?
        // It depends on how it was saved.
        // If we want to display it, we need `data:image/png;base64,...`

        const ext = file.name.split('.').pop().toLowerCase();
        let mime = 'application/octet-stream';
        if(ext === 'pdf') mime = 'application/pdf';
        else if(['png','jpg','jpeg','webp'].includes(ext)) mime = `image/${ext}`;

        setPreview({ data: `data:${mime};base64,${data}`, type: mime });
      } catch (e) {
          console.error(e);
          alert("Could not open file.");
      }
  };

  const handleDelete = async (file: any) => {
      if(!confirm("Delete this file?")) return;
      await FilesystemService.deleteFile(file.name);
      loadFiles();
  };

  return (
    <div className="fade-in space-y-6">
        <div className="bg-slate-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-3"><FolderLock /> Locker</h2>
            <p className="text-slate-400 text-sm">Secure Local Storage</p>
        </div>

        <Card className="text-center">
             <label className="cursor-pointer flex flex-col items-center gap-3 py-4 text-slate-500 hover:text-indigo-600 transition">
                <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleUpload} />
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center"><UploadCloud size={32} /></div>
                <span className="font-bold text-sm dark:text-white">Upload File</span>
            </label>
        </Card>

        <div className="space-y-3">
            {files.map((f, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center text-indigo-600">
                            {f.name.endsWith('pdf') ? <FileText size={20}/> : <Image size={20}/>}
                        </div>
                        <div className="truncate">
                            <div className="font-bold text-sm dark:text-white truncate w-40">{f.name}</div>
                            <div className="text-xs text-slate-400">{(f.size/1024).toFixed(0)} KB</div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => handleView(f)} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded"><Eye size={16}/></button>
                        <button onClick={() => handleDelete(f)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><Trash2 size={16}/></button>
                    </div>
                </div>
            ))}
            {files.length === 0 && <div className="text-center text-slate-400 text-sm py-8">No files securely stored yet.</div>}
        </div>

        {/* Preview Modal */}
        {preview && (
            <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col relative overflow-hidden">
                    <button onClick={() => setPreview(null)} className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"><X /></button>
                    <div className="flex-1 w-full h-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-2">
                        {preview.type.includes('image') ? (
                            <img src={preview.data} className="max-w-full max-h-full rounded shadow-lg object-contain" />
                        ) : (
                            <iframe src={preview.data} className="w-full h-full rounded border-none" />
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
