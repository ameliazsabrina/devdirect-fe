import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080",
  headers: {
    "Content-Type": "application/json",
  },
});

export const setAuthToken = (token: string) => {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  console.log("Auth token set for API requests");
};

export const removeAuthToken = () => {
  delete api.defaults.headers.common["Authorization"];
  console.log("Auth token removed from API requests");
};

export const getStoredAuthToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("authToken");
  }
  return null;
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
      const response = await api.post<LoginResponse>("/auth/login", data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      throw new Error("Network error occurred");
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
