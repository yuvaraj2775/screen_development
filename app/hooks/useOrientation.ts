import { useState, useEffect } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';

export const useOrientation = () => {
  const [isLandscape, setIsLandscape] = useState(false);

  const handleRotation = async () => {
    try {
      if (isLandscape) {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP
        );
        setIsLandscape(false);
      } else {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE
        );
        setIsLandscape(true);
      }
    } catch (error) {
      console.error('Failed to rotate screen:', error);
      throw error;
    }
  };

  useEffect(() => {
    const lockOrientation = async () => {
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP
        );
      } catch (error) {
        console.error('Failed to lock orientation:', error);
      }
    };

    lockOrientation();

    return () => {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      ).catch(console.error);
    };
  }, []);

  return {
    isLandscape,
    handleRotation,
  };
}; 