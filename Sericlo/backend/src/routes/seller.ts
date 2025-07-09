import express, { Request, Response } from "express";
import { createClient } from "../utils/supabase/server";
import { isAuthenticated } from "./users";

interface Product {
  id: string;
  name: string;
  image: string;
  seller_id: string;
}

interface OrderWithDetails {
  id: string;
  user_id: string;
  status: string;
  total: number;
  created_at: string;
  OrderItem: {
    id: string;
    order_id: string;
    product_id: string;
    quantity: number;
    price: number;
    Product: Product;
  }[];
  buyer: {
    user_metadata: {
      name: string;
    };
  };
}

const router = express.Router();

router.get(
  "/products",
  isAuthenticated,
  async (req: Request, res: Response) => {
    const seller_id = req.user!.id;
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", seller_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      console.error("Error fetching seller products:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch products" });
    }
  }
);

router.get("/orders", isAuthenticated, async (req: Request, res: Response) => {
  const seller_id = req.user!.id;
  try {
    const supabase = await createClient();

    const { data: orders, error: ordersError } = await supabase
      .from("Orders")
      .select(
        `
        *,
        OrderItem (
          *,
          Product (
            id,
            name,
            image,
            seller_id
          )
        ),
        buyer:user_id (
          user_metadata
        )
      `
      )
      .order("created_at", { ascending: false });

    if (ordersError) throw ordersError;

    const sellerOrders = (orders as OrderWithDetails[]).filter((order) =>
      order.OrderItem.some(
        (item) => item.Product && item.Product.seller_id === seller_id
      )
    );

    const transformedOrders = sellerOrders.map((order) => ({
      ...order,
      buyer_name: order.buyer?.user_metadata?.name || "Anonymous User",
    }));

    res.json({ success: true, data: transformedOrders });
  } catch (err) {
    console.error("Error fetching seller orders:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch seller orders" });
  }
});

export default router;
