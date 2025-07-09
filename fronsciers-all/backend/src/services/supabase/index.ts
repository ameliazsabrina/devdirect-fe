import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_API_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_API_KEY in your .env file"
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

export const dbService = {
  client: supabase,

  async healthCheck() {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("count")
        .limit(1);

      if (error) {
        return {
          status: "error",
          message: `Database connection failed: ${error.message}`,
        };
      }

      return { status: "ok", message: "Database connection successful" };
    } catch (error) {
      return {
        status: "error",
        message: `Database connection failed: ${error}`,
      };
    }
  },

  async initializeTables() {
    try {
      const { data: usersTable, error: usersError } = await supabase
        .from("users")
        .select("count")
        .limit(1);

      const { data: journalsTable, error: journalsError } = await supabase
        .from("journals")
        .select("count")
        .limit(1);

      const tablesExist = !usersError && !journalsError;

      if (tablesExist) {
      } else {
        console.warn(
          "⚠️  Some tables missing. Please run the SQL schema in Supabase."
        );
      }

      return true;
    } catch (error) {
      console.error("❌ Failed to verify Supabase database tables:", error);
      return false;
    }
  },

  async saveUser(data: {
    filename: string;
    fileSize: number;
    fileType: string;
    extractedText: string;
    cvData: any;
    aiEnabled: boolean;
    walletAddress: string;
  }) {
    try {
      console.log("Saving user data:", {
        filename: data.filename,
        fileSize: data.fileSize,
        fileType: data.fileType,
        extractedTextLength: data.extractedText.length,
        cvDataKeys: Object.keys(data.cvData || {}),
        aiEnabled: data.aiEnabled,
        walletAddress: data.walletAddress,
      });

      const { data: userResult, error: userError } = await supabase
        .from("users")
        .upsert(
          {
            wallet_address: data.walletAddress,
            filename: data.filename,
            file_size: data.fileSize,
            file_type: data.fileType,
            filetype: data.fileType,
            extracted_text: data.extractedText,
            ai_enabled: data.aiEnabled,

            full_name: data.cvData?.selfIdentity?.fullName || null,
            title: data.cvData?.selfIdentity?.title || null,
            profession: data.cvData?.selfIdentity?.profession || null,
            institution: data.cvData?.selfIdentity?.institution || null,
            location: data.cvData?.selfIdentity?.location || null,
            field: data.cvData?.selfIdentity?.field || null,
            specialization: data.cvData?.selfIdentity?.specialization || null,
            education_level: data.cvData?.educationLevel || null,

            email: data.cvData?.contact?.email || null,
            phone: data.cvData?.contact?.phone || null,
            linkedin: data.cvData?.contact?.linkedIn || null,
            github: data.cvData?.contact?.github || null,
            website: data.cvData?.contact?.website || null,

            overview: data.cvData?.overview || null,
          },
          {
            onConflict: "wallet_address",
          }
        )
        .select("id, created_at")
        .single();

      if (userError) {
        throw userError;
      }

      const userId = userResult.id;

      await Promise.all([
        supabase.from("user_education").delete().eq("user_id", userId),
        supabase.from("user_experience").delete().eq("user_id", userId),
        supabase.from("user_awards").delete().eq("user_id", userId),
        supabase.from("user_publications").delete().eq("user_id", userId),
      ]);

      if (data.cvData?.education && Array.isArray(data.cvData.education)) {
        const educationData = data.cvData.education.map((edu: any) => ({
          user_id: userId,
          institution: edu.institution || null,
          degree: edu.degree || null,
          field: edu.field || null,
          start_date: edu.startDate || null,
          end_date: edu.endDate || null,
          gpa: edu.gpa || null,
          location: edu.location || null,
        }));

        if (educationData.length > 0) {
          const { error: eduError } = await supabase
            .from("user_education")
            .insert(educationData);

          if (eduError) throw eduError;
        }
      }

      if (data.cvData?.experience && Array.isArray(data.cvData.experience)) {
        const experienceData = data.cvData.experience.map((exp: any) => ({
          user_id: userId,
          company: exp.company || null,
          position: exp.position || null,
          start_date: exp.startDate || null,
          end_date: exp.endDate || null,
          description: exp.description || null,
          location: exp.location || null,
          type: exp.type || null,
        }));

        if (experienceData.length > 0) {
          const { error: expError } = await supabase
            .from("user_experience")
            .insert(experienceData);

          if (expError) throw expError;
        }
      }

      if (data.cvData?.awards && Array.isArray(data.cvData.awards)) {
        const awardsData = data.cvData.awards.map((award: any) => ({
          user_id: userId,
          name: award.name || null,
          issuer: award.issuer || null,
          date: award.date || null,
          description: award.description || null,
        }));

        if (awardsData.length > 0) {
          const { error: awardsError } = await supabase
            .from("user_awards")
            .insert(awardsData);

          if (awardsError) throw awardsError;
        }
      }

      if (
        data.cvData?.publications &&
        Array.isArray(data.cvData.publications)
      ) {
        const publicationsData = data.cvData.publications.map((pub: any) => ({
          user_id: userId,
          title: pub.title || null,
          authors: pub.authors || [],
          venue: pub.venue || null,
          date: pub.date || null,
          doi: pub.doi || null,
          url: pub.url || null,
        }));

        if (publicationsData.length > 0) {
          const { error: pubError } = await supabase
            .from("user_publications")
            .insert(publicationsData);

          if (pubError) throw pubError;
        }
      }

      return userResult;
    } catch (error) {
      console.error("❌ Failed to save user to Supabase:", error);
      console.error("❌ Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async getUserByWalletAddress(walletAddress: string) {
    try {
      const { data, error } = await supabase
        .from("user_profile_complete")
        .select("*")
        .eq("wallet_address", walletAddress)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        const transformedData = {
          id: data.id,
          filename: data.filename,
          created_at: data.created_at,
          cv_data: {
            selfIdentity: {
              fullName: data.full_name,
              title: data.title,
              profession: data.profession,
              institution: data.institution,
              location: data.location,
              field: data.field,
              specialization: data.specialization,
            },
            contact: {
              email: data.email,
              phone: data.phone,
              linkedIn: data.linkedin,
              github: data.github,
              website: data.website,
            },
            overview: data.overview,
            profilePhoto: data.profile_photo,
            education: data.education || [],
            experience: data.experience || [],
            awards: data.awards || [],
            publications: data.publications || [],
            educationLevel: data.education_level,
          },
        };

        return transformedData;
      }

      return null;
    } catch (error) {
      console.error(
        "❌ Failed to get user by wallet address from Supabase:",
        error
      );
      throw error;
    }
  },

  async getAllUsers() {
    try {
      const { data, error } = await supabase
        .from("users")
        .select(
          "id, wallet_address, filename, file_size, file_type, ai_enabled, full_name, created_at"
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("❌ Failed to get users from Supabase:", error);
      throw error;
    }
  },

  async getAllUsersWithCVData() {
    try {
      const { data, error } = await supabase
        .from("user_profile_complete")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const transformedData = (data || []).map((user) => ({
        id: user.id,
        wallet_address: user.wallet_address,
        filename: user.filename,
        file_size: user.file_size,
        file_type: user.file_type,
        ai_enabled: user.ai_enabled,
        full_name: user.full_name,
        created_at: user.created_at,
        cv_data: {
          selfIdentity: {
            fullName: user.full_name,
            title: user.title,
            profession: user.profession,
            institution: user.institution,
            location: user.location,
            field: user.field,
            specialization: user.specialization,
          },
          contact: {
            email: user.email,
            phone: user.phone,
            linkedIn: user.linkedin,
            github: user.github,
            website: user.website,
          },
          overview: user.overview,
          profilePhoto: user.profile_photo,
          education: user.education || [],
          experience: user.experience || [],
          awards: user.awards || [],
          publications: user.publications || [],
          educationLevel: user.education_level,
        },
      }));

      return transformedData;
    } catch (error) {
      console.error(
        "❌ Failed to get users with CV data from Supabase:",
        error
      );
      throw error;
    }
  },

  async getUserById(id: number) {
    try {
      const { data, error } = await supabase
        .from("user_profile_complete")
        .select("*")
        .eq("id", id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error("❌ Failed to get user by ID from Supabase:", error);
      throw error;
    }
  },

  async saveCVExtraction(data: {
    filename: string;
    fileSize: number;
    fileType: string;
    extractedText: string;
    cvData: any;
    aiEnabled: boolean;
    walletAddress: string | null;
  }) {
    if (!data.walletAddress) {
      throw new Error("Wallet address is required for saving user data");
    }
    return this.saveUser({ ...data, walletAddress: data.walletAddress });
  },

  async getUserCVByWalletAddress(walletAddress: string) {
    return this.getUserByWalletAddress(walletAddress);
  },

  async getAllCVExtractions() {
    return this.getAllUsersWithCVData();
  },

  async getCVExtractionById(id: number) {
    try {
      const user = await this.getUserById(id);

      if (!user) {
        return null;
      }

      // Transform the data to match the expected CV format
      const transformedData = {
        id: user.id,
        wallet_address: user.wallet_address,
        filename: user.filename,
        file_size: user.file_size,
        file_type: user.file_type,
        ai_enabled: user.ai_enabled,
        full_name: user.full_name,
        created_at: user.created_at,
        cv_data: {
          selfIdentity: {
            fullName: user.full_name,
            title: user.title,
            profession: user.profession,
            institution: user.institution,
            location: user.location,
            field: user.field,
            specialization: user.specialization,
          },
          contact: {
            email: user.email,
            phone: user.phone,
            linkedIn: user.linkedin,
            github: user.github,
            website: user.website,
          },
          overview: user.overview,
          profilePhoto: user.profile_photo,
          education: user.education || [],
          experience: user.experience || [],
          awards: user.awards || [],
          publications: user.publications || [],
          educationLevel: user.education_level,
        },
      };

      return transformedData;
    } catch (error) {
      console.error("❌ Failed to get CV extraction by ID:", error);
      throw error;
    }
  },

  async updateUserProfile(
    walletAddress: string,
    updates: {
      fullName?: string;
      title?: string;
      profession?: string;
      institution?: string;
      location?: string;
      field?: string;
      specialization?: string;
      email?: string;
      phone?: string;
      linkedin?: string;
      github?: string;
      website?: string;
      overview?: string;
      profilePhoto?: string;
    }
  ) {
    try {
      const dbUpdates: any = {};

      if (updates.fullName !== undefined)
        dbUpdates.full_name = updates.fullName;
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.profession !== undefined)
        dbUpdates.profession = updates.profession;
      if (updates.institution !== undefined)
        dbUpdates.institution = updates.institution;
      if (updates.location !== undefined) dbUpdates.location = updates.location;
      if (updates.field !== undefined) dbUpdates.field = updates.field;
      if (updates.specialization !== undefined)
        dbUpdates.specialization = updates.specialization;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.linkedin !== undefined) dbUpdates.linkedin = updates.linkedin;
      if (updates.github !== undefined) dbUpdates.github = updates.github;
      if (updates.website !== undefined) dbUpdates.website = updates.website;
      if (updates.overview !== undefined) dbUpdates.overview = updates.overview;
      if (updates.profilePhoto !== undefined)
        dbUpdates.profile_photo = updates.profilePhoto;

      dbUpdates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("users")
        .update(dbUpdates)
        .eq("wallet_address", walletAddress)
        .select("id, updated_at")
        .single();

      if (error) {
        throw error;
      }

      console.log(
        `✅ User profile updated successfully for wallet: ${walletAddress}`
      );
      return data;
    } catch (error) {
      console.error("❌ Failed to update user profile:", error);
      throw error;
    }
  },

  async saveJournal(data: {
    title: string;
    author: string;
    category: string[] | undefined;
    ipfsHash: string;
    metadataCid?: string;
    abstract?: string;
    keywords?: string[];
    authorWallet?: string;
    status?: string;
  }) {
    try {
      const { data: result, error } = await supabase
        .from("journals")
        .insert({
          title: data.title,
          author: data.author,
          category: data.category,
          ipfs_hash: data.ipfsHash,
          metadata_cid: data.metadataCid || null,
          abstract: data.abstract || null,
          keywords: data.keywords || null,
          author_wallet: data.authorWallet || null,
          status: data.status || "submitted",
        })
        .select("id, created_at")
        .single();

      if (error) {
        throw error;
      }

      return result;
    } catch (error) {
      console.error("❌ Failed to save journal to Supabase:", error);
      throw error;
    }
  },

  async getRecentJournalsByCategory(category: string[], limit: number = 5) {
    try {
      const { data, error } = await supabase
        .from("journals")
        .select(
          `
          id, title, author, category, ipfs_hash, metadata_cid,
          abstract, keywords, author_wallet, status, submission_date,
          created_at
        `
        )
        .contains("category", category)
        .order("submission_date", { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error(
        "❌ Failed to get recent journals by category from Supabase:",
        error
      );
      throw error;
    }
  },

  async getAllCategories() {
    try {
      const { data, error } = await supabase
        .from("journals")
        .select("category")
        .order("category", { ascending: true });

      if (error) {
        throw error;
      }

      const categoryCount = (data || []).reduce(
        (acc: Record<string, number>, item) => {
          acc[item.category] = (acc[item.category] || 0) + 1;
          return acc;
        },
        {}
      );

      return Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count: count.toString() }))
        .sort((a, b) => parseInt(b.count) - parseInt(a.count));
    } catch (error) {
      console.error(
        "❌ Failed to get journal categories from Supabase:",
        error
      );
      throw error;
    }
  },

  async getJournalByIPFSHash(ipfsHash: string) {
    try {
      const { data, error } = await supabase
        .from("journals")
        .select("*")
        .eq("ipfs_hash", ipfsHash)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error(
        "❌ Failed to get journal by IPFS hash from Supabase:",
        error
      );
      throw error;
    }
  },

  async getPublishedJournalsByCategory(category: string[], limit: number = 10) {
    try {
      console.log(
        `📚 Getting published journals by category: ${category.join(", ")}`
      );

      const { data, error } = await supabase
        .from("journals")
        .select(
          `
          id, title, author, category, ipfs_hash, metadata_cid,
          abstract, keywords, author_wallet, status, submission_date,
          published_date, created_at
        `
        )
        .contains("category", category)
        .eq("status", "published")
        .order("published_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      console.log(
        `✅ Retrieved ${
          data?.length || 0
        } published journals for categories: ${category.join(", ")}`
      );
      return data || [];
    } catch (error) {
      console.error(
        "❌ Failed to get published journals by category from Supabase:",
        error
      );
      throw error;
    }
  },

  async getManuscriptsByStatus(
    status: string,
    limit: number = 20,
    category?: string
  ) {
    try {
      let query = supabase
        .from("journals")
        .select(
          `
          id, title, author, category, ipfs_hash, metadata_cid,
          abstract, keywords, author_wallet, status, submission_date,
          published_date, created_at, reviews_completed, reviews_approved
        `
        )
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (category) {
        const categoryArray = category.split(",").map((c) => c.trim());
        query = query.contains("category", categoryArray);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      console.log(
        `✅ Retrieved ${data?.length || 0} manuscripts with status: ${status}`
      );
      return data || [];
    } catch (error) {
      console.error(
        `❌ Failed to get manuscripts with status ${status} from Supabase:`,
        error
      );
      throw error;
    }
  },

  async updateJournalStatus(
    journalId: number,
    status: string,
    publishedBy?: string
  ) {
    try {
      const updates: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === "published") {
        updates.published_date = new Date().toISOString();
        if (publishedBy) {
          updates.published_by = publishedBy;
        }
      }

      const { data, error } = await supabase
        .from("journals")
        .update(updates)
        .eq("id", journalId)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error(
        `❌ Failed to update journal ${journalId} status to ${status}:`,
        error
      );
      throw error;
    }
  },

  async createReview(data: {
    manuscript_id: number;
    status?: string;
    assigned_reviewer?: string;
    assigned_editor?: string;
    review_deadline?: Date;
    review_days?: number;
  }) {
    try {
      let deadline = data.review_deadline;
      if (!deadline && data.review_days) {
        deadline = new Date();
        deadline.setDate(deadline.getDate() + data.review_days);
      }

      const { data: result, error } = await supabase
        .from("manuscript_reviews")
        .insert({
          manuscript_id: data.manuscript_id,
          status: data.status || "submitted",
          assigned_reviewer: data.assigned_reviewer || null,
          assigned_editor: data.assigned_editor || null,
          review_deadline: deadline || null,
        })
        .select("id, created_at, review_deadline")
        .single();

      if (error) {
        throw error;
      }

      console.log(
        `📅 Review deadline: ${
          result.review_deadline || "Auto-calculated (30 days)"
        }`
      );
      return result;
    } catch (error) {
      console.error("❌ Failed to create review:", error);
      throw error;
    }
  },

  async updateReview(
    reviewId: number,
    updates: {
      status?: string;
      assigned_reviewer?: string;
      assigned_editor?: string;
      review_deadline?: Date;
      review_started_at?: Date;
      review_completed_at?: Date;
      review_comments?: string;
      editor_notes?: string;
      extend_deadline_days?: number;
    }
  ) {
    try {
      // Handle deadline extension
      if (updates.extend_deadline_days) {
        const currentReview = await this.getReviewById(reviewId);
        if (currentReview?.review_deadline) {
          const extendedDeadline = new Date(currentReview.review_deadline);
          extendedDeadline.setDate(
            extendedDeadline.getDate() + updates.extend_deadline_days
          );
          updates.review_deadline = extendedDeadline;
          console.log(
            `📅 Extending deadline by ${
              updates.extend_deadline_days
            } days to: ${extendedDeadline.toISOString()}`
          );
        }
        delete updates.extend_deadline_days; // Remove helper field
      }

      const { data: result, error } = await supabase
        .from("manuscript_reviews")
        .update(updates)
        .eq("id", reviewId)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return result;
    } catch (error) {
      console.error(`❌ Failed to update review ${reviewId}:`, error);
      throw error;
    }
  },

  async getReviewById(reviewId: number) {
    try {
      const { data, error } = await supabase
        .from("manuscript_reviews")
        .select(
          `
          *,
          journals:manuscript_id (
            id, title, author, category, ipfs_hash, 
            abstract, keywords, author_wallet
          )
        `
        )
        .eq("id", reviewId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error(`❌ Failed to get review ${reviewId}:`, error);
      throw error;
    }
  },

  async getReviews(
    filters: {
      status?: string;
      assigned_reviewer?: string;
      assigned_editor?: string;
      manuscript_author?: string;
      limit?: number;
      overdue_only?: boolean;
    } = {}
  ) {
    try {
      let query = supabase.from("manuscript_reviews").select(`
          *,
          journals:manuscript_id (
            id, title, author, category, ipfs_hash, 
            abstract, keywords, author_wallet
          )
        `);

      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.assigned_reviewer) {
        query = query.eq("assigned_reviewer", filters.assigned_reviewer);
      }
      if (filters.assigned_editor) {
        query = query.eq("assigned_editor", filters.assigned_editor);
      }
      if (filters.manuscript_author) {
        query = query.eq("journals.author_wallet", filters.manuscript_author);
      }
      if (filters.overdue_only) {
        query = query.lt("review_deadline", new Date().toISOString());
      }

      // Order by deadline (urgent first), then by creation date
      query = query
        .order("review_deadline", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("❌ Failed to get reviews:", error);
      throw error;
    }
  },

  async getReviewByManuscriptId(manuscriptId: number) {
    try {
      const { data, error } = await supabase
        .from("manuscript_reviews")
        .select(
          `
          *,
          journals:manuscript_id (
            id, title, author, category, ipfs_hash, 
            abstract, keywords, author_wallet
          )
        `
        )
        .eq("manuscript_id", manuscriptId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error(
        `❌ Failed to get review for manuscript ${manuscriptId}:`,
        error
      );
      throw error;
    }
  },

  async getJournalById(journalId: number) {
    try {
      const { data, error } = await supabase
        .from("journals")
        .select("*")
        .eq("id", journalId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error(`❌ Failed to get journal ${journalId}:`, error);
      throw error;
    }
  },

  async updateReviewByManuscriptId(
    manuscriptId: number,
    updates: {
      status?: string;
      assigned_reviewer?: string;
      assigned_editor?: string;
      review_deadline?: Date;
      review_started_at?: Date;
      review_completed_at?: Date;
      review_comments?: string;
      editor_notes?: string;
    }
  ) {
    try {
      const { data: result, error } = await supabase
        .from("manuscript_reviews")
        .update(updates)
        .eq("manuscript_id", manuscriptId)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      console.log(
        `✅ Review for manuscript ${manuscriptId} updated successfully`
      );
      return result;
    } catch (error) {
      console.error(
        `❌ Failed to update review for manuscript ${manuscriptId}:`,
        error
      );
      throw error;
    }
  },

  async getReviewsByReviewerWallet(reviewerWallet: string, limit: number = 50) {
    try {
      let query = supabase
        .from("manuscript_reviews")
        .select(
          `
          *,
          journals:manuscript_id (
            id, title, author, category, ipfs_hash, metadata_cid,
            abstract, keywords, author_wallet, submission_date, created_at
          )
        `
        )
        .eq("reviewer_wallet", reviewerWallet)
        .order("created_at", { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error(
        `❌ Failed to get reviews for reviewer ${reviewerWallet}:`,
        error
      );
      throw error;
    }
  },

  async getManuscriptsByAuthorWallet(authorWallet: string) {
    try {
      const { data: manuscripts, error } = await supabase
        .from("journals")
        .select("*")
        .eq("author_wallet", authorWallet)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      // Get review information for each manuscript
      const manuscriptsWithReviews = await Promise.all(
        (manuscripts || []).map(async (manuscript) => {
          const { data: reviews, error: reviewError } = await supabase
            .from("manuscript_reviews")
            .select(
              "id, status, comments, confidential_comments, recommendation, completed_date"
            )
            .eq("manuscript_id", manuscript.id);

          if (reviewError) {
            console.error(
              `Failed to get reviews for manuscript ${manuscript.id}:`,
              reviewError
            );
            return {
              ...manuscript,
              reviewInfo: {
                totalReviewers: 0,
                completedReviews: 0,
                requiredReviews: 3,
                canPublish: false,
              },
              reviews: [],
            };
          }

          const completedReviews =
            reviews?.filter((r) => r.status === "completed") || [];
          const totalReviewers = reviews?.length || 0;
          const requiredReviews = 3; // Standard requirement
          const canPublish = completedReviews.length >= requiredReviews;

          return {
            ...manuscript,
            reviewInfo: {
              totalReviewers,
              completedReviews: completedReviews.length,
              requiredReviews,
              canPublish,
            },
            reviews: completedReviews.map((review) => ({
              id: review.id,
              status: review.status,
              decision: review.recommendation,
              comments: review.comments,
              completed_date: review.completed_date,
            })),
          };
        })
      );

      return manuscriptsWithReviews;
    } catch (error) {
      console.error(
        `❌ Failed to get manuscripts for author ${authorWallet}:`,
        error
      );
      throw error;
    }
  },

  async saveDraftReview(
    reviewId: number,
    updates: {
      comments?: string;
      confidential_comments?: string;
      recommendation?: string;
      reviewer_wallet?: string;
    }
  ) {
    try {
      // Map the fields to match database column names
      const dbUpdates: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.comments !== undefined) {
        dbUpdates.comments = updates.comments;
      }
      if (updates.confidential_comments !== undefined) {
        dbUpdates.confidential_comments = updates.confidential_comments;
      }
      if (updates.recommendation !== undefined) {
        dbUpdates.recommendation = updates.recommendation;
      }
      if (updates.reviewer_wallet !== undefined) {
        dbUpdates.reviewer_wallet = updates.reviewer_wallet;
      }

      // Set status to in_progress if it's currently pending
      const { data: currentReview } = await supabase
        .from("manuscript_reviews")
        .select("status")
        .eq("id", reviewId)
        .single();

      if (currentReview?.status === "pending") {
        dbUpdates.status = "in_progress";
      }

      const { data: result, error } = await supabase
        .from("manuscript_reviews")
        .update(dbUpdates)
        .eq("id", reviewId)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return result;
    } catch (error) {
      console.error(`❌ Failed to save draft for review ${reviewId}:`, error);
      throw error;
    }
  },

  async getReviewedManuscriptIdsByReviewer(reviewerWallet: string) {
    try {
      const { data, error } = await supabase
        .from("manuscript_reviews")
        .select("manuscript_id")
        .eq("reviewer_wallet", reviewerWallet);

      if (error) {
        throw error;
      }

      return (data || []).map((review) => review.manuscript_id);
    } catch (error) {
      console.error(
        `❌ Failed to get reviewed manuscript IDs for reviewer ${reviewerWallet}:`,
        error
      );
      throw error;
    }
  },

  async uploadProfilePhoto(
    walletAddress: string,
    fileBuffer: ArrayBuffer,
    fileName: string,
    fileType: string
  ): Promise<string> {
    try {
      const filePath = `profile-photos/${walletAddress}/${Date.now()}_${fileName.replace(
        /\s+/g,
        "_"
      )}`;

      const { data, error } = await supabase.storage
        .from("user-uploads")
        .upload(filePath, fileBuffer, {
          contentType: fileType,
          upsert: true,
        });

      if (error) {
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from("user-uploads")
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error("Failed to get public URL for uploaded profile photo");
      }

      console.log(
        `✅ Profile photo uploaded successfully for wallet: ${walletAddress}`
      );
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error(
        "❌ Failed to upload profile photo to Supabase Storage:",
        error
      );
      throw error;
    }
  },
};
