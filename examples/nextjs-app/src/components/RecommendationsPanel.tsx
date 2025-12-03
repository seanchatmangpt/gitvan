'use client';

import { useEffect, useState } from 'react';

interface Recommendation {
  hookType: string;
  reason: string;
  priority: number;
  estimatedBenefit: string;
  action?: string;
}

interface RiskWarning {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
}

interface LearningOpportunity {
  topic: string;
  description: string;
  resources?: string[];
}

/**
 * Recommendations Panel Component
 *
 * Displays AI-powered recommendations, risk warnings, and learning opportunities
 * based on real-time analysis of git events and patterns.
 */
export function RecommendationsPanel() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [warnings, setWarnings] = useState<RiskWarning[]>([]);
  const [opportunities, setOpportunities] = useState<LearningOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await fetch('/api/gitvan/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (response.ok) {
          const data = await response.json();
          setRecommendations(data.recommendations || []);
          setWarnings(data.warnings || []);
          setOpportunities(data.opportunities || []);
        }
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
    const interval = setInterval(fetchRecommendations, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading recommendations...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>AI Recommendations</h1>
      <p>Smart suggestions based on your workflow analysis</p>

      {warnings.length > 0 && (
        <div style={{ marginTop: '20px', padding: '15px', border: '2px solid #ff4444', backgroundColor: '#fff5f5', borderRadius: '8px' }}>
          <h2>⚠️ Risk Warnings ({warnings.length})</h2>
          {warnings.map((warning, idx) => (
            <div key={idx} style={{ marginTop: '10px', padding: '10px', backgroundColor: 'white', border: '1px solid #ffcccc', borderRadius: '4px' }}>
              <h3>{warning.type} - <span style={{ color: '#cc0000', fontWeight: 'bold' }}>{warning.severity.toUpperCase()}</span></h3>
              <p>{warning.description}</p>
              <p style={{ fontSize: '12px', color: '#666' }}>💡 {warning.suggestion}</p>
            </div>
          ))}
        </div>
      )}

      {recommendations.length > 0 && (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h2>Next Suggested Actions ({recommendations.length})</h2>
          {recommendations.map((rec, idx) => (
            <div key={idx} style={{ marginTop: '10px', padding: '10px', border: '1px solid #eee', borderRadius: '4px' }}>
              <h3>{rec.hookType} - Priority {rec.priority}</h3>
              <p>{rec.reason}</p>
              <p style={{ fontSize: '12px' }}>📈 {rec.estimatedBenefit}</p>
            </div>
          ))}
        </div>
      )}

      {opportunities.length > 0 && (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #4444ff', backgroundColor: '#f5f5ff', borderRadius: '8px' }}>
          <h2>Learning Opportunities ({opportunities.length})</h2>
          {opportunities.map((opp, idx) => (
            <div key={idx} style={{ marginTop: '10px', padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
              <h3>{opp.topic}</h3>
              <p>{opp.description}</p>
              {opp.resources && opp.resources.length > 0 && (
                <p style={{ fontSize: '12px' }}>Resources: {opp.resources.join(', ')}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {recommendations.length === 0 && warnings.length === 0 && opportunities.length === 0 && (
        <div style={{ marginTop: '20px', padding: '40px', textAlign: 'center', color: '#666' }}>
          <p>No recommendations at this time</p>
          <p>Your workflow is performing optimally. Keep pushing great code! 🚀</p>
        </div>
      )}
    </div>
  );
}
