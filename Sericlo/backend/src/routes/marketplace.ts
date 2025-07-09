import express, { Request, Response } from "express";
import { createClient } from "../utils/supabase/server";
import { isAuthenticated } from "./users";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|webp/;
    const extname = fileTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = fileTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Error: Images Only!"));
    }
  },
});

//route
router.get("/", async (_req: Request, res: Response) => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("Product")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ success: false, error: "Failed to fetch products" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  const id = req.params.id;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("Product")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) {
      return res
        .status(404)
        .json({ success: false, error: "Product not found" });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ success: false, error: "Failed to fetch product" });
  }
});

router.post(
  "/",
  isAuthenticated,
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.split("Bearer ")[1];
      const supabase = createClient(token);

      const {
        name,
        price,
        condition,
        size,
        type,
        description,
        town,
        detailedAddress,
      } = req.body;

      if (
        !name ||
        !price ||
        !condition ||
        !size ||
        !type ||
        !description ||
        !town ||
        !detailedAddress
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Please provide all required fields including town and detailed address",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "Image file is required",
        });
      }

      if (!req.file.buffer || req.file.buffer.length === 0) {
        return res.status(400).json({
          success: false,
          error: "File buffer is empty. Upload failed.",
        });
      }
      const fileExt = path.extname(req.file.originalname);
      const fileName = `${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("products")
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("products").getPublicUrl(fileName);

      const towns = [
        "Gunung Kidul",
        "Kulon Progo",
        "Bantul",
        "Sleman",
        "Kota Yogyakarta",
      ];

      if (!towns.includes(town)) {
        return res.status(400).json({
          success: false,
          error: "Invalid town selection",
        });
      }

      const fullLocation = `${town}, ${detailedAddress}`;

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const { data: product, error: insertError } = await supabase
        .from("Product")
        .insert({
          name,
          price: parseFloat(price),
          condition,
          size,
          type,
          description,
          image: publicUrl,
          seller_id: user.id,
          seller_name: user.user_metadata?.name || "Anonymous User",
          location: fullLocation,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error(
          "Detailed insert error:",
          JSON.stringify(insertError, null, 2)
        );
        throw insertError;
      }

      res.status(201).json({ success: true, data: product });
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create product. Database error occurred.",
      });
    }
  }
);

router.put("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { name, price, condition, size, type, description } = req.body;

  try {
    const supabase = await createClient();

    const { data: existingProduct, error: fetchError } = await supabase
      .from("Product")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existingProduct) {
      return res
        .status(404)
        .json({ success: false, error: "Product not found" });
    }

    const { data: updatedProduct, error: updateError } = await supabase
      .from("Product")
      .update({
        name: name || existingProduct.name,
        price: price || existingProduct.price,
        condition: condition || existingProduct.condition,
        size: size || existingProduct.size,
        type: type || existingProduct.type,
        description: description || existingProduct.description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.status(200).json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ success: false, error: "Failed to update product" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  try {
    const supabase = await createClient();

    const { data: existingProduct, error: fetchError } = await supabase
      .from("Product")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existingProduct) {
      return res
        .status(404)
        .json({ success: false, error: "Product not found" });
    }

    const { error: deleteError } = await supabase
      .from("Product")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    res.status(200).json({
      success: true,
      data: {},
      message: `Product with id ${id} deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ success: false, error: "Failed to delete product" });
  }
});

router.get("/search/:term", async (req: Request, res: Response) => {
  const { term } = req.params;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("Product")
      .select("*")
      .or(
        `name.ilike.%${term}%,description.ilike.%${term}%,type.ilike.%${term}%`
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error searching products:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to search products" });
  }
});

router.post("/filter", async (req: Request, res: Response) => {
  const { type, size, condition, minPrice, maxPrice } = req.body;

  try {
    const supabase = await createClient();
    let query = supabase.from("Product").select("*");

    if (type && type !== "Semua") {
      query = query.eq("type", type);
    }

    if (size) {
      query = query.eq("size", size);
    }

    if (condition) {
      query = query.eq("condition", condition);
    }

    if (minPrice) {
      query = query.gte("price", minPrice);
    }

    if (maxPrice) {
      query = query.lte("price", maxPrice);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error filtering products:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to filter products" });
  }
});

export default router;
