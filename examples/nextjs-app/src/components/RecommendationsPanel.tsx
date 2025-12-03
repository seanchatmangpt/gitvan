'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
        const response = await fetch('/api/gitvan/recommendations');
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
    const interval = setInterval(fetchRecommendations, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const getPriorityColor = (priority: number): string => {
    if (priority >= 9) return 'bg-red-100 text-red-800';
    if (priority >= 7) return 'bg-orange-100 text-orange-800';
    if (priority >= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading recommendations...</div>;
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">AI Recommendations</h1>
        <p className="text-gray-600">Smart suggestions based on your workflow analysis</p>
      </div>

      {/* Risk Warnings */}
      {warnings.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-red-600">⚠️</span> Risk Warnings
            </CardTitle>
            <CardDescription>{warnings.length} potential issues detected</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {warnings.map((warning, idx) => (
                <div key={idx} className="p-4 bg-white rounded-lg border border-red-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-red-900">{warning.type}</h3>
                    <Badge className={getSeverityColor(warning.severity)}>
                      {warning.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-red-800">{warning.description}</p>
                  <p className="text-xs text-red-700 font-medium">
                    💡 {warning.suggestion}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hook Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Next Suggested Actions</CardTitle>
            <CardDescription>
              {recommendations.length} recommended hooks based on your workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-4 border rounded-lg space-y-2 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{rec.hookType}</h3>
                      <p className="text-sm text-gray-600 mt-1">{rec.reason}</p>
                    </div>
                    <Badge className={getPriorityColor(rec.priority)}>
                      Priority {rec.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-gray-500">
                      📈 {rec.estimatedBenefit}
                    </p>
                    <Button variant="outline" size="sm">
                      Learn More
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learning Opportunities */}
      {opportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Learning Opportunities</CardTitle>
            <CardDescription>Topics to improve your development workflow</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {opportunities.map((opp, idx) => (
                <div
                  key={idx}
                  className="p-4 border border-blue-200 bg-blue-50 rounded-lg space-y-2"
                >
                  <h3 className="font-semibold text-blue-900">{opp.topic}</h3>
                  <p className="text-sm text-blue-800">{opp.description}</p>
                  {opp.resources && opp.resources.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {opp.resources.map((resource, rIdx) => (
                        <a
                          key={rIdx}
                          href="#"
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          {resource}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {recommendations.length === 0 && warnings.length === 0 && opportunities.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <div className="text-gray-500">
              <p className="text-lg mb-2">No recommendations at this time</p>
              <p className="text-sm">
                Your workflow is performing optimally. Keep pushing great code! 🚀
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
