import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  PanResponder,
  Dimensions,
  SafeAreaView,
  TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Speech from 'expo-speech';
import { styled } from 'nativewind';
import { FormattedText } from '../types';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);
const StyledAnimatedView = styled(Animated.View);
const StyledSafeAreaView = styled(SafeAreaView);

interface ImageViewerProps {
  imageUrl: string | null;
  description: FormattedText[];
  voiceText: string;
  isLandscape: boolean;
  selectedIndex: number;
  totalSlides: number;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
  onRotate: () => void;
  isPlaying: boolean;
  isAutoPlaying: boolean;
  onPlay: () => void;
  onAutoPlay: () => void;
}

const renderFormattedText = (formattedText: FormattedText[]) => {
  return formattedText.map((segment, index) => (
    <StyledText
      key={index}
      className={`${segment.style.bold ? 'font-bold' : 'font-normal'} ${
        segment.style.italic ? 'italic' : 'normal'
      } ${segment.style.underline ? 'underline' : 'none'}`}
      style={{
        ...(segment.style.fontSize ? { fontSize: segment.style.fontSize } : {}),
        ...(segment.style.color
          ? { color: segment.style.color }
          : { color: '#ffffff' }),
      }}
    >
      {segment.text}
    </StyledText>
  ));
};

export const ImageViewer: React.FC<ImageViewerProps> = ({
  imageUrl,
  description,
  voiceText,
  isLandscape,
  selectedIndex,
  totalSlides,
  onNext,
  onPrevious,
  onClose,
  onRotate,
  isPlaying,
  isAutoPlaying,
  onPlay,
  onAutoPlay,
}) => {
  const [showControls, setShowControls] = useState(true);
  const position = React.useRef(new Animated.Value(0)).current;

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue(gesture.dx);
      },
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dx) > SCREEN_WIDTH * 0.2) {
          const direction = gesture.dx > 0 ? -1 : 1;
          const newIndex = selectedIndex + direction;

          if (newIndex >= 0 && newIndex < totalSlides) {
            Animated.timing(position, {
              toValue: -direction * SCREEN_WIDTH,
              duration: 300,
              useNativeDriver: true,
            }).start(() => {
              if (direction > 0) {
                onNext();
              } else {
                onPrevious();
              }
              position.setValue(0);
            });
          } else {
            Animated.spring(position, {
              toValue: 0,
              tension: 40,
              friction: 5,
              useNativeDriver: true,
            }).start();
          }
        } else {
          Animated.spring(position, {
            toValue: 0,
            tension: 40,
            friction: 5,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const renderImage = () => {
    if (!imageUrl) {
      return (
        <StyledView
          className={`${
            isLandscape ? 'w-full h-full' : 'w-full h-[80%] -mt-12'
          } bg-gray-800 justify-center items-center px-8`}
        >
          <StyledText className="text-white/90 text-center text-xl ml-10 mr-10 leading-8 tracking-wider">
            {renderFormattedText(description)}
          </StyledText>
        </StyledView>
      );
    }

    const hasDescription = description.some(
      (segment) => segment?.text && segment.text.trim() !== ''
    );

    return (
      <StyledImage
        source={{ uri: imageUrl }}
        className={`${
          isLandscape
            ? hasDescription
              ? 'w-1/2 h-full'
              : 'w-full h-full'
            : 'w-full h-[80%] -mt-12'
        }`}
        resizeMode="contain"
      />
    );
  };

  const handleScreenTap = () => {
    setShowControls(prev => !prev);
  };

  return (
    <TouchableWithoutFeedback onPress={handleScreenTap}>
      <StyledSafeAreaView className="flex-1 bg-black">
        {/* Header Controls */}
        {showControls && (
          <StyledView
            className={`flex-row justify-between items-center absolute top-0 left-0 right-0 z-10 ${
              isLandscape ? 'p-5 pt-3' : 'p-5 pt-10'
            } backdrop-blur`}
          >
            <StyledTouchableOpacity
              className="w-12 h-12 rounded-full justify-center items-center bg-black/50 border border-white/30"
              onPress={onClose}
            >
              <Icon name="close" size={30} color="#fff" />
            </StyledTouchableOpacity>

            <StyledView className="flex-row gap-3">
              <StyledTouchableOpacity
                className="w-12 h-12 rounded-full justify-center items-center bg-white/20 border border-white/30"
                onPress={onRotate}
              >
                <Icon
                  name={isLandscape ? 'screen-rotation' : 'screen-lock-rotation'}
                  size={24}
                  color="#fff"
                />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
        )}

        <StyledAnimatedView
          className={`flex-1 justify-center items-center w-full h-full bg-black ${
            isLandscape ? 'flex-row' : ''
          }`}
          style={{
            transform: [{ translateX: position }],
          }}
          {...panResponder.panHandlers}
        >
          {showControls && selectedIndex > 0 && (
            <StyledTouchableOpacity
              className={`absolute ${
                isLandscape ? 'left-4 top-1/2 -mt-6' : 'left-4 top-1/2 -mt-6'
              } w-12 h-12 rounded-full bg-black/50 justify-center items-center border border-white/30 z-10`}
              onPress={onPrevious}
            >
              <Icon name="chevron-left" size={36} color="#fff" />
            </StyledTouchableOpacity>
          )}

          {showControls && selectedIndex < totalSlides - 1 && (
            <StyledTouchableOpacity
              className={`absolute ${
                isLandscape ? 'right-4 top-1/2 -mt-6' : 'right-4 top-1/2 -mt-6'
              } w-12 h-12 rounded-full bg-black/50 justify-center items-center border border-white/30 z-10`}
              onPress={onNext}
            >
              <Icon name="chevron-right" size={36} color="#fff" />
            </StyledTouchableOpacity>
          )}

          {renderImage()}

          {imageUrl && description.some((segment) => segment?.text && segment.text.trim() !== '') && showControls && (
            <StyledView
              className={`${
                isLandscape
                  ? 'w-1/2 h-full justify-center p-6'
                  : 'absolute bottom-0 left-0 right-0 p-6'
              } bg-black/75 backdrop-blur`}
            >
              <StyledText className="text-white/90 text-base leading-6 tracking-wider">
                {renderFormattedText(description)}
              </StyledText>
            </StyledView>
          )}

          {showControls && (
            <>
              <StyledTouchableOpacity
                className={`absolute bottom-8 right-8 w-12 h-12 rounded-full justify-center items-center ${
                  isPlaying ? 'bg-danger' : 'bg-primary'
                }`}
                onPress={onPlay}
              >
                <Icon
                  name={isPlaying ? 'volume-up' : 'volume-down'}
                  size={24}
                  color="#fff"
                />
              </StyledTouchableOpacity>

              <StyledTouchableOpacity
                className={`absolute bottom-8 right-24 w-12 h-12 rounded-full justify-center items-center ${
                  isAutoPlaying ? 'bg-danger' : 'bg-primary'
                }`}
                onPress={onAutoPlay}
              >
                <Icon
                  name={isAutoPlaying ? 'stop' : 'play-arrow'}
                  size={24}
                  color="#fff"
                />
              </StyledTouchableOpacity>

              <StyledView
                className={`absolute ${
                  isLandscape
                    ? imageUrl
                      ? 'bottom-4 right-[25%]'
                      : 'bottom-4 self-center'
                    : 'bottom-8 self-center'
                } bg-black/75 px-4 py-2 rounded-full border border-white/20`}
              >
                <StyledText className="text-white text-sm font-medium">
                  {selectedIndex + 1} / {totalSlides}
                </StyledText>
              </StyledView>
            </>
          )}
        </StyledAnimatedView>
      </StyledSafeAreaView>
    </TouchableWithoutFeedback>
  );
}; 