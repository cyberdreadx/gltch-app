import React from 'react';
import { Link } from 'react-router-dom';

export interface TextPart {
  type: 'text' | 'hashtag';
  content: string;
}

export const parseHashtags = (text: string): TextPart[] => {
  const parts: TextPart[] = [];
  const hashtagRegex = /#[a-zA-Z0-9_]+/g;
  let lastIndex = 0;
  let match;

  while ((match = hashtagRegex.exec(text)) !== null) {
    // Add text before hashtag
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      });
    }
    
    // Add hashtag
    parts.push({
      type: 'hashtag',
      content: match[0]
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex)
    });
  }
  
  return parts;
};

export const renderTextWithHashtags = (text: string): React.ReactNode[] => {
  const parts = parseHashtags(text);
  
  return parts.map((part, index) => {
    if (part.type === 'hashtag') {
      const hashtag = part.content.slice(1); // Remove the # symbol
      return React.createElement(Link, {
        key: index,
        to: `/hashtag/${hashtag}`,
        className: "text-primary hover:text-primary/80 font-medium transition-colors duration-200"
      }, part.content);
    }
    return React.createElement('span', { key: index }, part.content);
  });
};