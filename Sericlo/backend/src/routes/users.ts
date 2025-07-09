import express, { NextFunction, Request, Response } from "express";
import { createClient } from "../utils/supabase/server";
import { User as SupabaseUser } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

interface User extends SupabaseUser {
  user_metadata: {
    name?: string;
    avatar_url?: string;
  };
}

declare module "express-serve-static-core" {
  interface Request {
    user?: User;
  }
}

export const isAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    const token = authHeader?.split("Bearer ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ success: false, error: "No token provided" });
    }

    const supabase = createClient(token);

    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      return res.status(401).json({ success: false, error: "Invalid session" });
    }

    req.user = data.user;
    next();
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// routes
router.get("/google", async (req: Request, res: Response) => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
        redirectTo: `${
          process.env.FRONTEND_URL ||
          "https://sericlo-ameliazsabrinas-projects.vercel.app"
        }/marketplace`,
      },
    });

    if (error) throw error;

    res.json({ url: data.url });
  } catch (error) {
    res.status(500).json({ error: "Failed to initiate Google OAuth" });
  }
});

router.get("/logout", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No authorization header" });
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ error: "Logout failed" });
  }
});

router.get("/profile", isAuthenticated, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

router.get(
  "/profile/:id",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const supabase = await createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.admin.getUserById(id);

      if (error) {
        return res.status(500).json({ error: "Failed to fetch user" });
      }
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  }
);

export default router;
