import express, { Request, Response } from "express";
import { createClient } from "../utils/supabase/server";
import { isAuthenticated } from "./users";

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  Product: {
    name: string;
    image: string;
  };
}

interface Order {
  id: string;
  user_id: string;
  status: string;
  total: number;
  created_at: string;
  OrderItem: OrderItem[];
}

const router = express.Router();

router.post("/add", isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const user_id = req.user.id;
    const { product_id, quantity } = req.body;

    if (!product_id || !quantity) {
      return res.status(400).json({
        success: false,
        error: "Product ID and quantity are required",
      });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.split("Bearer ")[1];
    const supabase = createClient(token);

    const { data: product, error: productError } = await supabase
      .from("Product")
      .select("price")
      .eq("id", product_id)
      .single();

    if (productError) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    const { error: cartError } = await supabase.from("Cart").insert({
      user_id,
      product_id,
      quantity,
      created_at: new Date().toISOString(),
    });

    if (cartError) {
      return res.status(500).json({
        success: false,
        error: "Failed to add item to cart",
      });
    }

    res.json({
      success: true,
      message: "Item added to cart successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Failed to add item to cart",
    });
  }
});

router.get("/", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split("Bearer ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ success: false, error: "No token provided" });
    }

    const supabase = createClient(token);

    const user_id = req.user!.id;

    const { data: cartItems, error: cartError } = await supabase
      .from("Cart")
      .select(
        `
        *,
        Product (
          name,
          image,
          price
        )
      `
      )
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });

    if (cartError) {
      throw cartError;
    }

    const transformedItems = (cartItems as any[]).map((item) => ({
      id: item.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.Product.price,
      name: item.Product.name,
      image: item.Product.image,
      created_at: item.created_at,
    }));

    res.json({ success: true, data: transformedItems });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch cart" });
  }
});

router.delete("/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    const token = authHeader?.split("Bearer ")[1];
    const supabase = createClient(token);

    const user_id = req.user!.id;

    const { error: cartError } = await supabase
      .from("Cart")
      .delete()
      .eq("user_id", user_id)
      .eq("id", id);

    if (cartError) {
      return res.status(500).json({
        success: false,
        error: "Failed to delete cart item",
      });
    }

    res.json({ success: true, message: "Cart item deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Failed to delete cart item" });
  }
});
export default router;
