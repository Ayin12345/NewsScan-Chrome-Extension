import React from 'react';
import styles from '../styles/AnalysisResults.module.css';

interface AnalysisResult {
  provider: string;
  result: {
    credibility_score: number;
    reasoning: string;
    supporting_links: string[];
  };
}

interface AnalysisResultsProps {
  analysis: AnalysisResult[];
  selectedProvider: string;
  onProviderSelect: (provider: string) => void;
}

const calculateAverageScore = (results: AnalysisResult[]): number => {
  if (results.length === 0) return 0;
  const sum = results.reduce((acc, curr) => acc + curr.result.credibility_score, 0);
  return Math.round(sum / results.length);
};

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({ 
  analysis, 
  selectedProvider, 
  onProviderSelect 
}) => {
  const getSelectedAnalysis = () => {
    return analysis.find(result => result.provider === selectedProvider);
  };

  return (
    <div className={styles.container}>
      <h2>Analysis Results</h2>
      <div className={styles.scoreContainer}>
        <h3>Overall Credibility Score</h3>
        <span className={styles.scoreValue}>
          {calculateAverageScore(analysis)}/100
        </span>
      </div>

      <div>
        <h3>AI Responses</h3>
        <select 
          value={selectedProvider}
          onChange={(e) => onProviderSelect(e.target.value)}
          className={styles.providerSelect}
        >
          <option value="">Select an AI Provider</option>
          {analysis.map((result, idx) => (
            <option key={idx} value={result.provider}>
              {result.provider}
            </option>
          ))}
        </select>

        {selectedProvider && getSelectedAnalysis() && (
          <div className={styles.resultContainer}>
            <div className={styles.section}>
              <strong>Credibility Score: </strong>
              <span>{getSelectedAnalysis()?.result.credibility_score}/100</span>
            </div>
            <div className={styles.section}>
              <strong>Reasoning: </strong>
              <p>{getSelectedAnalysis()?.result.reasoning}</p>
            </div>
            <div>
              <strong>Supporting Links: </strong>
              <ul className={styles.linkList}>
                {getSelectedAnalysis()?.result.supporting_links.map((link, linkIdx) => (
                  <li key={linkIdx}>
                    <a 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open(link, '_blank');
                      }}
                      className={styles.link}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 