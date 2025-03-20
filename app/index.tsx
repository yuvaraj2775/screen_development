import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Dimensions,
  SafeAreaView,
  Animated,
  PanResponder,
  TextInput,
  Alert,
} from "react-native";
import { useState, useRef, useEffect } from "react";
import Icon from "react-native-vector-icons/MaterialIcons";
import * as Speech from "expo-speech";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as XLSX from "xlsx";
import { styled } from "nativewind";
import * as ScreenOrientation from "expo-screen-orientation";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SCREEN_WIDTH = Dimensions.get("window").width;

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);
const StyledScrollView = styled(ScrollView);
const StyledTextInput = styled(TextInput);
const StyledSafeAreaView = styled(SafeAreaView);
const StyledAnimatedView = styled(Animated.View);

interface TextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  color?: string;
}

interface FormattedText {
  text: string;
  style: TextStyle;
}

interface Item {
  id: number;
  imageUrl: string | null;
  name: string;
  description: FormattedText[];
}

interface ExcelData {
  Image: string;
  Text: string;
  Highlighted: string;
  Style: string;
  backgroundVoice: string;
}

interface FolderItem {
  id: number;
  folderName: string;
  images: {
    imageUrl: string | null;
    name: string;
    description: FormattedText[];
    voiceText: string;
  }[];
}

