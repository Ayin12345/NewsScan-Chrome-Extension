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

  return (
    <div className={styles.container}>
      <div className={styles.detailsContainer}>
        <div className={styles.metaInfo}>
          <div className={styles.section}>
            <strong>Word Count: </strong>
            <span>{pageInfo.wordCount || 'No word count found'}</span>
          </div>
          <div className={styles.section}>
            <strong>URL: </strong>
            <span><a href={pageInfo.url} target="_blank" rel="noopener noreferrer">{pageInfo.url}</a></span>
          </div>
        </div>

        <div className={styles.contentSection}>
          <button 
            className={styles.contentToggle}
            onClick={() => setIsContentExpanded(!isContentExpanded)}
          >
            <span className={styles.toggleIcon}>{isContentExpanded ? '▼' : '▶'}</span>
            <strong>Content</strong>
          </button>
          
          {isContentExpanded && (
            <p className={styles.content}>
              {pageInfo.content || 'No content found'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}; 