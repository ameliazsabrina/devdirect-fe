import { Hono } from "hono";
import { dbService } from "../services/supabase/index";
import { reviewerAssignmentService } from "../services/reviewer-assignment-service";
import { aiReviewerAssignmentService } from "../services/ai-reviewer-assignment-service";

const reviewRoutes = new Hono();

reviewRoutes.post("/", async (c) => {
  try {
    const {
      manuscript_id,
      assigned_reviewer,
      assigned_editor,
      review_days = 30, // Default 30 days, can be customized
    } = await c.req.json();

    if (!manuscript_id) {
      return c.json({ error: "manuscript_id is required" }, 400);
    }

    const review = await dbService.createReview({
      manuscript_id,
      assigned_reviewer,
      assigned_editor,
      review_days,
    });

    return c.json({
      success: true,
      review,
      message: `Review created with ${review_days}-day deadline`,
    });
  } catch (error: any) {
    console.error("❌ Error creating review:", error);
    return c.json({ error: error.message }, 500);
  }
});

reviewRoutes.get("/", async (c) => {
  try {
    const status = c.req.query("status");
    const reviewer = c.req.query("reviewer");
    const editor = c.req.query("editor");
    const author = c.req.query("author");
    const limit = c.req.query("limit");
    const overdue = c.req.query("overdue") === "true";

    const filters = {
      status: status || undefined,
      assigned_reviewer: reviewer || undefined,
      assigned_editor: editor || undefined,
      manuscript_author: author || undefined,
      limit: limit ? parseInt(limit) : undefined,
      overdue_only: overdue,
    };

    const reviews = await dbService.getReviews(filters);

    const reviewsWithStatus = reviews.map((review: any) => ({
      ...review,
      is_overdue: review.review_deadline
        ? new Date(review.review_deadline) < new Date()
        : false,
      days_until_deadline: review.review_deadline
        ? Math.ceil(
            (new Date(review.review_deadline).getTime() -
              new Date().getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null,
    }));

    return c.json({
      success: true,
      reviews: reviewsWithStatus,
      total: reviewsWithStatus.length,
      overdue_count: reviewsWithStatus.filter((r: any) => r.is_overdue).length,
    });
  } catch (error: any) {
    console.error("❌ Error fetching reviews:", error);
    return c.json({ error: error.message }, 500);
  }
});

reviewRoutes.get("/reviewer/:walletAddress", async (c) => {
  try {
    const reviewerWallet = c.req.param("walletAddress");
    const limit = parseInt(c.req.query("limit") || "50");

    const reviews = await dbService.getReviewsByReviewerWallet(
      reviewerWallet,
      limit
    );

    const transformedReviews = reviews.map((review: any) => {
      const manuscript = review.journals;

      let status = review.status || "pending";
      if (
        review.deadline &&
        new Date(review.deadline) < new Date() &&
        status !== "completed"
      ) {
        status = "overdue";
      } else if (review.comments || review.confidential_comments) {
        status = "in_progress";
      }

      return {
        id: review.id.toString(),
        manuscript_id: review.manuscript_id.toString(),
        manuscript: {
          id: manuscript.id.toString(),
          title: manuscript.title,
          author: manuscript.author,
          abstract: manuscript.abstract || "",
          category: manuscript.category || [],
          keywords: manuscript.keywords || [],
          submissionDate: manuscript.submission_date || manuscript.created_at,
          ipfs_hash: manuscript.ipfs_hash,
          cid: manuscript.ipfs_hash,
        },
        status,
        assigned_date: review.assigned_date,
        deadline: review.deadline,
        comments: review.comments,
        confidential_comments: review.confidential_comments,
        decision: review.recommendation,
        completed_date: review.completed_date,
      };
    });

    return c.json({
      success: true,
      reviews: transformedReviews,
    });
  } catch (error: any) {
    console.error("❌ Error fetching reviews for reviewer:", error);
    return c.json({ error: error.message }, 500);
  }
});

reviewRoutes.get("/:id", async (c) => {
  try {
    const reviewId = parseInt(c.req.param("id"));
    const review = await dbService.getReviewById(reviewId);

    if (!review) {
      return c.json({ error: "Review not found" }, 404);
    }

    const manuscript = review.journals;

    const transformedReview = {
      id: review.id.toString(),
      manuscript_id: review.manuscript_id.toString(),
      reviewer_wallet: review.reviewer_wallet,
      status: review.status || "pending",
      assigned_date: review.assigned_date,
      deadline: review.deadline,
      comments: review.comments,
      confidential_comments: review.confidential_comments,
      decision: review.recommendation,
      manuscript: {
        id: manuscript.id.toString(),
        title: manuscript.title,
        author: manuscript.author,
        abstract: manuscript.abstract || "",
        category: manuscript.category || [],
        keywords: manuscript.keywords || [],
        submissionDate: manuscript.submission_date || manuscript.created_at,
        ipfs_hash: manuscript.ipfs_hash,
        cid: manuscript.ipfs_hash,
      },
    };

    return c.json({ success: true, review: transformedReview });
  } catch (error: any) {
    console.error("❌ Error fetching review:", error);
    return c.json({ error: error.message }, 500);
  }
});

reviewRoutes.put("/:id", async (c) => {
  try {
    const reviewId = parseInt(c.req.param("id"));
    const updates = await c.req.json();

    const review = await dbService.updateReview(reviewId, updates);

    return c.json({ success: true, review });
  } catch (error: any) {
    console.error("❌ Error updating review:", error);
    return c.json({ error: error.message }, 500);
  }
});

reviewRoutes.put("/:id/assign", async (c) => {
  try {
    const reviewId = parseInt(c.req.param("id"));
    const { assigned_reviewer, assigned_editor, review_deadline, review_days } =
      await c.req.json();

    let updates: any = {};

    if (assigned_reviewer) updates.assigned_reviewer = assigned_reviewer;
    if (assigned_editor) updates.assigned_editor = assigned_editor;
    if (review_deadline) updates.review_deadline = new Date(review_deadline);
    if (review_days) {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + review_days);
      updates.review_deadline = deadline;
    }

    if (assigned_reviewer && !updates.status) {
      updates.status = "assigned";
    }

    const review = await dbService.updateReview(reviewId, updates);

    return c.json({
      success: true,
      review,
      message: "Review assignment updated successfully",
    });
  } catch (error: any) {
    console.error("❌ Error assigning review:", error);
    return c.json({ error: error.message }, 500);
  }
});

reviewRoutes.put("/:id/status", async (c) => {
  try {
    const reviewId = parseInt(c.req.param("id"));
    const { status } = await c.req.json();

    if (!status) {
      return c.json({ error: "Status is required" }, 400);
    }

    const validStatuses = [
      "submitted",
      "assigned",
      "in_review",
      "reviewed",
      "accepted",
      "rejected",
      "revision_required",
    ];

    if (!validStatuses.includes(status)) {
      return c.json(
        {
          error: "Invalid status",
          valid_statuses: validStatuses,
        },
        400
      );
    }

    const review = await dbService.updateReview(reviewId, { status });

    return c.json({
      success: true,
      review,
      message: `Review status updated to: ${status}`,
    });
  } catch (error: any) {
    console.error("❌ Error updating review status:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Extend deadline
reviewRoutes.put("/:id/extend-deadline", async (c) => {
  try {
    const reviewId = parseInt(c.req.param("id"));
    const { days, reason } = await c.req.json();

    if (!days || days <= 0) {
      return c.json({ error: "Valid number of days is required" }, 400);
    }

    const updates: any = { extend_deadline_days: days };
    if (reason) {
      updates.editor_notes = reason;
    }

    const review = await dbService.updateReview(reviewId, updates);

    return c.json({
      success: true,
      review,
      message: `Deadline extended by ${days} days`,
    });
  } catch (error: any) {
    console.error("❌ Error extending deadline:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get review by manuscript ID
reviewRoutes.get("/manuscript/:manuscriptId", async (c) => {
  try {
    const manuscriptId = parseInt(c.req.param("manuscriptId"));
    const review = await dbService.getReviewByManuscriptId(manuscriptId);

    if (!review) {
      return c.json({ error: "Review not found for this manuscript" }, 404);
    }

    const reviewWithStatus = {
      ...review,
      is_overdue: review.review_deadline
        ? new Date(review.review_deadline) < new Date()
        : false,
      days_until_deadline: review.review_deadline
        ? Math.ceil(
            (new Date(review.review_deadline).getTime() -
              new Date().getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null,
    };

    return c.json({ success: true, review: reviewWithStatus });
  } catch (error: any) {
    console.error("❌ Error fetching review by manuscript:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Auto-assign reviewer endpoint
reviewRoutes.post("/:id/auto-assign", async (c) => {
  try {
    const reviewId = parseInt(c.req.param("id"));

    // Get manuscript ID from review
    const review = await dbService.getReviewById(reviewId);
    if (!review) {
      return c.json({ error: "Review not found" }, 404);
    }

    if (review.assigned_reviewer) {
      return c.json(
        {
          error: "Review already has an assigned reviewer",
          assigned_reviewer: review.assigned_reviewer,
        },
        400
      );
    }

    const result = await reviewerAssignmentService.autoAssignReviewer(
      review.manuscript_id
    );

    if (result.success) {
      return c.json({
        success: true,
        message: "Reviewer auto-assigned successfully",
        assignedReviewer: result.assignedReviewer,
        reason: result.reason,
        qualifiedReviewersCount: result.qualifiedReviewers?.length || 0,
      });
    } else {
      return c.json(
        {
          success: false,
          error: result.reason,
          qualifiedReviewers: result.qualifiedReviewers,
        },
        400
      );
    }
  } catch (error: any) {
    console.error("❌ Auto-assignment error:", error);
    return c.json(
      {
        error: "Auto-assignment failed",
        message: error.message,
      },
      500
    );
  }
});

// Get qualified reviewers for a manuscript
reviewRoutes.get("/manuscript/:manuscriptId/qualified-reviewers", async (c) => {
  try {
    const manuscriptId = parseInt(c.req.param("manuscriptId"));

    const manuscript = await dbService.getJournalById(manuscriptId);
    if (!manuscript) {
      return c.json({ error: "Manuscript not found" }, 404);
    }

    const qualifiedReviewers =
      await reviewerAssignmentService.getQualifiedReviewers(
        manuscript.category || [],
        manuscript.title,
        manuscript.abstract
      );

    return c.json({
      success: true,
      manuscript: {
        id: manuscript.id,
        title: manuscript.title,
        category: manuscript.category,
      },
      qualifiedReviewers,
      total: qualifiedReviewers.length,
    });
  } catch (error: any) {
    console.error("❌ Error getting qualified reviewers:", error);
    return c.json(
      {
        error: "Failed to get qualified reviewers",
        message: error.message,
      },
      500
    );
  }
});

// Get reviewer qualification details
reviewRoutes.get("/reviewer/:walletAddress/qualification", async (c) => {
  try {
    const walletAddress = c.req.param("walletAddress");

    const qualification =
      await reviewerAssignmentService.getReviewerQualification(walletAddress);

    if (!qualification) {
      return c.json({ error: "No CV data found for this reviewer" }, 404);
    }

    return c.json({
      success: true,
      qualification,
    });
  } catch (error: any) {
    console.error("❌ Error getting reviewer qualification:", error);
    return c.json(
      {
        error: "Failed to get reviewer qualification",
        message: error.message,
      },
      500
    );
  }
});

// AI-powered auto-assign reviewer endpoint
reviewRoutes.post("/:id/ai-auto-assign", async (c) => {
  try {
    const reviewId = parseInt(c.req.param("id"));

    // Get manuscript ID from review
    const review = await dbService.getReviewById(reviewId);
    if (!review) {
      return c.json({ error: "Review not found" }, 404);
    }

    if (review.assigned_reviewer) {
      return c.json(
        {
          error: "Review already has an assigned reviewer",
          assigned_reviewer: review.assigned_reviewer,
        },
        400
      );
    }

    const result = await aiReviewerAssignmentService.aiAutoAssignReviewer(
      review.manuscript_id
    );

    if (result.success) {
      return c.json({
        success: true,
        message: "AI auto-assigned reviewer successfully",
        assignedReviewer: result.assignedReviewer,
        reasoning: result.reasoning,
        confidenceLevel: result.confidenceLevel,
        candidateAnalysis: result.allCandidates,
      });
    } else {
      return c.json(
        {
          success: false,
          error: result.reasoning,
          confidenceLevel: result.confidenceLevel,
          candidateAnalysis: result.allCandidates,
        },
        400
      );
    }
  } catch (error: any) {
    console.error("❌ AI auto-assignment error:", error);
    return c.json(
      {
        error: "AI auto-assignment failed",
        message: error.message,
      },
      500
    );
  }
});

// Get AI-powered reviewer recommendations
reviewRoutes.get("/manuscript/:manuscriptId/ai-recommendations", async (c) => {
  try {
    const manuscriptId = parseInt(c.req.param("manuscriptId"));

    const recommendations =
      await aiReviewerAssignmentService.getAIReviewerRecommendations(
        manuscriptId
      );

    return c.json({
      success: true,
      ...recommendations,
    });
  } catch (error: any) {
    console.error("❌ Error getting AI recommendations:", error);
    return c.json(
      {
        error: "Failed to get AI recommendations",
        message: error.message,
      },
      500
    );
  }
});
reviewRoutes.get("/manuscript/:manuscriptId/ai-analysis", async (c) => {
  try {
    const manuscriptId = parseInt(c.req.param("manuscriptId"));

    const analysis =
      await aiReviewerAssignmentService.analyzeManuscriptRequirements(
        manuscriptId
      );

    return c.json({
      success: true,
      manuscriptId,
      analysis,
    });
  } catch (error: any) {
    console.error("❌ Error analyzing manuscript:", error);
    return c.json(
      {
        error: "Failed to analyze manuscript",
        message: error.message,
      },
      500
    );
  }
});

reviewRoutes.post("/manuscript/:manuscriptId/assign-reviewers", async (c) => {
  try {
    const manuscriptId = parseInt(c.req.param("manuscriptId"));
    const { reviewers, assignedBy } = await c.req.json();

    if (!Array.isArray(reviewers) || reviewers.length < 3) {
      return c.json(
        {
          error: "Minimum 3 reviewers required",
          code: "INSUFFICIENT_REVIEWERS",
        },
        400
      );
    }

    const reviewRecords: any[] = [];
    for (const reviewerWallet of reviewers) {
      const reviewRecord = await dbService.createReview({
        manuscript_id: manuscriptId,
        assigned_reviewer: reviewerWallet,
        assigned_editor: assignedBy,
        status: "assigned",
        review_days: 30,
      });
      reviewRecords.push(reviewRecord);
    }

    return c.json({
      success: true,
      manuscriptId,
      reviewersAssigned: reviewers.length,
      reviewRecords: reviewRecords.map((r) => ({
        id: r.id,
        reviewer: reviewers[reviewRecords.indexOf(r)],
        deadline: r.review_deadline,
      })),
      message: `${reviewers.length} reviewers assigned successfully`,
    });
  } catch (error: any) {
    console.error("❌ Error assigning multiple reviewers:", error);
    return c.json(
      {
        error: "Failed to assign reviewers",
        message: error.message,
      },
      500
    );
  }
});

reviewRoutes.post("/:reviewId/submit-review", async (c) => {
  try {
    const reviewId = parseInt(c.req.param("reviewId"));
    const { decision, comments, confidentialComments, reviewerWallet } =
      await c.req.json();

    if (
      !decision ||
      !["accept", "reject", "minor_revision", "major_revision"].includes(
        decision
      )
    ) {
      return c.json(
        {
          error:
            "Valid decision required: accept, reject, minor_revision, major_revision",
          code: "INVALID_DECISION",
        },
        400
      );
    }

    if (!reviewerWallet) {
      return c.json(
        {
          error: "Reviewer wallet address is required",
          code: "MISSING_WALLET",
        },
        400
      );
    }

    const review = await dbService.getReviewById(reviewId);
    if (!review) {
      return c.json({ error: "Review not found" }, 404);
    }

    const reviewManuscript = await dbService.getJournalById(
      review.manuscript_id
    );
    if (!reviewManuscript) {
      return c.json({ error: "Manuscript not found" }, 404);
    }

    const reviewerCV = await dbService.getUserCVByWalletAddress(reviewerWallet);
    if (!reviewerCV) {
      return c.json(
        {
          error: "Reviewer not qualified",
          code: "REVIEWER_NOT_QUALIFIED",
          message: "❌ You must upload your CV first to qualify as a reviewer",
          requirements: {
            hasCV: false,
            hasBachelors: false,
            hasThreeTopicPapers: false,
            hasTopicExpertise: false,
          },
        },
        403
      );
    }

    const qualifiedReviewers =
      await reviewerAssignmentService.getQualifiedReviewers(
        reviewManuscript.category || [],
        reviewManuscript.title,
        reviewManuscript.abstract
      );

    const reviewerQualification = qualifiedReviewers.find(
      (reviewer) => reviewer.walletAddress === reviewerWallet
    );

    if (!reviewerQualification || !reviewerQualification.isQualified) {
      const generalQualification =
        await reviewerAssignmentService.getReviewerQualification(
          reviewerWallet
        );

      return c.json(
        {
          error: "Reviewer not qualified",
          code: "REVIEWER_NOT_QUALIFIED",
          message:
            "❌ You do not meet the qualification requirements to review this manuscript",
          requirements: {
            hasCV: true,
            hasBachelors: generalQualification?.hasBachelors || false,
            hasThreeTopicPapers:
              (generalQualification?.firstAuthorPapersOnTopic || 0) >= 3,
            hasTopicExpertise: false,
          },
          details: {
            reasons: generalQualification?.qualificationReasons || [
              "Must have Bachelor's degree or higher",
              "Must have 3+ first-author papers on the same topic as this manuscript",
            ],
            totalFirstAuthorPapers:
              generalQualification?.firstAuthorPapers || 0,
            topicRelevantPapers:
              generalQualification?.firstAuthorPapersOnTopic || 0,
            requiredTopicPapers: 3,
          },
        },
        403
      );
    }

    const updatedReview = await dbService.updateReview(reviewId, {
      status: "submitted",
      review_completed_at: new Date(),
      review_comments: comments,
      editor_notes: confidentialComments,
    });

    await dbService.saveDraftReview(reviewId, {
      recommendation: decision,
      reviewer_wallet: reviewerWallet,
    });

    const manuscriptForPublication = await dbService.getJournalById(
      updatedReview.manuscript_id
    );
    const allReviews = await dbService.getReviews({
      manuscript_author: manuscriptForPublication.author_wallet,
    });

    const completedReviews = allReviews.filter(
      (r) =>
        r.manuscript_id === updatedReview.manuscript_id &&
        r.status === "submitted" &&
        r.recommendation
    );

    let canPublish = false;
    let publishRecommendation = null;

    if (completedReviews.length >= 3) {
      const acceptCount = completedReviews.filter(
        (r) => r.recommendation === "accept"
      ).length;

      canPublish = acceptCount >= 2; // Require at least 2 accepts out of 3+ reviews
      publishRecommendation = canPublish ? "approve" : "reject";
    }

    return c.json({
      success: true,
      review: {
        id: reviewId,
        status: "submitted",
        decision,
        completedAt: updatedReview.review_completed_at,
      },
      manuscriptId: updatedReview.manuscript_id,
      reviewProgress: {
        completed: completedReviews.length,
        required: 3,
        canPublish,
        publishRecommendation,
      },
      message: "Review submitted successfully",
    });
  } catch (error: any) {
    console.error("❌ Error submitting review:", error);
    return c.json(
      {
        error: "Failed to submit review",
        message: error.message,
      },
      500
    );
  }
});

// Get review status for a manuscript (shows progress toward publication)
reviewRoutes.get("/manuscript/:manuscriptId/review-status", async (c) => {
  try {
    const manuscriptId = parseInt(c.req.param("manuscriptId"));

    const manuscript = await dbService.getJournalById(manuscriptId);
    if (!manuscript) {
      return c.json({ error: "Manuscript not found" }, 404);
    }

    const allReviews = await dbService.getReviews({});
    const manuscriptReviews = allReviews.filter(
      (r) => r.manuscript_id === manuscriptId
    );

    const reviewStatus = {
      manuscriptId,
      manuscriptTitle: manuscript.title,
      currentStatus: manuscript.status,
      totalReviewers: manuscriptReviews.length,
      reviewsCompleted: manuscriptReviews.filter(
        (r) => r.status === "submitted" && r.recommendation
      ).length,
      reviewsInProgress: manuscriptReviews.filter(
        (r) => r.status === "assigned" || r.status === "in_progress"
      ).length,
      reviewsPending: manuscriptReviews.filter((r) => r.status === "pending")
        .length,
      requiredReviews: 3,
      reviews: manuscriptReviews.map((r) => ({
        id: r.id,
        reviewer: r.assigned_reviewer,
        status: r.status,
        deadline: r.review_deadline,
        completed: r.review_completed_at,
        overdue: r.review_deadline
          ? new Date(r.review_deadline) < new Date()
          : false,
      })),
    };

    const completedReviews = reviewStatus.reviewsCompleted;
    const canPublish =
      completedReviews >= 3 && manuscript.status === "under_review";

    return c.json({
      success: true,
      ...reviewStatus,
      canPublish,
      nextAction: canPublish
        ? "ready_to_publish"
        : completedReviews >= 3
        ? "review_complete"
        : `need_${3 - completedReviews}_more_reviews`,
    });
  } catch (error: any) {
    console.error("❌ Error getting review status:", error);
    return c.json(
      {
        error: "Failed to get review status",
        message: error.message,
      },
      500
    );
  }
});

reviewRoutes.patch("/:reviewId/save-draft", async (c) => {
  try {
    const reviewId = parseInt(c.req.param("reviewId"));
    const {
      comments,
      confidentialComments,
      decision,
      recommendation,
      reviewerWallet,
    } = await c.req.json();

    if (!reviewId) {
      return c.json({ error: "Review ID is required" }, 400);
    }

    const updates: any = {};

    if (comments !== undefined) updates.comments = comments;
    if (confidentialComments !== undefined)
      updates.confidential_comments = confidentialComments;
    if (decision !== undefined) updates.recommendation = decision;
    if (recommendation !== undefined) updates.recommendation = recommendation;
    if (reviewerWallet !== undefined) updates.reviewer_wallet = reviewerWallet;

    const savedReview = await dbService.saveDraftReview(reviewId, updates);

    return c.json({
      success: true,
      message: "Draft saved successfully",
      review: {
        id: reviewId.toString(),
        status: savedReview.status || "in_progress",
      },
    });
  } catch (error: any) {
    console.error("❌ Error saving review draft:", error);
    return c.json(
      {
        error: "Failed to save draft",
        message: error.message,
      },
      500
    );
  }
});

// ✅ NEW ENDPOINT: Check if reviewer can review a specific manuscript
reviewRoutes.get(
  "/reviewer/:walletAddress/can-review/:manuscriptId",
  async (c) => {
    try {
      const walletAddress = c.req.param("walletAddress");
      const manuscriptId = parseInt(c.req.param("manuscriptId"));

      if (!walletAddress || !manuscriptId) {
        return c.json(
          { error: "Wallet address and manuscript ID are required" },
          400
        );
      }

      // Get manuscript details
      const manuscript = await dbService.getJournalById(manuscriptId);
      if (!manuscript) {
        return c.json({ error: "Manuscript not found" }, 404);
      }

      // Check if reviewer is the author
      if (manuscript.author_wallet === walletAddress) {
        return c.json({
          success: false,
          canReview: false,
          reason: "❌ Cannot review your own manuscript",
          requirements: {
            notAuthor: false,
            hasBachelors: false,
            hasThreeTopicPapers: false,
            hasTopicExpertise: false,
          },
          manuscript: {
            id: manuscript.id,
            title: manuscript.title,
            category: manuscript.category,
          },
        });
      }

      // Check if reviewer already reviewed this manuscript
      const existingReviews = await dbService.getReviews({
        manuscript_author: manuscript.author_wallet,
      });

      const alreadyReviewed = existingReviews.some(
        (review: any) =>
          review.manuscript_id === manuscriptId &&
          review.assigned_reviewer === walletAddress &&
          review.status === "submitted"
      );

      if (alreadyReviewed) {
        return c.json({
          success: false,
          canReview: false,
          reason: "❌ You have already reviewed this manuscript",
          requirements: {
            notAuthor: true,
            alreadyReviewed: true,
            hasBachelors: false,
            hasThreeTopicPapers: false,
            hasTopicExpertise: false,
          },
          manuscript: {
            id: manuscript.id,
            title: manuscript.title,
            category: manuscript.category,
          },
        });
      }

      // Get reviewer CV data
      const reviewerCV = await dbService.getUserCVByWalletAddress(
        walletAddress
      );
      if (!reviewerCV) {
        return c.json({
          success: false,
          canReview: false,
          reason:
            "❌ No CV found. Please upload your CV first to qualify as a reviewer",
          requirements: {
            notAuthor: true,
            hasCV: false,
            hasBachelors: false,
            hasThreeTopicPapers: false,
            hasTopicExpertise: false,
          },
          manuscript: {
            id: manuscript.id,
            title: manuscript.title,
            category: manuscript.category,
          },
        });
      }

      // Get detailed qualification for this specific manuscript
      const qualifiedReviewers =
        await reviewerAssignmentService.getQualifiedReviewers(
          manuscript.category || [],
          manuscript.title,
          manuscript.abstract
        );

      const reviewerQualification = qualifiedReviewers.find(
        (reviewer) => reviewer.walletAddress === walletAddress
      );

      if (!reviewerQualification) {
        // Reviewer not found in qualified list, get their general qualification
        const generalQualification =
          await reviewerAssignmentService.getReviewerQualification(
            walletAddress
          );

        return c.json({
          success: false,
          canReview: false,
          reason:
            "❌ You do not meet the qualification requirements for this manuscript",
          requirements: {
            notAuthor: true,
            hasCV: true,
            hasBachelors: generalQualification?.hasBachelors || false,
            hasThreeTopicPapers:
              (generalQualification?.firstAuthorPapersOnTopic || 0) >= 3,
            hasTopicExpertise: false,
          },
          manuscript: {
            id: manuscript.id,
            title: manuscript.title,
            category: manuscript.category,
          },
          details: {
            totalFirstAuthorPapers:
              generalQualification?.firstAuthorPapers || 0,
            topicRelevantPapers:
              generalQualification?.firstAuthorPapersOnTopic || 0,
            requiredTopicPapers: 3,
            hasEducation: generalQualification?.hasBachelors || false,
            reasons: generalQualification?.qualificationReasons || [],
          },
        });
      }

      // Reviewer is qualified!
      return c.json({
        success: true,
        canReview: true,
        reason: "✅ You are qualified to review this manuscript",
        requirements: {
          notAuthor: true,
          hasCV: true,
          hasBachelors: reviewerQualification.hasBachelors,
          hasThreeTopicPapers:
            reviewerQualification.firstAuthorPapersOnTopic >= 3,
          hasTopicExpertise: true,
        },
        manuscript: {
          id: manuscript.id,
          title: manuscript.title,
          category: manuscript.category,
        },
        qualification: {
          totalFirstAuthorPapers: reviewerQualification.firstAuthorPapers,
          topicRelevantPapers: reviewerQualification.firstAuthorPapersOnTopic,
          requiredTopicPapers: 3,
          hasEducation: reviewerQualification.hasBachelors,
          expertise: reviewerQualification.expertise,
          institution: reviewerQualification.institution,
          reasons: reviewerQualification.qualificationReasons,
        },
      });
    } catch (error: any) {
      console.error("❌ Error checking reviewer qualification:", error);
      return c.json(
        {
          error: "Failed to check reviewer qualification",
          message: error.message,
        },
        500
      );
    }
  }
);

export { reviewRoutes };
