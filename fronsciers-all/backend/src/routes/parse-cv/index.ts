import { createWorker } from "tesseract.js";
import { fromPath } from "pdf2pic";
import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { Hono } from "hono";

let pdf: any = null;

export const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

export function isPDF(buffer: Uint8Array): boolean {
  const pdfHeader = [0x25, 0x50, 0x44, 0x46, 0x2d];
  return pdfHeader.every((byte, index) => buffer[index] === byte);
}

interface CVData {
  selfIdentity: {
    fullName?: string;
    institution?: string;
    location?: string;
    profession?: string;
    title?: string;
  };
  overview?: string;
  education: Array<{
    institution?: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
    gpa?: string;
    location?: string;
  }>;
  experience: Array<{
    company?: string;
    position?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    location?: string;
    type?: string; // project/work
  }>;
  publications: Array<{
    title?: string;
    authors?: string[];
    venue?: string;
    date?: string;
    doi?: string;
    url?: string;
  }>;
  awards: Array<{
    name?: string;
    issuer?: string;
    date?: string;
    description?: string;
  }>;
  contact: {
    email?: string;
    linkedIn?: string;
    github?: string;
    website?: string;
    phone?: string;
  };
}

export function extractCVDataWithRegex(text: string): CVData {
  const cvData: CVData = {
    selfIdentity: {},
    education: [],
    experience: [],
    publications: [],
    awards: [],
    contact: {},
  };

  const emailMatch = text.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  );
  if (emailMatch) cvData.contact.email = emailMatch[0];

  const linkedInMatch = text.match(/linkedin\.com\/in\/[^\s]+/i);
  if (linkedInMatch) cvData.contact.linkedIn = linkedInMatch[0];

  const githubMatch = text.match(/github\.com\/[^\s]+/i);
  if (githubMatch) cvData.contact.github = githubMatch[0];

  const phoneMatch = text.match(
    /(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/
  );
  if (phoneMatch) cvData.contact.phone = phoneMatch[0];

  return cvData;
}

function extractJSONFromResponse(content: string): string {
  let cleaned = content.replace(/```json\s*\n?/g, "").replace(/```\s*$/g, "");

  cleaned = cleaned.replace(/^\s*\/\/.*$/gm, "");
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");

  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");

  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }

  cleaned = cleaned.trim();

  return cleaned;
}

export async function extractCVDataWithAI(text: string): Promise<CVData> {
  if (!openai) {
    return extractCVDataWithRegex(text);
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a CV parser. Extract structured information from the CV text and return it as JSON in this exact format:
{
  "selfIdentity": {
    "fullName": "string",
    "institution": "string",
    "location": "string",
    "profession": "string",
    "title": "string",
    "field": "string" ,
    "specialization": "string"
  },
  "overview": "string",
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "field": "string",
      "startDate": "string",
      "endDate": "string",
      "gpa": "string",
      "location": "string"
    }
  ],
  "experience": [
    {
      "company": "string",
      "position": "string",
      "startDate": "string",
      "endDate": "string",
      "description": "string",
      "location": "string",
      "type": "string"
    }
  ],
  "publications": [
    {
      "title": "string",
      "authors": ["string"],
      "venue": "string",
      "date": "string",
      "doi": "string",
      "url": "string"
    }
  ],
  "awards": [
    {
      "name": "string",
      "issuer": "string",
      "date": "string",
      "description": "string"
    }
  ],
  "contact": {
    "email": "string",
    "linkedIn": "string",
    "github": "string",
    "website": "string",
    "phone": "string"
  }
}

Only return the JSON, no additional text. Make sure to extract all available information in each section.

IMPORTANT EXTRACTION GUIDELINES:
- fullName: Extract the person's complete name (first + last name)
- profession: Job title/role (e.g., "Software Engineer", "Professor", "Research Scientist")
- field: General academic/professional domain (e.g., "Computer Science", "Biology", "Physics")
- specialization: Specific area of expertise within the field (e.g., "Machine Learning", "Quantum Computing", "Molecular Biology", "Artificial Intelligence", "Neruology", "Fluid Dynamics and Aeorodynamics", "Polymer Chemistry", "Earthquake-Resistant Design", "Hypersonic Vehicles", "Moral Psychology", "Political Philosophy")
- title: Academic or professional title (e.g., "Dr.", "PhD", "Associate Professor", "Senior Engineer")

