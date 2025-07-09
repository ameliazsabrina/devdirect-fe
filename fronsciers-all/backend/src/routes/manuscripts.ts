import { Hono } from "hono";
import { ipfsService } from "../services/ipfs/index";
import { dbService } from "../services/supabase/index";
import { reviewerAssignmentService } from "../services/reviewer-assignment-service";
import { aiReviewerAssignmentService } from "../services/ai-reviewer-assignment-service";

const manuscriptsRoutes = new Hono();

manuscriptsRoutes.get("/check-cv-status/:walletAddress", async (c) => {
  try {
    const walletAddress = c.req.param("walletAddress");

    if (!walletAddress) {
      return c.json(
        {
          error: "Wallet address is required",
          code: "MISSING_WALLET",
        },
        400
      );
    }

    console.log(`🔍 Checking CV status for wallet: ${walletAddress}`);
    const userCV = await dbService.getUserCVByWalletAddress(walletAddress);

    if (!userCV) {
      return c.json({
        success: false,
        hasCV: false,
        canSubmitManuscripts: false,
        message:
          "No CV found for this wallet address. Please upload your CV first.",
        walletAddress: walletAddress,
        requiresAction: "cv_upload",
      });
    }

    const cvData = userCV.cv_data;
    const hasCompleteProfile = !!(
      cvData?.selfIdentity?.fullName &&
      cvData?.selfIdentity?.institution &&
      cvData?.education?.length > 0
    );

    return c.json({
      success: true,
      hasCV: true,
      canSubmitManuscripts: true,
      hasCompleteProfile: hasCompleteProfile,
      userInfo: {
        fullName: cvData?.selfIdentity?.fullName || null,
        institution: cvData?.selfIdentity?.institution || null,
        profession: cvData?.selfIdentity?.profession || null,
        registeredAt: userCV.created_at,
      },
      walletAddress: walletAddress,
      message: "CV verified. You can submit manuscripts.",
    });
  } catch (error) {
    console.error("❌ CV status check failed:", error);
    return c.json(
      {
        error: "Failed to check CV status",
        details: error instanceof Error ? error.message : "Unknown error",
        code: "CV_CHECK_ERROR",
      },
      500
    );
  }
});

