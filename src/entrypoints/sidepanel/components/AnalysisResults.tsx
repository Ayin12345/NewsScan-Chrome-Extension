import React, { useState } from 'react';
import styles from '../styles/AnalysisResults.module.css';

interface AnalysisResult {
  provider: string;
  result: {
    credibility_score: number;
    credibility_summary: string;
    reasoning: string;
    evidence_sentences: Array<{
      quote: string;
      impact: string;
    }>;
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

const getScoreRange = (results: AnalysisResult[]): { min: number; max: number } => {
  if (results.length === 0) return { min: 0, max: 0 };
  const scores = results.map(r => r.result.credibility_score);
  return {
    min: Math.min(...scores),
    max: Math.max(...scores)
  };
};

const getAllEvidence = (results: AnalysisResult[]) => {
  const evidenceMap = new Map<string, { impact: string; providers: string[]; sentiment: 'positive' | 'negative' | 'neutral' }>();
  
  results.forEach(result => {
    if (result.result.evidence_sentences && Array.isArray(result.result.evidence_sentences)) {
      result.result.evidence_sentences.forEach(evidence => {
        const existing = evidenceMap.get(evidence.quote);
        // Determine sentiment based on impact text
        const sentiment = evidence.impact.toLowerCase().includes('concern') || 
                         evidence.impact.toLowerCase().includes('problem') ||
                         evidence.impact.toLowerCase().includes('issue') ? 'negative' : 'positive';
        
        if (existing) {
          existing.providers.push(result.provider);
        } else {
          evidenceMap.set(evidence.quote, {
            impact: evidence.impact,
            providers: [result.provider],
            sentiment
          });
        }
      });
    }
  });

  return Array.from(evidenceMap.entries())
    .map(([quote, data]) => ({
      quote,
      impact: data.impact,
      providers: data.providers,
      sentiment: data.sentiment
    }))
    .sort((a, b) => b.providers.length - a.providers.length);
};

const getAllLinks = (results: AnalysisResult[]): string[] => {
  const uniqueLinks = new Set<string>();
  results.forEach(result => {
    if (result.result.supporting_links && Array.isArray(result.result.supporting_links)) {
      result.result.supporting_links.forEach(link => uniqueLinks.add(link));
    }
  });
  return Array.from(uniqueLinks);
};

const getScoreCategory = (score: number) => {
  if (score >= 80) return { text: 'Excellent', class: styles.scoreExcellent };
  if (score >= 60) return { text: 'Good', class: styles.scoreGood };
  if (score >= 40) return { text: 'Fair', class: styles.scoreFair };
  if (score >= 20) return { text: 'Poor', class: styles.scorePoor };
  return { text: 'Very Poor', class: styles.scoreVeryPoor };
};

const getBalancedSummary = (results: AnalysisResult[]): string => {
  const avgScore = calculateAverageScore(results);
  const mainResponse = results.reduce((closest, current) => {
    const currentDiff = Math.abs(current.result.credibility_score - avgScore);
    const closestDiff = Math.abs(closest.result.credibility_score - avgScore);
    return currentDiff < closestDiff ? current : closest;
  }, results[0]);

  return mainResponse.result.credibility_summary;
};

type TabType = 'overview' | 'evidence' | 'analysis' | 'sources';

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({ 
  analysis
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  if (!analysis || !Array.isArray(analysis) || analysis.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <p>No analysis results available.</p>
        </div>
      </div>
    );
  }
  
  const averageScore = calculateAverageScore(analysis);
  const scoreRange = getScoreRange(analysis);
  const allEvidence = getAllEvidence(analysis);
  const allLinks = getAllLinks(analysis);
  const scoreCategory = getScoreCategory(averageScore);
  const balancedSummary = getBalancedSummary(analysis);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className={styles.overviewContent}>
            <div className={styles.summaryCard}>
              <p className={styles.summaryText}>{balancedSummary}</p>
            </div>
            
            <div className={styles.quickStats}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{analysis.length}</div>
                <div className={styles.statLabel}>AI Models</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{allEvidence.length}</div>
                <div className={styles.statLabel}>Key Quotes</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{allLinks.length}</div>
                <div className={styles.statLabel}>Sources</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{scoreRange.min}-{scoreRange.max}</div>
                <div className={styles.statLabel}>Score Range</div>
              </div>
            </div>
          </div>
        );

      case 'evidence':
        return (
          <div className={styles.evidenceList}>
            {allEvidence.map((evidence, idx) => (
              <div key={idx} className={`${styles.evidenceCard} ${styles[evidence.sentiment]}`}>
                <div className={styles.quote}>{evidence.quote}</div>
                <div className={styles.impact}>{evidence.impact}</div>
                <div className={styles.providers}>
                  Cited by: {evidence.providers.join(', ')}
                </div>
              </div>
            ))}
          </div>
        );

      case 'analysis':
        return (
          <div className={styles.analysisContent}>
            {analysis.map((result, idx) => (
              <div key={idx} className={styles.aiCard}>
                <div className={styles.aiHeader}>
                  <div className={styles.aiName}>{result.provider}</div>
                  <div className={styles.aiScore}>{result.result.credibility_score}/100</div>
                </div>
                <div className={styles.aiContent}>
                  <p className={styles.aiReasoning}>
                    {result.result.reasoning || 'No detailed reasoning available'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        );

      case 'sources':
        return (
          <div className={styles.sourcesList}>
            {allLinks.length > 0 ? (
              allLinks.map((link, idx) => (
                <div key={idx} className={styles.sourceCard}>
                  {link.startsWith('http') ? (
                    <a 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open(link, '_blank');
                      }}
                      className={styles.sourceLink}
                    >
                      {link}
                    </a>
                  ) : (
                    <span className={styles.sourceLink}>{link}</span>
                  )}
                </div>
              ))
            ) : (
              <p style={{ color: '#5f6368', textAlign: 'center', padding: '40px' }}>
                No sources available for verification.
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      {/* Left Side - Score Display */}
      <div className={`${styles.scoreSection} ${scoreCategory.class}`}>
        <div 
          className={styles.scoreRing}
          style={{
            '--score-percentage': averageScore
          } as React.CSSProperties}
        >
          <div className={styles.scoreValue}>{averageScore}</div>
        </div>
        <div className={styles.scoreLabel}>{scoreCategory.text}</div>
        <div className={styles.scoreRange}>Range: {scoreRange.min}-{scoreRange.max}</div>
      </div>

      {/* Right Side - Navigation & Content */}
      <div className={styles.mainSection}>
        <div className={styles.navigation}>
          <button 
            className={`${styles.navTab} ${activeTab === 'overview' ? styles.active : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`${styles.navTab} ${activeTab === 'evidence' ? styles.active : ''}`}
            onClick={() => setActiveTab('evidence')}
          >
            Evidence ({allEvidence.length})
          </button>
          <button 
            className={`${styles.navTab} ${activeTab === 'analysis' ? styles.active : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            Analysis ({analysis.length})
          </button>
          <button 
            className={`${styles.navTab} ${activeTab === 'sources' ? styles.active : ''}`}
            onClick={() => setActiveTab('sources')}
          >
            Sources ({allLinks.length})
          </button>
        </div>

        <div className={styles.contentArea}>
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}; 