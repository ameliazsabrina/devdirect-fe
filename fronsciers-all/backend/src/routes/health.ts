import { Hono } from "hono";
import { simpleDatabaseService } from "../services/simple-database-service";
import { dbService } from "../services/supabase/index";

const healthRoutes = new Hono();

healthRoutes.get("/", async (c) => {
  try {
    const stats = await simpleDatabaseService.getStats();

    return c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      ...stats,
    });
  } catch (error: any) {
    return c.json(
      {
        status: "error",
        error: error.message,
      },
      500
    );
  }
});

healthRoutes.get("/database", async (c) => {
  try {
    const healthResult = await dbService.healthCheck();
    return c.json({
      ...healthResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        status: "error",
        message: "Database health check failed",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

export { healthRoutes };
