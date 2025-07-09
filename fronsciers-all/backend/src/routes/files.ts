import { Hono } from "hono";
import { simpleDatabaseService } from "../services/simple-database-service";

const filesRoutes = new Hono();

filesRoutes.post("/upload", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const hash = await simpleDatabaseService.storeFile(uint8Array, {
      filename: file.name,
      type: file.type,
    });

    return c.json({
      success: true,
      hash,
      filename: file.name,
      size: file.size,
      type: file.type,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

filesRoutes.get("/:hash", async (c) => {
  try {
    const hash = c.req.param("hash");
    if (!hash) {
      return c.json({ error: "No hash provided" }, 400);
    }

    const fileData = await simpleDatabaseService.retrieveFile(hash);
    const blob = new Blob([new Uint8Array(fileData)]);

    return new Response(blob, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${hash}"`,
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export { filesRoutes };
