import express, { Request, Response } from "express";
import { createClient } from "../utils/supabase/server";
import { isAuthenticated } from "./users";

const router = express.Router();

router.post("/", isAuthenticated, async (req: Request, res: Response) => {
  const { name, price, condition, size, type, description, image, location } =
    req.body;

  if (
    !name ||
    !price ||
    !condition ||
    !size ||
    !type ||
    !description ||
    !image ||
    !location
  ) {
    return res
      .status(400)
      .json({ success: false, error: "Please provide all required fields" });
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    const { data: product, error: insertError } = await supabase
      .from("products")
      .insert({
        name,
        price,
        condition,
        size,
        type,
        description,
        image,
        seller_id: user.id,
        seller_name: user.user_metadata?.name || "Anonymous User",
        location,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create product. Database error occurred.",
    });
  }
});

export default router;
