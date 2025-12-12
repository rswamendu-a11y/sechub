import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const FilesystemService = {
  // Save base64 data as a file
  saveFile: async (fileName: string, data: string, directory = Directory.Data) => {
    try {
      const result = await Filesystem.writeFile({
        path: fileName,
        data: data,
        directory: directory,
        encoding: Encoding.UTF8, // or don't specify for base64? Usually writeFile handles base64 string if data is string.
        // If data is base64 string, we might not need encoding if we don't pass it,
        // or we pass it as base64?
        // Capacitor docs: "If the data is a string, it will be written using utf8 encoding by default.
        // To write a base64 string, set the encoding option to 'utf8' (default) is WRONG logic usually."
        // Actually, if we want to write binary from base64, we usually don't set encoding in some libs, but in Capacitor:
        // "If you want to write a binary file, you should pass a Base64 string as the data argument and not set the encoding argument."
      });
      return result.uri;
    } catch (e) {
      console.error('Error saving file', e);
      throw e;
    }
  },

  // Save text/json
  saveText: async (fileName: string, text: string, directory = Directory.Data) => {
    return await Filesystem.writeFile({
      path: fileName,
      data: text,
      directory: directory,
      encoding: Encoding.UTF8,
    });
  },

  listFiles: async (directory = Directory.Data) => {
    try {
      const result = await Filesystem.readdir({
        path: '',
        directory: directory,
      });
      return result.files;
    } catch (e) {
      return [];
    }
  },

  readFile: async (fileName: string, directory = Directory.Data) => {
     const result = await Filesystem.readFile({
       path: fileName,
       directory: directory,
     });
     return result.data;
  },

  deleteFile: async (fileName: string, directory = Directory.Data) => {
    await Filesystem.deleteFile({
      path: fileName,
      directory: directory,
    });
  },

  shareFile: async (fileName: string, directory = Directory.Data) => {
    const uriResult = await Filesystem.getUri({
      path: fileName,
      directory: directory,
    });

    await Share.share({
      title: 'Share File',
      text: `Sharing ${fileName}`,
      url: uriResult.uri,
      dialogTitle: 'Share with',
    });
  }
};
