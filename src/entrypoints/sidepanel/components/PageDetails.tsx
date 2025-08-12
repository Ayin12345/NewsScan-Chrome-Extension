import React, { useState } from 'react';
import styles from '../styles/PageDetails.module.css';

interface PageDetailsProps {
  pageInfo: {
    title: string;
    content: string;
    url: string;
    wordCount: number;
  };
}

export const PageDetails: React.FC<PageDetailsProps> = ({ pageInfo }) => {
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  // Calculate content quality metrics
  const getContentQuality = () => {
    const wordCount = pageInfo.wordCount || 0;
    if (wordCount >= 500) return { score: 'Excellent', color: '#137333', bg: '#e6f4ea' };
    if (wordCount >= 200) return { score: 'Good', color: '#1a73e8', bg: '#e8f0fe' };
    if (wordCount >= 100) return { score: 'Fair', color: '#f57c00', bg: '#fff3e0' };
    return { score: 'Poor', color: '#d93025', bg: '#fce8e6' };
  };

  const getContentLength = () => {
    const wordCount = pageInfo.wordCount || 0;
    if (wordCount >= 800) return { score: 'Long', color: '#137333', bg: '#e6f4ea' };
    if (wordCount >= 300) return { score: 'Medium', color: '#1a73e8', bg: '#e8f0fe' };
    return { score: 'Short', color: '#f57c00', bg: '#fff3e0' };
  };

  const getRealSentenceCount = () => {
    const content = pageInfo.content || '';
    if (!content) return 0;
    
    // Handle common abbreviations that shouldn't end sentences
    let processedContent = content
      .replace(/\b(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Sr\.|Jr\.|Inc\.|Corp\.|Ltd\.|Co\.|vs\.|etc\.|i\.e\.|e\.g\.|U\.S\.|U\.K\.|Ph\.D\.|M\.D\.|B\.A\.|M\.A\.)\s+/gi, '$1<ABBR>')
      .replace(/\b(\d+)\.(\d+)\s+/g, '$1<DECIMAL>$2'); // Handle decimal numbers
    
    // Split by sentence endings: . ! ? followed by space or end of string
    const sentences = processedContent
      .replace(/([.!?])\s*(?=[A-Z])/g, '$1|') // Split on sentence endings followed by capital letters
      .replace(/([.!?])\s*$/g, '$1|') // Handle sentence at end of text
      .split('|')
      .filter(sentence => sentence.trim().length > 0) // Remove empty sentences
      .filter(sentence => {
        const trimmed = sentence.trim();
        // Skip very short fragments that aren't real sentences
        return trimmed.length > 10 && 
               trimmed.split(' ').length > 2 &&
               /[.!?]$/.test(trimmed) && // Must end with sentence punctuation
               !trimmed.includes('<ABBR>') && // Skip if it contains our abbreviation marker
               !trimmed.includes('<DECIMAL>'); // Skip if it contains our decimal marker
      });
    
    return sentences.length;
  };

  const contentQuality = getContentQuality();
  const contentLength = getContentLength();

  // Get content snippet (reduced to 750 characters to ensure no scroll)
  const contentSnippet = pageInfo.content 
    ? pageInfo.content.substring(0, 750).trim() + '...' 
    : 'No content available';

  return (
    <div className={styles.container}>
      {/* Metrics Cards */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricValue}>{pageInfo.wordCount || 0}</div>
          <div className={styles.metricLabel}>Words</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricValue}>{getRealSentenceCount()}</div>
          <div className={styles.metricLabel}>Sentences</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricValue} style={{ color: contentQuality.color }}>
            {contentQuality.score}
          </div>
          <div className={styles.metricLabel}>Quality</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricValue} style={{ color: contentLength.color }}>
            {contentLength.score}
          </div>
          <div className={styles.metricLabel}>Length</div>
        </div>
      </div>

      {/* URL Section */}
      <div className={styles.urlSection}>
        <div className={styles.urlLabel}>Source URL</div>
        <a href={pageInfo.url} target="_blank" rel="noopener noreferrer" className={styles.urlLink}>
          {pageInfo.url}
        </a>
      </div>

      {/* Interactive Content Preview */}
      <div 
        className={styles.contentPreview}
        data-expanded={isContentExpanded}
      >
        <div className={styles.contentHeader}>
          <h3 className={styles.contentTitle}>Article Preview</h3>
          <button 
            className={styles.expandButton}
            onClick={() => setIsContentExpanded(!isContentExpanded)}
          >
            {isContentExpanded ? 'Show Less' : 'Show More'}
          </button>
        </div>
        
        <div className={styles.contentSnippet}>
          {isContentExpanded ? (
            <p className={styles.fullContent}>{pageInfo.content || 'No content found'}</p>
          ) : (
            <p className={styles.truncatedContent}>{contentSnippet}</p>
          )}
        </div>
      </div>
    </div>
  );
}; 