import React from 'react';
import styles from '../styles/FailedProviders.module.css';

interface FailedProvidersProps {
  providers: string[];
}

export const FailedProviders: React.FC<FailedProvidersProps> = ({ providers }) => {
  if (providers.length === 0) return null;

  return (
    <div>
      <h2>Failed Providers</h2>
      {providers.map((provider, idx) => (
        <div key={idx}>
          <h3>{provider}</h3>
          <p className={styles.errorMessage}>Failed to analyze</p>
        </div>
      ))}
    </div>
  );
}; 