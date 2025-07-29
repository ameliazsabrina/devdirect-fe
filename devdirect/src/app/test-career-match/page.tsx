"use client";
import { useEffect, useState } from "react";
import { competencyAPI, LatestAnalysisData } from "@/lib/api";

export default function TestCareerMatchPage() {
  const [analysisData, setAnalysisData] = useState<LatestAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await competencyAPI.getLatestAnalysis();
        
        if (response.status === "success" && response.data) {
          setAnalysisData(response.data);
        } else {
          setError(response.message || "No analysis data available");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Generate career options using the same logic as onboarding page
  const generateCareerOptions = () => {
    if (!analysisData?.analysis?.skill_strengths) {
      return [];
    }

    const skillStrengths = analysisData.analysis.skill_strengths;
    const sortedSkills = [...skillStrengths].sort((a, b) => b.strength_score - a.strength_score);
    
    return sortedSkills.map((skill, index) => ({
      title: skill.career_potential || skill.skill_domain,
      match: `${Math.round(skill.strength_score)}%`,
      desc: skill.recommendations && skill.recommendations.length > 0 
        ? skill.recommendations[0]
        : `Strong potential in ${skill.skill_domain} based on your skills and market demand`,
      isTop: index === 0,
      skills: skill.evidence?.cv_skills?.slice(0, 4) || [skill.skill_domain],
      marketDemand: skill.market_demand,
      strengthScore: skill.strength_score,
    })).slice(0, 3);
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Testing Career Selection Match</h1>
        <p>Loading analysis data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Testing Career Selection Match</h1>
        <p className="text-red-500">Error: {error}</p>
        <p className="text-sm text-gray-600">Complete the skill analysis first to see career recommendations.</p>
      </div>
    );
  }

  const careerOptions = generateCareerOptions();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Career Selection vs AI Analysis Comparison</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AI Analysis Raw Data */}
        <div>
          <h2 className="text-xl font-semibold mb-4">🤖 AI Analysis - Skill Strengths</h2>
          {analysisData?.analysis?.skill_strengths ? (
            <div className="space-y-4">
              {analysisData.analysis.skill_strengths
                .sort((a, b) => b.strength_score - a.strength_score)
                .map((skill, index) => (
                <div key={skill.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-blue-900">
                      #{index + 1} {skill.skill_domain}
                    </h3>
                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {Math.round(skill.strength_score)}%
                    </span>
                  </div>
                  <p className="text-sm text-blue-700 mb-2">
                    <strong>Career Potential:</strong> {skill.career_potential}
                  </p>
                  <p className="text-sm text-blue-700 mb-2">
                    <strong>Market Demand:</strong> {skill.market_demand}
                  </p>
                  {skill.recommendations && skill.recommendations.length > 0 && (
                    <div className="text-sm text-blue-700">
                      <strong>Recommendations:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {skill.recommendations.slice(0, 2).map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No skill strengths data available</p>
          )}
        </div>

        {/* Career Selection Generated Options */}
        <div>
          <h2 className="text-xl font-semibold mb-4">🎯 Career Selection - Generated Options</h2>
          {careerOptions.length > 0 ? (
            <div className="space-y-4">
              {careerOptions.map((career, index) => (
                <div 
                  key={index} 
                  className={`border rounded-lg p-4 ${
                    career.isTop 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className={`font-semibold ${
                      career.isTop ? 'text-green-900' : 'text-gray-900'
                    }`}>
                      {career.isTop && '🏆 '}{career.title}
                    </h3>
                    <span className={`text-sm px-2 py-1 rounded ${
                      career.isTop 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {career.match}
                    </span>
                  </div>
                  <p className={`text-sm mb-3 ${
                    career.isTop ? 'text-green-700' : 'text-gray-700'
                  }`}>
                    {career.desc}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {career.skills.map((skill, idx) => (
                      <span 
                        key={idx}
                        className={`text-xs px-2 py-1 rounded ${
                          career.isTop 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No career options generated</p>
          )}
        </div>
      </div>

      {/* Summary Comparison */}
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">✅ Expected Result:</h3>
        <p className="text-sm text-yellow-700">
          The Career Selection options should now exactly match the AI Analysis skill strengths, 
          showing the same career potentials in the same order with the same scores.
        </p>
      </div>
    </div>
  );
}