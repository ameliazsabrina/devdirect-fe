import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import helmet from "helmet";
import path from "path";
import { createClient } from "./utils/supabase/server";
import userRoutes from "./routes/users";
import productRoutes from "./routes/marketplace";
import donationRoutes from "./routes/donations";
import aiRoutes from "./routes/ai";
import cartRoutes from "./routes/cart";
import checkoutRoutes from "./routes/checkout";
import sellerRoutes from "./routes/seller";

dotenv.config();

const app = express();
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const PORT = process.env.PORT || 5001;
const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "https://sericlo-ameliazsabrinas-projects.vercel.app";

app.use(helmet());
app.use(compression());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  message: "Too many requests, please try again later.",
});

app.use(limiter);

const checkSupabaseConnection = async () => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("_health").select("*").limit(1);

    if (error) {
      console.error("Error connecting to Supabase:", error);
    } else {
      console.log("Supabase connected successfully");
    }
  } catch (err) {
    console.error("Error checking Supabase connection:", err);
  }
};

checkSupabaseConnection();

app.use(morgan("dev"));
app.use(express.json());
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Headers",
      "Access-Control-Allow-Methods",
      "Access-Control-Allow-Credentials",
    ],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    maxAge: 86400,
  })
);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Origin", FRONTEND_URL);
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );
  next();
});

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/user", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/seller", sellerRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Welcome to Sericlo API" });
});

app.listen(PORT);
