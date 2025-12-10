import JSZip from 'jszip';

/**
 * Creates a FileList-like object from an array of Files
 * This allows us to create a FileList from extracted zip files
 */
function createFileList(files: File[]): FileList {
  // Use a Proxy to handle numeric index access
  return new Proxy(files, {
    get(target, prop) {
      if (prop === 'length') {
        return target.length;
      }
      if (prop === 'item') {
        return (index: number) => target[index] || null;
      }
      if (prop === Symbol.iterator) {
        return target[Symbol.iterator].bind(target);
      }
      // Handle numeric string indices (e.g., "0", "1", etc.)
      const numProp = Number(prop);
      if (!isNaN(numProp) && numProp >= 0 && numProp < target.length) {
        return target[numProp];
      }
      // Fall back to array properties
      return (target as unknown as Record<string, unknown>)[prop as string];
    },
    has(target, prop) {
      const numProp = Number(prop);
      if (!isNaN(numProp) && numProp >= 0 && numProp < target.length) {
        return true;
      }
      return prop in target || prop === 'length' || prop === 'item';
    },
    ownKeys(target) {
      const keys: (string | symbol)[] = ['length', 'item'];
      for (let i = 0; i < target.length; i++) {
        keys.push(String(i));
      }
      return keys;
    },
    getOwnPropertyDescriptor(target, prop) {
      const numProp = Number(prop);
      if (!isNaN(numProp) && numProp >= 0 && numProp < target.length) {
        return {
          enumerable: true,
          configurable: true,
          value: target[numProp],
        };
      }
      if (prop === 'length') {
        return {
          enumerable: false,
          configurable: false,
          value: target.length,
        };
      }
      if (prop === 'item') {
        return {
          enumerable: false,
          configurable: false,
          value: (index: number) => target[index] || null,
        };
      }
      return undefined;
    },
  }) as unknown as FileList;
}

/**
 * Extracts a zip file and converts it to a FileList-compatible structure
 * @param zipFile The zip file to extract
 * @returns A FileList containing all files from the zip
 */
export async function extractZipToFileList(
  zipFile: File
): Promise<FileList> {
  try {
    const zip = await JSZip.loadAsync(zipFile);
    const files: File[] = [];

    // Process all entries in the zip
    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      // Skip directories
      if (zipEntry.dir) {
        continue;
      }

      // Get file content as blob
      const blob = await zipEntry.async('blob');
      
      // Extract basename from path for file.name (e.g., "folder/file.json" -> "file.json")
      const pathParts = relativePath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      // Create a File object with the basename
      const file = new File([blob], fileName, {
        type: blob.type || 'application/octet-stream',
      });

      // Add webkitRelativePath property to match folder upload behavior
      // This is the full relative path within the zip (e.g., "folder/file.json")
      Object.defineProperty(file, 'webkitRelativePath', {
        value: relativePath,
        writable: false,
        enumerable: true,
        configurable: true,
      });

      files.push(file);
    }

    // Create a FileList-like wrapper using Proxy
    return createFileList(files);
  } catch (error) {
    console.error('Error extracting zip file:', error);
    throw new Error('Failed to extract zip file. Please ensure it is a valid zip archive.');
  }
}

/**
 * Checks if a file is a zip file based on its name or MIME type
 */
export function isZipFile(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith('.zip') ||
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed'
  );
}

