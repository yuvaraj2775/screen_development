export interface TextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  color?: string;
}

export interface FormattedText {
  text: string;
  style: TextStyle;
}

export interface Item {
  id: number;
  imageUrl: string | null;
  name: string;
  description: FormattedText[];
}

export interface ExcelData {
  Image: string;
  Text: string;
  Highlighted: string;
  Style: string;
  backgroundVoice: string;
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