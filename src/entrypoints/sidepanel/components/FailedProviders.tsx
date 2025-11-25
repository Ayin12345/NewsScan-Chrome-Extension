import React from 'react';
import styles from '../styles/FailedProviders.module.css';
import { FailedProvider } from '../../../types/analysis';

interface FailedProvidersProps {
  providers: FailedProvider[];
}

export const FailedProviders: React.FC<FailedProvidersProps> = ({ providers }) => {
  if (providers.length === 0) return null;

  return (
    <div className={styles.container}>
      <h2>Failed Providers</h2>
      {providers.map((failedProvider, idx) => {
        // Handle both old format (string) and new format (object) for backward compatibility
        const provider = typeof failedProvider === 'string' ? failedProvider : failedProvider.provider;
        const error = typeof failedProvider === 'string' ? 'Failed to analyze' : (failedProvider.error || 'Failed to analyze');
        
        return (
          <div key={idx} className={styles.providerItem}>
            <div className={styles.providerName}>{provider}</div>
            <p className={styles.errorMessage}>{error}</p>
          </div>
        );
      })}
    </div>
  );
}; 