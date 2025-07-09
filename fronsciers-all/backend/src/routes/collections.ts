import { Hono } from "hono";
import { simpleDatabaseService } from "../services/simple-database-service";

const collectionsRoutes = new Hono();

collectionsRoutes.post("/", async (c) => {
  try {
    const { name } = await c.req.json();

    if (!name) {
      return c.json({ error: "Collection name required" }, 400);
    }

    await simpleDatabaseService.createCollection(name);

    return c.json({
      success: true,
      collection: name,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Collection creation error:", error);
    return c.json({ error: error.message }, 500);
  }
});

collectionsRoutes.get("/", async (c) => {
  try {
    const collections = simpleDatabaseService.getCollectionNames();

    return c.json({
      success: true,
      collections,
      count: collections.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Collection listing error:", error);
    return c.json({ error: error.message }, 500);
  }
});

collectionsRoutes.post("/:collection", async (c) => {
  try {
    const collection = c.req.param("collection");

    if (!collection) {
      return c.json({ error: "Collection name required" }, 400);
    }

    const document = await c.req.json();
    const documentId = await simpleDatabaseService.saveDocument(
      collection,
      document
    );

    return c.json({
      success: true,
      id: documentId,
      collection,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Document save error:", error);
    return c.json({ error: error.message }, 500);
  }
});

collectionsRoutes.get("/:collection", async (c) => {
  try {
    const collection = c.req.param("collection");

    if (!collection) {
      return c.json({ error: "Collection name required" }, 400);
    }

    const documents = await simpleDatabaseService.listDocuments(collection);
    return c.json({
      success: true,
      collection,
      documents,
      count: documents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Document retrieval error:", error);
    return c.json({ error: error.message }, 500);
  }
});

collectionsRoutes.get("/:collection/:documentId", async (c) => {
  try {
    const collection = c.req.param("collection");
    const documentId = c.req.param("documentId");

    if (!collection) {
      return c.json({ error: "Collection name required" }, 400);
    }

    const document = await simpleDatabaseService.getDocument(
      collection,
      documentId
    );
    if (!document) {
      return c.json({ error: "Document not found" }, 404);
    }
    return c.json({
      success: true,
      document,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Document retrieval error:", error);
    return c.json({ error: error.message }, 500);
  }
});

collectionsRoutes.post("/:collection/search", async (c) => {
  try {
    const collection = c.req.param("collection");

    if (!collection) {
      return c.json({ error: "Collection name required" }, 400);
    }

    const query = await c.req.json();
    const results = await simpleDatabaseService.searchDocuments(
      collection,
      query
    );

    return c.json({
      success: true,
      collection,
      query,
      results,
      count: results.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Search error:", error);
    return c.json({ error: error.message }, 500);
  }
});

collectionsRoutes.delete("/:collection/:documentId", async (c) => {
  try {
    const collection = c.req.param("collection");
    const documentId = c.req.param("documentId");

    if (!collection || !documentId) {
      return c.json({ error: "Collection name and document ID required" }, 400);
    }

    const deleted = await simpleDatabaseService.deleteDocument(
      collection,
      documentId
    );

    return c.json({
      success: true,
      deleted,
      collection,
      documentId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Document deletion error:", error);
    return c.json({ error: error.message }, 500);
  }
});

collectionsRoutes.post("/:collection/backup", async (c) => {
  try {
    const collection = c.req.param("collection");

    if (!collection) {
      return c.json({ error: "Collection name required" }, 400);
    }

    const backupHash = await simpleDatabaseService.backup(collection);

    return c.json({
      success: true,
      collection,
      backupHash,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Backup error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export { collectionsRoutes };