For specialization, look for:
- Research interests/areas
- Specialized skills or domains mentioned
- PhD dissertation topics
- Specialized courses taught
- Technical expertise areas
- Niche areas within their broader field`,
        },
        {
          role: "user",
          content: `Extract information from this CV:\n\n${text}`,
        },
      ],
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const cleanedContent = extractJSONFromResponse(content);
      try {
        return JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error("JSON parsing failed. Original content:", content);
        console.error("Cleaned content:", cleanedContent);
        console.error("Parse error:", parseError);
        throw parseError;
      }
    }
    throw new Error("No content from AI");
  } catch (error) {
    console.error("AI extraction failed, falling back to regex:", error);
    return extractCVDataWithRegex(text);
  }
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    if (!pdf) {
      pdf = (await import("pdf-parse")).default;
    }

    const data = await pdf(buffer);

    console.log("PDF data extracted:", {
      totalPages: data.numpages,
      textLength: data.text?.length || 0,
    });

    if (data.text && data.text.trim().length > 0) {
      return data.text;
    }

    return "";
  } catch (error) {
    console.error("PDF text extraction failed:", error);
    return "";
  }
}

export async function extractTextWithOCR(
  buffer: Buffer,
  isDirectImage: boolean = false
): Promise<string> {
  try {
    console.log(
      `Starting OCR process for ${isDirectImage ? "image" : "PDF"}...`
    );

    if (isDirectImage) {
      const worker = await createWorker("eng");
      const {
        data: { text },
      } = await worker.recognize(buffer);
      await worker.terminate();

      return text || "";
    } else {
      const tempDir = path.join(process.cwd(), "temp");
      await fs.mkdir(tempDir, { recursive: true });

      const tempFile = path.join(tempDir, `pdf_${Date.now()}.pdf`);
      await fs.writeFile(tempFile, buffer);

      try {
        const convert = fromPath(tempFile, {
          density: 200,
          saveFilename: "page",
          savePath: tempDir,
          format: "png",
          width: 1600,
          height: 2000,
        });

        const pageImages = await convert.bulk(-1, { responseType: "image" });

        const worker = await createWorker("eng");
        let fullText = "";

        for (let i = 0; i < Math.min(pageImages.length, 3); i++) {
          const page = pageImages[i];
          if (page.path) {
            const {
              data: { text },
            } = await worker.recognize(page.path);
            fullText += text + "\n\n";
          }
        }

        await worker.terminate();

        try {
          await fs.unlink(tempFile);
          for (const page of pageImages) {
            if (page.path) {
              await fs.unlink(page.path);
            }
          }
        } catch (cleanupError) {
          console.warn("Cleanup failed:", cleanupError);
        }

        return fullText;
      } catch (conversionError) {
        console.error("PDF to image conversion failed:", conversionError);

        try {
          const worker = await createWorker("eng");
          const {
            data: { text },
          } = await worker.recognize(buffer);
          await worker.terminate();

          return text || "";
        } catch (fallbackError) {
          console.error("Fallback OCR also failed:", fallbackError);
          return "";
        }
      }
    }
  } catch (error) {
    console.error("OCR processing failed:", error);
    return "";
  }
}

export async function extractTextFromImagePDF(buffer: Buffer): Promise<string> {
  return await extractTextWithOCR(buffer, false);
}

export async function extractTextFromImage(buffer: Buffer): Promise<string> {
  return await extractTextWithOCR(buffer, true);
}

const app = new Hono();

app.post("/upload", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("cv") as unknown as File;

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
        if (extractedText.trim().length < 100) {
          extractedText = await extractTextFromImagePDF(Buffer.from(buffer));
        }
      } catch (error) {
        extractedText = await extractTextFromImagePDF(Buffer.from(buffer));
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
      } catch (error) {
        console.error("Image OCR extraction failed:", error);
        return c.json({ error: "Failed to extract text from image" }, 400);
      }
    }

    if (!extractedText || extractedText.trim().length < 50) {
      return c.json(
        {
          error:
            "Unable to extract meaningful text from the file. Please ensure it's a readable CV document.",
        },
        400
      );
    }

    const cvData = await extractCVDataWithAI(extractedText);

    return c.json({
      success: true,
      data: cvData,
      extractedText: extractedText.substring(0, 1000) + "...",
      message: "CV parsed successfully",
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

app.get("/health", (c) => {
  return c.json({
    status: "OK",
    service: "CV Parser",
    aiEnabled: !!openai,
    timestamp: new Date().toISOString(),
  });
});

export const parseCVRoute = app;
