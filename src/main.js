import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

console.log('Capacitor Native Logic Loading...');

// Wait for the app to be initialized
const waitForApp = setInterval(() => {
    if (window.app) {
        clearInterval(waitForApp);
        initNativeOverrides();
    }
}, 100);

function initNativeOverrides() {
    console.log('Initializing Native Overrides');

    // --- OVERRIDE: Share/Download (For Reports) ---
    window.app.shareOrDownload = async (blob, filename) => {
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Data = reader.result;
                try {
                    // Write to Cache for Sharing
                    await Filesystem.writeFile({
                        path: filename,
                        data: base64Data,
                        directory: Directory.Cache
                    });

                    const result = await Filesystem.getUri({
                        directory: Directory.Cache,
                        path: filename
                    });

                    await Share.share({
                        title: filename,
                        url: result.uri
                    });
                } catch (e) {
                    console.error('File/Share Error', e);
                    alert('Error sharing file: ' + e.message);
                }
            };
            reader.readAsDataURL(blob);
        } catch (e) {
            console.error(e);
            alert('Error processing file');
        }
    };

    // --- OVERRIDE: Locker (Use Documents Directory) ---

    // 1. Init: Create 'SECLocker' folder if not exists
    window.app.locker.initDB = async () => {
        try {
            await Filesystem.mkdir({
                path: 'SECLocker',
                directory: Directory.Data,
                recursive: true // don't error if exists
            });
            window.app.locker.list(); // Refresh list
        } catch (e) {
            console.error('Locker Init Error', e);
        }
    };

    // 2. Upload: Save file to Data/SECLocker
    window.app.locker.upload = async (inp) => {
        const f = inp.files[0];
        if (!f) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Data = reader.result; // Data URL
            try {
                await Filesystem.writeFile({
                    path: `SECLocker/${f.name}`,
                    data: base64Data,
                    directory: Directory.Data
                });
                alert('File Saved to Locker');
                window.app.locker.list();
            } catch (e) {
                console.error(e);
                alert('Error saving file: ' + e.message);
            }
        };
        reader.readAsDataURL(f);
    };

    // 3. List: Read directory
    window.app.locker.list = async () => {
        const con = document.getElementById('file-list');
        if (!con) return;

        try {
            const result = await Filesystem.readdir({
                path: 'SECLocker',
                directory: Directory.Data
            });

            // Filesystem.readdir returns { files: [FileInfo...] }
            // FileInfo has name, type, etc.

            if (result.files.length === 0) {
                 con.innerHTML = '<div class="text-center text-slate-400 p-4">Locker is empty</div>';
                 return;
            }

            con.innerHTML = result.files.map(f => {
                const isImg = f.name.match(/\.(jpg|jpeg|png|webp)$/i);
                const isPdf = f.name.match(/\.pdf$/i);
                const icon = isImg ? 'image' : 'file-text';

                return `
                <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <div class="flex items-center gap-3 overflow-hidden">
                        <div class="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center text-indigo-600">
                           <i data-lucide="${icon}"></i>
                        </div>
                        <div class="truncate">
                            <div class="font-bold text-sm dark:text-white truncate w-40">${f.name}</div>
                            <div class="text-xs text-slate-400">Local File</div>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="window.app.locker.view('${f.name}')" class="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded"><i data-lucide="eye" width="16"></i></button>
                        <button onclick="window.app.locker.shareItem('${f.name}')" class="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded"><i data-lucide="share-2" width="16"></i></button>
                        <button onclick="window.app.locker.del('${f.name}')" class="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><i data-lucide="trash" width="16"></i></button>
                    </div>
                </div>`;
            }).join('');

            if(window.lucide) window.lucide.createIcons();

        } catch (e) {
            console.error(e);
            con.innerHTML = '<div class="text-center text-red-400 p-4">Error loading files</div>';
        }
    };

    // 4. View: Read file content
    window.app.locker.view = async (filename) => {
        try {
            // Check file type
            if (filename.match(/\.pdf$/i)) {
                // For PDFs, we cannot display them in WebView easily.
                // We will trigger the system share/open sheet.
                window.app.locker.shareItem(filename);
                return;
            }

            const file = await Filesystem.readFile({
                path: `SECLocker/${filename}`,
                directory: Directory.Data
            });

            let src = file.data;
            if (!src.startsWith('data:')) {
                const ext = filename.split('.').pop().toLowerCase();
                let mime = 'application/octet-stream';
                if(['jpg','jpeg','png'].includes(ext)) mime = `image/${ext}`;
                src = `data:${mime};base64,${src}`;
            }

            const modal = document.getElementById('file-modal');
            const content = document.getElementById('file-viewer-content');
            modal.classList.remove('hidden');

            if (filename.match(/\.(jpg|jpeg|png|webp)$/i)) {
                content.innerHTML = `<img src="${src}" class="max-w-full max-h-full rounded shadow-lg">`;
            } else {
                 content.innerHTML = `<div class="p-8 bg-white rounded text-center"><p class="mb-4">Cannot preview this file type.</p><button onclick="window.app.locker.shareItem('${filename}')" class="text-indigo-600 font-bold underline">Open External Viewer</button></div>`;
            }

        } catch (e) {
            console.error(e);
            alert('Error opening file');
        }
    };

    // 5. Delete
    window.app.locker.del = async (filename) => {
        if(confirm(`Delete ${filename}?`)) {
            try {
                await Filesystem.deleteFile({
                    path: `SECLocker/${filename}`,
                    directory: Directory.Data
                });
                window.app.locker.list();
            } catch (e) {
                alert('Error deleting file');
            }
        }
    };

    // 6. Share Item (New feature for Locker items)
    window.app.locker.shareItem = async (filename) => {
        try {
            const uriResult = await Filesystem.getUri({
                path: `SECLocker/${filename}`,
                directory: Directory.Data
            });
            await Share.share({
                title: filename,
                url: uriResult.uri
            });
        } catch (e) {
            console.error(e);
            alert('Error sharing file');
        }
    };

    // Also override Tracker Import to support picking?
    // The existing <input type="file"> works fine for importing into the browser memory
    // to parse with XLSX. No need to change unless it fails.
    // The prompt only mentioned Permissions for importing/exporting.
    // The export (write) is the hard part. The import (read) via input tag is standard.
}
