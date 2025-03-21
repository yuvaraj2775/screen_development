import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions, TextStyle, ScrollView } from 'react-native';
import { styled } from 'nativewind';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Speech from 'expo-speech';
import { FormattedText } from '../types';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledImage = styled(Image);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);

interface SlideViewerProps {
  imageUrl: string | null;
  description: FormattedText[];
  currentIndex: number;
  totalSlides: number;
  voiceText?: string;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
  onGoToFirst: () => void;
  onGoToLast: () => void;
}

// Function to generate a random color
const getRandomColor = () => {
  const colors = [
    'text-yellow-400',
    'text-blue-400',
    'text-green-400',
    'text-red-400',
    'text-purple-400',
    'text-pink-400',
    'text-indigo-400',
    'text-orange-400',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Function to get sentence color based on sentence index
const getSentenceColor = (index: number) => {
  const colors = [
    'text-yellow-400',
    'text-blue-400',
    'text-green-400',
    'text-red-400',
    'text-purple-400',
    'text-pink-400',
    'text-indigo-400',
    'text-orange-400',
  ];
  return colors[index % colors.length];
};

export function SlideViewer({
  imageUrl,
  description,
  currentIndex,
  totalSlides,
  voiceText,
  onNext,
  onPrevious,
  onClose,
  onGoToFirst,
  onGoToLast,
}: SlideViewerProps) {
  const [imageError, setImageError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    const setOrientation = async () => {
      await ScreenOrientation.lockAsync(
        isLandscape
          ? ScreenOrientation.OrientationLock.LANDSCAPE
          : ScreenOrientation.OrientationLock.PORTRAIT
      );
    };
    setOrientation();

    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
      Speech.stop();
    };
  }, [isLandscape]);

  useEffect(() => {
    // Stop speech when changing slides
    Speech.stop();
    setIsPlaying(false);
  }, [currentIndex]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const autoPlayNext = async () => {
      if (!isAutoPlaying) return;

      if (voiceText) {
        try {
          await Speech.speak(voiceText, {
            onDone: () => {
              if (currentIndex < totalSlides - 1) {
                onNext();
              } else {
                setIsAutoPlaying(false);
              }
            },
            onError: () => {
              setIsAutoPlaying(false);
            },
          });
        } catch (error) {
          console.error('Error playing voice:', error);
          setIsAutoPlaying(false);
        }
      } else {
        timeoutId = setTimeout(() => {
          if (currentIndex < totalSlides - 1) {
            onNext();
          } else {
            setIsAutoPlaying(false);
          }
        }, 3000);
      }
    };

    if (isAutoPlaying) {
      autoPlayNext();
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isAutoPlaying, currentIndex, voiceText, totalSlides]);

  const toggleOrientation = async () => {
    setIsLandscape(!isLandscape);
  };

  const toggleVoice = async () => {
    if (!voiceText) return;

    if (isPlaying) {
      await Speech.stop();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      try {
        await Speech.speak(voiceText, {
          onDone: () => setIsPlaying(false),
          onError: () => setIsPlaying(false),
        });
      } catch (error) {
        console.error('Error playing voice:', error);
        setIsPlaying(false);
      }
    }
  };

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
    if (!isAutoPlaying) {
      setIsPlaying(true);
    }
  };

  const hasImage = imageUrl && !imageError;
  const hasDescription = description && description.length > 0;

  return (
    <StyledView className="flex-1 bg-black">
      {/* Top Bar */}
      <StyledView className="flex-row justify-between items-center p-4">
        <StyledTouchableOpacity onPress={onClose} className="w-12 h-12 rounded-full bg-gray-800/50 justify-center items-center">
          <Icon name="close" size={32} color="#fff" />
        </StyledTouchableOpacity>
        <StyledText className="text-white text-lg font-semibold">
          {currentIndex + 1} / {totalSlides}
        </StyledText>
        <StyledView className="flex-row gap-2">
          <StyledTouchableOpacity
            onPress={toggleOrientation}
            className="w-12 h-12 rounded-full bg-gray-800/50 justify-center items-center"
          >
            <Icon name="screen-rotation" size={24} color="#fff" />
          </StyledTouchableOpacity>
          {voiceText && (
            <StyledTouchableOpacity
              onPress={toggleVoice}
              className={`w-12 h-12 rounded-full ${isPlaying ? 'bg-blue-500' : 'bg-gray-800/50'} justify-center items-center`}
            >
              <Icon
                name={isPlaying ? "volume-up" : "record-voice-over"}
                size={24}
                color="#fff"
              />
            </StyledTouchableOpacity>
          )}
          <StyledTouchableOpacity
            onPress={toggleAutoPlay}
            className={`w-12 h-12 rounded-full ${isAutoPlaying ? 'bg-blue-500' : 'bg-gray-800/50'} justify-center items-center`}
          >
            <Icon
              name={isAutoPlaying ? "pause-circle-filled" : "play-circle-filled"}
              size={32}
              color="#fff"
            />
          </StyledTouchableOpacity>
        </StyledView>
      </StyledView>

      {/* Content */}
      <StyledView className={`flex-1 ${isLandscape ? 'flex-row' : 'flex-col'} ${(!hasImage || !hasDescription) ? 'justify-center' : ''}`}>
        {/* Image Section */}
        {hasImage && (
          <StyledView className={`${isLandscape ? (hasDescription ? 'w-1/2' : 'flex-1') : 'h-1/2'} justify-center items-center p-4`}>
            <StyledImage
              source={{ uri: imageUrl }}
              className="w-full h-full"
              resizeMode="contain"
              onError={() => setImageError(true)}
            />
          </StyledView>
        )}

        {/* Description Section */}
        {hasDescription && (
          <StyledView className={`${isLandscape ? (hasImage ? 'w-1/2' : 'flex-1') : 'h-1/2'} justify-center p-6`}>
            <StyledScrollView 
              className="bg-gray-800/80 rounded-xl p-4 max-h-full"
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ flexGrow: 1 }}
            >
              <StyledText className="text-white flex-wrap">
                {(() => {
                  let currentSentenceIndex = -1;
                  let currentColor = '';
                  let lastWasHighlighted = false;
                  let highlightedPhrase = '';

                  return description.map((segment, index) => {
                    // If this segment starts a highlighted phrase, store it
                    if (segment.style.highlighted && !lastWasHighlighted) {
                      highlightedPhrase = segment.text;
                    } 
                    // If this is a continuation of a highlighted phrase, append to it
                    else if (segment.style.highlighted && lastWasHighlighted) {
                      highlightedPhrase += ' ' + segment.text;
                    }
                    // If this ends a highlighted phrase, reset it
                    else if (!segment.style.highlighted && lastWasHighlighted) {
                      highlightedPhrase = '';
                    }

                    // Check if this is a new sentence
                    const isNewSentence = index === 0 || 
                      (description[index - 1]?.text.match(/[.!?]$/)) ||
                      (!lastWasHighlighted && segment.style.highlighted) ||
                      (lastWasHighlighted && segment.style.highlighted === false);

                    if (isNewSentence && segment.style.highlighted) {
                      currentSentenceIndex++;
                      currentColor = getSentenceColor(currentSentenceIndex);
                    }

                    lastWasHighlighted = Boolean(segment.style.highlighted);

                    // Only apply highlighting if this segment is part of the complete highlighted phrase
                    if (segment.style.highlighted && highlightedPhrase.includes(segment.text)) {
                      const textStyle: TextStyle = {
                        fontSize: segment.style.fontSize || 16,
                        fontWeight: segment.style.bold ? 'bold' : 'normal',
                        fontStyle: segment.style.italic ? 'italic' : 'normal',
                        textDecorationLine: segment.style.textDecorationLine === 'underline' ? 'underline' : 'none',
                      };

                      return (
                        <StyledText
                          key={index}
                          className={currentColor}
                          style={textStyle}
                        >
                          {segment.text}{' '}
                        </StyledText>
                      );
                    }

                    return (
                      <StyledText
                        key={index}
                      >
                        {segment.text}{' '}
                      </StyledText>
                    );
                  });
                })()}
              </StyledText>
            </StyledScrollView>
          </StyledView>
        )}
      </StyledView>

      {/* Navigation Buttons */}
      <StyledView className="flex-row justify-between items-center p-4">
        <StyledView className="flex-row gap-2">
          <StyledTouchableOpacity
            onPress={onPrevious}
            disabled={currentIndex === 0 || isAutoPlaying}
            className={`w-12 h-12 rounded-full ${
              currentIndex === 0 || isAutoPlaying ? 'bg-gray-800/30' : 'bg-gray-800/50'
            } justify-center items-center`}
          >
            <Icon
              name="chevron-left"
              size={32}
              color={currentIndex === 0 || isAutoPlaying ? '#666' : '#fff'}
            />
          </StyledTouchableOpacity>
          <StyledTouchableOpacity
            onPress={onGoToFirst}
            disabled={currentIndex === 0 || isAutoPlaying}
            className={`w-12 h-12 rounded-full ${
              currentIndex === 0 || isAutoPlaying ? 'bg-gray-800/30' : 'bg-gray-800/50'
            } justify-center items-center`}
          >
            <Icon
              name="first-page"
              size={24}
              color={currentIndex === 0 || isAutoPlaying ? '#666' : '#fff'}
            />
          </StyledTouchableOpacity>
        </StyledView>

        <StyledView className="flex-row gap-2">
          <StyledTouchableOpacity
            onPress={onGoToLast}
            disabled={currentIndex === totalSlides - 1 || isAutoPlaying}
            className={`w-12 h-12 rounded-full ${
              currentIndex === totalSlides - 1 || isAutoPlaying ? 'bg-gray-800/30' : 'bg-gray-800/50'
            } justify-center items-center`}
          >
            <Icon
              name="last-page"
              size={24}
              color={currentIndex === totalSlides - 1 || isAutoPlaying ? '#666' : '#fff'}
            />
          </StyledTouchableOpacity>
          <StyledTouchableOpacity
            onPress={onNext}
            disabled={currentIndex === totalSlides - 1 || isAutoPlaying}
            className={`w-12 h-12 rounded-full ${
              currentIndex === totalSlides - 1 || isAutoPlaying ? 'bg-gray-800/30' : 'bg-gray-800/50'
            } justify-center items-center`}
          >
            <Icon
              name="chevron-right"
              size={32}
              color={currentIndex === totalSlides - 1 || isAutoPlaying ? '#666' : '#fff'}
            />
          </StyledTouchableOpacity>
        </StyledView>
      </StyledView>
    </StyledView>
  );
} 