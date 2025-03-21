import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import { FolderItem, ExcelData, FormattedText } from '../types';
import { createFormattedText } from '../utils';

export const useFolder = () => {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleFolderUpload = async () => {
    try {
      setIsLoading(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'image/png',
          'image/jpeg',
        ],
        multiple: true,
      });

      if (result.canceled) {
        setIsLoading(false);
        return;
      }

      const excelFile = result.assets.find(
        (file) =>
          file.name.endsWith('.xlsx') ||
          file.name.endsWith('.xls') ||
          file.name.endsWith('.csv')
      );

      const imageFiles = result.assets.filter(
        (file) =>
          file.mimeType?.startsWith('image/') &&
          (file.name.endsWith('.png') ||
            file.name.endsWith('.jpg') ||
            file.name.endsWith('.jpeg'))
      );

      const newFolder: FolderItem = {
        id: Math.max(...folders.map((f) => f.id), 0) + 1,
        folderName: excelFile ? excelFile.name.split('.')[0] : 'Image Folder',
        images: [],
      };

      let newEntries: {
        imageUrl: string | null;
        name: string;
        description: FormattedText[];
        voiceText: string;
      }[] = [];

      if (excelFile && imageFiles.length > 0) {
        const excelContent = await FileSystem.readAsStringAsync(excelFile.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const workbook = XLSX.read(excelContent, { type: 'base64' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const excelData: ExcelData[] = XLSX.utils.sheet_to_json(worksheet);

        const uniqueEntries = new Map();

        newEntries = excelData
          .map((entry) => {
            const matchingImage = imageFiles.find(
              (image) => image.name === entry.Image
            );

            const uniqueKey = `${entry.Image || 'text-only'}-${entry.Text || ''}`;

            if (uniqueEntries.has(uniqueKey)) return null;

            const processedEntry = {
              imageUrl: matchingImage ? matchingImage.uri : null,
              name: entry.Image || 'Untitled',
              description: createFormattedText(
                entry.Text || '',
                entry.Highlighted || '',
                entry.Style || ''
              ),
              voiceText: entry.backgroundVoice || entry.Text || '',
            };

            uniqueEntries.set(uniqueKey, processedEntry);
            return processedEntry;
          })
          .filter((entry): entry is NonNullable<typeof entry> => {
            return (
              entry !== null &&
              (entry.imageUrl !== null ||
                (entry.description &&
                  entry.description.some(
                    (segment) => segment && segment.text.trim() !== ''
                  )))
            );
          });
      } else if (excelFile) {
        const excelContent = await FileSystem.readAsStringAsync(excelFile.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const workbook = XLSX.read(excelContent, { type: 'base64' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const excelData: ExcelData[] = XLSX.utils.sheet_to_json(worksheet);

        const uniqueEntries = new Map();

        newEntries = excelData
          .map((entry) => {
            const uniqueKey = entry.Text || '';

            if (uniqueEntries.has(uniqueKey)) return null;

            const processedEntry = {
              imageUrl: null,
              name: entry.Image || 'Untitled',
              description: createFormattedText(
                entry.Text || '',
                entry.Highlighted || '',
                entry.Style || ''
              ),
              voiceText: entry.backgroundVoice || entry.Text || '',
            };

            uniqueEntries.set(uniqueKey, processedEntry);
            return processedEntry;
          })
          .filter((entry): entry is NonNullable<typeof entry> => {
            return (
              entry !== null &&
              entry.description &&
              entry.description.some(
                (segment) => segment && segment.text.trim() !== ''
              )
            );
          });
      } else if (imageFiles.length > 0) {
        const uniqueImages = new Map();

        newEntries = imageFiles
          .map((image) => {
            if (uniqueImages.has(image.name)) return null;

            const processedEntry = {
              imageUrl: image.uri,
              name: image.name,
              description: [{ text: image.name, style: {} }],
              voiceText: image.name,
            };

            uniqueImages.set(image.name, processedEntry);
            return processedEntry;
          })
          .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
      }

      newFolder.images = newEntries;
      setFolders([...folders, newFolder]);
    } catch (error) {
      console.error('Error uploading folder:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateFolder = (folderId: number, updates: Partial<FolderItem>) => {
    setFolders((prevFolders) =>
      prevFolders.map((folder) =>
        folder.id === folderId ? { ...folder, ...updates } : folder
      )
    );
  };

  return {
    folders,
    setFolders,
    isLoading,
    handleFolderUpload,
    updateFolder,
  };
}; 