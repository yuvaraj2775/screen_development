import React, { useState } from 'react';
import { View, Modal, SafeAreaView, Text, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { styled } from 'nativewind';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import { FolderCard } from './components/FolderCard';
import { SlideViewer } from './components/SlideViewer';
import { useFolder } from './hooks/useFolder';
import { FolderItem, ExcelData, FormattedText } from './types';
import { createFormattedText } from './utils';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);
const StyledSafeAreaView = styled(SafeAreaView);
const StyledTextInput = styled(TextInput);

export default function HomeScreen() {
  const [editFolderModalVisible, setEditFolderModalVisible] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FolderItem | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slideModalVisible, setSlideModalVisible] = useState(false);

  const { folders, setFolders, handleFolderUpload, updateFolder, deleteFolder, isLoading: folderIsLoading, progress } = useFolder();

  const handleEditFolder = (folder: FolderItem) => {
    setEditingFolder(folder);
    setNewFolderName(folder.folderName);
    setEditFolderModalVisible(true);
  };

  const handleSaveFolderChanges = () => {
    if (!editingFolder) return;

    updateFolder(editingFolder.id, { folderName: newFolderName });
    setEditFolderModalVisible(false);
    setEditingFolder(null);
  };

  const handleDeleteFolder = (folder: FolderItem) => {
    Alert.alert(
      'Delete Folder',
      `Are you sure you want to delete "${folder.folderName}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteFolder(folder.id);
          },
        },
      ]
    );
  };

  const handleDuplicateFolder = (folder: FolderItem) => {
    const newFolder = {
      ...folder,
      id: Math.max(...folders.map((f) => f.id), 0) + 1,
      folderName: `${folder.folderName} (Copy)`,
    };
    setFolders([...folders, newFolder]);
  };

  const handleShareFolder = async (folder: FolderItem) => {
    try {
      const folderData = {
        name: folder.folderName,
        slides: folder.images.length,
        date: new Date().toISOString(),
      };
      
      Alert.alert(
        'Share Folder',
        'This is a placeholder for sharing functionality. You can implement actual sharing using React Native Share API.',
        [
          {
            text: 'OK',
            style: 'default',
          },
        ]
      );
    } catch (error) {
      console.error('Error sharing folder:', error);
      Alert.alert('Error', 'Failed to share folder');
    }
  };

  const handleAddMore = async (folder: FolderItem) => {
    try {
      setIsLoading(true);

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
              description: [],
              voiceText: '',
            };

            uniqueImages.set(image.name, processedEntry);
            return processedEntry;
          })
          .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
      }

      if (newEntries.length > 0) {
        setFolders((prevFolders) =>
          prevFolders.map((f) =>
            f.id === folder.id
              ? { ...f, images: [...f.images, ...newEntries] }
              : f
          )
        );
        Alert.alert('Success', `Added ${newEntries.length} new slides to "${folder.folderName}"`);
      } else {
        Alert.alert('No Files Added', 'No valid files were found to add to the folder.');
      }
    } catch (error) {
      console.error('Error adding more files:', error);
      Alert.alert('Error', 'Failed to add files to folder');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFolderPress = (folder: FolderItem) => {
    setSelectedFolder(folder);
    setCurrentSlideIndex(0);
    setSlideModalVisible(true);
  };

  const handleNextSlide = () => {
    if (selectedFolder && currentSlideIndex < selectedFolder.images.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const handlePreviousSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const handleCloseSlideViewer = () => {
    setSlideModalVisible(false);
    setSelectedFolder(null);
    setCurrentSlideIndex(0);
  };

  const handleNext = () => {
    if (selectedFolder?.images && currentSlideIndex < selectedFolder.images.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const handleGoToFirst = () => {
    setCurrentSlideIndex(0);
  };

  const handleGoToLast = () => {
    if (selectedFolder?.images) {
      setCurrentSlideIndex(selectedFolder.images.length - 1);
    }
  };

  return (
    <StyledView className="flex-1 p-4 bg-gray-100">
      {/* Upload Section */}
      <StyledView className="mb-6 flex-row justify-end">
        <StyledTouchableOpacity
          className="bg-primary px-6 py-3.5 rounded-xl shadow-lg"
          onPress={handleFolderUpload}
        >
          <StyledText className="text-white text-base font-bold tracking-wider">
            Upload Folder
          </StyledText>
        </StyledTouchableOpacity>
      </StyledView>

      {/* Content Display Section */}
      <StyledScrollView className="flex-1 px-1">
        {folders.length === 0 ? (
          <StyledView className="flex-1 justify-center items-center py-20">
            <StyledView className="w-20 h-20 mb-6 rounded-full bg-primary/10 justify-center items-center">
              <Icon name="folder-open" size={40} color="#4361ee" />
            </StyledView>
            <StyledText className="text-xl font-bold text-dark mb-2 text-center">
              No Folders Yet
            </StyledText>
            <StyledText className="text-base text-gray-500 text-center max-w-[280px] mb-8">
              Click the "Upload Folder" button to add a folder with images and
              descriptions
            </StyledText>
            <StyledTouchableOpacity
              className="bg-primary px-6 py-3.5 rounded-xl shadow-lg flex-row items-center"
              onPress={handleFolderUpload}
            >
              <Icon name="add" size={24} color="#fff" className="mr-2" />
              <StyledText className="text-white text-base font-bold tracking-wider">
                Upload Folder
              </StyledText>
            </StyledTouchableOpacity>
          </StyledView>
        ) : (
          <>
            {/* Folder Cards */}
            {folders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                onPress={() => handleFolderPress(folder)}
                onEdit={handleEditFolder}
                onDelete={handleDeleteFolder}
                onAddMore={handleAddMore}
              />
            ))}
          </>
        )}
      </StyledScrollView>

      {/* Edit Folder Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={editFolderModalVisible}
        onRequestClose={() => setEditFolderModalVisible(false)}
      >
        <StyledView className="flex-1 bg-black/50 justify-center items-center p-4">
          <StyledView className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl">
            <StyledText className="text-xl font-bold mb-4 text-gray-800">
              Edit Folder
            </StyledText>

            <StyledView className="mb-4">
              <StyledText className="text-sm font-medium text-gray-600 mb-2">
                Folder Name
              </StyledText>
              <StyledTextInput
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200"
                value={newFolderName}
                onChangeText={setNewFolderName}
                placeholder="Enter folder name"
                placeholderTextColor="#9CA3AF"
              />
            </StyledView>

            <StyledView className="flex-row justify-end gap-3">
              <StyledTouchableOpacity
                className="px-4 py-2 rounded-xl bg-gray-100"
                onPress={() => {
                  setEditFolderModalVisible(false);
                  setEditingFolder(null);
                }}
              >
                <StyledText className="text-gray-600 font-medium">
                  Cancel
                </StyledText>
              </StyledTouchableOpacity>
              <StyledTouchableOpacity
                className="px-4 py-2 rounded-xl bg-primary"
                onPress={handleSaveFolderChanges}
              >
                <StyledText className="text-white font-medium">
                  Save Changes
                </StyledText>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
        </StyledView>
      </Modal>

      {/* Slide Viewer Modal */}
      <Modal
        animationType="fade"
        transparent={false}
        visible={slideModalVisible}
        onRequestClose={handleCloseSlideViewer}
      >
        <StyledSafeAreaView className="flex-1 bg-black">
          {selectedFolder && selectedFolder.images[currentSlideIndex] && (
            <SlideViewer
              imageUrl={selectedFolder.images[currentSlideIndex].imageUrl}
              description={selectedFolder.images[currentSlideIndex].description}
              voiceText={selectedFolder.images[currentSlideIndex].voiceText}
              currentIndex={currentSlideIndex}
              totalSlides={selectedFolder.images.length}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onClose={handleCloseSlideViewer}
              onGoToFirst={handleGoToFirst}
              onGoToLast={handleGoToLast}
            />
          )}
        </StyledSafeAreaView>
      </Modal>

      {/* Loading Overlay */}
      {folderIsLoading && (
        <StyledSafeAreaView className=" left-0 right-0 top-0 bottom-0 absolute inset-0 bg-white flex-1 z-50">
          <StyledView className="flex-1 justify-center items-center px-8">
            {/* Loading Icon */}
            <StyledView className="mb-16">
              <Icon
                name="refresh"
                size={48}
                color="#4361ee"
                className="animate-spin"
              />
            </StyledView>

            {/* Title and Description */}
            <StyledText className="text-2xl font-bold text-gray-900 mb-2">
              Processing Images
            </StyledText>
            <StyledText className="text-base text-gray-500 mb-12">
              Please wait while we process your images...
            </StyledText>

            {/* Progress Bar Container */}
            <StyledView className="w-full max-w-sm">
              <StyledView className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                <StyledView 
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </StyledView>
              <StyledText className="text-sm text-gray-600 text-center">
                {Math.round(progress)}% Complete
              </StyledText>
            </StyledView>
          </StyledView>
        </StyledSafeAreaView>
      )}
    </StyledView>
  );
}