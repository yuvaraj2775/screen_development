import { TextStyle as RNTextStyle } from 'react-native';

export interface TextStyle extends RNTextStyle {
  highlighted?: boolean;
  bold?: boolean;
  italic?: boolean;
  textDecorationLine?: 'underline' | 'none';
  fontSize?: number;
}

export interface FormattedText {
  text: string;
  style: TextStyle;
}

export interface ExcelData {
  Image: string;
  Text: string;
  Highlighted: string;
  Style: string;
  backgroundVoice?: string;
}

export interface FolderItem {
  id: number;
  folderName: string;
  images: {
    imageUrl: string | null;
    name: string;
    description: FormattedText[];
    voiceText: string;
  }[];
} 