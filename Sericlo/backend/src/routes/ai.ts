import express from "express";
import OpenAI from "openai";
import multer from "multer";
import path from "path";
import fs from "fs";
import { createClient } from "../utils/supabase/server";
import { isAuthenticated } from "./users";

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|webp/;
    const extname = fileTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = fileTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Error: Images Only!"));
    }
  },
});

router.post(
  "/redesign",
  isAuthenticated,
  upload.single("image"),
  async (req, res) => {
    const user_id = req.user!.id;
    const authHeader = req.headers.authorization;
    const token = authHeader?.split("Bearer ")[1];
    const supabase = createClient(token);

    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "Please upload an image" });
      }

      const { style, description } = req.body;

      if (!style) {
        return res.status(400).json({
          success: false,
          error: "Please provide a style for redesign",
        });
      }

      const fileBuffer = fs.readFileSync(req.file.path);
      const fileName = `${Date.now()}-${req.file.originalname}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("redesigns")
        .upload(fileName, fileBuffer, {
          contentType: req.file.mimetype,
        });

      if (uploadError) {
        throw uploadError;
      }
      const { data: signedUrl, error: signedUrlError } = await supabase.storage
        .from("redesigns")
        .createSignedUrl(fileName, 60 * 60);

      if (signedUrlError) {
        throw signedUrlError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("redesigns").getPublicUrl(fileName);

      const prompt = `Diberikan sebuah item pakaian dengan detail berikut:
Gaya: ${style}
Deskripsi: ${description || "Tidak ada deskripsi spesifik yang diberikan"}

Harap berikan tepat 3 ide desain ulang kreatif yang mengubah item ini menjadi sesuatu yang baru dan berkelanjutan. Untuk setiap ide, sertakan:

1. Judul
2. Deskripsi lengkap tentang transformasi
3. Instruksi langkah demi langkah
4. Perkiraan tingkat kesulitan (Mudah/Menengah/Lanjut)
5. Bahan dan alat yang dibutuhkan
6. Dampak terhadap keberlanjutan

Selain itu, untuk setiap ide, berikan deskripsi visual singkat yang dapat digunakan untuk menghasilkan gambar dari item yang telah didesain ulang.

Kembalikan respons Anda dalam format markdown yang valid dengan struktur persis seperti ini:

+ Kembalikan respons Anda dalam format markdown yang terstruktur rapi, misalnya:
+
+ ### Idea 1: Judul Desain Ulang
+ **Deskripsi:** Deskripsi lengkap transformasi
+ **Langkah-langkah:**
+ 1. Langkah 1
+ 2. Langkah 2
+ **Tingkat Kesulitan:** Mudah | Menengah | Lanjut
+ **Bahan dan Alat:** 
+ - Bahan 1
+ - Alat 1
+ **Dampak Keberlanjutan:** Bagaimana ini membantu keberlanjutan
+ **Deskripsi Visual:** Deskripsi visual yang sesuai untuk pembuatan gambar AI

Pastikan ide yang Anda berikan memiliki keterkaitan dengan item pakaian yang diberikan dan dalam bahasa Indonesia yang santai.
`;

      const imageUrlToUse = signedUrl || publicUrl;
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "text",
                text: `Image URL: ${imageUrlToUse}`,
              },
            ],
          },
        ],
        max_tokens: 1000,
      });

      const redesignIdeasText = completion.choices[0].message.content || "";

      const { data: redesignData, error: redesignError } = await supabase
        .from("Redesigns")
        .insert({
          user_id: user_id,
          original_image: publicUrl,
          style,
          description: description || "",
          ideas: redesignIdeasText,
          status: "completed",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (redesignError) {
        throw redesignError;
      }

      fs.unlinkSync(req.file.path);

      res.status(200).json({
        success: true,
        data: {
          ...redesignData,
          ideas: redesignIdeasText,
        },
      });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, error: "Error processing redesign request" });
    }
  }
);

router.get("/", isAuthenticated, async (req, res) => {
  try {
    const user_id = req.user!.id;
    const authHeader = req.headers.authorization;
    const token = authHeader?.split("Bearer ")[1];
    const supabase = createClient(token);

    const { data: history, error } = await supabase
      .from("Redesigns")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    res.status(200).json({ success: true, data: history });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Error fetching redesign history" });
  }
});

router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const user_id = req.user!.id;
    const authHeader = req.headers.authorization;
    const token = authHeader?.split("Bearer ")[1];
    const supabase = createClient(token);

    const { id } = req.params;

    const { data: redesign, error } = await supabase
      .from("Redesigns")
      .select("*")
      .eq("id", id)
      .eq("user_id", user_id)
      .single();

    if (error) {
      throw error;
    }

    res.status(200).json({ success: true, data: redesign });
  } catch (error) {
    res.status(500).json({ success: false, error: "Error fetching redesign" });
  }
});

export default router;
