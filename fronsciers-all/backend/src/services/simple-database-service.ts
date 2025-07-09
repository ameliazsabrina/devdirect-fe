import { ipfsService } from "./ipfs";

interface Document {
  id: string;
  hash: string;
  data: any;
  metadata: {
    collection: string;
    timestamp: string;
    type: string;
    size: number;
  };
}

interface Collection {
  name: string;
  documents: Map<string, Document>;
  indexes: Map<string, Set<string>>;
}

export class SimpleDatabaseService {
  private collections = new Map<string, Collection>();
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  async initialize() {
    if (this.isInitialized) return;

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._doInitialize();
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async _doInitialize() {
    if (this.isInitialized) return;

    try {
      // Initialize the existing IPFS service
      await ipfsService.initialize();

      this.isInitialized = true;
    } catch (error) {
      console.error("❌ Failed to initialize Simple Database Service:", error);
      throw error;
    }
  }

  async storeFile(
    content: Uint8Array,
    metadata?: { filename?: string; type?: string }
  ): Promise<string> {
    await this.initialize();

    try {
      const hash = await ipfsService.addFile(content);

      return hash;
    } catch (error) {
      console.error("❌ Failed to store file:", error);
      throw error;
    }
  }

  async retrieveFile(hash: string): Promise<Uint8Array> {
    await this.initialize();
    return ipfsService.getFile(hash);
  }

  // === DOCUMENT COLLECTIONS ===

  async createCollection(name: string): Promise<void> {
    await this.initialize();

    if (this.collections.has(name)) {
      return;
    }

    this.collections.set(name, {
      name,
      documents: new Map(),
      indexes: new Map(),
    });
  }

  async saveDocument(collection: string, document: any): Promise<string> {
    await this.initialize();

    try {
      // Ensure collection exists
      if (!this.collections.has(collection)) {
        await this.createCollection(collection);
      }

      // Store document content in IPFS
      const content = JSON.stringify(document);
      const contentBytes = new TextEncoder().encode(content);
      const hash = await ipfsService.addFile(contentBytes);

      // Create document metadata
      const doc: Document = {
        id: hash,
        hash,
        data: document,
        metadata: {
          collection,
          timestamp: new Date().toISOString(),
          type: "document",
          size: content.length,
        },
      };

      // Store in collection
      const coll = this.collections.get(collection)!;
      coll.documents.set(hash, doc);

      // Update indexes
      this.updateIndexes(coll, doc);

      return hash;
    } catch (error) {
      console.error("❌ Failed to save document:", error);
      throw error;
    }
  }

  async getDocument(collection: string, id: string): Promise<Document | null> {
    await this.initialize();

    const coll = this.collections.get(collection);
    if (!coll) {
      throw new Error(`Collection ${collection} not found`);
    }

    const doc = coll.documents.get(id);
    if (!doc) {
      return null;
    }

    // Optionally refresh from IPFS
    try {
      const content = await ipfsService.getFile(doc.hash);
      const text = new TextDecoder().decode(content);
      doc.data = JSON.parse(text);
    } catch (error) {
      console.warn("Could not refresh document from IPFS, using cached data");
    }

    return doc;
  }

  async listDocuments(collection: string): Promise<Document[]> {
    await this.initialize();

    const coll = this.collections.get(collection);
    if (!coll) {
      throw new Error(`Collection ${collection} not found`);
    }

    return Array.from(coll.documents.values());
  }

  async searchDocuments(collection: string, query: any): Promise<Document[]> {
    await this.initialize();

    const documents = await this.listDocuments(collection);

    return documents.filter((doc) => {
      return Object.keys(query).every((key) => {
        const docValue = this.getNestedValue(doc.data, key);
        const queryValue = query[key];

        if (typeof queryValue === "string") {
          return (
            docValue &&
            docValue.toString().toLowerCase().includes(queryValue.toLowerCase())
          );
        }

        return docValue === queryValue;
      });
    });
  }

  async deleteDocument(collection: string, id: string): Promise<boolean> {
    await this.initialize();

    const coll = this.collections.get(collection);
    if (!coll) {
      throw new Error(`Collection ${collection} not found`);
    }

    const deleted = coll.documents.delete(id);
    return deleted;
  }

  // === UTILITIES ===

  private updateIndexes(collection: Collection, doc: Document) {
    // Simple indexing for common fields
    const commonFields = ["type", "status", "category", "author"];

    for (const field of commonFields) {
      const value = this.getNestedValue(doc.data, field);
      if (value) {
        if (!collection.indexes.has(field)) {
          collection.indexes.set(field, new Set());
        }
        collection.indexes.get(field)!.add(doc.id);
      }
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  async getStats() {
    await this.initialize();

    try {
      const ipfsInfo = await ipfsService.getInfo();

      const collections = Array.from(this.collections.entries()).map(
        ([name, coll]) => ({
          name,
          documentCount: coll.documents.size,
          indexes: coll.indexes.size,
        })
      );

      return {
        ipfs: {
          initialized: ipfsInfo.initialized,
          peerId: ipfsInfo.peerId,
          connectedPeers: ipfsInfo.connectedPeers,
          version: ipfsInfo.version,
        },
        database: {
          collections: collections.length,
          totalDocuments: collections.reduce(
            (sum, c) => sum + c.documentCount,
            0
          ),
          collectionDetails: collections,
        },
      };
    } catch (error) {
      console.error("❌ Failed to get stats:", error);
      throw error;
    }
  }

  async backup(collection: string): Promise<string> {
    await this.initialize();

    try {
      const documents = await this.listDocuments(collection);
      const backup = {
        collection,
        timestamp: new Date().toISOString(),
        documents: documents.map((doc) => ({
          id: doc.id,
          data: doc.data,
          metadata: doc.metadata,
        })),
        version: "1.0",
      };

      const backupContent = JSON.stringify(backup, null, 2);
      const backupBytes = new TextEncoder().encode(backupContent);
      const backupHash = await ipfsService.addFile(backupBytes);

      return backupHash;
    } catch (error) {
      console.error("❌ Failed to create backup:", error);
      throw error;
    }
  }

  async restore(backupHash: string): Promise<string> {
    await this.initialize();

    try {
      const backupContent = await ipfsService.getFile(backupHash);
      const backupText = new TextDecoder().decode(backupContent);
      const backup = JSON.parse(backupText);

      const collection = backup.collection;
      await this.createCollection(collection);

      for (const docData of backup.documents) {
        await this.saveDocument(collection, docData.data);
      }

      console.log(
        `📥 Restored ${backup.documents.length} documents to ${collection}`
      );
      return collection;
    } catch (error) {
      console.error("❌ Failed to restore backup:", error);
      throw error;
    }
  }

  getCollectionNames(): string[] {
    return Array.from(this.collections.keys());
  }

  async stop() {
    this.collections.clear();
    this.isInitialized = false;
    this.initializationPromise = null;
  }
}

export const simpleDatabaseService = new SimpleDatabaseService();
