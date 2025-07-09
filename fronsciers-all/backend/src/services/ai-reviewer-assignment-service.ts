import { dbService } from "./supabase/index";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

interface AIReviewerScore {
  walletAddress: string;
  name: string;
  institution: string;
  overallScore: number;
  qualificationScore: number;
  expertiseScore: number;
  availabilityScore: number;
  reasoningExplanation: string;
  strengths: string[];
  concerns: string[];
  recommendation:
    | "highly_recommended"
    | "recommended"
    | "suitable"
    | "not_suitable";
}

interface AIAssignmentResult {
  success: boolean;
  assignedReviewer?: string;
  reasoning: string;
  allCandidates?: AIReviewerScore[];
  confidenceLevel: number;
}

export class AIReviewerAssignmentService {
  async aiAutoAssignReviewer(
    manuscriptId: number
  ): Promise<AIAssignmentResult> {
    if (!openai) {
      return {
        success: false,
        reasoning:
          "OpenAI API not configured. Please set OPENAI_API_KEY environment variable.",
        confidenceLevel: 0,
      };
    }

    try {
      console.log(
        `🤖 AI Auto-assigning reviewer for manuscript: ${manuscriptId}`
      );

      const manuscript = await dbService.getJournalById(manuscriptId);
      if (!manuscript) {
        return {
          success: false,
          reasoning: "Manuscript not found",
          confidenceLevel: 0,
        };
      }

      const cvExtractions = await dbService.getAllCVExtractions();
      if (cvExtractions.length === 0) {
        return {
          success: false,
          reasoning: "No reviewer CVs available in the system",
          confidenceLevel: 0,
        };
      }

      console.log(
        `📊 Analyzing ${cvExtractions.length} potential reviewers with AI...`
      );

      const candidateScores: AIReviewerScore[] = [];

      for (const cv of cvExtractions) {
        if (!cv.wallet_address || !cv.cv_data) continue;

        const score = await this.aiEvaluateReviewer(cv, manuscript);
        candidateScores.push(score);
      }

      const suitableCandidates = candidateScores
        .filter((c) => c.recommendation !== "not_suitable")
        .sort((a, b) => b.overallScore - a.overallScore);

      if (suitableCandidates.length === 0) {
        return {
          success: false,
          reasoning: "No suitable reviewers found based on AI analysis",
          allCandidates: candidateScores,
          confidenceLevel: 0.2,
        };
      }

      const selectedReviewer = suitableCandidates[0];

      const currentLoad = await this.getCurrentReviewLoad(
        selectedReviewer.walletAddress
      );
      if (currentLoad >= 3) {
        const nextBest = suitableCandidates.find((c) =>
          this.getCurrentReviewLoad(c.walletAddress).then((load) => load < 3)
        );

        if (!nextBest) {
          return {
            success: false,
            reasoning: "All suitable reviewers are currently overloaded",
            allCandidates: candidateScores,
            confidenceLevel: 0.3,
          };
        }
      }

      const reviewDeadline = new Date();
      reviewDeadline.setDate(reviewDeadline.getDate() + 30);

      await dbService.updateReviewByManuscriptId(manuscriptId, {
        assigned_reviewer: selectedReviewer.walletAddress,
        status: "assigned",
        review_deadline: reviewDeadline,
      });

      console.log(
        `🎯 Overall score: ${selectedReviewer.overallScore.toFixed(2)}`
      );

      return {
        success: true,
        assignedReviewer: selectedReviewer.walletAddress,
        reasoning: `AI selected ${
          selectedReviewer.name
        } (score: ${selectedReviewer.overallScore.toFixed(2)}/100) - ${
          selectedReviewer.reasoningExplanation
        }`,
        allCandidates: candidateScores,
        confidenceLevel: selectedReviewer.overallScore / 100,
      };
    } catch (error) {
      console.error("❌ AI assignment failed:", error);
      return {
        success: false,
        reasoning: `AI assignment failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        confidenceLevel: 0,
      };
    }
  }

  private async aiEvaluateReviewer(
    cvExtraction: any,
    manuscript: any
  ): Promise<AIReviewerScore> {
    const cvData = cvExtraction.cv_data;
    const reviewerName = cvData.selfIdentity?.fullName || "Unknown";

    try {
      const reviewerContext = this.prepareReviewerContext(cvData);
      const manuscriptContext = this.prepareManuscriptContext(manuscript);

      const prompt = `You are an expert academic editor tasked with evaluating whether a researcher is suitable to review a specific manuscript.

MANUSCRIPT TO REVIEW:
Title: ${manuscript.title}
Categories: ${manuscript.category?.join(", ") || "Not specified"}
Abstract: ${manuscript.abstract || "Not provided"}

POTENTIAL REVIEWER:
${reviewerContext}

EVALUATION CRITERIA:
1. QUALIFICATIONS (40 points):
   - Educational background (PhD preferred, minimum Bachelor's required)
   - Publication record and research experience
   - Academic standing and institutional affiliation

2. EXPERTISE MATCH (35 points):
   - Research area alignment with manuscript topic
   - Methodological expertise
   - Domain knowledge depth

3. AVAILABILITY & WORKLOAD (25 points):
   - Current review commitments
   - Career stage and time availability
   - Recent publication activity indicating active research

Please provide a detailed evaluation as a JSON object with this exact structure:
{
  "overallScore": <number 0-100>,
  "qualificationScore": <number 0-40>,
  "expertiseScore": <number 0-35>, 
  "availabilityScore": <number 0-25>,
  "recommendation": "<highly_recommended|recommended|suitable|not_suitable>",
  "reasoningExplanation": "<detailed explanation of scoring>",
  "strengths": ["<strength1>", "<strength2>", ...],
  "concerns": ["<concern1>", "<concern2>", ...],
  "firstAuthorPapers": <estimated number>,
  "hasAdvancedDegree": <boolean>,
  "expertiseKeywords": ["<keyword1>", "<keyword2>", ...]
}

Be thorough but concise. Focus on concrete evidence from their CV.`;

      const response = await openai!.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are an expert academic editor with 20+ years of experience in peer review assignment. Provide precise, evidence-based evaluations.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const aiResult = JSON.parse(
        response.choices[0]?.message?.content || "{}"
      );

      return {
        walletAddress: cvExtraction.wallet_address,
        name: reviewerName,
        institution: cvData.selfIdentity?.institution || "Unknown",
        overallScore: aiResult.overallScore || 0,
        qualificationScore: aiResult.qualificationScore || 0,
        expertiseScore: aiResult.expertiseScore || 0,
        availabilityScore: aiResult.availabilityScore || 0,
        reasoningExplanation:
          aiResult.reasoningExplanation || "No explanation provided",
        strengths: aiResult.strengths || [],
        concerns: aiResult.concerns || [],
        recommendation: aiResult.recommendation || "not_suitable",
      };
    } catch (error) {
      console.error(`Failed to evaluate reviewer ${reviewerName}:`, error);

      return {
        walletAddress: cvExtraction.wallet_address,
        name: reviewerName,
        institution: cvData.selfIdentity?.institution || "Unknown",
        overallScore: 0,
        qualificationScore: 0,
        expertiseScore: 0,
        availabilityScore: 0,
        reasoningExplanation: "AI evaluation failed, no score available",
        strengths: [],
        concerns: ["AI evaluation failed"],
        recommendation: "not_suitable",
      };
    }
  }

  private prepareReviewerContext(cvData: any): string {
    const sections = [];

    if (cvData.selfIdentity) {
      sections.push(`Name: ${cvData.selfIdentity.fullName || "Not provided"}`);
      sections.push(
        `Institution: ${cvData.selfIdentity.institution || "Not provided"}`
      );
      sections.push(
        `Field: ${
          cvData.selfIdentity.field ||
          cvData.selfIdentity.profession ||
          "Not provided"
        }`
      );
    }

    if (cvData.education && cvData.education.length > 0) {
      sections.push("\nEDUCATION:");
      cvData.education.forEach((edu: any) => {
        const degree = edu.degree || "Unknown degree";
        const institution = edu.institution || "Unknown institution";
        const field = edu.field || "";
        const year = edu.endDate || edu.startDate || "";
        sections.push(`- ${degree} in ${field} from ${institution} (${year})`);
      });
    }

    if (cvData.publications && cvData.publications.length > 0) {
      sections.push(`\nPUBLICATIONS (${cvData.publications.length} total):`);
      cvData.publications.slice(0, 5).forEach((pub: any, index: number) => {
        const title = pub.title || "Untitled";
        const venue = pub.venue || "Unknown venue";
        const year = pub.date || "Unknown year";
        const authors = pub.authors
          ? pub.authors.slice(0, 3).join(", ")
          : "Unknown authors";
        sections.push(`${index + 1}. "${title}" in ${venue} (${year})`);
        sections.push(
          `   Authors: ${authors}${
            pub.authors && pub.authors.length > 3 ? " et al." : ""
          }`
        );
      });
      if (cvData.publications.length > 5) {
        sections.push(
          `... and ${cvData.publications.length - 5} more publications`
        );
      }
    }

    if (cvData.experience && cvData.experience.length > 0) {
      sections.push("\nRELEVANT EXPERIENCE:");
      cvData.experience.slice(0, 3).forEach((exp: any) => {
        const position = exp.position || "Unknown position";
        const company = exp.company || "Unknown organization";
        const duration =
          exp.startDate && exp.endDate
            ? `${exp.startDate} - ${exp.endDate}`
            : "Unknown duration";
        sections.push(`- ${position} at ${company} (${duration})`);
        if (exp.description) {
          sections.push(
            `  ${exp.description.substring(0, 200)}${
              exp.description.length > 200 ? "..." : ""
            }`
          );
        }
      });
    }

    return sections.join("\n");
  }

  private prepareManuscriptContext(manuscript: any): string {
    const sections = [];

    sections.push(`Title: ${manuscript.title}`);
    sections.push(`Author: ${manuscript.author}`);
    sections.push(
      `Categories: ${manuscript.category?.join(", ") || "Not specified"}`
    );

    if (manuscript.abstract) {
      sections.push(`\nAbstract: ${manuscript.abstract}`);
    }

    if (manuscript.keywords && manuscript.keywords.length > 0) {
      sections.push(`\nKeywords: ${manuscript.keywords.join(", ")}`);
    }

    return sections.join("\n");
  }

  private async getCurrentReviewLoad(walletAddress: string): Promise<number> {
    try {
      const assignedReviews = await dbService.getReviews({
        assigned_reviewer: walletAddress,
        status: "assigned",
      });

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

  async analyzeManuscriptRequirements(manuscriptId: number): Promise<{
    researchArea: string;
    methodology: string[];
    expertiseRequired: string[];
    reviewerProfile: string;
  }> {
    if (!openai) {
      throw new Error("OpenAI API not configured");
    }

    const manuscript = await dbService.getJournalById(manuscriptId);
    if (!manuscript) {
      throw new Error("Manuscript not found");
    }

    const prompt = `Analyze this research manuscript and determine what type of reviewer would be most suitable:

MANUSCRIPT:
Title: ${manuscript.title}
Categories: ${manuscript.category?.join(", ") || "Not specified"}
Abstract: ${manuscript.abstract || "Not provided"}

Please provide a detailed analysis as JSON:
{
  "researchArea": "<primary research domain>",
  "methodology": ["<method1>", "<method2>", ...],
  "expertiseRequired": ["<expertise1>", "<expertise2>", ...],
  "reviewerProfile": "<detailed description of ideal reviewer background>",
  "complexityLevel": "<beginner|intermediate|advanced|expert>",
  "interdisciplinary": <boolean>
}`;

    const response = await openai!.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are an expert academic editor who specializes in matching manuscripts with appropriate reviewers.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
    });

    return JSON.parse(response.choices[0]?.message?.content || "{}");
  }

  async getAIReviewerRecommendations(manuscriptId: number): Promise<{
    manuscript: any;
    requirements: any;
    recommendations: AIReviewerScore[];
    summary: string;
  }> {
    const manuscript = await dbService.getJournalById(manuscriptId);
    if (!manuscript) {
      throw new Error("Manuscript not found");
    }

    const requirements = await this.analyzeManuscriptRequirements(manuscriptId);

    const cvExtractions = await dbService.getAllCVExtractions();
    const recommendations: AIReviewerScore[] = [];

    for (const cv of cvExtractions) {
      if (!cv.wallet_address || !cv.cv_data) continue;
      const score = await this.aiEvaluateReviewer(cv, manuscript);
      recommendations.push(score);
    }

    recommendations.sort((a, b) => b.overallScore - a.overallScore);

    const summary =
      `Found ${recommendations.length} potential reviewers. ` +
      `${
        recommendations.filter((r) => r.recommendation === "highly_recommended")
          .length
      } highly recommended, ` +
      `${
        recommendations.filter((r) => r.recommendation === "recommended").length
      } recommended, ` +
      `${
        recommendations.filter((r) => r.recommendation === "suitable").length
      } suitable.`;

    return {
      manuscript,
      requirements,
      recommendations,
      summary,
    };
  }
}

export const aiReviewerAssignmentService = new AIReviewerAssignmentService();
