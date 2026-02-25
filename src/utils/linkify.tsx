import React from 'react';

// URL detection regex pattern
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;

/**
 * Convert plain text with URLs into React elements with clickable links
 * @param text - The text to process
 * @returns Array of React elements (text and links)
 */
export function linkifyText(text: string): React.ReactNode[] {
  if (!text) return [];
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  
  // Reset regex lastIndex to ensure we start from the beginning
  URL_REGEX.lastIndex = 0;
  
  while ((match = URL_REGEX.exec(text)) !== null) {
    const url = match[0];
    const startIndex = match.index;
    
    // Add text before the URL
    if (startIndex > lastIndex) {
      parts.push(text.slice(lastIndex, startIndex));
    }
    
    // Add the clickable link
    parts.push(
      <a
        key={`link-${startIndex}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-green-600 hover:text-green-800 hover:underline break-all"
      >
        {url}
      </a>
    );
    
    lastIndex = startIndex + url.length;
  }
  
  // Add remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts.length > 0 ? parts : [text];
}

/**
 * Convert a paragraph with URLs into a React element with clickable links
 * @param paragraph - The paragraph text to process
 * @param index - Index for React key
 * @returns React paragraph element with linkified content
 */
export function linkifyParagraph(paragraph: string, index: number): React.ReactElement {
  const linkifiedContent = linkifyText(paragraph);
  
  return (
    <p key={index} className="mb-2 last:mb-0">
      {linkifiedContent}
    </p>
  );
}