export default function HomeScreen() {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingText, setEditingText] = useState("");
  const [selectedTextRange, setSelectedTextRange] = useState({
    start: 0,
    end: 0,
  });
  const [isPlaying, setIsPlaying] = useState<number | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const autoPlayTimeout = useRef<NodeJS.Timeout | null>(null);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    imageUrl: "",
  });
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<FolderItem | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editFolderModalVisible, setEditFolderModalVisible] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [isAddingContent, setIsAddingContent] = useState(false);

  const position = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        if (!editMode) {
          position.setValue(gesture.dx);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (!editMode) {
          if (Math.abs(gesture.dx) > SCREEN_WIDTH * 0.2) {
            const direction = gesture.dx > 0 ? -1 : 1;
            const newIndex = selectedIndex + direction;
            const maxLength = selectedFolder ? selectedFolder.images.length : 0;

            if (newIndex >= 0 && newIndex < maxLength) {
              Animated.timing(position, {
                toValue: -direction * SCREEN_WIDTH,
                duration: 300,
                useNativeDriver: true,
              }).start(() => {
                setSelectedIndex(newIndex);
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
        }
      },
    })
  ).current;

  const renderFormattedText = (formattedText: FormattedText[]) => {
    return formattedText.map((segment, index) => (
      <StyledText
        key={index}
        className={`${segment.style.bold ? "font-bold" : "font-normal"} ${
          segment.style.italic ? "italic" : "normal"
        } ${segment.style.underline ? "underline" : "none"}`}
        style={{
          ...(segment.style.fontSize
            ? { fontSize: segment.style.fontSize }
            : {}),
          ...(segment.style.color
            ? { color: segment.style.color }
            : { color: "#ffffff" }), // Default to white if no color specified
        }}
      >
        {segment.text}
      </StyledText>
    ));
  };

  const handlePlay = async (voiceText: string) => {
    try {
      // If currently playing, stop it
      if (isPlaying !== null) {
        await Speech.stop();
        setIsPlaying(null);
        return;
      }

      // If no voice text, don't play
      if (!voiceText || voiceText.trim() === "") {
        return;
      }

      // Start playing
      setIsPlaying(selectedIndex);

      // Play the voice and move to next slide when done
      await Speech.speak(voiceText, {
        onDone: () => {
          setIsPlaying(null);
          // Move to next slide if not at the end
          if (selectedFolder && selectedIndex < selectedFolder.images.length - 1) {
            handleNextImage();
          }
        },
        onError: () => {
          setIsPlaying(null);
        },
      });
    } catch (error) {
      console.error("Error playing voice:", error);
      setIsPlaying(null);
    }
  };

  const processExcelStyle = (styleName: string): TextStyle => {
    const style: TextStyle = {};
    const styleList = styleName
      .toLowerCase()
      .split(",")
      .map((s) => s.trim());

    if (styleList.includes("bold")) style.bold = true;
    if (styleList.includes("italic")) style.italic = true;
    if (styleList.includes("underline")) style.underline = true;

    // Add heading styles
    if (styleList.includes("h1")) {
      style.bold = true;
      style.fontSize = 32;
    } else if (styleList.includes("h2")) {
      style.bold = true;
      style.fontSize = 28;
    } else if (styleList.includes("h3")) {
      style.bold = true;
      style.fontSize = 24;
    } else if (styleList.includes("h4")) {
      style.bold = true;
      style.fontSize = 20;
    } else if (styleList.includes("h5")) {
      style.bold = true;
      style.fontSize = 18;
    } else if (styleList.includes("h6")) {
      style.bold = true;
      style.fontSize = 16;
    }

    // Add color styles with more visible colors
    if (styleList.includes("red")) style.color = "#ff4444";
    else if (styleList.includes("blue")) style.color = "#44aaff";
    else if (styleList.includes("green")) style.color = "#44ff44";
    else if (styleList.includes("yellow")) style.color = "#ffff44";
    else if (styleList.includes("purple")) style.color = "#ff44ff";
    else if (styleList.includes("pink")) style.color = "#ff88cc";
    else if (styleList.includes("orange")) style.color = "#ff8844";
    else if (styleList.includes("white")) style.color = "#ffffff";
    else if (styleList.includes("black")) style.color = "#000000";
    else if (styleList.includes("gray")) style.color = "#888888";
    else if (styleList.includes("cyan")) style.color = "#44ffff";
    else if (styleList.includes("lime")) style.color = "#88ff44";
    else if (styleList.includes("magenta")) style.color = "#ff44ff";

    return style;
  };

  // Add this function to generate random colors
  const getRandomColor = () => {
    const colors = [
      "#ff4444", // red
      "#44aaff", // blue
      "#44ff44", // green
      "#ffff44", // yellow
      "#ff44ff", // purple
      "#ff88cc", // pink
      "#ff8844", // orange
      "#44ffff", // cyan
      "#88ff44", // lime
      "#ff44ff", // magenta
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const createFormattedText = (
    text: string,
    highlightedText: string,
    style: string
  ): FormattedText[] => {
    if (!highlightedText) {
      return [{ text, style: {} }];
    }

    const parts = text.split(highlightedText);
    const formattedText: FormattedText[] = [];

    parts.forEach((part, index) => {
      if (part) {
        formattedText.push({ text: part, style: {} });
      }
      if (index < parts.length - 1) {
        // Apply random color to highlighted text
        formattedText.push({
          text: highlightedText,
          style: {
            ...processExcelStyle(style),
            color: getRandomColor(), // Always apply a random color to highlighted text
          },
        });
      }
    });

    return formattedText.length > 0 ? formattedText : [{ text, style: {} }];
  };

  const handleFolderUpload = async () => {
    try {
      setIsLoading(true); // Start loading

      // Pick all files from the folder
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
          "application/vnd.ms-excel", // xls
          "text/csv", // csv
          "image/png", // png
          "image/jpeg", // jpeg/jpg
        ],
        multiple: true,
      });

      if (result.canceled) {
        setIsLoading(false);
        return;
      }

      const excelFile = result.assets.find(
        (file) =>
          file.name.endsWith(".xlsx") ||
          file.name.endsWith(".xls") ||
          file.name.endsWith(".csv")
      );

      const imageFiles = result.assets.filter(
        (file) =>
          file.mimeType?.startsWith("image/") &&
          (file.name.endsWith(".png") ||
            file.name.endsWith(".jpg") ||
            file.name.endsWith(".jpeg"))
      );

      const newFolder: FolderItem = {
        id: Math.max(...folders.map((f) => f.id), 0) + 1,
        folderName: excelFile ? excelFile.name.split(".")[0] : "Image Folder",
        images: [],
      };

      if (excelFile && imageFiles.length > 0) {
        setIsLoading(true); // Ensure loading before processing the Excel file

        const excelContent = await FileSystem.readAsStringAsync(excelFile.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const workbook = XLSX.read(excelContent, { type: "base64" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const excelData: ExcelData[] = XLSX.utils.sheet_to_json(worksheet);

        const uniqueEntries = new Map();

        const processedEntries = excelData
          .map((entry) => {
            const matchingImage = imageFiles.find(
              (image) => image.name === entry.Image
            );

            const uniqueKey = `${entry.Image || "text-only"}-${
              entry.Text || ""
            }`;

            if (uniqueEntries.has(uniqueKey)) return null;

            const processedEntry = {
              imageUrl: matchingImage ? matchingImage.uri : null,
              name: entry.Image || "Untitled",
              description: createFormattedText(
                entry.Text || "",
                entry.Highlighted || "",
                entry.Style || ""
              ),
              voiceText: entry.backgroundVoice || entry.Text || "",
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
                    (segment) => segment && segment.text.trim() !== ""
                  )))
            );
          });

        newFolder.images = processedEntries;
        Alert.alert(
          "Success",
          `Folder uploaded successfully!\nFound ${
            processedEntries.length
          } unique entries, including ${
            processedEntries.filter((entry) => entry.imageUrl).length
          } with images.`
        );
      } else if (excelFile) {
        setIsLoading(true); // Ensure loading before processing the Excel file

        const excelContent = await FileSystem.readAsStringAsync(excelFile.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const workbook = XLSX.read(excelContent, { type: "base64" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const excelData: ExcelData[] = XLSX.utils.sheet_to_json(worksheet);

        const uniqueEntries = new Map();

        const processedEntries = excelData
          .map((entry) => {
            const uniqueKey = entry.Text || "";

            if (uniqueEntries.has(uniqueKey)) return null;

            const processedEntry = {
              imageUrl: null,
              name: entry.Image || "Untitled",
              description: createFormattedText(
                entry.Text || "",
                entry.Highlighted || "",
                entry.Style || ""
              ),
              voiceText: entry.backgroundVoice || entry.Text || "",
            };

            uniqueEntries.set(uniqueKey, processedEntry);
            return processedEntry;
          })
          .filter((entry): entry is NonNullable<typeof entry> => {
            return (
              entry !== null &&
              entry.description &&
              entry.description.some(
                (segment) => segment && segment.text.trim() !== ""
              )
            );
          });

        newFolder.images = processedEntries;
        Alert.alert(
          "Success",
          `Excel file uploaded successfully!\nFound ${processedEntries.length} unique text entries.`
        );
      } else if (imageFiles.length > 0) {
        setIsLoading(true); // Ensure loading before processing images

        const uniqueImages = new Map();

        const processedEntries = imageFiles
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
          .filter(
            (entry): entry is NonNullable<typeof entry> => entry !== null
          );

        newFolder.images = processedEntries;
        Alert.alert(
          "Success",
          `Images uploaded successfully!\nFound ${processedEntries.length} unique images.`
        );
      } else {
        Alert.alert(
          "Error",
          "No valid files found. Please upload images or an Excel file."
        );
        setIsLoading(false);
        return;
      }

      setFolders([...folders, newFolder]);
      setIsLoading(false); // End loading
    } catch (error) {
      setIsLoading(false); // End loading on error
      Alert.alert("Error", "Failed to process the files. Please try again.");
      console.error(error);
    }
  };

  const handleFolderPress = (folder: FolderItem) => {
    setSelectedFolder(folder);
    setModalVisible(true);
  };

  const handleNextImage = async () => {
    if (selectedFolder && selectedIndex < selectedFolder.images.length - 1) {
      await Speech.stop();
      setIsPlaying(null);
      setIsAutoPlaying(false);
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const handlePreviousImage = async () => {
    if (selectedIndex > 0) {
      await Speech.stop();
      setIsPlaying(null);
      setIsAutoPlaying(false);
      setSelectedIndex(selectedIndex - 1);
    }
  };

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
      console.error("Failed to rotate screen:", error);
      Alert.alert("Error", "Failed to rotate screen. Please try again.");
    }
  };

  // Set initial orientation
  useEffect(() => {
    const lockOrientation = async () => {
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP
        );
      } catch (error) {
        console.error("Failed to lock orientation:", error);
      }
    };

    lockOrientation();

    // Cleanup: Reset to portrait when component unmounts
    return () => {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      ).catch(console.error);
    };
  }, []);

  // Update auto-play function with a simpler approach
  const handleAutoPlay = async () => {
    if (!selectedFolder) return;

    setIsAutoPlaying(!isAutoPlaying);

    if (!isAutoPlaying) {
      // Start auto-play
      const playNextSlide = async () => {
        if (!isAutoPlaying || !selectedFolder) return;

        const currentSlide = selectedFolder.images[selectedIndex];
        const voiceText = currentSlide?.voiceText || "";

        try {
          if (voiceText.trim() !== "") {
            // If there's voice text, play it
            await Speech.speak(voiceText, {
              onDone: () => {
                // After voice is done, move to next slide
                if (selectedIndex < selectedFolder.images.length - 1) {
                  handleNextImage();
                  // Play next slide's voice if it exists
                  const nextSlide = selectedFolder.images[selectedIndex + 1];
                  if (nextSlide?.voiceText?.trim()) {
                    Speech.speak(nextSlide.voiceText, {
                      onDone: () => {
                        // Continue the cycle
                        if (selectedIndex < selectedFolder.images.length - 1) {
                          handleNextImage();
                          const nextNextSlide = selectedFolder.images[selectedIndex + 1];
                          if (nextNextSlide?.voiceText?.trim()) {
                            Speech.speak(nextNextSlide.voiceText);
                          }
                        } else {
                          setIsAutoPlaying(false);
                        }
                      },
                      onError: () => {
                        setIsAutoPlaying(false);
                      },
                    });
                  }
                } else {
                  setIsAutoPlaying(false);
                }
              },
              onError: () => {
                setIsAutoPlaying(false);
              },
            });
          } else {
            // If no voice text, wait 3 seconds then move to next slide
            setTimeout(() => {
              if (selectedIndex < selectedFolder.images.length - 1) {
                handleNextImage();
                // Play next slide's voice if it exists
                const nextSlide = selectedFolder.images[selectedIndex + 1];
                if (nextSlide?.voiceText?.trim()) {
                  Speech.speak(nextSlide.voiceText);
                }
              } else {
                setIsAutoPlaying(false);
              }
            }, 3000);
          }
        } catch (error) {
          console.error("Error in auto-play:", error);
          setIsAutoPlaying(false);
        }
      };

      // Start playing current slide
      playNextSlide();
    } else {
      // Stop auto-play
      await Speech.stop();
      setIsPlaying(null);
    }
  };

  // Cleanup auto-play on unmount or when modal closes
  useEffect(() => {
    return () => {
      if (isAutoPlaying) {
        Speech.stop();
      }
    };
  }, [isAutoPlaying]);

  // Update the renderImage function with safe checks
  const renderImage = (
    imageUrl: string | null,
    description: FormattedText[],
    voiceText: string
  ) => {
    if (!imageUrl) {
      return (
        <StyledView
          className={`${
            isLandscape ? "w-full h-full" : "w-full h-[80%] -mt-12"
          } bg-gray-800 justify-center items-center px-8`}
        >
          <StyledText className="text-white/90 text-center text-xl ml-10 mr-10 leading-8 tracking-wider">
            {renderFormattedText(description || [])}
          </StyledText>
        </StyledView>
      );
    }

    // Check if there's any description text with safe checks
    const hasDescription = (description || []).some(
      (segment) => segment?.text && segment.text.trim() !== ""
    );

    return (
      <StyledImage
        source={{ uri: imageUrl }}
        className={`${
          isLandscape
            ? hasDescription
              ? "w-1/2 h-full"
              : "w-full h-full"
            : "w-full h-[80%] -mt-12"
        }`}
        resizeMode="contain"
      />
    );
  };

  // Add function to handle folder edit
  const handleEditFolder = (folder: FolderItem) => {
    setEditingFolder(folder);
    setNewFolderName(folder.folderName);
    setEditFolderModalVisible(true);
  };

  // Add function to save folder changes
  const handleSaveFolderChanges = () => {
    if (!editingFolder) return;

    const updatedFolders = folders.map((folder) =>
      folder.id === editingFolder.id
        ? { ...folder, folderName: newFolderName }
        : folder
    );

    setFolders(updatedFolders);
    setEditFolderModalVisible(false);
    setEditingFolder(null);
  };

  // Add function to handle adding more content
  const handleAddContent = async () => {
    if (!editingFolder) return;

    try {
      setIsLoading(true);

      // Pick new files
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
          "text/csv",
          "image/png",
          "image/jpeg",
        ],
        multiple: true,
      });

      if (result.canceled) {
        setIsLoading(false);
        return;
      }

      const excelFile = result.assets.find(
        (file) =>
          file.name.endsWith(".xlsx") ||
          file.name.endsWith(".xls") ||
          file.name.endsWith(".csv")
      );

      const imageFiles = result.assets.filter(
        (file) =>
          file.mimeType?.startsWith("image/") &&
          (file.name.endsWith(".png") ||
            file.name.endsWith(".jpg") ||
            file.name.endsWith(".jpeg"))
      );

      let newEntries = [];

      if (excelFile && imageFiles.length > 0) {
        // Process Excel with images
        const excelContent = await FileSystem.readAsStringAsync(excelFile.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const workbook = XLSX.read(excelContent, { type: "base64" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const excelData: ExcelData[] = XLSX.utils.sheet_to_json(worksheet);

        newEntries = excelData
          .map((entry) => {
            const matchingImage = imageFiles.find(
              (image) => image.name === entry.Image
            );

            return {
              imageUrl: matchingImage ? matchingImage.uri : null,
              name: entry.Image || "Untitled",
              description: createFormattedText(
                entry.Text || "",
                entry.Highlighted || "",
                entry.Style || ""
              ),
              voiceText: entry.backgroundVoice || entry.Text || "",
            };
          })
          .filter(
            (entry) =>
              entry.imageUrl !== null ||
              entry.description.some((segment) => segment.text.trim() !== "")
          );
      } else if (excelFile) {
        // Process Excel only
        const excelContent = await FileSystem.readAsStringAsync(excelFile.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const workbook = XLSX.read(excelContent, { type: "base64" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const excelData: ExcelData[] = XLSX.utils.sheet_to_json(worksheet);

        newEntries = excelData
          .map((entry) => ({
            imageUrl: null,
            name: entry.Image || "Untitled",
            description: createFormattedText(
              entry.Text || "",
              entry.Highlighted || "",
              entry.Style || ""
            ),
            voiceText: entry.backgroundVoice || entry.Text || "",
          }))
          .filter((entry) =>
            entry.description.some((segment) => segment.text.trim() !== "")
          );
      } else if (imageFiles.length > 0) {
        // Process images only
        newEntries = imageFiles.map((image) => ({
          imageUrl: image.uri,
          name: image.name,
          description: [{ text: image.name, style: {} }],
          voiceText: image.name,
        }));
      }

      // Update the folder with new entries
      const updatedFolders = folders.map((folder) =>
        folder.id === editingFolder.id
          ? {
              ...folder,
              folderName: newFolderName,
              images: [...folder.images, ...newEntries],
            }
          : folder
      );

      setFolders(updatedFolders);
      Alert.alert(
        "Success",
        `Added ${newEntries.length} new entries to the folder.`
      );
      setEditFolderModalVisible(false);
      setEditingFolder(null);
    } catch (error) {
      console.error("Error adding content:", error);
      Alert.alert("Error", "Failed to add content. Please try again.");
    } finally {
      setIsLoading(false);
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
              <StyledView
                key={folder.id}
                className="mb-5 rounded-2xl bg-white overflow-hidden shadow-lg border border-gray-200/20"
              >
                <StyledView className="flex-row p-4">
                  <StyledView className="flex-1">
                    <StyledText className="text-xl font-bold mb-2 text-red-400 tracking-wider">
                      {folder.folderName}
                    </StyledText>
                    <StyledText className="text-base text-gray-500">
                      {folder.images.length} Slides
                    </StyledText>
                  </StyledView>
                  <StyledView className="flex-row items-center gap-3">
                    <StyledTouchableOpacity
                      className="w-10 h-10 rounded-full justify-center items-center bg-primary/10"
                      onPress={() => handleEditFolder(folder)}
                    >
                      <Icon name="edit" size={20} color="#4361ee" />
                    </StyledTouchableOpacity>
                    <StyledTouchableOpacity
                      className="w-10 h-10 rounded-full justify-center items-center bg-primary/10"
                      onPress={() => handleFolderPress(folder)}
                    >
                      <Icon name="folder" size={24} color="#4361ee" />
                    </StyledTouchableOpacity>
                  </StyledView>
                </StyledView>
              </StyledView>
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

            <StyledView className="mb-6">
              <StyledTouchableOpacity
                className="w-full bg-primary/10 py-3 rounded-xl flex-row justify-center items-center"
                onPress={handleAddContent}
              >
                <Icon name="add" size={24} color="#4361ee" className="mr-2" />
                <StyledText className="text-primary font-medium">
                  Add More Content
                </StyledText>
              </StyledTouchableOpacity>
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

      {/* Full Screen Modal */}
      <Modal
        animationType="fade"
        transparent={false}
        visible={modalVisible}
        onRequestClose={async () => {
          await Speech.stop();
          setIsPlaying(null);
          setIsAutoPlaying(false);
          if (isLandscape) {
            await ScreenOrientation.lockAsync(
              ScreenOrientation.OrientationLock.PORTRAIT_UP
            );
            setIsLandscape(false);
          }
          setModalVisible(false);
          setSelectedFolder(null);
        }}
      >
        <StyledSafeAreaView className="flex-1 bg-black ">
          <StyledView
            className={`flex-row justify-between  items-center  absolute top-0 left-0 right-0 z-10 ${
              isLandscape ? "p-5 pt-3" : "p-5 pt-10"
            } backdrop-blur`}
          >
            <StyledTouchableOpacity
              className="w-12 h-12 rounded-full justify-center items-center bg-black/50 border border-white/30"
              onPress={async () => {
                await Speech.stop();
                setIsPlaying(null);
                setIsAutoPlaying(false);
                if (isLandscape) {
                  await ScreenOrientation.lockAsync(
                    ScreenOrientation.OrientationLock.PORTRAIT_UP
                  );
                  setIsLandscape(false);
                }
                setModalVisible(false);
              }}
            >
              <Icon name="close" size={30} color="#fff" />
            </StyledTouchableOpacity>

            <StyledView className="flex-row gap-3">
              <StyledTouchableOpacity
                className="w-12 h-12 rounded-full justify-center items-center bg-white/20 border border-white/30"
                onPress={handleRotation}
              >
                <Icon
                  name={
                    isLandscape ? "screen-rotation" : "screen-lock-rotation"
                  }
                  size={24}
                  color="#fff"
                />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {selectedFolder && (
            <StyledAnimatedView
              className={`flex-1 justify-center  items-center w-full h-full bg-black ${
                isLandscape ? "flex-row" : ""
              }`}
              style={{
                transform: [{ translateX: position }],
              }}
              {...panResponder.panHandlers}
            >
              {/* Left Arrow */}
              {selectedIndex > 0 && (
                <StyledTouchableOpacity
                  className={`absolute ${
                    isLandscape
                      ? "left-4 top-1/2 -mt-6"
                      : "left-4 top-1/2 -mt-6"
                  } w-12 h-12 rounded-full bg-black/50 justify-center items-center border border-white/30 z-10`}
                  onPress={handlePreviousImage}
                >
                  <Icon name="chevron-left" size={36} color="#fff" />
                </StyledTouchableOpacity>
              )}

              {/* Right Arrow */}
              {selectedFolder &&
                selectedIndex < selectedFolder.images.length - 1 && (
                  <StyledTouchableOpacity
                    className={`absolute ${
                      isLandscape
                        ? "right-4 top-1/2 -mt-6"
                        : "right-4 top-1/2 -mt-6"
                    } w-12 h-12 rounded-full bg-black/50 justify-center items-center border border-white/30 z-10`}
                    onPress={handleNextImage}
                  >
                    <Icon name="chevron-right" size={36} color="#fff" />
                  </StyledTouchableOpacity>
                )}

              {renderImage(
                selectedFolder.images[selectedIndex]?.imageUrl,
                selectedFolder.images[selectedIndex]?.description || [],
                selectedFolder.images[selectedIndex]?.voiceText || ""
              )}

              {/* Description panel - show if there's an image and description */}
              {selectedFolder.images[selectedIndex]?.imageUrl &&
                (selectedFolder.images[selectedIndex]?.description || []).some(
                  (segment) => segment?.text && segment.text.trim() !== ""
                ) && (
                  <StyledView
                    className={`${
                      isLandscape
                        ? "w-1/2 h-full  justify-center p-6"
                        : "absolute bottom-0 left-0 right-0  p-6 "
                    } bg-black/75 backdrop-blur`}
                  >
                    <StyledText className="text-white/90 text-base leading-6 tracking-wider">
                      {renderFormattedText(
                        selectedFolder.images[selectedIndex]?.description || []
                      )}
                    </StyledText>
                  </StyledView>
                )}

              {/* Play Button - Fixed position for both modes */}
              <StyledTouchableOpacity
                className={`absolute bottom-8 right-8 w-12 h-12 rounded-full justify-center items-center ${
                  isPlaying === selectedIndex ? "bg-danger" : "bg-primary"
                }`}
                onPress={() =>
                  handlePlay(
                    selectedFolder.images[selectedIndex]?.voiceText || ""
                  )
                }
              >
                <Icon
                  name={
                    isPlaying === selectedIndex ? "volume-up" : "volume-down"
                  }
                  size={24}
                  color="#fff"
                />
              </StyledTouchableOpacity>

              {/* Auto-play Button */}
              <StyledTouchableOpacity
                className={`absolute bottom-8 right-24 w-12 h-12 rounded-full justify-center items-center ${
                  isAutoPlaying ? "bg-danger" : "bg-primary"
                }`}
                onPress={() => {
                  if (!isAutoPlaying) {
                    // Start auto-play
                    setIsAutoPlaying(true);
                    // Play current slide's voice if it exists
                    const currentSlide = selectedFolder?.images[selectedIndex];
                    if (currentSlide?.voiceText?.trim()) {
                      Speech.speak(currentSlide.voiceText, {
                        onDone: () => {
                          // After voice is done, move to next slide
                          if (selectedIndex < (selectedFolder?.images.length || 0) - 1) {
                            handleNextImage();
                            // Play next slide's voice if it exists
                            const nextSlide = selectedFolder?.images[selectedIndex + 1];
                            if (nextSlide?.voiceText?.trim()) {
                              Speech.speak(nextSlide.voiceText);
                            }
                          } else {
                            setIsAutoPlaying(false);
                          }
                        },
                        onError: () => {
                          setIsAutoPlaying(false);
                        },
                      });
                    } else {
                      // If no voice, wait 3 seconds then move to next slide
                      setTimeout(() => {
                        if (selectedIndex < (selectedFolder?.images.length || 0) - 1) {
                          handleNextImage();
                          // Play next slide's voice if it exists
                          const nextSlide = selectedFolder?.images[selectedIndex + 1];
                          if (nextSlide?.voiceText?.trim()) {
                            Speech.speak(nextSlide.voiceText);
                          }
                        } else {
                          setIsAutoPlaying(false);
                        }
                      }, 3000);
                    }
                  } else {
                    // Stop auto-play
                    setIsAutoPlaying(false);
                    Speech.stop();
                    setIsPlaying(null);
                  }
                }}
              >
                <Icon
                  name={isAutoPlaying ? "stop" : "play-arrow"}
                  size={24}
                  color="#fff"
                />
              </StyledTouchableOpacity>

              {/* Image Counter */}
              <StyledView
                className={`absolute ${
                  isLandscape
                    ? selectedFolder.images[selectedIndex]?.imageUrl
                      ? "bottom-4 right-[25%]"
                      : "bottom-4 self-center"
                    : "bottom-8 self-center"
                } bg-black/75 px-4 py-2 rounded-full border border-white/20`}
              >
                <StyledText className="text-white text-sm font-medium">
                  {selectedIndex + 1} / {selectedFolder.images.length}
                </StyledText>
              </StyledView>
            </StyledAnimatedView>
          )}

          {/* Add loading overlay */}
          {isLoading && (
            <StyledView className="absolute inset-0 bg-black/50 justify-center items-center z-50">
              <StyledView className="bg-white p-6 rounded-2xl shadow-xl">
                <StyledView className="w-16 h-16 mb-4 justify-center items-center">
                  <Icon
                    name="refresh"
                    size={32}
                    color="#4361ee"
                    className="animate-spin"
                  />
                </StyledView>
                <StyledText className="text-center text-base font-medium text-gray-700">
                  Processing folder...
                </StyledText>
              </StyledView>
            </StyledView>
          )}
        </StyledSafeAreaView>
      </Modal>
    </StyledView>
  );
}
