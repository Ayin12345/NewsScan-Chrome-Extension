import React from 'react';
import styles from '../styles/PageDetails.module.css';

interface PageDetailsProps {
  pageInfo: {
    title: string;
    content: string;
    url: string;
    wordCount: number;
  };
  isExpanded: boolean;
  onToggle: () => void;
}

export const PageDetails: React.FC<PageDetailsProps> = ({ pageInfo, isExpanded, onToggle }) => {
  return (
    <div className={styles.container}>
      <button 
        onClick={onToggle}
        className={styles.toggleButton}
      >
        {isExpanded ? '▼' : '▶'} Page Details
      </button>
      
      {isExpanded && (
        <div className={styles.detailsContainer}>
          <div className={styles.section}>
            <strong>URL: </strong>
            <span><a href={pageInfo.url}>{pageInfo.url}</a></span>
          </div>
          <div className={styles.section}>
            <strong>Word Count: </strong>
            <span>{pageInfo.wordCount || 'No word count found'}</span>
          </div>
          <div>
            <strong>Content:</strong>
            <p className={styles.content}>
              {pageInfo.content || 'No content found'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}; 