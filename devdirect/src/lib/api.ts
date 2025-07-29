import axios from "axios";
import { supabase } from "./supabase";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080",
  headers: {
    "Content-Type": "application/json",
  },
});

console.log(
  "API Base URL:",
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"
);

api.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error.message);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`✅ ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    // Don't log 404 errors for session endpoints (Redis not implemented yet)
    const isSessionEndpoint = error.config?.url?.includes('/session/');
    const is404 = error.response?.status === 404;
    
    if (isSessionEndpoint && is404) {
      // Silently pass through 404s for session endpoints
      if (process.env.NODE_ENV === "development") {
        console.log(`📝 Session endpoint not implemented: ${error.config.url} (this is expected)`);
      }
    } else {
      // Log other errors normally
      console.error(
        `❌ ${error.response?.status || "Network"} Error:`,
        error.message
      );
    }
    return Promise.reject(error);
  }
);

export const setAuthToken = (token: string) => {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  if (typeof window !== "undefined") {
    localStorage.setItem("authToken", token);

    localStorage.removeItem("auth_token");
  }
  console.log("Auth token set for API requests");
};

export const clearAuthTokens = () => {
  delete api.defaults.headers.common["Authorization"];

  if (typeof window !== "undefined") {
    localStorage.removeItem("authToken");
    localStorage.removeItem("auth_token");
  }

  console.log("Backend auth tokens cleared for login");
};

export const removeAuthToken = async () => {
  delete api.defaults.headers.common["Authorization"];

  if (typeof window !== "undefined") {
    localStorage.removeItem("authToken");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("supabase.auth.token");

    const supabaseSession = localStorage.getItem(
      "sb-jheqxwukevylsputyfuw-auth-token"
    );
    if (supabaseSession) {
      await supabase.auth.signOut();
    }

    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (
        key.includes("auth") ||
        key.includes("token") ||
        key.includes("supabase")
      ) {
        localStorage.removeItem(key);
      }
    });
  }

  console.log("All auth tokens and storage cleared");
};

export const getStoredAuthToken = (): string | null => {
  if (typeof window !== "undefined") {
    return (
      localStorage.getItem("authToken") || localStorage.getItem("auth_token")
    );
  }
  return null;
};

export const isTokenNearExpiry = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expirationTime = payload.exp * 1000;
    const currentTime = Date.now();
    const timeUntilExpiry = expirationTime - currentTime;

    return timeUntilExpiry < 10 * 60 * 1000;
  } catch (error) {
    console.error("Error parsing token:", error);
    return true;
  }
};

export const getTokenInfo = (
  token: string
): { exp: number; timeLeft: string } | null => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expirationTime = payload.exp * 1000;
    const currentTime = Date.now();
    const timeLeft = expirationTime - currentTime;

    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    return {
      exp: payload.exp,
      timeLeft: `${hoursLeft}h ${minutesLeft}m`,
    };
  } catch (error) {
    console.error("Error parsing token:", error);
    return null;
  }
};

export const initializeAuth = () => {
  const token = getStoredAuthToken();
  if (token) {
    setAuthToken(token);
    return true;
  }
  return false;
};

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  role: "applicant" | "recruiter";
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  status: "success" | "error";
  message: string;
  data?: {
    token: string;
    user: {
      id: string;
      email: string;
      auth_provider: string;
      role: string;
      created_at: string;
    };
  };
  error?: string;
}

export type RegisterResponse = AuthResponse;
export type LoginResponse = AuthResponse;

export interface UserProfile {
  id: string;
  email: string;
  auth_provider: string;
  role: string;
  created_at: string;
  profile: {
    id: number;
    user_id: string;
    full_name: string;
    headline: string | null;
    skills: string[];
    summary: string | null;
    created_at: string;
  };
}

export interface UserProfileResponse {
  status: "success" | "error";
  message: string;
  data?: UserProfile;
  error?: string;
}

export interface ParsedCV {
  full_name: string;
  email: string;
  phone: string;
  summary: string;
  skills: string[];
  education: {
    institution: string;
    degree: string;
    major: string;
    gpa: number;
    start_year: number;
    end_year: string | number;
  }[];
  experience: {
    company: string;
    position: string;
    start_date: string;
    end_date: string;
    description: string;
  }[];
  projects: {
    name: string;
    description: string;
    technologies: string[];
    url: string;
  }[];
}

export interface CVData {
  id: number;
  user_id: string;
  full_name: string;
  headline: string | null;
  skills: string[] | null;
  summary: string;
  created_at: string;
  cv_file_url: string;
  cv_file_name: string;
  cv_uploaded_at: string;
  cv_parsed_at: string;
  education_records?:
    | {
        id: number;
        profile_id: number;
        institution: string;
        degree: string;
        major: string;
        gpa: number;
        start_year: number;
        end_year: number | null;
      }[]
    | null;
  experiences?:
    | {
        id: number;
        profile_id: number;
        company: string;
        position: string;
        start_date: string;
        end_date: string | null;
        description: string;
      }[]
    | null;
  projects?:
    | {
        id: number;
        profile_id: number;
        name: string;
        description: string;
        repo_url: string | null;
        demo_url: string | null;
      }[]
    | null;
}

export interface CVUploadResponse {
  status: "success" | "error";
  message: string;
  data?: {
    message: string;
    cv_file_url: string;
    parsed_cv: ParsedCV;
  };
  error?: string;
}

export interface CVDataResponse {
  status: "success" | "error";
  message: string;
  data?: CVData;
  error?: string;
}

export interface CVUpdateEducation {
  id?: number;
  institution: string;
  degree: string;
  major: string;
  gpa: number;
  start_year: number;
  end_year: number | null;
}

export interface CVUpdateExperience {
  id?: number;
  company: string;
  position: string;
  start_date: string;
  end_date: string | null;
  description: string;
}

export interface CVUpdateProject {
  id?: number;
  name: string;
  description: string;
  repo_url: string | null;
  demo_url: string | null;
}

export interface CVUpdateRequest {
  full_name?: string;
  summary?: string;
  skills?: string[];
  education?: CVUpdateEducation[];
  experience?: CVUpdateExperience[];
  projects?: CVUpdateProject[];
}

export interface CVUpdateResponse {
  status: "success" | "error";
  message: string;
  error?: string;
}

export interface CourseGrade {
  id: number;
  transcript_id: number;
  course_code: string;
  course_name: string;
  sks: number;
  grade: string;
  grade_point: number;
  grade_description: string;
  score: number | null;
  course_type: string | null;
}

export interface KHSData {
  id: number;
  profile_id: number;
  semester: string;
  academic_year: string;
  semester_gpa: number | null;
  cumulative_gpa: number | null;
  total_sks: number;
  cumulative_sks: number;
  file_url: string;
  file_name: string;
  uploaded_at: string;
  parsed_at: string;
  course_grades: CourseGrade[] | null;
}

export interface KHSUploadResponse {
  status: "success" | "error";
  message: string;
  data?: KHSData;
  error?: string;
}

export const testTokenValidity = async (): Promise<boolean> => {
  try {
    const token = getStoredAuthToken();
    console.log("Testing token validity:", {
      hasToken: !!token,
      tokenLength: token?.length,
      tokenPreview: token ? token.substring(0, 30) + "..." : "No token",
    });

    if (!token) {
      console.log("No token found");
      return false;
    }

    // Check if token is expired or near expiry
    const tokenInfo = getTokenInfo(token);
    if (tokenInfo) {
      console.log("Token info:", {
        expiresAt: new Date(tokenInfo.exp * 1000).toLocaleString(),
        timeLeft: tokenInfo.timeLeft,
        isNearExpiry: isTokenNearExpiry(token),
      });

      // If token is already expired, don't make API call
      if (tokenInfo.exp * 1000 < Date.now()) {
        console.log("Token is already expired");
        removeAuthToken();
        return false;
      }
    }

    setAuthToken(token);

    const response = await api.get("/auth/profile");
    console.log("Token validation successful:", response.status);
    return response.status === 200;
  } catch (error) {
    console.error("Token validation failed:", error);
    if (axios.isAxiosError(error)) {
      console.error("Token validation error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });

      // Only remove token if it's actually invalid (401), not for network errors
      if (error.response?.status === 401) {
        console.log("Token is invalid (401), removing from storage");
        removeAuthToken();
      }
    }
    return false;
  }
};

export const authAPI = {
  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    try {
      const response = await api.post<RegisterResponse>("/auth/register", data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      throw new Error("Network error occurred");
    }
  },

  login: async (data: LoginRequest): Promise<LoginResponse> => {
    try {
      clearAuthTokens();

      console.log(
        "API Login - Making request to:",
        `${api.defaults.baseURL}/auth/login`
      );
      console.log("API Login - Request data:", data);
      console.log("API Login - JSON stringified data:", JSON.stringify(data));
      console.log("API Login - Email length:", data.email.length);
      console.log("API Login - Password length:", data.password.length);
      console.log(
        "API Login - Email bytes:",
        new TextEncoder().encode(data.email)
      );
      console.log(
        "API Login - Password bytes:",
        new TextEncoder().encode(data.password)
      );
      console.log("API Login - Request headers:", api.defaults.headers);

      const response = await api.post<LoginResponse>("/auth/login", data, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      console.log("API Login - Full axios response:", response);
      console.log("API Login - Response status:", response.status);
      console.log("API Login - Response status text:", response.statusText);
      console.log("API Login - Response headers:", response.headers);
      console.log("API Login - Response data:", response.data);

      return response.data;
    } catch (error) {
      console.error("API Login - Error occurred:", error);

      if (axios.isAxiosError(error)) {
        console.error("API Login - Axios error details:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
            data: error.config?.data,
          },
        });

        if (error.response) {
          console.log(
            "API Login - Returning error response data:",
            error.response.data
          );
          return error.response.data;
        }
      }

      throw new Error("Network error occurred");
    }
  },

  // Exchange Supabase OAuth token for backend JWT token
  exchangeOAuthToken: async (
    supabaseToken: string,
    userEmail: string
  ): Promise<LoginResponse> => {
    try {
      console.log("Exchanging Supabase token for backend JWT");

      const response = await api.post<LoginResponse>(
        "/auth/oauth/exchange",
        {
          provider: "google",
          access_token: supabaseToken,
          email: userEmail,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      console.log("OAuth token exchange response:", response.data);
      return response.data;
    } catch (error) {
      console.error("OAuth token exchange error:", error);

      if (axios.isAxiosError(error) && error.response) {
        // If endpoint doesn't exist (404), provide helpful information
        if (error.response.status === 404) {
          console.error(
            "OAuth exchange endpoint not found. Backend needs to implement /auth/oauth/exchange"
          );
          return {
            status: "error",
            message: "OAuth integration not configured on backend",
            error:
              "The backend does not have OAuth token exchange endpoint. Please implement /auth/oauth/exchange endpoint.",
          };
        }

        return {
          status: "error",
          message:
            error.response.data?.message || "Failed to exchange OAuth token",
          error: error.response.data?.error || error.message,
        };
      }

      return {
        status: "error",
        message: "Network error during token exchange",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  logout: async (): Promise<{ status: string; message: string }> => {
    try {
      const token = getStoredAuthToken();
      if (token) {
        setAuthToken(token);
      }

      const response = await api.post("/auth/logout");

      removeAuthToken();

      return response.data;
    } catch (error) {
      console.error("Logout Error:", error);

      // Still clear tokens even if API call fails
      removeAuthToken();

      if (axios.isAxiosError(error) && error.response) {
        return {
          status: "error",
          message: error.response.data?.message || "Failed to logout",
        };
      }

      return {
        status: "success", // Consider it success even if API fails
        message: "Logged out locally",
      };
    }
  },
};

export const cvAPI = {
  uploadCV: async (file: File): Promise<CVUploadResponse> => {
    try {
      const token = getStoredAuthToken();
      console.log("CV Upload - Token check:", {
        tokenExists: !!token,
        tokenLength: token?.length,
        tokenPreview: token ? token.substring(0, 20) + "..." : "No token",
      });

      if (!token) {
        return {
          status: "error",
          message: "No authentication token found",
          error: "Please login again",
        };
      }

      setAuthToken(token);
      console.log("CV Upload - Auth token set for request");

      const formData = new FormData();
      formData.append("cv_file", file);

      console.log("CV Upload - Request details:", {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        endpoint: `${api.defaults.baseURL}/cv/upload`,
        headers: api.defaults.headers.common,
      });

      const response = await api.post<CVUploadResponse>(
        "/cv/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("CV Upload Response:", response.data);
      return response.data;
    } catch (error) {
      console.error("CV Upload Error:", error);

      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error("CV Upload Error Details:", {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            headers: error.response.headers,
            requestHeaders: error.config?.headers,
          });

          // Handle specific authentication errors
          if (error.response.status === 401) {
            console.error("Authentication failed - clearing stored token");
            // Clear invalid token using standardized function
            removeAuthToken();

            return {
              status: "error",
              message: "Authentication expired. Please login again.",
              error: "Invalid or expired token",
            };
          }

          return {
            status: "error",
            message:
              error.response.data?.message ||
              `Server error: ${error.response.status}`,
            error: error.response.data?.error || error.message,
          };
        } else if (error.request) {
          return {
            status: "error",
            message: "No response from server",
            error: "Network error - server may be down",
          };
        }
      }

      return {
        status: "error",
        message: "Unexpected error occurred",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  getCVData: async (): Promise<CVDataResponse> => {
    try {
      const token = getStoredAuthToken();
      console.log("Get CV Data - Token check:", {
        tokenExists: !!token,
        tokenLength: token?.length,
        tokenPreview: token ? token.substring(0, 20) + "..." : "No token",
      });

      if (!token) {
        return {
          status: "error",
          message: "No authentication token found",
          error: "Please login again",
        };
      }

      setAuthToken(token);
      console.log("Get CV Data - Auth token set for request");
      console.log(
        "Get CV Data - Request headers:",
        api.defaults.headers.common
      );

      const response = await api.get<CVDataResponse>("/cv/");

      console.log("CV Data Response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Get CV Data Error:", error);

      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error("Get CV Data Error Details:", {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            headers: error.response.headers,
            requestHeaders: error.config?.headers,
          });

          if (error.response.status === 401) {
            console.error("Authentication failed - clearing stored token");

            removeAuthToken();

            return {
              status: "error",
              message: "Authentication expired. Please login again.",
              error: "Invalid or expired token",
            };
          }

          return {
            status: "error",
            message:
              error.response.data?.message ||
              `Server error: ${error.response.status}`,
            error: error.response.data?.error || error.message,
          };
        } else if (error.request) {
          return {
            status: "error",
            message: "No response from server",
            error: "Network error - server may be down",
          };
        }
      }

      return {
        status: "error",
        message: "Unexpected error occurred",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  updateCV: async (data: CVUpdateRequest): Promise<CVUpdateResponse> => {
    try {
      const token = getStoredAuthToken();
      console.log("CV Update - Token check:", {
        tokenExists: !!token,
        tokenLength: token?.length,
        tokenPreview: token ? token.substring(0, 20) + "..." : "No token",
      });

      if (!token) {
        return {
          status: "error",
          message: "No authentication token found",
          error: "Please login again",
        };
      }

      setAuthToken(token);
      console.log("CV Update - Auth token set for request");
      console.log("CV Update - Request data:", data);

      const response = await api.put<CVUpdateResponse>("/cv/", data, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("CV Update Response:", response.data);
      return response.data;
    } catch (error) {
      console.error("CV Update Error:", error);

      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error("CV Update Error Details:", {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            headers: error.response.headers,
            requestHeaders: error.config?.headers,
          });

          if (error.response.status === 401) {
            console.error("Authentication failed - clearing stored token");
            removeAuthToken();

            return {
              status: "error",
              message: "Authentication expired. Please login again.",
              error: "Invalid or expired token",
            };
          }

          return {
            status: "error",
            message:
              error.response.data?.message ||
              `Server error: ${error.response.status}`,
            error: error.response.data?.error || error.message,
          };
        } else if (error.request) {
          return {
            status: "error",
            message: "No response from server",
            error: "Network error - server may be down",
          };
        }
      }

      return {
        status: "error",
        message: "Unexpected error occurred",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

export const khsAPI = {
  uploadKHS: async (file: File): Promise<KHSUploadResponse> => {
    try {
      const token = getStoredAuthToken();
      console.log("KHS Upload - Token check:", {
        tokenExists: !!token,
        tokenLength: token?.length,
        tokenPreview: token ? token.substring(0, 20) + "..." : "No token",
      });

      if (!token) {
        return {
          status: "error",
          message: "No authentication token found",
          error: "Please login again",
        };
      }

      setAuthToken(token);
      console.log("KHS Upload - Auth token set for request");

      const formData = new FormData();
      formData.append("khs_file", file);

      console.log("KHS Upload - Request details:", {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        endpoint: `${api.defaults.baseURL}/khs/upload`,
        headers: api.defaults.headers.common,
      });

      const response = await api.post<KHSUploadResponse>(
        "/khs/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("KHS Upload Response:", response.data);
      return response.data;
    } catch (error) {
      console.error("KHS Upload Error:", error);

      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error("KHS Upload Error Details:", {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            headers: error.response.headers,
            requestHeaders: error.config?.headers || {},
          });

          if (error.response.status === 401) {
            console.error("Authentication failed - clearing stored token");
            removeAuthToken();

            return {
              status: "error",
              message: "Authentication expired. Please login again.",
              error: "Invalid or expired token",
            };
          }

          if (error.response.status === 409) {
            return {
              status: "error",
              message:
                error.response.data?.message ||
                "KHS for this semester already exists",
              error: error.response.data?.error || "Duplicate KHS",
            };
          }

          if (error.response.status === 400) {
            return {
              status: "error",
              message: error.response.data?.message || "Failed to parse KHS",
              error: error.response.data?.error || "Invalid KHS file",
              data: error.response.data?.data,
            };
          }

          return {
            status: "error",
            message:
              error.response.data?.message ||
              `Server error: ${error.response.status}`,
            error: error.response.data?.error || error.message,
          };
        } else if (error.request) {
          return {
            status: "error",
            message: "No response from server",
            error: "Network error - server may be down",
          };
        }
      }

      return {
        status: "error",
        message: "Unexpected error occurred",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

export interface SessionData {
  cvData?: CVData | null;
  khsData?: KHSData | null;
  uploadedCVFile?: {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  } | null;
  uploadedKHSFile?: {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  } | null;
  parsedCVData?: ParsedCV | null;
  consentGiven?: boolean;
  currentStep?: number;
  analysisData?: LatestAnalysisData | null;
}

export interface SessionResponse {
  status: "success" | "error";
  message: string;
  data?: SessionData;
  error?: string;
}

export const sessionAPI = {
  saveSession: async (sessionData: SessionData): Promise<SessionResponse> => {
    try {
      const token = getStoredAuthToken();
      console.log("Session Save - Token check:", {
        tokenExists: !!token,
        tokenLength: token?.length,
        tokenPreview: token ? token.substring(0, 20) + "..." : "No token",
      });

      if (!token) {
        return {
          status: "error",
          message: "No authentication token found",
          error: "Please login again",
        };
      }

      setAuthToken(token);
      console.log("Session Save - Auth token set for request");
      console.log("Session Save - Data:", sessionData);

      const response = await api.post<SessionResponse>(
        "/session/save",
        sessionData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Session Save Response:", response.data);
      return response.data;
    } catch (error) {
      // Error handling moved below - don't log generic error here

      if (axios.isAxiosError(error)) {
        if (error.response) {
          // Handle endpoint not implemented (404) - this is expected
          if (error.response.status === 404) {
            console.log(
              "📝 Session save endpoint not implemented - using local state (this is expected during development)"
            );
            return {
              status: "success",
              message:
                "Session save endpoint not available - using local state only",
              data: sessionData, // Return the data back to indicate successful local handling
            };
          }

          // Only log detailed errors for non-404 issues
          console.error("Session Save Error Details:", {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            headers: error.response.headers,
            requestHeaders: error.config?.headers || {},
          });

          if (error.response.status === 401) {
            console.error("Authentication failed - clearing stored token");
            removeAuthToken();

            return {
              status: "error",
              message: "Authentication expired. Please login again.",
              error: "Invalid or expired token",
            };
          }

          return {
            status: "error",
            message:
              error.response.data?.message ||
              `Server error: ${error.response.status}`,
            error: error.response.data?.error || error.message,
          };
        } else if (error.request) {
          return {
            status: "error",
            message: "No response from server",
            error: "Network error - server may be down",
          };
        }
      }

      return {
        status: "error",
        message: "Unexpected error occurred",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  getSession: async (): Promise<SessionResponse> => {
    try {
      const token = getStoredAuthToken();
      console.log("Session Get - Token check:", {
        tokenExists: !!token,
        tokenLength: token?.length,
        tokenPreview: token ? token.substring(0, 20) + "..." : "No token",
      });

      if (!token) {
        return {
          status: "error",
          message: "No authentication token found",
          error: "Please login again",
        };
      }

      setAuthToken(token);
      console.log("Session Get - Auth token set for request");

      const response = await api.get<SessionResponse>("/session/get");

      console.log("Session Get Response:", response.data);
      return response.data;
    } catch (error) {
      // Error handling moved below - don't log generic error here

      if (axios.isAxiosError(error)) {
        if (error.response) {
          // Handle endpoint not implemented (404) - this is expected
          if (error.response.status === 404) {
            console.log(
              "📝 Session get endpoint not implemented - no session data available (this is expected during development)"
            );
            return {
              status: "success",
              message: "No session found or endpoints not implemented",
              data: {}, // Return empty data object for consistency
            };
          }

          // Only log detailed errors for non-404 issues
          console.error("Session Get Error Details:", {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            headers: error.response.headers,
            requestHeaders: error.config?.headers || {},
          });

          // Handle specific authentication errors
          if (error.response.status === 401) {
            console.error("Authentication failed - clearing stored token");
            removeAuthToken();

            return {
              status: "error",
              message: "Authentication expired. Please login again.",
              error: "Invalid or expired token",
            };
          }

          return {
            status: "error",
            message:
              error.response.data?.message ||
              `Server error: ${error.response.status}`,
            error: error.response.data?.error || error.message,
          };
        } else if (error.request) {
          return {
            status: "error",
            message: "No response from server",
            error: "Network error - server may be down",
          };
        }
      }

      return {
        status: "error",
        message: "Unexpected error occurred",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  clearSession: async (): Promise<SessionResponse> => {
    try {
      const token = getStoredAuthToken();
      if (!token) {
        return {
          status: "success",
          message: "No token, session already cleared",
        };
      }

      setAuthToken(token);
      const response = await api.delete<SessionResponse>("/session/clear");
      console.log("Session Clear Response:", response.data);
      return response.data;
    } catch (error) {
      // Always return success for clear operation, even if endpoint doesn't exist
      console.log("📝 Session clear endpoint not available - clearing locally only");

      return {
        status: "success", 
        message: "Session cleared locally (Redis endpoint not available)",
      };
    }
  },
};

// Competency Analysis interfaces
export interface Certificate {
  name: string;
  issuer: string;
  is_active: boolean;
  skills: string[];
  credibility_weight: number;
}

export interface RelevantCourse {
  course_code: string;
  course_name: string;
  grade: string;
  grade_point: number;
  relevance_score: number;
}

export interface SkillEvidence {
  cv_skills: string[];
  certificates: Certificate[];
  relevant_courses: RelevantCourse[];
  projects: string[];
  grade_average: number;
}

export interface SkillStrength {
  id: number;
  skill_domain: string;
  strength_score: number;
  market_demand: number;
  evidence: SkillEvidence;
  career_potential: string;
  recommendations: string[];
}

export interface AnalysisMetadata {
  analyzed_at: string;
  data_sources: string[];
  confidence_level: string;
  total_skills_found: number;
}

export interface CompetencyAnalysisData {
  skill_strengths: SkillStrength[];
  analysis_metadata: AnalysisMetadata;
}

export interface CompetencyAnalysisResponse {
  status: "success" | "error";
  message: string;
  data?: CompetencyAnalysisData;
  error?: string;
}

export interface AnalysisSummary {
  top_skill_domain: string;
  top_skill_score: number;
  skills_found: number;
}

export interface LatestAnalysisData {
  analysis: CompetencyAnalysisData;
  confidence_level: string;
  analyzed_at: string;
  data_sources: string[];
  summary: AnalysisSummary;
}

export interface LatestAnalysisResponse {
  status: "success" | "error";
  message?: string;
  data?: LatestAnalysisData;
  error?: string;
}

export const competencyAPI = {
  analyzeSkills: async (): Promise<CompetencyAnalysisResponse> => {
    try {
      const token = getStoredAuthToken();
      console.log("Competency Analysis - Token check:", {
        tokenExists: !!token,
        tokenLength: token?.length,
        tokenPreview: token ? token.substring(0, 20) + "..." : "No token",
      });

      if (!token) {
        return {
          status: "error",
          message: "No authentication token found",
          error: "Please login again",
        };
      }

      setAuthToken(token);
      console.log("Competency Analysis - Auth token set for request");
      console.log(
        "Competency Analysis - Request endpoint:",
        `${api.defaults.baseURL}/competency/analyze`
      );

      const response = await api.post<CompetencyAnalysisResponse>(
        "/competency/analyze",
        {}, // Empty body as per specification
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Competency Analysis Response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Competency Analysis Error:", error);

      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error("Competency Analysis Error Details:", {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            headers: error.response.headers,
            requestHeaders: error.config?.headers || {},
          });

          if (error.response.status === 401) {
            console.error("Authentication failed - clearing stored token");
            removeAuthToken();

            return {
              status: "error",
              message: "Authentication expired. Please login again.",
              error: "Invalid or expired token",
            };
          }

          if (error.response.status === 404) {
            return {
              status: "error",
              message: "Competency analysis endpoint not found",
              error: "Analysis service not available",
            };
          }

          if (error.response.status === 400) {
            return {
              status: "error",
              message:
                error.response.data?.message || "Invalid data for analysis",
              error: error.response.data?.error || "Bad request",
            };
          }

          return {
            status: "error",
            message:
              error.response.data?.message ||
              `Server error: ${error.response.status}`,
            error: error.response.data?.error || error.message,
          };
        } else if (error.request) {
          return {
            status: "error",
            message: "No response from server",
            error: "Network error - server may be down",
          };
        }
      }

      return {
        status: "error",
        message: "Unexpected error occurred",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  getLatestAnalysis: async (): Promise<LatestAnalysisResponse> => {
    try {
      const token = getStoredAuthToken();
      console.log("Get Latest Analysis - Token check:", {
        tokenExists: !!token,
        tokenLength: token?.length,
        tokenPreview: token ? token.substring(0, 20) + "..." : "No token",
      });

      if (!token) {
        return {
          status: "error",
          message: "No authentication token found",
          error: "Please login again",
        };
      }

      setAuthToken(token);
      console.log("Get Latest Analysis - Auth token set for request");
      console.log(
        "Get Latest Analysis - Request endpoint:",
        `${api.defaults.baseURL}/competency/latest`
      );

      const response = await api.get<LatestAnalysisResponse>(
        "/competency/latest"
      );

      console.log("Latest Analysis Response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Get Latest Analysis Error:", error);

      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error("Get Latest Analysis Error Details:", {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            headers: error.response.headers,
            requestHeaders: error.config?.headers || {},
          });

          if (error.response.status === 401) {
            console.error("Authentication failed - clearing stored token");
            removeAuthToken();

            return {
              status: "error",
              message: "Authentication expired. Please login again.",
              error: "Invalid or expired token",
            };
          }

          if (error.response.status === 404) {
            return {
              status: "error",
              message: "No analysis found or endpoint not available",
              error: "Analysis not found",
            };
          }

          return {
            status: "error",
            message:
              error.response.data?.message ||
              `Server error: ${error.response.status}`,
            error: error.response.data?.error || error.message,
          };
        } else if (error.request) {
          return {
            status: "error",
            message: "No response from server",
            error: "Network error - server may be down",
          };
        }
      }

      return {
        status: "error",
        message: "Unexpected error occurred",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

export const userAPI = {
  getProfile: async (): Promise<UserProfileResponse> => {
    try {
      console.log(
        "Making API request to:",
        `${api.defaults.baseURL}/auth/profile`
      );
      console.log("Headers:", api.defaults.headers);

      const response = await api.get<UserProfileResponse>("/auth/profile");
      console.log("API Response status:", response.status);
      console.log("API Response data:", response.data);

      return response.data;
    } catch (error) {
      console.error("API Error details:", error);

      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error(
            "Error response:",
            error.response.status,
            error.response.data
          );
          return {
            status: "error",
            message:
              error.response.data?.message ||
              `Server error: ${error.response.status}`,
            error: error.response.data?.error || error.message,
          };
        } else if (error.request) {
          console.error("No response received:", error.request);
          return {
            status: "error",
            message: "No response from server",
            error: "Network error - server may be down",
          };
        }
      }

      console.error("Unexpected error:", error);
      return {
        status: "error",
        message: "Unexpected error occurred",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

export default api;
