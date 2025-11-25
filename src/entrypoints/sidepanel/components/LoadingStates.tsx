import React from 'react';
import styles from '../styles/App.module.css';

interface AnalysisLoadingProps {}

export const AnalysisLoadingState: React.FC<AnalysisLoadingProps> = () => (
  <div className={styles.analysisLoadingState}>
    <div className={styles.analysisLoadingContent}>
      <h2 className={styles.analysisLoadingTitle}>
        Analyzing Content
      </h2>
      <p className={styles.analysisLoadingSubtitle}>
        Please wait while we process and evaluate this content
      </p>
      <div className={styles.modernSpinner}>
        <div className={styles.spinnerRing}></div>
        <div className={styles.spinnerRing}></div>
        <div className={styles.spinnerRing}></div>
      </div>
    </div>
  </div>
);

interface InitialLoadingProps {}

export const InitialLoadingState: React.FC<InitialLoadingProps> = () => (
  <div className={styles.analysisLoadingState}>
    <div className={styles.analysisLoadingContent}>
      <h2 className={styles.analysisLoadingTitle}>
        Loading Article
      </h2>
      <p className={styles.analysisLoadingSubtitle}>
        Please wait while we initialize the article
      </p>
      <div className={styles.modernSpinner}>
        <div className={styles.spinnerRing}></div>
        <div className={styles.spinnerRing}></div>
        <div className={styles.spinnerRing}></div>
      </div>
    </div>
  </div>
);

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
  canRetry: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry, canRetry }) => (
  <div className={styles.analysisLoadingState} style={{
    background: 'linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%)'
  }}>
    <div className={styles.analysisLoadingContent}>
      <h2 className={styles.analysisLoadingTitle} style={{ color: '#dc2626' }}>
        Analysis Failed
      </h2>
      <p className={styles.analysisLoadingSubtitle} style={{ color: '#7f1d1d' }}>
        {error || "Unable to analyze this page"}
      </p>
      {canRetry && (
        <button 
          className={styles.errorActionButton} 
          onClick={onRetry}
          style={{
            marginTop: '18px',
            padding: '12px 24px',
            backgroundColor: '#f87171',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#f87171')}
        >
          Try Again
        </button>
      )}
    </div>
  </div>
);
