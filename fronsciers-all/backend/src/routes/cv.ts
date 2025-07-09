import { Hono } from "hono";
import {
  isPDF,
  extractCVDataWithAI,
  extractTextFromPDF,
  extractTextFromImagePDF,
  extractTextFromImage,
  openai,
} from "./parse-cv/index";
import { dbService } from "../services/supabase/index";

const cvRoutes = new Hono();

cvRoutes.get("/user/profile/:walletAddress", async (c) => {
  try {
    const walletAddress = c.req.param("walletAddress");

    if (!walletAddress) {
      return c.json({ error: "Wallet address is required" }, 400);
    }

    const userCV = await dbService.getUserCVByWalletAddress(walletAddress);

    if (!userCV) {
      return c.json(
        {
          success: false,
          message: "No CV data found for this wallet address",
          profile: null,
        },
        404
      );
    }

    // Debug logging to check if profile photo exists in the data
    console.log(
      "DEBUG - Profile photo from database:",
      userCV.cv_data?.profilePhoto
    );
    console.log(
      "DEBUG - Raw user data:",
      JSON.stringify({
        cv_data_keys: Object.keys(userCV.cv_data || {}),
      })
    );

    const profileData = {
      id: userCV.id,
      filename: userCV.filename,
      createdAt: userCV.created_at,
      walletAddress: walletAddress,
      cvData: userCV.cv_data,

      personalInfo: {
        fullName: userCV.cv_data?.selfIdentity?.fullName || null,
        title: userCV.cv_data?.selfIdentity?.title || null,
        profession: userCV.cv_data?.selfIdentity?.profession || null,
        institution: userCV.cv_data?.selfIdentity?.institution || null,
        location: userCV.cv_data?.selfIdentity?.location || null,
        field: userCV.cv_data?.selfIdentity?.field || null,
        specialization: userCV.cv_data?.selfIdentity?.specialization || null,
      },

      contact: {
        email: userCV.cv_data?.contact?.email || null,
        linkedIn: userCV.cv_data?.contact?.linkedIn || null,
        github: userCV.cv_data?.contact?.github || null,
        website: userCV.cv_data?.contact?.website || null,
        phone: userCV.cv_data?.contact?.phone || null,
      },

      overview: userCV.cv_data?.overview || null,
      profilePhoto: userCV.cv_data?.profilePhoto || null,

      summary: {
        education: userCV.cv_data?.education?.length || 0,
        experience: userCV.cv_data?.experience?.length || 0,
        publications: userCV.cv_data?.publications?.length || 0,
        awards: userCV.cv_data?.awards?.length || 0,
      },
    };

    // Add more explicit debug logging for the final response
    console.log("DEBUG - Final profilePhoto value:", profileData.profilePhoto);

    return c.json({
      success: true,
      message: "Profile data retrieved successfully",
      profile: profileData,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return c.json(
      {
        error: "Failed to fetch user profile",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

cvRoutes.post("/parse-cv", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("cv") as unknown as File;
    const walletAddress = formData.get("walletAddress") as string;

    if (!file) {
      return c.json({ error: "No file uploaded" }, 400);
    }

    if (!file.name?.toLowerCase().match(/\.(pdf|jpg|jpeg|png)$/)) {
      return c.json(
        { error: "Only PDF, JPG, and PNG files are supported" },
        400
      );
    }

    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    let extractedText = "";

    if (file.name.toLowerCase().endsWith(".pdf")) {
      if (!isPDF(uint8Array)) {
        return c.json({ error: "Invalid PDF file" }, 400);
      }
      if (buffer.byteLength > 10 * 1024 * 1024) {
        return c.json(
          { error: "File size too large. Maximum 10MB allowed." },
          400
        );
      }

      try {
        extractedText = await extractTextFromPDF(Buffer.from(buffer));
      } catch (error) {
        extractedText = "";
      }

      if (extractedText.trim().length >= 100) {
        // Direct extraction successful
      } else {
        try {
          const ocrText = await extractTextFromImagePDF(Buffer.from(buffer));

          if (ocrText.trim().length > extractedText.trim().length) {
            extractedText = ocrText;
          } else if (
            extractedText.trim().length === 0 &&
            ocrText.trim().length > 0
          ) {
            extractedText = ocrText;
          }
        } catch (ocrError) {}
      }

      if (extractedText.trim().length < 10) {
        return c.json(
          {
            error: "Could not extract sufficient text from this PDF",
            details:
              "The PDF may be corrupted, heavily encrypted, or contain unrecognizable content. Please ensure the PDF contains readable text or clear images.",
            extractedLength: extractedText.length,
            preview: extractedText.substring(0, 200) || "No text found",
            suggestion:
              "Try using a different PDF or convert it to a high-quality PNG/JPG image",
          },
          400
        );
      }
    } else if (file.name.toLowerCase().match(/\.(jpg|jpeg|png)$/)) {
      if (buffer.byteLength > 10 * 1024 * 1024) {
        return c.json(
          { error: "File size too large. Maximum 10MB allowed." },
          400
        );
      }

      try {
        extractedText = await extractTextFromImage(Buffer.from(buffer));

        if (extractedText.trim().length < 10) {
          return c.json(
            {
              error: "Could not extract sufficient text from this image",
              details:
                "The image may be too blurry, low resolution, or contain text that's not clearly readable",
              extractedLength: extractedText.length,
              preview: extractedText.substring(0, 200) || "No text found",
              suggestion:
                "Try using a higher quality image with clear, readable text",
            },
            400
          );
        }
      } catch (error) {
        console.error("Image OCR processing failed:", error);
        return c.json(
          {
            error: "Failed to process image",
            details:
              error instanceof Error
                ? error.message
                : "Unknown error occurred during image processing",
          },
          500
        );
      }
    }

    if (!extractedText || extractedText.trim().length < 50) {
      return c.json(
        {
          error:
            "Unable to extract meaningful text from the file. Please ensure it's a readable CV document.",
          extractedLength: extractedText?.length || 0,
          preview: extractedText?.substring(0, 200) || "No text extracted",
        },
        400
      );
    }

    const cvData = await extractCVDataWithAI(extractedText);

    let savedCV = null;
    if (walletAddress) {
      try {
        savedCV = await dbService.saveCVExtraction({
          filename: file.name,
          fileSize: buffer.byteLength,
          fileType: file.name.split(".").pop()?.toLowerCase() || "unknown",
          extractedText: extractedText,
          cvData: cvData,
          aiEnabled: !!openai,
          walletAddress: walletAddress,
        });
      } catch (saveError) {
        console.error("Failed to save CV data:", saveError);
      }
    }

    return c.json({
      success: true,
      data: cvData,
      extractedText: extractedText.substring(0, 1000) + "...",
      message: walletAddress
        ? savedCV
          ? "CV parsed and saved successfully"
          : "CV parsed successfully (save failed)"
        : "CV parsed successfully",
      metadata: {
        filename: file.name,
        fileSize: buffer.byteLength,
        fileType: file.name.split(".").pop()?.toLowerCase() || "unknown",
        extractedTextLength: extractedText.length,
        aiEnabled: !!openai,
        walletAddress: walletAddress || null,
        saved: !!savedCV,
        savedId: savedCV?.id || null,
      },
    });
  } catch (error) {
    console.error("CV parsing error:", error);
    return c.json(
      {
        error: "Failed to parse CV",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

cvRoutes.post("/save-cv", async (c) => {
  try {
    const body = await c.req.json();

    const requiredFields = ["filename", "file_size", "file_type", "cv_data"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return c.json(
          {
            error: `Missing required field: ${field}`,
            code: "MISSING_FIELD",
          },
          400
        );
      }
    }

    if (typeof body.file_size !== "number" || body.file_size <= 0) {
      return c.json(
        {
          error: "file_size must be a positive number",
          code: "INVALID_FILE_SIZE",
        },
        400
      );
    }

    if (typeof body.cv_data !== "object" || body.cv_data === null) {
      return c.json(
        {
          error: "cv_data must be a valid JSON object",
          code: "INVALID_CV_DATA",
        },
        400
      );
    }

    const dbResult = await dbService.saveCVExtraction({
      filename: body.filename,
      fileSize: body.file_size,
      fileType: body.file_type,
      extractedText: body.extracted_text || "",
      cvData: body.cv_data,
      aiEnabled: body.ai_enabled || false,
      walletAddress: body.wallet_address || null,
    });

    if (!dbResult) {
      return c.json(
        {
          error: "Failed to save CV extraction",
          message: "Database operation returned null",
          code: "SAVE_ERROR",
        },
        500
      );
    }

    return c.json({
      success: true,
      message: "CV extraction saved successfully",
      data: {
        id: dbResult.id,
        createdAt: dbResult.created_at,
      },
    });
  } catch (error) {
    console.error("CV extraction save error:", error);
    return c.json(
      {
        error: "Failed to save CV extraction",
        message: error instanceof Error ? error.message : "Unknown error",
        code: "SAVE_ERROR",
      },
      500
    );
  }
});

cvRoutes.get("/extractions", async (c) => {
  try {
    const extractions = await dbService.getAllCVExtractions();
    return c.json({
      success: true,
      data: extractions,
      count: extractions.length,
      message: "CV extractions retrieved successfully",
    });
  } catch (error) {
    console.error("Failed to get CV extractions:", error);
    return c.json(
      {
        error: "Failed to retrieve CV extractions",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

cvRoutes.get("/extractions/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id") || "0");
    if (isNaN(id) || id <= 0) {
      return c.json({ error: "Invalid extraction ID" }, 400);
    }

    const extraction = await dbService.getCVExtractionById(id);
    if (!extraction) {
      return c.json({ error: "CV extraction not found" }, 404);
    }

    return c.json({
      success: true,
      data: extraction,
      message: "CV extraction retrieved successfully",
    });
  } catch (error) {
    console.error("Failed to get CV extraction by ID:", error);
    return c.json(
      {
        error: "Failed to retrieve CV extraction",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

cvRoutes.get("/user/specialization/:walletAddress", async (c) => {
  try {
    const walletAddress = c.req.param("walletAddress");

    if (!walletAddress) {
      return c.json({ error: "Wallet address is required" }, 400);
    }

    const userCV = await dbService.getUserCVByWalletAddress(walletAddress);

    if (!userCV) {
      return c.json(
        {
          success: false,
          message: "No CV data found for this wallet address",
          specialization: null,
        },
        404
      );
    }

    const specializationInfo = {
      fullName: userCV.cv_data?.selfIdentity?.fullName || null,
      field: userCV.cv_data?.selfIdentity?.field || null,
      specialization: userCV.cv_data?.selfIdentity?.specialization || null,
      profession: userCV.cv_data?.selfIdentity?.profession || null,
      institution: userCV.cv_data?.selfIdentity?.institution || null,
      profilePhoto: userCV.cv_data?.profilePhoto || null,
      researchAreas: [] as string[],
      extractedAt: userCV.created_at,
    };

    // Extract research areas from publications if available
    if (
      userCV.cv_data?.publications &&
      Array.isArray(userCV.cv_data.publications)
    ) {
      const researchAreas = new Set();
      userCV.cv_data.publications.forEach((pub: any) => {
        if (pub.venue) researchAreas.add(pub.venue);
      });
      specializationInfo.researchAreas = Array.from(researchAreas).slice(
        0,
        5
      ) as string[];
    }

    return c.json({
      success: true,
      message: "Specialization data retrieved successfully",
      data: specializationInfo,
    });
  } catch (error) {
    console.error("Error fetching user specialization:", error);
    return c.json(
      {
        error: "Failed to fetch user specialization",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

cvRoutes.patch("/user/profile/:walletAddress", async (c) => {
  try {
    const walletAddress = c.req.param("walletAddress");

    if (!walletAddress) {
      return c.json({ error: "Wallet address is required" }, 400);
    }

    const existingUser = await dbService.getUserCVByWalletAddress(
      walletAddress
    );
    if (!existingUser) {
      return c.json(
        {
          error: "User not found",
          message: "No CV data found for this wallet address",
        },
        404
      );
    }

    let updates: any = {};
    let profilePhotoUrl: string | null = null;

    const contentType = c.req.header("Content-Type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await c.req.formData();
      const profilePhoto = formData.get("profilePhoto") as File;

      if (profilePhoto && profilePhoto.size > 0) {
        if (!profilePhoto.type.startsWith("image/")) {
          return c.json(
            {
              error: "Invalid file type",
              message: "Profile photo must be an image file",
            },
            400
          );
        }

        if (profilePhoto.size > 5 * 1024 * 1024) {
          return c.json(
            {
              error: "File too large",
              message: "Profile photo must be less than 5MB",
            },
            400
          );
        }

        try {
          const arrayBuffer = await profilePhoto.arrayBuffer();
          profilePhotoUrl = await dbService.uploadProfilePhoto(
            walletAddress,
            arrayBuffer,
            profilePhoto.name,
            profilePhoto.type
          );
        } catch (uploadError) {
          console.error("Failed to upload profile photo:", uploadError);
          return c.json(
            {
              error: "Upload failed",
              message: "Failed to upload profile photo to Supabase Storage",
            },
            500
          );
        }
      }

      const personalInfo = {
        fullName: formData.get("fullName") as string,
        title: formData.get("title") as string,
        profession: formData.get("profession") as string,
        institution: formData.get("institution") as string,
        location: formData.get("location") as string,
        field: formData.get("field") as string,
        specialization: formData.get("specialization") as string,
      };

      const contact = {
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        linkedIn: formData.get("linkedIn") as string,
        github: formData.get("github") as string,
        website: formData.get("website") as string,
      };

      const overview = formData.get("overview") as string;

      updates = { personalInfo, contact, overview };
    } else {
      updates = await c.req.json();
    }

    const allowedUpdates = {
      fullName: updates.personalInfo?.fullName,
      title: updates.personalInfo?.title,
      profession: updates.personalInfo?.profession,
      institution: updates.personalInfo?.institution,
      location: updates.personalInfo?.location,
      field: updates.personalInfo?.field,
      specialization: updates.personalInfo?.specialization,

      email: updates.contact?.email,
      phone: updates.contact?.phone,
      linkedin: updates.contact?.linkedIn,
      github: updates.contact?.github,
      website: updates.contact?.website,

      overview: updates.overview,

      profilePhoto: profilePhotoUrl || updates.profilePhoto,
    };

    const filteredUpdates = Object.fromEntries(
      Object.entries(allowedUpdates).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(filteredUpdates).length === 0) {
      return c.json(
        {
          error: "No valid updates provided",
          message: "Please provide at least one field to update",
        },
        400
      );
    }

    const updatedUser = await dbService.updateUserProfile(
      walletAddress,
      filteredUpdates
    );

    if (!updatedUser) {
      return c.json(
        {
          error: "Update failed",
          message: "Failed to update user profile",
        },
        500
      );
    }

    const refreshedProfile = await dbService.getUserCVByWalletAddress(
      walletAddress
    );

    const profileData = {
      id: refreshedProfile!.id,
      filename: refreshedProfile!.filename,
      createdAt: refreshedProfile!.created_at,
      walletAddress: walletAddress,
      cvData: refreshedProfile!.cv_data,

      personalInfo: {
        fullName: refreshedProfile!.cv_data?.selfIdentity?.fullName || null,
        title: refreshedProfile!.cv_data?.selfIdentity?.title || null,
        profession: refreshedProfile!.cv_data?.selfIdentity?.profession || null,
        institution:
          refreshedProfile!.cv_data?.selfIdentity?.institution || null,
        location: refreshedProfile!.cv_data?.selfIdentity?.location || null,
        field: refreshedProfile!.cv_data?.selfIdentity?.field || null,
        specialization:
          refreshedProfile!.cv_data?.selfIdentity?.specialization || null,
      },

      contact: {
        email: refreshedProfile!.cv_data?.contact?.email || null,
        linkedIn: refreshedProfile!.cv_data?.contact?.linkedIn || null,
        github: refreshedProfile!.cv_data?.contact?.github || null,
        website: refreshedProfile!.cv_data?.contact?.website || null,
        phone: refreshedProfile!.cv_data?.contact?.phone || null,
      },

      overview: refreshedProfile!.cv_data?.overview || null,
      profilePhoto: refreshedProfile!.cv_data?.profilePhoto || null,

      summary: {
        education: refreshedProfile!.cv_data?.education?.length || 0,
        experience: refreshedProfile!.cv_data?.experience?.length || 0,
        publications: refreshedProfile!.cv_data?.publications?.length || 0,
        awards: refreshedProfile!.cv_data?.awards?.length || 0,
      },
    };

    return c.json({
      success: true,
      message: "Profile updated successfully",
      profile: profileData,
      updatedFields: Object.keys(filteredUpdates),
      profilePhotoUploaded: !!profilePhotoUrl,
    });
  } catch (error) {
    return c.json(
      {
        error: "Failed to update profile",
        message: error instanceof Error ? error.message : "Unknown error",
        code: "UPDATE_ERROR",
      },
      500
    );
  }
});

cvRoutes.post("/user/profile-photo/:walletAddress", async (c) => {
  try {
    const walletAddress = c.req.param("walletAddress");

    if (!walletAddress) {
      return c.json({ error: "Wallet address is required" }, 400);
    }

    const existingUser = await dbService.getUserCVByWalletAddress(
      walletAddress
    );
    if (!existingUser) {
      return c.json(
        {
          error: "User not found",
          message: "No CV data found for this wallet address",
        },
        404
      );
    }

    const formData = await c.req.formData();
    const profilePhoto = formData.get("profilePhoto") as File;

    if (!profilePhoto || profilePhoto.size === 0) {
      return c.json(
        {
          error: "No photo provided",
          message: "Please select a profile photo to upload",
        },
        400
      );
    }

    if (!profilePhoto.type.startsWith("image/")) {
      return c.json(
        {
          error: "Invalid file type",
          message: "Profile photo must be an image file",
        },
        400
      );
    }

    if (profilePhoto.size > 5 * 1024 * 1024) {
      return c.json(
        {
          error: "File too large",
          message: "Profile photo must be less than 5MB",
        },
        400
      );
    }

    let profilePhotoUrl: string;

    try {
      const arrayBuffer = await profilePhoto.arrayBuffer();
      profilePhotoUrl = await dbService.uploadProfilePhoto(
        walletAddress,
        arrayBuffer,
        profilePhoto.name,
        profilePhoto.type
      );
    } catch (uploadError) {
      console.error("Failed to upload profile photo:", uploadError);
      return c.json(
        {
          error: "Upload failed",
          message: "Failed to upload profile photo to Supabase Storage",
        },
        500
      );
    }

    const updatedUser = await dbService.updateUserProfile(walletAddress, {
      profilePhoto: profilePhotoUrl,
    });

    if (!updatedUser) {
      return c.json(
        {
          error: "Update failed",
          message: "Failed to update user profile photo",
        },
        500
      );
    }

    return c.json({
      success: true,
      message: "Profile photo updated successfully",
      profilePhoto: profilePhotoUrl,
    });
  } catch (error) {
    return c.json(
      {
        error: "Failed to update profile photo",
        message: error instanceof Error ? error.message : "Unknown error",
        code: "PHOTO_UPDATE_ERROR",
      },
      500
    );
  }
});

cvRoutes.get("/user/check-cv/:walletAddress", async (c) => {
  try {
    const walletAddress = c.req.param("walletAddress");

    if (!walletAddress) {
      return c.json({ error: "Wallet address is required" }, 400);
    }

    const userCV = await dbService.getUserCVByWalletAddress(walletAddress);

    return c.json({
      hasCv: !!userCV,
      cvData: userCV
        ? {
            id: userCV.id,
            filename: userCV.filename,
            createdAt: userCV.created_at,
            profilePhoto: userCV.cv_data?.profilePhoto || null,
          }
        : null,
    });
  } catch (error) {
    console.error("Error checking user CV:", error);
    return c.json({ error: "Failed to check user CV" }, 500);
  }
});

export { cvRoutes };
