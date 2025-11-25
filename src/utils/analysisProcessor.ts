// Analysis-related type definitions

export interface AnalysisResult {
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
