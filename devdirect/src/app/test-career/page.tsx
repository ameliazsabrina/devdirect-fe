"use client";
import { useEffect, useState } from "react";
import { competencyAPI, LatestAnalysisData } from "@/lib/api";

export default function TestCareerPage() {
  const [analysisData, setAnalysisData] = useState<LatestAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await competencyAPI.getLatestAnalysis();
        
        console.log("Test Career - API Response:", response);
        
        if (response.status === "success" && response.data) {
          setAnalysisData(response.data);
          console.log("Test Career - Summary Data:", response.data.summary);
        } else {
          setError(response.message || "No analysis data available");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        console.error("Test Career - Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1>Testing Career Selection API</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1>Testing Career Selection API</h1>
        <p className="text-red-500">Error: {error}</p>
        <p className="text-sm text-gray-600">This is expected if you haven't completed the analysis step yet.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Career Selection API Test</h1>
      
      {analysisData?.summary ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">✅ Summary Data Found:</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="font-bold text-lg">{analysisData.summary.top_skill_domain}</div>
              <div className="text-sm text-gray-600">Top Skill Domain</div>
            </div>
            <div>
              <div className="font-bold text-lg">{analysisData.summary.top_skill_score}</div>
              <div className="text-sm text-gray-600">Top Skill Score</div>
            </div>
            <div>
              <div className="font-bold text-lg">{analysisData.summary.skills_found}</div>
              <div className="text-sm text-gray-600">Skills Found</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p>No summary data available. Complete the skill analysis first.</p>
        </div>
      )}

      <div className="mt-4">
        <h3 className="font-semibold mb-2">Full Analysis Data:</h3>
        <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-96">
          {JSON.stringify(analysisData, null, 2)}
        </pre>
      </div>
    </div>
  );
}