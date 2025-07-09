import { dbService } from "./supabase/index";

interface ReviewerQualification {
  walletAddress: string;
  name: string;
  institution: string;
  field: string;
  isQualified: boolean;
  qualificationReasons: string[];
  expertise: string[];
  publicationCount: number;
  firstAuthorPapers: number;
  firstAuthorPapersOnTopic: number;
  hasBachelors: boolean;
  currentReviewLoad: number;
  availability: boolean;
}

interface AutoAssignmentResult {
  success: boolean;
  assignedReviewer?: string;
  reason: string;
  qualifiedReviewers?: ReviewerQualification[];
}

export class ReviewerAssignmentService {
  /**
   * Auto-assign a reviewer to a manuscript based on CV qualifications
   */
  async autoAssignReviewer(
    manuscriptId: number
  ): Promise<AutoAssignmentResult> {
    try {
      // 1. Get manuscript details
      const manuscript = await dbService.getJournalById(manuscriptId);
      if (!manuscript) {
        return { success: false, reason: "Manuscript not found" };
      }

      console.log(
        `🔍 Auto-assigning reviewer for manuscript: ${manuscript.title}`
      );

      // 2. Get qualified reviewers for this topic
      const qualifiedReviewers = await this.getQualifiedReviewers(
        manuscript.category || [],
        manuscript.title,
        manuscript.abstract
      );

      if (qualifiedReviewers.length === 0) {
        return {
          success: false,
          reason: "No qualified reviewers found for this topic",
          qualifiedReviewers: [],
        };
      }

      // 3. Select best reviewer (least current workload among qualified)
      const availableReviewers = qualifiedReviewers
        .filter((r) => r.availability && r.currentReviewLoad < 3)
        .sort((a, b) => a.currentReviewLoad - b.currentReviewLoad);

      if (availableReviewers.length === 0) {
        return {
          success: false,
          reason: "All qualified reviewers are currently overloaded",
          qualifiedReviewers,
        };
      }

      const selectedReviewer = availableReviewers[0];

      // 4. Assign the reviewer
      const reviewDeadline = new Date();
      reviewDeadline.setDate(reviewDeadline.getDate() + 30); // 30 days

      await dbService.updateReviewByManuscriptId(manuscriptId, {
        assigned_reviewer: selectedReviewer.walletAddress,
        status: "assigned",
        review_deadline: reviewDeadline,
      });

      console.log(
        `✅ Auto-assigned reviewer: ${selectedReviewer.name} (${selectedReviewer.walletAddress})`
      );

      return {
        success: true,
        assignedReviewer: selectedReviewer.walletAddress,
        reason: `Assigned to ${
          selectedReviewer.name
        } - ${selectedReviewer.qualificationReasons.join(", ")}`,
        qualifiedReviewers,
      };
    } catch (error) {
      console.error("❌ Auto-assignment failed:", error);
      return {
        success: false,
        reason: `Assignment failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  /**
   * Get all qualified reviewers for a given topic/category
   */
  async getQualifiedReviewers(
    categories: string[],
    title?: string,
    abstract?: string
  ): Promise<ReviewerQualification[]> {
    // Get all CV extractions
    const cvExtractions = await dbService.getAllCVExtractions();
    const qualifications: ReviewerQualification[] = [];

    for (const cv of cvExtractions) {
      if (!cv.wallet_address || !cv.cv_data) continue;

      const qualification = await this.evaluateReviewerQualification(
        cv,
        categories,
        title,
        abstract
      );

      qualifications.push(qualification);
    }

    // Return only qualified reviewers, sorted by expertise match
    return qualifications
      .filter((q) => q.isQualified)
      .sort((a, b) => b.firstAuthorPapers - a.firstAuthorPapers);
  }

  /**
   * Evaluate if a person qualifies as a reviewer based on their CV
   */
  private async evaluateReviewerQualification(
    cvExtraction: any,
    categories: string[],
    title?: string,
    abstract?: string
  ): Promise<ReviewerQualification> {
    const cvData = cvExtraction.cv_data;
    const walletAddress = cvExtraction.wallet_address;

    const qualification: ReviewerQualification = {
      walletAddress,
      name: cvData.selfIdentity?.fullName || "Unknown",
      institution: cvData.selfIdentity?.institution || "Unknown",
      field:
        cvData.selfIdentity?.field ||
        cvData.selfIdentity?.profession ||
        "Unknown",
      isQualified: false,
      qualificationReasons: [],
      expertise: [],
      publicationCount: cvData.publications?.length || 0,
      firstAuthorPapers: 0,
      firstAuthorPapersOnTopic: 0,
      hasBachelors: false,
      currentReviewLoad: 0,
      availability: true,
    };

    // Check educational background - Bachelor's degree requirement
    qualification.hasBachelors = this.checkEducationalBackground(
      cvData.education || []
    );

    // Count ALL first-author publications (for general info)
    qualification.firstAuthorPapers = this.countFirstAuthorPapers(
      cvData.publications || [],
      qualification.name
    );

    // Count first-author publications ON THE SAME TOPIC (for qualification)
    qualification.firstAuthorPapersOnTopic = this.countFirstAuthorPapersOnTopic(
      cvData.publications || [],
      qualification.name,
      categories,
      title,
      abstract
    );

    // Check expertise match with manuscript categories
    const expertiseMatch = this.checkExpertiseMatch(
      cvData,
      categories,
      title,
      abstract
    );
    qualification.expertise = expertiseMatch.topics;

    // Get current review workload
    qualification.currentReviewLoad = await this.getCurrentReviewLoad(
      walletAddress
    );

    // ✅ UPDATED QUALIFICATION LOGIC - ENFORCES USER'S REQUIREMENTS
    if (
      qualification.hasBachelors &&
      qualification.firstAuthorPapersOnTopic >= 3 && // Must have 3+ first-author papers ON SAME TOPIC
      expertiseMatch.hasMatch
    ) {
      qualification.isQualified = true;
      qualification.qualificationReasons.push(
        `${qualification.firstAuthorPapersOnTopic} first-author papers on relevant topic`,
        "Has Bachelor's degree or higher",
        `Expertise match: ${expertiseMatch.topics.join(", ")}`
      );
    } else {
      // Add specific reasons for disqualification
      if (!qualification.hasBachelors) {
        qualification.qualificationReasons.push(
          "❌ Missing Bachelor's degree or higher"
        );
      }
      if (qualification.firstAuthorPapersOnTopic < 3) {
        qualification.qualificationReasons.push(
          `❌ Only ${qualification.firstAuthorPapersOnTopic} first-author papers on relevant topic (need 3)`
        );
      }
      if (!expertiseMatch.hasMatch) {
        qualification.qualificationReasons.push(
          "❌ No expertise match with manuscript topic"
        );
      }
    }

    return qualification;
  }

  /**
   * Check if person has Bachelor's degree or higher
   */
  private checkEducationalBackground(education: any[]): boolean {
    if (!education || education.length === 0) return false;

    const degreeKeywords = [
      "bachelor",
      "bs",
      "ba",
      "bsc",
      "b.s",
      "b.a",
      "master",
      "ms",
      "ma",
      "msc",
      "m.s",
      "m.a",
      "mba",
      "phd",
      "ph.d",
      "doctorate",
      "doctoral",
      "phd.",
    ];

    return education.some((edu) => {
      const degree = (edu.degree || "").toLowerCase();
      return degreeKeywords.some((keyword) => degree.includes(keyword));
    });
  }

  /**
   * Count first-author publications (general count)
   */
  private countFirstAuthorPapers(
    publications: any[],
    authorName: string
  ): number {
    if (!publications || publications.length === 0) return 0;

    return publications.filter((pub) => {
      if (!pub.authors || pub.authors.length === 0) return false;

      // Check if this person is first author
      const firstAuthor = pub.authors[0].toLowerCase();
      const normalizedName = authorName.toLowerCase();

      // Simple name matching (could be improved with fuzzy matching)
      return (
        firstAuthor.includes(normalizedName.split(" ")[0]) &&
        firstAuthor.includes(normalizedName.split(" ").slice(-1)[0])
      );
    }).length;
  }

  /**
   * ✅ NEW METHOD: Count first-author publications ON THE SAME TOPIC as the manuscript
   */
  private countFirstAuthorPapersOnTopic(
    publications: any[],
    authorName: string,
    manuscriptCategories: string[],
    manuscriptTitle?: string,
    manuscriptAbstract?: string
  ): number {
    if (!publications || publications.length === 0) return 0;

    // Build topic keywords from manuscript
    const manuscriptTopics = [...manuscriptCategories];
    if (manuscriptTitle) {
      manuscriptTopics.push(...this.extractKeyTerms(manuscriptTitle));
    }
    if (manuscriptAbstract) {
      manuscriptTopics.push(...this.extractKeyTerms(manuscriptAbstract));
    }

    return publications.filter((pub) => {
      // First check if this person is first author
      if (!pub.authors || pub.authors.length === 0) return false;

      const firstAuthor = pub.authors[0].toLowerCase();
      const normalizedName = authorName.toLowerCase();

      const isFirstAuthor =
        firstAuthor.includes(normalizedName.split(" ")[0]) &&
        firstAuthor.includes(normalizedName.split(" ").slice(-1)[0]);

      if (!isFirstAuthor) return false;

      // Then check if the publication is on the same topic
      const publicationTopics: string[] = [];

      // Extract topics from publication title
      if (pub.title) {
        publicationTopics.push(...this.extractKeyTerms(pub.title));
      }

      // Extract topics from publication venue/journal
      if (pub.venue) {
        publicationTopics.push(...this.extractKeyTerms(pub.venue));
      }

      // Check for topic overlap
      const hasTopicMatch = manuscriptTopics.some((manuscriptTopic) =>
        publicationTopics.some(
          (pubTopic) =>
            manuscriptTopic.toLowerCase().includes(pubTopic.toLowerCase()) ||
            pubTopic.toLowerCase().includes(manuscriptTopic.toLowerCase())
        )
      );

      return hasTopicMatch;
    }).length;
  }

  /**
   * Check if reviewer's expertise matches manuscript topic
   */
  private checkExpertiseMatch(
    cvData: any,
    categories: string[],
    title?: string,
    abstract?: string
  ): { hasMatch: boolean; topics: string[] } {
    const expertise: string[] = [];

    // Get expertise from CV data
    if (cvData.selfIdentity?.field) expertise.push(cvData.selfIdentity.field);
    if (cvData.selfIdentity?.profession)
      expertise.push(cvData.selfIdentity.profession);

    // Extract topics from publications
    if (cvData.publications) {
      cvData.publications.forEach((pub: any) => {
        if (pub.venue) expertise.push(pub.venue);
        if (pub.title) {
          // Extract key terms from publication titles
          const keyTerms = this.extractKeyTerms(pub.title);
          expertise.push(...keyTerms);
        }
      });
    }

    // Extract topics from experience
    if (cvData.experience) {
      cvData.experience.forEach((exp: any) => {
        if (exp.position) expertise.push(exp.position);
        if (exp.description) {
          const keyTerms = this.extractKeyTerms(exp.description);
          expertise.push(...keyTerms);
        }
      });
    }

    // Check for matches with manuscript categories
    const allTopics = [...categories];
    if (title) allTopics.push(...this.extractKeyTerms(title));
    if (abstract) allTopics.push(...this.extractKeyTerms(abstract));

    const matchedTopics = expertise.filter((exp) =>
      allTopics.some(
        (topic) =>
          exp.toLowerCase().includes(topic.toLowerCase()) ||
          topic.toLowerCase().includes(exp.toLowerCase())
      )
    );

    return {
      hasMatch: matchedTopics.length > 0,
      topics: [...new Set(expertise)], // Remove duplicates
    };
  }

  /**
   * Extract key terms from text for topic matching
   */
  private extractKeyTerms(text: string): string[] {
    if (!text) return [];

    // Simple keyword extraction (could be improved with NLP)
    const stopWords = [
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
    ];

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.includes(word))
      .slice(0, 10); // Limit to top 10 terms
  }

  /**
   * Get current review workload for a reviewer
   */
  private async getCurrentReviewLoad(walletAddress: string): Promise<number> {
    try {
      // Get reviews with assigned status
      const assignedReviews = await dbService.getReviews({
        assigned_reviewer: walletAddress,
        status: "assigned",
      });

      // Get reviews with in_review status
      const inReviewReviews = await dbService.getReviews({
        assigned_reviewer: walletAddress,
        status: "in_review",
      });

      return assignedReviews.length + inReviewReviews.length;
    } catch (error) {
      console.warn(`Could not get review load for ${walletAddress}:`, error);
      return 0;
    }
  }

  /**
   * Get reviewer qualification details for a specific wallet address
   */
  async getReviewerQualification(
    walletAddress: string
  ): Promise<ReviewerQualification | null> {
    try {
      const cvExtraction = await dbService.getUserCVByWalletAddress(
        walletAddress
      );
      if (!cvExtraction) return null;

      return await this.evaluateReviewerQualification(
        cvExtraction,
        [], // No specific categories for general qualification check
        undefined,
        undefined
      );
    } catch (error) {
      console.error("Failed to get reviewer qualification:", error);
      return null;
    }
  }
}

export const reviewerAssignmentService = new ReviewerAssignmentService();
