import React from 'react';
import styles from '../styles/App.module.css';

interface WelcomeProps {
  onStartAnalysis: () => void;
}

export const Welcome: React.FC<WelcomeProps> = ({ onStartAnalysis }) => {
  return (
    <div className={styles.welcomeContainer}>
      <div className={styles.logoSection}>
        <img src="/logo.svg" alt="Fake News Reader" className={styles.logo} />
        <h1 className={styles.tagline}>
          News Credibility Assistant
        </h1>
      </div>

      <p className={styles.welcomeDescription}>
        Analyze news articles instantly using advanced AI technology to assess credibility,
        detect potential biases, and verify information through multiple sources.
      </p>

      <div className={styles.featureCards}>
        <div className={styles.featureCard}>
          <span className={styles.featureIcon}>🎯</span>
          <h2 className={styles.featureTitle}>AI Analysis</h2>
          <p className={styles.featureDescription}>
            Multiple AI models analyze the article to provide credibility scores, evidence-based reasoning, and detect potential biases.
          </p>
        </div>

        <div className={styles.featureCard}>
          <span className={styles.featureIcon}>📝</span>
          <h2 className={styles.featureTitle}>Evidence Review</h2>
          <p className={styles.featureDescription}>
            Key quotes are extracted and analyzed for their impact on credibility, with detailed explanations of their significance.
          </p>
        </div>

        <div className={styles.featureCard}>
          <span className={styles.featureIcon}>🔍</span>
          <h2 className={styles.featureTitle}>Fact Verification</h2>
          <p className={styles.featureDescription}>
            Access fact-checks and related coverage from trusted sources like Reuters, AP News, and major news outlets.
          </p>
        </div>
      </div>

      <div className={styles.welcomeFooter}>
        <p>Version 1.0.0 • © 2025 Fake News Reader</p>
      </div>

      <div className={styles.welcomeStartButton}>
        <button 
          className={styles.startButton} 
          onClick={onStartAnalysis}
          aria-label="Start Analysis"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}; 