manuscriptsRoutes.post("/submit", async (c) => {
  try {
    console.log("=== MANUSCRIPT SUBMIT REQUEST ===");

    const formData = await c.req.formData();
    const file = formData.get("manuscript") as File;
    const title = formData.get("title") as string;
    const author = formData.get("author") as string;
    const category = formData.get("category") as string;
    const abstract = formData.get("abstract") as string;
    const keywords = formData.get("keywords") as string;
    const authorWallet = formData.get("authorWallet") as string;

    if (!file || !title || !author || !category) {
      return c.json(
        {
          error:
            "Missing required fields: manuscript file, title, author, and category",
          code: "MISSING_FIELDS",
        },
        400
      );
    }

    if (!authorWallet) {
      return c.json(
        {
          error: "Author wallet address is required for manuscript submission",
          code: "MISSING_WALLET",
          message: "Please provide your wallet address to submit manuscripts",
        },
        400
      );
    }

    console.log(`🔍 Checking CV registration for wallet: ${authorWallet}`);
    const userCV = await dbService.getUserCVByWalletAddress(authorWallet);

    if (!userCV) {
      return c.json(
        {
          error: "CV registration required",
          code: "CV_REQUIRED",
          message:
            "You must upload and register your CV before submitting manuscripts. Please visit the CV upload page first.",
          requiresCV: true,
          walletAddress: authorWallet,
        },
        403
      );
    }

    console.log(
      `✅ CV verified for user: ${
        userCV.cv_data?.selfIdentity?.fullName || "Unknown"
      }`
    );

    const cvAuthorName = userCV.cv_data?.selfIdentity?.fullName;
    if (
      cvAuthorName &&
      !author
        .toLowerCase()
        .includes(cvAuthorName.toLowerCase().split(" ")[0]) &&
      !cvAuthorName.toLowerCase().includes(author.toLowerCase().split(" ")[0])
    ) {
      console.log(
        `⚠️ Author name mismatch: manuscript author "${author}" vs CV author "${cvAuthorName}"`
      );
    }

    console.log(
      `📄 Processing file: ${file.name} (${file.size} bytes, ${file.type})`
    );

    console.log("🔍 Checking IPFS service status...");
    try {
      await ipfsService.initialize();
      console.log("✅ IPFS service initialized successfully");
    } catch (initError) {
      console.error("❌ IPFS service initialization failed:", initError);
      return c.json(
        {
          error: "IPFS service initialization failed",
          details:
            initError instanceof Error
              ? initError.message
              : "Unknown initialization error",
          code: "IPFS_INIT_ERROR",
        },
        500
      );
    }

    console.log("📤 Converting file to buffer...");
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    console.log(`✅ File converted: ${uint8Array.length} bytes`);

    // Get file extension from original file
    const fileExtension = file.name.split(".").pop() || "pdf";
    // Create new filename using the title
    const manuscriptFilename = `${title}.${fileExtension}`;

    console.log("🚀 Uploading manuscript to Pinata IPFS...");
    const manuscriptCid = await ipfsService.addFile(
      uint8Array,
      manuscriptFilename
    );
    console.log(`✅ Manuscript uploaded successfully!`);
    console.log(`📄 Manuscript uploaded as: ${manuscriptFilename}`);
    console.log(`🆔 Manuscript CID: ${manuscriptCid}`);

    // Create and upload metadata
    console.log("📝 Creating metadata file...");
    const metadata = {
      title,
      author,
      category,
      abstract: abstract || "",
      keywords: keywords ? keywords.split(",").map((k) => k.trim()) : [],
      filename: manuscriptFilename,
      fileSize: file.size,
      fileType: file.type,
      uploadedAt: new Date().toISOString(),
      manuscriptCid,
    };

    const metadataStr = JSON.stringify(metadata, null, 2);
    const metadataBytes = new TextEncoder().encode(metadataStr);
    const metadataFilename = `metadata-${title}.json`;

    console.log("🚀 Uploading metadata to Pinata IPFS...");
    const metadataCid = await ipfsService.addFile(
      metadataBytes,
      metadataFilename
    );
    console.log(`✅ Metadata uploaded successfully!`);
    console.log(`📄 Metadata file: ${metadataFilename}`);
    console.log(`🆔 Metadata CID: ${metadataCid}`);

    console.log("💾 Saving manuscript to database...");
    const savedManuscript = await dbService.saveJournal({
      title,
      author,
      category: [category],
      ipfsHash: manuscriptCid,
      metadataCid,
      abstract: abstract || undefined,
      keywords: keywords ? keywords.split(",").map((k) => k.trim()) : [],
      authorWallet,
      status: "under_review",
    });

    const reviewRecord = await dbService.createReview({
      manuscript_id: savedManuscript.id,
      status: "submitted",
      review_days: 30,
    });

    const autoAssign =
      formData.get("autoAssign") === "true" ||
      c.req.query("autoAssign") === "true";
    const aiAutoAssign =
      formData.get("aiAutoAssign") === "true" ||
      c.req.query("aiAutoAssign") === "true";
    let autoAssignmentResult = null;

    if (aiAutoAssign) {
      console.log(`🤖 AI Auto-assigning reviewer...`);
      autoAssignmentResult =
        await aiReviewerAssignmentService.aiAutoAssignReviewer(
          savedManuscript.id
        );

      if (autoAssignmentResult.success) {
        console.log(
          `✅ AI Auto-assigned reviewer: ${
            autoAssignmentResult.assignedReviewer
          } (confidence: ${autoAssignmentResult.confidenceLevel.toFixed(2)})`
        );
      } else {
        console.log(
          `⚠️ AI Auto-assignment failed: ${autoAssignmentResult.reasoning}`
        );
      }
    } else if (autoAssign) {
      console.log(`🤖 Auto-assigning reviewer...`);
      autoAssignmentResult = await reviewerAssignmentService.autoAssignReviewer(
        savedManuscript.id
      );

      if (autoAssignmentResult.success) {
        console.log(
          `✅ Auto-assigned reviewer: ${autoAssignmentResult.assignedReviewer}`
        );
      } else {
        console.log(
          `⚠️ Auto-assignment failed: ${autoAssignmentResult.reason}`
        );
      }
    }

    console.log(
      `✅ Manuscript saved to database with ID: ${savedManuscript.id}`
    );

    return c.json({
      success: true,
      manuscript: {
        id: savedManuscript.id,
        cid: manuscriptCid,
        title,
        author,
        category,
        filename: manuscriptFilename,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
        submittedAt: savedManuscript.created_at,
      },
      metadata: {
        cid: metadataCid,
        filename: metadataFilename,
      },
      ipfsUrls: {
        manuscript: `https://ipfs.io/ipfs/${manuscriptCid}`,
        metadata: `https://ipfs.io/ipfs/${metadataCid}`,
      },
      review: {
        id: reviewRecord.id,
        status: "submitted",
        autoAssignmentAttempted: autoAssign || aiAutoAssign,
        autoAssignmentResult: autoAssignmentResult,
      },
      smartContract: {
        ipfs_hash: manuscriptCid,
        metadata_cid: metadataCid,
        callData: {
          function: "submit_manuscript",
          parameter: manuscriptCid,
        },
      },
      message: "Manuscript uploaded to IPFS and saved to database successfully",
    });
  } catch (error: any) {
    console.error("❌ Manuscript upload error:", error);
    console.error("❌ Error stack:", error.stack);

    let errorCode = "UPLOAD_ERROR";
    let errorMessage = "Failed to upload manuscript";

    if (error.message?.includes("Pinata")) {
      errorCode = "PINATA_ERROR";
      errorMessage = "Pinata IPFS upload failed";
    } else if (error.message?.includes("authentication")) {
      errorCode = "AUTH_ERROR";
      errorMessage = "Pinata authentication failed";
    } else if (error.message?.includes("network")) {
      errorCode = "NETWORK_ERROR";
      errorMessage = "Network connection failed";
    } else if (error.message?.includes("CV")) {
      errorCode = "CV_ERROR";
      errorMessage = "CV verification failed";
    } else if (error.message?.includes("database")) {
      errorCode = "DATABASE_ERROR";
      errorMessage = "Database operation failed";
    }

    return c.json(
      {
        error: errorMessage,
        details: error.message || "Unknown error occurred",
        code: errorCode,
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

manuscriptsRoutes.get("/pending-review", async (c) => {
  try {
    const limitStr = c.req.query("limit");
    const limit = limitStr ? parseInt(limitStr) : 20;
    const categoryParam = c.req.query("category");
    const reviewerWallet = c.req.query("reviewerWallet");

    if (limit < 1 || limit > 100) {
      return c.json(
        {
          error: "Limit must be between 1 and 100",
          code: "INVALID_LIMIT",
        },
        400
      );
    }

    console.log(
      `🔍 Fetching ${limit} manuscripts pending review${
        reviewerWallet ? ` for reviewer: ${reviewerWallet}` : ""
      }`
    );

    // Get manuscripts that are under review
    const manuscripts = await dbService.getManuscriptsByStatus(
      "under_review",
      limit,
      categoryParam
    );

    // If reviewerWallet is provided, filter out manuscripts they've already reviewed
    // AND manuscripts they authored themselves
    let filteredManuscripts = manuscripts;
    if (reviewerWallet) {
      const reviewedManuscriptIds =
        await dbService.getReviewedManuscriptIdsByReviewer(reviewerWallet);

      filteredManuscripts = manuscripts.filter((manuscript: any) => {
        // Filter out already reviewed manuscripts
        const alreadyReviewed = reviewedManuscriptIds.includes(manuscript.id);

        // Filter out manuscripts authored by the reviewer
        const isAuthor = manuscript.author_wallet === reviewerWallet;

        // Only include if not already reviewed AND not authored by reviewer
        return !alreadyReviewed && !isAuthor;
      });

      const reviewedCount = manuscripts.filter((m: any) =>
        reviewedManuscriptIds.includes(m.id)
      ).length;

      const authoredCount = manuscripts.filter(
        (m: any) => m.author_wallet === reviewerWallet
      ).length;

      console.log(
        `🔍 Filtered out ${reviewedCount} already reviewed and ${authoredCount} self-authored manuscripts for ${reviewerWallet}`
      );
    }

    const enhancedManuscripts = filteredManuscripts.map((manuscript: any) => ({
      id: manuscript.id,
      title: manuscript.title,
      author: manuscript.author,
      category: manuscript.category,
      abstract: manuscript.abstract,
      keywords: manuscript.keywords,
      status: manuscript.status,
      submissionDate: manuscript.submission_date,
      cid: manuscript.ipfs_hash,
      metadataCid: manuscript.metadata_cid,
      reviewInfo: {
        reviewsCompleted: manuscript.reviews_completed || 0,
        reviewsRequired: 3, // Minimum 3 reviews required
        canPublish:
          (manuscript.reviews_completed || 0) >= 3 &&
          manuscript.reviews_approved >= 2,
      },
      ipfsUrls: {
        manuscript: `https://ipfs.io/ipfs/${manuscript.ipfs_hash}`,
        metadata: manuscript.metadata_cid
          ? `https://ipfs.io/ipfs/${manuscript.metadata_cid}`
          : null,
      },
    }));

    return c.json({
      success: true,
      status: "under_review",
      count: enhancedManuscripts.length,
      limit,
      manuscripts: enhancedManuscripts,
      message: "Manuscripts pending review retrieved successfully",
    });
  } catch (error: any) {
    console.error("Failed to fetch pending review manuscripts:", error);
    return c.json(
      {
        error: "Failed to fetch pending review manuscripts",
        details: error.message,
        code: "FETCH_PENDING_MANUSCRIPTS_ERROR",
      },
      500
    );
  }
});

manuscriptsRoutes.get("/published", async (c) => {
  try {
    const limitStr = c.req.query("limit");
    const limit = limitStr ? parseInt(limitStr) : 10;

    if (limit < 1 || limit > 50) {
      return c.json(
        {
          error: "Limit must be between 1 and 50",
          code: "INVALID_LIMIT",
        },
        400
      );
    }

    console.log(`🔍 Fetching ${limit} published manuscripts (all categories)`);

    const manuscripts = await dbService.getManuscriptsByStatus(
      "published",
      limit
    );

    const enhancedManuscripts = manuscripts.map((manuscript: any) => ({
      id: manuscript.id,
      title: manuscript.title,
      author: manuscript.author,
      category: manuscript.category,
      abstract: manuscript.abstract,
      keywords: manuscript.keywords,
      status: manuscript.status,
      submissionDate: manuscript.submission_date,
      publishedDate: manuscript.published_date,
      cid: manuscript.ipfs_hash,
      metadataCid: manuscript.metadata_cid,
      ipfsUrls: {
        manuscript: `https://ipfs.io/ipfs/${manuscript.ipfs_hash}`,
        metadata: manuscript.metadata_cid
          ? `https://ipfs.io/ipfs/${manuscript.metadata_cid}`
          : null,
      },
      gateways: [
        `https://ipfs.io/ipfs/${manuscript.ipfs_hash}`,
        `https://gateway.pinata.cloud/ipfs/${manuscript.ipfs_hash}`,
        `https://dweb.link/ipfs/${manuscript.ipfs_hash}`,
      ],
    }));

    return c.json({
      success: true,
      category: "All",
      count: enhancedManuscripts.length,
      limit,
      manuscripts: enhancedManuscripts,
      message: "All published manuscripts retrieved successfully",
    });
  } catch (error: any) {
    console.error("Failed to fetch all published manuscripts:", error);
    return c.json(
      {
        error: "Failed to fetch published manuscripts",
        details: error.message,
        code: "FETCH_PUBLISHED_MANUSCRIPTS_ERROR",
      },
      500
    );
  }
});

manuscriptsRoutes.get("/published/:category", async (c) => {
  try {
    const categoryParam = c.req.param("category");
    const limitStr = c.req.query("limit");
    const limit = limitStr ? parseInt(limitStr) : 10;

    if (!categoryParam) {
      return c.json(
        {
          error: "Category parameter is required",
          code: "MISSING_CATEGORY",
        },
        400
      );
    }

    if (limit < 1 || limit > 50) {
      return c.json(
        {
          error: "Limit must be between 1 and 50",
          code: "INVALID_LIMIT",
        },
        400
      );
    }

    const categoryArray = categoryParam.split(",").map((c) => c.trim());

    console.log(
      `🔍 Fetching ${limit} published manuscripts for categories: ${categoryArray.join(
        ", "
      )}`
    );

    const manuscripts = await dbService.getPublishedJournalsByCategory(
      categoryArray,
      limit
    );

    const enhancedManuscripts = manuscripts.map((manuscript: any) => ({
      id: manuscript.id,
      title: manuscript.title,
      author: manuscript.author,
      category: manuscript.category,
      abstract: manuscript.abstract,
      keywords: manuscript.keywords,
      status: manuscript.status,
      submissionDate: manuscript.submission_date,
      publishedDate: manuscript.published_date,
      cid: manuscript.ipfs_hash,
      metadataCid: manuscript.metadata_cid,
      ipfsUrls: {
        manuscript: `https://ipfs.io/ipfs/${manuscript.ipfs_hash}`,
        metadata: manuscript.metadata_cid
          ? `https://ipfs.io/ipfs/${manuscript.metadata_cid}`
          : null,
      },
      gateways: [
        `https://ipfs.io/ipfs/${manuscript.ipfs_hash}`,
        `https://gateway.pinata.cloud/ipfs/${manuscript.ipfs_hash}`,
        `https://dweb.link/ipfs/${manuscript.ipfs_hash}`,
      ],
    }));

    return c.json({
      success: true,
      category: categoryArray,
      count: enhancedManuscripts.length,
      limit,
      manuscripts: enhancedManuscripts,
      message: "Published manuscripts retrieved successfully",
    });
  } catch (error: any) {
    console.error("Failed to fetch published manuscripts:", error);
    return c.json(
      {
        error: "Failed to fetch published manuscripts",
        details: error.message,
        code: "FETCH_PUBLISHED_MANUSCRIPTS_ERROR",
      },
      500
    );
  }
});

// Publish a manuscript after successful review
manuscriptsRoutes.post("/:id/publish", async (c) => {
  try {
    const manuscriptId = parseInt(c.req.param("id"));
    const { publishedBy } = await c.req.json();

    if (!manuscriptId || isNaN(manuscriptId)) {
      return c.json(
        {
          error: "Valid manuscript ID is required",
          code: "INVALID_MANUSCRIPT_ID",
        },
        400
      );
    }

    console.log(`📚 Publishing manuscript ID: ${manuscriptId}`);

    // Check if manuscript exists and is ready for publication
    const manuscript = await dbService.getJournalById(manuscriptId);
    if (!manuscript) {
      return c.json(
        {
          error: "Manuscript not found",
          code: "MANUSCRIPT_NOT_FOUND",
        },
        404
      );
    }

    if (manuscript.status === "published") {
      return c.json(
        {
          error: "Manuscript is already published",
          code: "ALREADY_PUBLISHED",
        },
        400
      );
    }

    // Get review information
    const reviewInfo = await dbService.getReviewByManuscriptId(manuscriptId);
    if (!reviewInfo) {
      return c.json(
        {
          error: "No review record found for this manuscript",
          code: "NO_REVIEW_RECORD",
        },
        400
      );
    }

    // Check if minimum reviews are completed (this logic might need to be implemented in dbService)
    // For now, we'll assume the check is done externally

    // Update manuscript status to published
    const updatedManuscript = await dbService.updateJournalStatus(
      manuscriptId,
      "published",
      publishedBy
    );

    console.log(`✅ Manuscript ${manuscriptId} published successfully`);

    return c.json({
      success: true,
      manuscript: {
        id: updatedManuscript.id,
        title: updatedManuscript.title,
        author: updatedManuscript.author,
        status: "published",
        publishedDate: updatedManuscript.published_date,
        publishedBy: publishedBy,
      },
      message: "Manuscript published successfully",
    });
  } catch (error: any) {
    console.error("Failed to publish manuscript:", error);
    return c.json(
      {
        error: "Failed to publish manuscript",
        details: error.message,
        code: "PUBLISH_MANUSCRIPT_ERROR",
      },
      500
    );
  }
});

// Get manuscripts by status
manuscriptsRoutes.get("/status/:status", async (c) => {
  try {
    const status = c.req.param("status");
    const limitStr = c.req.query("limit");
    const limit = limitStr ? parseInt(limitStr) : 20;
    const categoryParam = c.req.query("category");

    if (!status) {
      return c.json(
        {
          error: "Status parameter is required",
          code: "MISSING_STATUS",
        },
        400
      );
    }

    const validStatuses = ["under_review", "published", "rejected"];
    if (!validStatuses.includes(status)) {
      return c.json(
        {
          error: "Invalid status. Valid statuses: " + validStatuses.join(", "),
          code: "INVALID_STATUS",
        },
        400
      );
    }

    if (limit < 1 || limit > 100) {
      return c.json(
        {
          error: "Limit must be between 1 and 100",
          code: "INVALID_LIMIT",
        },
        400
      );
    }

    console.log(`🔍 Fetching ${limit} manuscripts with status: ${status}`);

    const manuscripts = await dbService.getManuscriptsByStatus(
      status,
      limit,
      categoryParam
    );

    const enhancedManuscripts = manuscripts.map((manuscript: any) => ({
      id: manuscript.id,
      title: manuscript.title,
      author: manuscript.author,
      category: manuscript.category,
      abstract: manuscript.abstract,
      keywords: manuscript.keywords,
      status: manuscript.status,
      submissionDate: manuscript.submission_date,
      publishedDate: manuscript.published_date,
      cid: manuscript.ipfs_hash,
      metadataCid: manuscript.metadata_cid,
      ipfsUrls: {
        manuscript: `https://ipfs.io/ipfs/${manuscript.ipfs_hash}`,
        metadata: manuscript.metadata_cid
          ? `https://ipfs.io/ipfs/${manuscript.metadata_cid}`
          : null,
      },
    }));

    return c.json({
      success: true,
      status,
      count: enhancedManuscripts.length,
      limit,
      manuscripts: enhancedManuscripts,
      message: `Manuscripts with status '${status}' retrieved successfully`,
    });
  } catch (error: any) {
    console.error(
      `Failed to fetch manuscripts with status ${c.req.param("status")}:`,
      error
    );
    return c.json(
      {
        error: `Failed to fetch manuscripts with status ${c.req.param(
          "status"
        )}`,
        details: error.message,
        code: "FETCH_MANUSCRIPTS_BY_STATUS_ERROR",
      },
      500
    );
  }
});

// Legacy endpoint - kept for backward compatibility but now only shows published manuscripts
manuscriptsRoutes.get("/recent/:category", async (c) => {
  try {
    const categoryParam = c.req.param("category");
    const limitStr = c.req.query("limit");
    const limit = limitStr ? parseInt(limitStr) : 5;

    console.log(
      "⚠️ Using legacy /recent endpoint. Consider using /published/:category instead"
    );

    if (!categoryParam) {
      return c.json(
        {
          error: "Category parameter is required",
          code: "MISSING_CATEGORY",
        },
        400
      );
    }

    if (limit < 1 || limit > 50) {
      return c.json(
        {
          error: "Limit must be between 1 and 50",
          code: "INVALID_LIMIT",
        },
        400
      );
    }

    const categoryArray = categoryParam.split(",").map((c) => c.trim());

    console.log(
      `🔍 Fetching ${limit} published manuscripts for categories: ${categoryArray.join(
        ", "
      )} (legacy endpoint)`
    );

    // Only show published manuscripts to maintain the new workflow
    const manuscripts = await dbService.getPublishedJournalsByCategory(
      categoryArray,
      limit
    );

    const enhancedManuscripts = manuscripts.map((manuscript: any) => ({
      id: manuscript.id,
      title: manuscript.title,
      author: manuscript.author,
      category: manuscript.category,
      abstract: manuscript.abstract,
      keywords: manuscript.keywords,
      status: manuscript.status,
      submissionDate: manuscript.submission_date,
      publishedDate: manuscript.published_date,
      cid: manuscript.ipfs_hash,
      metadataCid: manuscript.metadata_cid,
      ipfsUrls: {
        manuscript: `https://ipfs.io/ipfs/${manuscript.ipfs_hash}`,
        metadata: manuscript.metadata_cid
          ? `https://ipfs.io/ipfs/${manuscript.metadata_cid}`
          : null,
      },
      gateways: [
        `https://ipfs.io/ipfs/${manuscript.ipfs_hash}`,
        `https://gateway.pinata.cloud/ipfs/${manuscript.ipfs_hash}`,
        `https://dweb.link/ipfs/${manuscript.ipfs_hash}`,
      ],
    }));

    return c.json({
      success: true,
      category: categoryArray,
      count: enhancedManuscripts.length,
      limit,
      manuscripts: enhancedManuscripts,
      message: "Published manuscripts retrieved successfully (legacy endpoint)",
    });
  } catch (error: any) {
    console.error("Failed to fetch recent manuscripts:", error);
    return c.json(
      {
        error: "Failed to fetch recent manuscripts",
        details: error.message,
        code: "FETCH_MANUSCRIPTS_ERROR",
      },
      500
    );
  }
});

manuscriptsRoutes.get("/categories", async (c) => {
  try {
    const categories = await dbService.getAllCategories();

    return c.json({
      success: true,
      categories: categories.map((cat) => ({
        name: cat.category,
        count: parseInt(cat.count),
      })),
    });
  } catch (error: any) {
    console.error("Failed to fetch categories:", error);
    return c.json(
      {
        error: "Failed to fetch categories",
        details: error.message,
        code: "FETCH_CATEGORIES_ERROR",
      },
      500
    );
  }
});

manuscriptsRoutes.get("/author/:walletAddress", async (c) => {
  try {
    const authorWallet = c.req.param("walletAddress");

    if (!authorWallet) {
      return c.json({ error: "Author wallet address is required" }, 400);
    }

    console.log(`📚 Fetching manuscripts for author: ${authorWallet}`);

    const manuscripts = await dbService.getManuscriptsByAuthorWallet(
      authorWallet
    );

    // Transform manuscripts to match expected format
    const transformedManuscripts = manuscripts.map((manuscript: any) => ({
      id: manuscript.id.toString(),
      title: manuscript.title,
      abstract: manuscript.abstract || "",
      category: manuscript.category || [],
      keywords: manuscript.keywords || [],
      author_wallet: manuscript.author_wallet,
      status: manuscript.status || "under_review",
      submissionDate: manuscript.submission_date || manuscript.created_at,
      created_at: manuscript.created_at,
      updated_at: manuscript.updated_at,
      publishedDate: manuscript.published_date,
      cid: manuscript.ipfs_hash || manuscript.metadata_cid,
      ipfs_hash: manuscript.ipfs_hash,
      reviewInfo: manuscript.reviewInfo,
      reviews: manuscript.reviews,
    }));

    return c.json({
      success: true,
      manuscripts: transformedManuscripts,
    });
  } catch (error: any) {
    console.error("❌ Error fetching manuscripts for author:", error);
    return c.json(
      {
        error: "Failed to fetch manuscripts",
        message: error.message,
      },
      500
    );
  }
});

manuscriptsRoutes.get("/:cid", async (c) => {
  try {
    const cid = c.req.param("cid");
    if (!cid) {
      return c.json(
        {
          error: "Invalid CID provided",
          code: "INVALID_CID",
        },
        400
      );
    }

    if (!cid.startsWith("Qm") && !cid.startsWith("baf")) {
      return c.json(
        {
          error: "Invalid IPFS hash format. Expected Qm... or baf... format.",
          code: "INVALID_HASH_FORMAT",
        },
        400
      );
    }

    const fileData = await ipfsService.getFile(cid);

    const textContent = new TextDecoder().decode(fileData);
    let contentType = "application/octet-stream";

    try {
      JSON.parse(textContent);
      contentType = "application/json";
    } catch {
      if (textContent.includes("# ") || textContent.includes("## ")) {
        contentType = "text/markdown";
      } else if (
        textContent.includes("<html") ||
        textContent.includes("<!DOCTYPE")
      ) {
        contentType = "text/html";
      } else {
        contentType = "text/plain";
      }
    }

    return new Response(new Uint8Array(fileData), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${cid}"`,
      },
    });
  } catch (error: any) {
    console.error("File retrieval error:", error);
    return c.json(
      {
        error: "Failed to retrieve manuscript",
        details: error.message,
        code: "RETRIEVAL_ERROR",
      },
      500
    );
  }
});

manuscriptsRoutes.get("/info/:cid", async (c) => {
  try {
    const cid = c.req.param("cid");
    if (!cid) {
      return c.json(
        {
          error: "No CID provided",
          code: "MISSING_CID",
        },
        400
      );
    }

    if (!cid.startsWith("Qm") && !cid.startsWith("baf")) {
      return c.json(
        {
          error: "Invalid IPFS hash format. Expected Qm... or baf... format.",
          code: "INVALID_HASH_FORMAT",
        },
        400
      );
    }

    const fileData = await ipfsService.getFile(cid);

    return c.json({
      success: true,
      manuscript: {
        cid: cid,
        size: fileData.length,
        exists: true,
        ipfsUrl: `https://ipfs.io/ipfs/${cid}`,
        gateways: [
          `https://ipfs.io/ipfs/${cid}`,
          `https://gateway.pinata.cloud/ipfs/${cid}`,
          `https://dweb.link/ipfs/${cid}`,
        ],
      },
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        manuscript: null,
        error: "Manuscript not found or not accessible",
        code: "NOT_FOUND",
      },
      404
    );
  }
});

manuscriptsRoutes.get("/stats/overview", async (c) => {
  try {
    const authorWallet = c.req.query("authorWallet");

    let publishedCount = 0;
    let availableForReviewCount = 0;
    let docisMintedCount = 0;

    if (authorWallet) {
      const authorManuscripts = await dbService.getManuscriptsByAuthorWallet(
        authorWallet
      );

      publishedCount = authorManuscripts.filter(
        (m) => m.status === "published"
      ).length;
      availableForReviewCount = authorManuscripts.filter(
        (m) => m.status === "under_review"
      ).length;
      docisMintedCount = publishedCount;
    } else {
      const publishedManuscripts = await dbService.getManuscriptsByStatus(
        "published",
        1000
      );
      const underReviewManuscripts = await dbService.getManuscriptsByStatus(
        "under_review",
        1000
      );

      publishedCount = publishedManuscripts.length;
      availableForReviewCount = underReviewManuscripts.length;
      docisMintedCount = publishedCount; // Same as published papers
    }

    const stats = {
      papersPublished: publishedCount,
      papersAvailableForReview: availableForReviewCount,
      docisMinted: docisMintedCount,
      // Additional metrics for dashboard compatibility
      totalSubmissions: publishedCount + availableForReviewCount,
      published: publishedCount,
      underReview: availableForReviewCount,
    };

    return c.json({
      success: true,
      stats,
      message: authorWallet
        ? "Author statistics retrieved successfully"
        : "Platform statistics retrieved successfully",
    });
  } catch (error: any) {
    console.error("❌ Error fetching manuscript stats:", error);
    return c.json(
      {
        error: "Failed to fetch manuscript statistics",
        details: error.message,
        code: "FETCH_STATS_ERROR",
      },
      500
    );
  }
});

export { manuscriptsRoutes };
