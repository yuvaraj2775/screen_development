import { TextStyle, FormattedText } from '../types';

export const processExcelStyle = (styleName: string): TextStyle => {
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

export const getRandomColor = () => {
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

export const createFormattedText = (
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
      formattedText.push({
        text: highlightedText,
        style: {
          ...processExcelStyle(style),
          color: getRandomColor(),
        },
      });
    }
  });

  return formattedText.length > 0 ? formattedText : [{ text, style: {} }];
}; 