import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { styled } from 'nativewind';
import { FolderItem } from '../types';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface FolderCardProps {
  folder: FolderItem;
  onPress: (folder: FolderItem) => void;
  onEdit: (folder: FolderItem) => void;
  onDelete?: (folder: FolderItem) => void;
  onDuplicate?: (folder: FolderItem) => void;
  onShare?: (folder: FolderItem) => void;
  onAddMore?: (folder: FolderItem) => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({
  folder,
  onPress,
  onEdit,
  onDelete,
  onDuplicate,
  onShare,
  onAddMore,
}) => {
  const [showOptions, setShowOptions] = useState(false);

  const handleEditPress = (e: any) => {
    e.stopPropagation();
    setShowOptions(true);
  };

  return (
    <>
      <StyledView className="mb-5 rounded-2xl bg-white overflow-hidden shadow-lg border border-gray-200/20">
        <StyledView className="flex-row p-4">
          <StyledView className="flex-1">
            <StyledText className="text-xl font-bold mb-2 text-red-400 tracking-wider">
              {folder.folderName}
            </StyledText>
            <StyledText className="text-base text-gray-500">
              {`${folder.images.length} Slides`}
            </StyledText>
          </StyledView>
          <StyledView className="flex-row items-center gap-3">
            <StyledTouchableOpacity
              className="w-10 h-10 rounded-full justify-center items-center bg-primary/10"
              onPress={handleEditPress}
            >
              <Icon name="more-vert" size={20} color="#4361ee" />
            </StyledTouchableOpacity>
            <StyledTouchableOpacity
              className="w-10 h-10 rounded-full justify-center items-center bg-primary/10"
              onPress={() => onPress(folder)}
            >
              <Icon name="folder" size={24} color="#4361ee" />
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>
      </StyledView>

      {/* Edit Options Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showOptions}
        onRequestClose={() => setShowOptions(false)}
      >
        <StyledTouchableOpacity
          className="flex-1 bg-black/50 justify-center items-center p-4"
          activeOpacity={1}
          onPress={() => setShowOptions(false)}
        >
          <StyledView className="w-full max-w-xs bg-white rounded-2xl overflow-hidden">
            {onAddMore && (
              <StyledTouchableOpacity
                className="flex-row items-center px-6 py-4 border-b border-gray-100"
                onPress={() => {
                  setShowOptions(false);
                  onAddMore(folder);
                }}
              >
                <Icon name="add-photo-alternate" size={24} color="#4361ee" />
                <StyledText className="ml-3 text-base font-medium text-gray-800">
                  Add More Files
                </StyledText>
              </StyledTouchableOpacity>
            )}

            <StyledTouchableOpacity
              className="flex-row items-center px-6 py-4 border-b border-gray-100"
              onPress={() => {
                setShowOptions(false);
                onEdit(folder);
              }}
            >
              <Icon name="edit" size={24} color="#4361ee" />
              <StyledText className="ml-3 text-base font-medium text-gray-800">
                Rename Folder
              </StyledText>
            </StyledTouchableOpacity>

           

           

            {onDelete && (
              <StyledTouchableOpacity
                className="flex-row items-center px-6 py-4"
                onPress={() => {
                  setShowOptions(false);
                  onDelete(folder);
                }}
              >
                <Icon name="delete" size={24} color="#ef4444" />
                <StyledText className="ml-3 text-base font-medium text-red-500">
                  Delete Folder
                </StyledText>
              </StyledTouchableOpacity>
            )}
          </StyledView>
        </StyledTouchableOpacity>
      </Modal>
    </>
  );
}; 