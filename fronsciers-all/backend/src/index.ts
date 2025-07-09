import { Hono } from "hono";
import { cors } from "hono/cors";
import { simpleDatabaseService } from "./services/simple-database-service";
import { dbService } from "./services/supabase/index";
import { config } from "dotenv";

import {
  cvRoutes,
  healthRoutes,
  filesRoutes,
  collectionsRoutes,
  manuscriptsRoutes,
  reviewRoutes,
  nftMetadataRoutes,
} from "./routes";

config();

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.route("/health", healthRoutes);
app.route("/api/files", filesRoutes);
app.route("/api/collections", collectionsRoutes);
app.route("/api/parse-cv", cvRoutes);
app.route("/api/manuscripts", manuscriptsRoutes);
app.route("/api/reviews", reviewRoutes);
app.route("/api/nft-metadata", nftMetadataRoutes);

// Restore endpoint
app.post("/api/restore", async (c) => {
  try {
    const { backupHash } = await c.req.json();

    if (!backupHash) {
      return c.json({ error: "Backup hash required" }, 400);
    }

    const collection = await simpleDatabaseService.restore(backupHash);

    return c.json({
      success: true,
      collection,
      message: "Collection restored successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Restore error:", error);
    return c.json({ error: error.message }, 500);
  }
});

app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

async function startServer() {
  try {
    // Temporarily comment out database initialization for debugging
    console.log("Starting server without database initialization...");

    // await Promise.all([
    //   simpleDatabaseService.initialize(),
    //   dbService.initializeTables(),
    // ]);

    const server = Bun.serve({
      port: 5001,
      fetch: app.fetch,
    });

    console.log("Server running on http://localhost:5001");
    return server;
  } catch (error: any) {
    console.error("Failed to initialize services:", error.message);
    process.exit(1);
  }
}

startServer();
