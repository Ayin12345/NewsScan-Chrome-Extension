import React, { useEffect, useState } from 'react';
import styles from '../styles/AnalysisResults.module.css';
import { getStorage } from '../../../utils/storage';

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
  onNewAnalysis: () => void;
  isViewingFromRecent?: boolean;
  pageTitle?: string;
  onLoadAnalysisForUrl?: (url: string, timestamp?: number) => void;
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

  // Return evidence in logical order (grouped by provider agreement)
  return Array.from(evidenceMap.entries())
    .map(([quote, data]) => ({
      quote,
      impact: data.impact,
      providers: data.providers,
      sentiment: data.sentiment
    }))
    .sort((a, b) => b.providers.length - a.providers.length); // Sort by provider count (most agreed upon first)
};

const getAllLinks = (results: AnalysisResult[]): string[] => {
  const uniqueLinks = new Set<string>();
  
  results.forEach((result) => {
    if (result.result.supporting_links && Array.isArray(result.result.supporting_links)) {
      result.result.supporting_links.forEach(link => {
        uniqueLinks.add(link);
      });
    }
  });
  
  return Array.from(uniqueLinks);
};

const getScoreCategory = (score: number) => {
  if (score >= 90) return { text: 'Excellent', class: styles.scoreExcellent };
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

type TabType = 'analysis' | 'evidence' | 'sources' | 'history';

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({ 
  analysis,
  selectedProvider,
  onProviderSelect,
  onNewAnalysis,
  isViewingFromRecent = false,
  pageTitle,
  onLoadAnalysisForUrl
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('analysis');
  const [history, setHistory] = useState<Array<{ title: string; url: string; timestamp: number; score?: number; fullAnalysis?: any; pageInfo?: any; failedProviders?: string[] }>>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await getStorage('recentAnalyses');
        
        if (Array.isArray(list)) {
          const processedHistory = list
            .slice(0, 10)
            .map((i: any) => ({
              title: i.title,
              url: i.url,
              timestamp: i.timestamp,
              score: i.score,
              fullAnalysis: i.fullAnalysis,
              pageInfo: i.pageInfo,
              failedProviders: i.failedProviders || []
            }));
          
          setHistory(processedHistory);
        } else {
          setHistory([]);
        }
      } catch (e) {
        console.error('Error loading history:', e);
        setHistory([]);
      }
    };
    load();
  }, []);
  
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

  // Filter out error messages that aren't actual sources
  const validSources = allLinks.filter(link => 
    link && 
    typeof link === 'string' &&
    link.trim().length > 0 &&
    !link.includes('Search timed out') && 
    !link.includes('Unable to verify') && 
    !link.includes('Error accessing') &&
    !link.includes('No verification sources found')
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'evidence':
        return (
          <div className={styles.evidenceList}>
            {allEvidence.length > 0 ? (
              allEvidence.map((evidence, idx) => (
                <div key={idx} className={`${styles.evidenceCard} ${styles[evidence.sentiment]}`}>
                  <div className={styles.quote}>{evidence.quote}</div>
                  <div className={styles.impact}>{evidence.impact}</div>
                  <div className={styles.providers}>
                    Cited by: {evidence.providers.join(', ')}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: '#5f6368', textAlign: 'center', padding: '40px' }}>
                No evidence available.
              </p>
            )}
          </div>
        );

      case 'analysis':
        return (
          <div className={styles.analysisContent}>
            {analysis.length > 0 ? (
              analysis.map((result, idx) => (
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
              ))
            ) : (
              <p style={{ color: '#5f6368', textAlign: 'center', padding: '40px' }}>
                No analysis available.
              </p>
            )}
          </div>
        );

      case 'sources':
        try {
          return (
            <div className={styles.sourcesList}>
              {validSources.length > 0 ? (
              validSources.map((link, idx) => {
                // Extract domain for display
                let domain = '';
                try { 
                  domain = new URL(link).hostname.replace(/^www\./, ''); 
                } catch {}
                
                // Determine source quality indicator
                const getQualityIndicator = (url: string) => {
                  const urlLower = url.toLowerCase();
                  if (urlLower.includes('factcheck.org') || urlLower.includes('snopes.com') || urlLower.includes('politifact.com')) {
                    return { text: 'Fact Check', class: styles.sourceFactCheck };
                  }
                  if (urlLower.includes('reuters.com') || urlLower.includes('ap.org') || urlLower.includes('bbc.com')) {
                    return { text: 'News', class: styles.sourceNews };
                  }
                  if (urlLower.includes('.edu') || urlLower.includes('researchgate.net')) {
                    return { text: 'Academic', class: styles.sourceAcademic };
                  }
                  if (urlLower.includes('.gov')) {
                    return { text: 'Government', class: styles.sourceGovernment };
                  }
                  return { text: 'Source', class: styles.sourceGeneral };
                };
                
                const quality = getQualityIndicator(link);
                
                return (
                  <div key={idx} className={styles.sourceCard}>
                    <div className={styles.sourceHeader}>
                      <span className={quality.class}>{quality.text}</span>
                      {domain && <span className={styles.sourceDomain}>{domain}</span>}
                    </div>
                    <a 
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.sourceLink}
                      title="Click to open in new tab"
                    >
                      {link}
                    </a>
                    <div className={styles.sourceContext}>
                      <span className={styles.sourceContextText}>
                        Related article for verification
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p style={{ color: '#5f6368', textAlign: 'center', padding: '40px' }}>
                No related articles found.
              </p>
            )}
          </div>
        );
        } catch (e) {
          console.error('Error in sources tab:', e);
          return (
            <div className={styles.sourcesList}>
              <p style={{ color: '#d93025', textAlign: 'center', padding: '40px' }}>
                Error loading related articles.
              </p>
            </div>
          );
        }

      case 'history':
        try {
          return (
          <div className={styles.historyList}>
            {history.length === 0 ? (
              <p style={{ color: '#5f6368', textAlign: 'center', padding: '40px' }}>
                No previous analyses yet.
              </p>
            ) : (
              history.map((h, idx) => {
                const formatRelativeTime = (ts: number) => {
                  const diff = Date.now() - ts;
                  const mins = Math.floor(diff / 60000);
                  if (mins < 1) return 'just now';
                  if (mins < 60) return `${mins}m ago`;
                  const hrs = Math.floor(mins / 60);
                  if (hrs < 24) return `${hrs}h ago`;
                  const days = Math.floor(hrs / 24);
                  if (days < 7) return `${days}d ago`;
                  return new Date(ts).toLocaleDateString();
                };

                let hostname = '';
                try { hostname = new URL(h.url).hostname.replace(/^www\./, ''); } catch {}

                return (
                  <div key={`${h.url}-${h.timestamp}-${idx}`} className={styles.historyItem}>
                    <div className={styles.historyMain}>
                      <button
                        className={styles.historyTitle}
                        title={h.title}
                        onClick={() => {
                          // Use the loadAnalysisForUrl function passed as prop
                          if (onLoadAnalysisForUrl) {
                            onLoadAnalysisForUrl(h.url, h.timestamp);
                          } else {
                            // Fallback: open in new tab
                            window.open(h.url, '_blank');
                          }
                        }}
                      >
                        {h.title}
                      </button>
                      {typeof h.score === 'number' && (
                        <span className={styles.historyScore}>{h.score}</span>
                      )}
                    </div>
                    <div className={styles.historyMeta}>
                      {hostname && <span className={styles.historyDomain}>{hostname}</span>}
                      <span>• {formatRelativeTime(h.timestamp)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );
        } catch (e) {
          console.error('Error in history tab:', e);
          return (
            <div className={styles.historyList}>
              <p style={{ color: '#d93025', textAlign: 'center', padding: '40px' }}>
                Error loading history.
              </p>
            </div>
          );
        }

      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      {/* Hero Score Section - Top Center */}
      <div className={`${styles.scoreSection} ${scoreCategory.class}`}>
        {averageScore >= 5 ? (
          <div 
            className={styles.scoreRing}
            style={{
              '--score-percentage': averageScore
            } as React.CSSProperties}
          >
            <div className={styles.scoreValue}>{averageScore}</div>
          </div>
        ) : (
          <div className={styles.scoreRingEmpty}>
            <div className={styles.scoreValueEmpty}>{averageScore}</div>
          </div>
        )}
        <div className={styles.scoreLabel}>{scoreCategory.text}</div>
        {scoreRange.min === scoreRange.max ? (
          <div className={styles.scoreRange}>Score: {scoreRange.min}</div>
        ) : (
          <div className={styles.scoreRange}>Range: {scoreRange.min}-{scoreRange.max}</div>
        )}
        {pageTitle && <div className={styles.pageTitle}>{pageTitle}</div>}
      </div>

      {/* Horizontal Stats Bar */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{analysis.length}</div>
          <div className={styles.statLabel}>AI Models</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{allEvidence.length}</div>
          <div className={styles.statLabel}>Key Quotes</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{validSources.length}</div>
          <div className={styles.statLabel}>{validSources.length === 1 ? 'Related' : 'Related'}</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>
            {scoreRange.min === scoreRange.max ? scoreRange.min : `${scoreRange.min}-${scoreRange.max}`}
          </div>
          <div className={styles.statLabel}>
            {scoreRange.min === scoreRange.max ? 'Score' : 'Score Range'}
          </div>
        </div>
      </div>

      {/* Main Content Section */}
      <div className={styles.mainSection}>
        <div className={styles.navigation}>
          <button 
            className={`${styles.navTab} ${activeTab === 'analysis' ? styles.active : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            Analysis
          </button>
          <button 
            className={`${styles.navTab} ${activeTab === 'evidence' ? styles.active : ''}`}
            onClick={() => setActiveTab('evidence')}
          >
            Evidence
          </button>
          <button 
            className={`${styles.navTab} ${activeTab === 'sources' ? styles.active : ''}`}
            onClick={() => setActiveTab('sources')}
          >
            Related
          </button>
          <button 
            className={`${styles.navTab} ${activeTab === 'history' ? styles.active : ''}`}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
        </div>

        <div className={styles.contentArea}>
          {renderTabContent()}
        </div>
      </div>

      {/* Done Button */}
      <div className={styles.fixedAnalyzeButton}>
        <button 
          className={styles.analyzeButton} 
          onClick={() => {
            onNewAnalysis();
          }}
        >
          {'Done'}
        </button>
      </div>
    </div>
  );
}; 