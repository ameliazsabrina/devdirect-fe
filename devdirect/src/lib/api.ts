import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080",
  headers: {
    "Content-Type": "application/json",
  },
});

// Types
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: "applicant" | "recruiter";
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

export default api;
