import React, { useState, useEffect } from 'react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Folder, FileText, Image, Upload, Eye, Trash2, Download } from 'lucide-react';

const DocsLocker = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      // We use Documents directory. In Android this maps to specific app storage or shared docs if configured.
      // For simplicity/permissions, we'll try Directory.Documents first, or fallback to Directory.Data (Internal).
      // Given constraints, let's use Directory.Data for guaranteed read/write in sandbox,
      // but the prompt asked for "Locker" to import/upload PDF & Images.

      const result = await Filesystem.readdir({
        path: 'locker',
        directory: Directory.Data
      });
      setFiles(result.files);
    } catch (e) {
      // Create dir if not exists
      try {
          await Filesystem.mkdir({
              path: 'locker',
              directory: Directory.Data,
              recursive: true
          });
          setFiles([]);
      } catch (err) {
          console.error("Locker Init Error", err);
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const base64Data = event.target.result.split(',')[1];
            await Filesystem.writeFile({
                path: `locker/${file.name}`,
                data: base64Data,
                directory: Directory.Data
            });
            await loadFiles();
            alert("File Uploaded to Locker!");
        } catch (error) {
            console.error(error);
            alert("Upload Failed");
        }
        setLoading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const openFile = async (fileName) => {
      try {
          const uriResult = await Filesystem.getUri({
              path: `locker/${fileName}`,
              directory: Directory.Data
          });

          await Share.share({
              title: fileName,
              url: uriResult.uri
          });
      } catch (error) {
          alert("Cannot open file: " + error.message);
      }
  };

  const deleteFile = async (fileName) => {
      if(!confirm(`Delete ${fileName}?`)) return;
      try {
          await Filesystem.deleteFile({
              path: `locker/${fileName}`,
              directory: Directory.Data
          });
          loadFiles();
      } catch (error) {
          console.error(error);
      }
  };

  const getIcon = (name) => {
      if (name.endsWith('.pdf')) return <FileText className="text-red-500" />;
      if (name.match(/\.(jpg|jpeg|png|gif)$/i)) return <Image className="text-blue-500" />;
      return <FileText className="text-slate-400" />;
  };

  return (
    <div className="fade-in p-4 pb-24 space-y-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h2 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2">
                <Folder className="text-amber-500" /> Docs Locker
            </h2>

            <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                <div className="flex flex-col items-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-indigo-500" />
                    <p className="mb-2 text-sm text-slate-500 dark:text-slate-400"><span className="font-semibold">Click to upload</span> PDF or Image</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Stored locally in App Data</p>
                </div>
                <input type="file" className="hidden" accept="image/*,application/pdf,.xlsx,.xls" onChange={handleFileUpload} disabled={loading} />
            </label>
            {loading && <p className="text-center text-xs text-indigo-500 mt-2">Uploading...</p>}
        </div>

        <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase ml-2">My Files</h3>
            {files.length === 0 ? (
                <div className="text-center p-8 text-slate-400 text-sm bg-slate-50 dark:bg-slate-800/50 rounded-2xl">Locker is empty.</div>
            ) : (
                files.map((f, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden">
                            {getIcon(f.name)}
                            <span className="text-sm font-bold truncate dark:text-white">{f.name}</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => openFile(f.name)} className="p-2 text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg"><Eye size={18}/></button>
                            <button onClick={() => deleteFile(f.name)} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={18}/></button>
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
  );
};

export default DocsLocker;
