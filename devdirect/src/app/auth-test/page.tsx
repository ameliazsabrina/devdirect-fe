"use client";
import { useAuth } from "@/contexts/AuthContext.minimal";

export default function AuthTest() {
  const { user, session, loading, signOut } = useAuth();
  
  console.log("🧪 AuthTest component rendering", { user, session, loading });
  
  return (
    <div className="p-8">
      <h1>Auth Test Page</h1>
      <div className="space-y-2">
        <p>User: {user ? user.email : "None"}</p>
        <p>Session: {session ? "Active" : "None"}</p>
        <p>Loading: {loading.toString()}</p>
        <button 
          onClick={signOut}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Sign Out (Test)
        </button>
      </div>
    </div>
  );
}