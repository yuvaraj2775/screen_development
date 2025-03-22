import { useState, useEffect } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import { FolderItem, ExcelData, FormattedText } from '../types';
import { createFormattedText } from '../utils';

const IMAGES_DIRECTORY = `${FileSystem.documentDirectory}images/`;
const BATCH_SIZE = 5; // Process 5 images at a time
const FOLDERS_STORAGE_KEY = 'folders_data';
const PROCESSING_DELAY = 100; // 2 seconds delay between images
const DOCUMENTS_FOLDER = `${FileSystem.documentDirectory}folders/`;

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface DocumentAsset {
  uri: string;
  name: string;
  mimeType?: string;
}

interface ProcessedImage {
  imageUrl: string;
  name: string;
  description: FormattedText[];
  voiceText: string;
}

export const useFolder = () => {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');

  // Load saved folders on mount
  useEffect(() => {
    loadSavedFolders();
  }, []);

  // Save folders whenever they change
  useEffect(() => {
    saveFolders();
  }, [folders]);

  // Load saved folders from storage
  const loadSavedFolders = async () => {
    try {
      const savedData = await FileSystem.readAsStringAsync(
        `${FileSystem.documentDirectory}${FOLDERS_STORAGE_KEY}.json`
      );
      const parsedData = JSON.parse(savedData);
      setFolders(parsedData);
    } catch (error) {
      console.log('No saved folders found or error loading:', error);
    }
  };

  // Save folders to storage
  const saveFolders = async () => {
    try {
      await FileSystem.writeAsStringAsync(
        `${FileSystem.documentDirectory}${FOLDERS_STORAGE_KEY}.json`,
        JSON.stringify(folders)
      );
    } catch (error) {
      console.error('Error saving folders:', error);
    }
  };

  // Ensure images directory exists
  const ensureImagesDirectory = async () => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(IMAGES_DIRECTORY);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(IMAGES_DIRECTORY, { intermediates: true });
      }
    } catch (error) {
      console.error('Error creating images directory:', error);
      throw error;
    }
  };

  // Process images in batches with delay
  const processImagesInBatches = async (
    images: DocumentAsset[],
    onProgress: (progress: number) => void
  ) => {
    const results = [];
    const totalImages = images.length;
    let processedCount = 0;

    for (let i = 0; i < totalImages; i += BATCH_SIZE) {
      const batch = images.slice(i, i + BATCH_SIZE);
      
      // Process each image in the batch sequentially with delay
      for (const image of batch) {
        try {
          // Add delay before processing each image
          await delay(PROCESSING_DELAY);
          
          const newPath = await moveImageToAppDirectory(image.uri, image.name);
          processedCount++;
          onProgress((processedCount / totalImages) * 100);
          results.push({ originalName: image.name, newPath });
        } catch (error) {
          console.error(`Error processing image ${image.name}:`, error);
        }
      }
    }

    return results;
  };

  // Move image to app's directory and return the new path
  const moveImageToAppDirectory = async (uri: string, fileName: string): Promise<string> => {
    try {
      await ensureImagesDirectory();
      const newPath = `${IMAGES_DIRECTORY}${Date.now()}-${fileName}`;
      
      // Check if file exists before moving
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('Source file does not exist');
      }

      // Use copyAsync instead of moveAsync for better reliability
      await FileSystem.copyAsync({
        from: uri,
        to: newPath,
      });

      // Verify the file was copied successfully
      const newFileInfo = await FileSystem.getInfoAsync(newPath);
      if (!newFileInfo.exists) {
        throw new Error('Failed to copy file');
      }

      // Delete the original file after successful copy
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch (error) {
        console.warn('Could not delete original file:', error);
      }

      return newPath;
    } catch (error) {
      console.error('Error moving image:', error);
      throw error;
    }
  };

  // Clean up images when folder is deleted
  const cleanupFolderImages = async (folder: FolderItem) => {
    try {
      const deletePromises = folder.images
        .filter((image) => image.imageUrl && image.imageUrl.startsWith(IMAGES_DIRECTORY))
        .map((image) => 
          FileSystem.deleteAsync(image.imageUrl!, { idempotent: true })
            .catch(error => console.error('Error deleting image:', error))
        );
      
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error cleaning up folder images:', error);
    }
  };

  // Ensure the documents folder exists
  const ensureDocumentsFolder = async () => {
    const folderInfo = await FileSystem.getInfoAsync(DOCUMENTS_FOLDER);
    if (!folderInfo.exists) {
      await FileSystem.makeDirectoryAsync(DOCUMENTS_FOLDER, { intermediates: true });
    }
  };

  // Save file to documents directory
  const saveFileToDocuments = async (uri: string, fileName: string): Promise<string> => {
    await ensureDocumentsFolder();
    const destination = `${DOCUMENTS_FOLDER}${Date.now()}-${fileName}`;
    await FileSystem.copyAsync({
      from: uri,
      to: destination,
    });
    return destination;
  };

  // Process a batch of files
  const processBatch = async (files: DocumentPicker.DocumentPickerAsset[]): Promise<ProcessedImage[]> => {
    const processedFiles = await Promise.all(
      files.map(async (file) => {
        try {
          const savedPath = await saveFileToDocuments(file.uri, file.name);
          return {
            imageUrl: savedPath,
            name: file.name,
            description: [] as FormattedText[],
            voiceText: '',
          };
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          return null;
        }
      })
    );

    return processedFiles.filter((file): file is ProcessedImage => file !== null);
  };

  const handleFolderUpload = async () => {
    try {
      setIsLoading(true);
      setProgress(0);

      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'image/png',
          'image/jpeg',
          'image/svg+xml',
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
            file.name.endsWith('.jpeg') ||
            file.name.endsWith('.svg'))
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

        // Process images in batches
        const processedImages = await processImagesInBatches(imageFiles, (progress) => {
          setProgress(progress);
        });

        newEntries = excelData
          .map((entry) => {
            const matchingImage = processedImages.find(
              (image) => image.originalName === entry.Image
            );

            const uniqueKey = `${entry.Image || 'text-only'}-${entry.Text || ''}`;

            if (uniqueEntries.has(uniqueKey)) return null;

            const processedEntry = {
              imageUrl: matchingImage ? matchingImage.newPath : null,
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
        setProcessingMessage('Processing images...');
        const totalBatches = Math.ceil(imageFiles.length / BATCH_SIZE);
        for (let i = 0; i < totalBatches; i++) {
          const startIndex = i * BATCH_SIZE;
          const endIndex = Math.min(startIndex + BATCH_SIZE, imageFiles.length);
          setProgress((i / totalBatches) * 100);
          setProcessingMessage(`Processing images ${startIndex + 1} to ${endIndex} of ${imageFiles.length}...`);

          const batchResults = await processBatch(imageFiles.slice(startIndex, endIndex));
          newEntries.push(...batchResults.filter((entry): entry is NonNullable<typeof entry> => entry !== null));
        }

        // Update entries to have empty descriptions instead of filenames
        newEntries = newEntries.map(entry => ({
          ...entry,
          description: [], // Empty description array
          voiceText: '' // Empty voice text
        }));
      }

      newFolder.images = newEntries;
      setFolders([...folders, newFolder]);
      setProcessingMessage('Upload complete!');
    } catch (error) {
      console.error('Error uploading folder:', error);
      throw error;
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  const updateFolder = (folderId: number, updates: Partial<FolderItem>) => {
    setFolders((prevFolders) =>
      prevFolders.map((folder) =>
        folder.id === folderId ? { ...folder, ...updates } : folder
      )
    );
  };

  const deleteFolder = async (folderId: number) => {
    const folderToDelete = folders.find((f) => f.id === folderId);
    if (folderToDelete) {
      await cleanupFolderImages(folderToDelete);
      setFolders((prevFolders) => prevFolders.filter((f) => f.id !== folderId));
    }
  };

  return {
    folders,
    setFolders,
    isLoading,
    progress,
    processingMessage,
    handleFolderUpload,
    updateFolder,
    deleteFolder,
  };
}; 