"use client";
import { useState } from "react";
import { sessionAPI, SessionData } from "@/lib/api";

export default function TestSessionPage() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testSaveSession = async () => {
    setLoading(true);
    setResult("Testing session save...");
    
    try {
      const testData: SessionData = {
        currentStep: 2,
        consentGiven: true,
        cvData: null,
        khsData: null,
      };

      const response = await sessionAPI.saveSession(testData);
      
      setResult(`✅ Save Session Test Result:
Status: ${response.status}
Message: ${response.message}
Data: ${JSON.stringify(response.data, null, 2)}`);
      
    } catch (error) {
      setResult(`❌ Save Session Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const testGetSession = async () => {
    setLoading(true);
    setResult("Testing session get...");
    
    try {
      const response = await sessionAPI.getSession();
      
      setResult(`✅ Get Session Test Result:
Status: ${response.status}
Message: ${response.message}
Data: ${JSON.stringify(response.data, null, 2)}`);
      
    } catch (error) {
      setResult(`❌ Get Session Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const testClearSession = async () => {
    setLoading(true);
    setResult("Testing session clear...");
    
    try {
      const response = await sessionAPI.clearSession();
      
      setResult(`✅ Clear Session Test Result:
Status: ${response.status}
Message: ${response.message}`);
      
    } catch (error) {
      setResult(`❌ Clear Session Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Session API Test (Redis Endpoints)</h1>
      
      <div className="space-y-4 mb-6">
        <button 
          onClick={testSaveSession}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Test Save Session
        </button>
        
        <button 
          onClick={testGetSession}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Test Get Session
        </button>
        
        <button 
          onClick={testClearSession}
          disabled={loading}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
        >
          Test Clear Session
        </button>
      </div>

      {loading && (
        <div className="text-blue-600">Testing...</div>
      )}

      {result && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Test Result:</h3>
          <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto whitespace-pre-wrap">
            {result}
          </pre>
        </div>
      )}

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">Expected Behavior:</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• All tests should return <code>status: "success"</code> even if Redis is not implemented</li>
          <li>• Save and Get should mention "local state only" or "not implemented"</li>
          <li>• Clear should succeed with local clearing</li>
          <li>• ❌ <strong>No 404 errors should be thrown to the console</strong></li>
          <li>• ✅ Should see friendly "📝 Session endpoint not implemented" messages instead</li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Console Messages You Should See:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <code>📝 Session endpoint not implemented: /session/save (this is expected)</code></li>
          <li>• <code>📝 Session save endpoint not implemented - using local state</code></li>
          <li>• <strong>NOT:</strong> <code>❌ 404 Error: Request failed with status code 404</code></li>
        </ul>
      </div>
    </div>
  );
}