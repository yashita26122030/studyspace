
require("dotenv").config();
console.log("Gemini key loaded:", Boolean(process.env.GEMINI_API_KEY));
const express = require("express");
const multer = require("multer");
const pdf = require("pdf-parse");
const {
    GoogleGenAI,
    createPartFromUri,
    createUserContent
} = require("@google/genai");

const app = express();
const PORT = 3000;
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

app.use(express.json());
app.use(express.static(__dirname));
app.use((req, res, next) => {
    console.log("Incoming request:", req.method, req.url);
    next();
});

// ======================================
// FILE UPLOAD SETTINGS
// ======================================

const pdfUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            cb(new Error("Only PDF files are allowed."));
        }
    }
});

const mediaUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype.startsWith("audio/") ||
            file.mimetype.startsWith("video/")
        ) {
            cb(null, true);
        } else {
            cb(new Error("Please upload an audio or video file."));
        }
    }
});
const transcriptionUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }
});

// ======================================
// SERVER STATUS
// ======================================

app.get("/api/status", (req, res) => {
    res.json({
        status: "success",
        message: "StudySpace backend is running!"
    });
});

// ======================================
// PDF UPLOAD
// ======================================

app.post("/api/upload-pdf", pdfUpload.single("pdf"), async (req, res) => {
    try {
        console.log("Gemini summarisation request received!");
        if (!req.file) {
            return res.status(400).json({
                error: "Please upload a PDF."
            });
        }

        const data = await pdf(req.file.buffer);

        res.json({
            message: "PDF uploaded successfully!",
            fileName: req.file.originalname,
            text: data.text
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Could not read the PDF."
        });
    }
});

// ======================================
// VIDEO AND AUDIO UPLOAD
// ======================================

// ======================================
// VIDEO AND AUDIO UPLOAD + AI PROCESSING
// ======================================

app.post("/api/upload-media", mediaUpload.single("media"), async (req, res) => {
    let geminiFile;

    try {
        if (!req.file) {
            return res.status(400).json({
                error: "Please select an audio or video file."
            });
        }

        const { summaryType } = req.body;

        const formats = {
            short: "Write a short summary.",
            detailed: "Create detailed, well-organised study notes.",
            keypoints: "List the most important key points."
        };

        const instruction = formats[summaryType] || formats.short;

        const uploadedFile = new File(
            [req.file.buffer],
            req.file.originalname,
            { type: req.file.mimetype }
        );

        geminiFile = await ai.files.upload({
            file: uploadedFile,
            config: {
                mimeType: req.file.mimetype
            }
        });

        // Wait for video processing to finish
        if (req.file.mimetype.startsWith("video/")) {
            let attempts = 0;

            while (
                geminiFile.state &&
                geminiFile.state.toString() !== "ACTIVE" &&
                attempts < 30
            ) {
                if (geminiFile.state.toString() === "FAILED") {
                    throw new Error("Gemini could not process this video.");
                }

                await new Promise(resolve =>
                    setTimeout(resolve, 2000)
                );

                geminiFile = await ai.files.get({
                    name: geminiFile.name
                });

                attempts++;
            }

            if (geminiFile.state.toString() !== "ACTIVE") {
                throw new Error("Video processing took too long.");
            }
        }

const prompt = `
You are StudySpace AI, a friendly and fast study tutor.

Analyze the uploaded audio or video and create clear study notes.

Follow these rules:
- Use simple, beginner-friendly English.
- Explain important concepts clearly.
- Organize the information with headings.
- Include important points and examples mentioned.
- Keep the summary concise but meaningful.
- Do not invent information.
- If mathematical equations appear, format them using LaTeX.
- Preserve important formulas and calculations.

Return your answer in this format:

TRANSCRIPT:
Provide the main spoken content.

SUMMARY:
Provide clear, easy-to-understand study notes.
`;




        const response = await ai.models.generateContent({
           model:" gemini-3.5-flash-lite",
            contents: createUserContent([
                createPartFromUri(
                    geminiFile.uri,
                    geminiFile.mimeType
                ),
                prompt
            ])
        });

        res.json({
            status: "success",
            fileName: req.file.originalname,
            result: response.text
        });

    } catch (error) {
        console.error("Media processing error:", error);

        res.status(500).json({
            error: error.message ||
                "Could not process the recording. Please try again."
        });

    } finally {
        if (geminiFile && geminiFile.name) {
            try {
                await ai.files.delete({
                    name: geminiFile.name
                });
            } catch (deleteError) {
                console.error("Temporary file cleanup failed:", deleteError);
            }
        }
    }
});

// ======================================
// AUDIO TRANSCRIPTION
// ======================================

app.post("/api/transcribe-media", transcriptionUpload.single("media"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: "Please upload an audio file."
            });
        }

        const transcription = await openai.audio.transcriptions.create({
            file: new File(
                [req.file.buffer],
                req.file.originalname,
                { type: req.file.mimetype }
            ),
            model: "whisper-1"
        });

        res.json({
            transcript: transcription.text
        });

    } catch (error) {
        console.error("Transcription error:", error);

        res.status(500).json({
            error: "Could not transcribe the recording."
        });
    }
});

// ======================================
// AI MEDIA SUMMARISATION - GEMINI
// ======================================

app.post("/api/summarize-media", async (req, res) => {
    try {
        const { transcript, summaryType } = req.body;

        if (!transcript || !transcript.trim()) {
            return res.status(400).json({
                error: "No transcript was provided."
            });
        }

        const formats = {
            short: "Write a short summary.",
            detailed: "Create detailed, well-organised study notes.",
            keypoints: "List the most important key points."
        };

        const instruction = formats[summaryType] || formats.short;

        const prompt = `
You are a helpful study assistant.
Create accurate study notes from the supplied transcript.
Do not invent information.

${instruction}

Transcript:
${transcript}
`;

        let response;

for (let attempt = 1; attempt <= 3; attempt++) {
    try {
        response = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: prompt
        });

        break;

    } catch (error) {
        if (error.status !== 503 || attempt === 3) {
            throw error;
        }

        console.log(`Gemini busy. Retrying (${attempt}/3)...`);

        await new Promise(resolve =>
            setTimeout(resolve, attempt * 3000)
        );
    }
}

        res.json({
            summary: response.text
        });

    } catch (error) {
        console.error("Gemini summary error:", error);

        res.status(503).json({
    error: "StudySpace Media Summariser is temporarily unavailable. Please try again later."
});
    }
});
console.log("Gemini summarisation route registered!");


// ======================================
// ERROR HANDLING
// ======================================
// ======================================
// AI STUDY ASSISTANT - ASK GEMINI
// ======================================

app.post("/api/ask-ai", async (req, res) => {
    try {
        const { question, documentText } = req.body;

        if (!question || !question.trim()) {
            return res.status(400).json({
                error: "Please enter a question."
            });
        }


const prompt = `
You are StudySpace AI, a fast and friendly study tutor.

Explain answers using:
- Simple, beginner-friendly English.
- Short sentences and paragraphs.
- Clear headings when useful.
- One easy example.
- Step-by-step working only when needed.
- A short recap for difficult topics.

Keep answers concise but meaningful.
Avoid unnecessary introductions and repetition.
For simple questions, answer directly.
For difficult questions, explain enough to make the idea clear.

MATH FORMATTING RULES:
- Write mathematical expressions using LaTeX.
- Use \\( ... \\) for inline maths.
- Use \\[ ... \\] for equations on separate lines.
- Format fractions, powers, roots, symbols and equations properly.
- Show calculations one step at a time.
- Explain each step in simple English.
- Put important final answers on a separate line.
- Use clear mathematical notation instead of confusing plain text.

If a document is provided, use it as the main source.
Stay faithful to the document.
If the answer is not available in the document, clearly say so.
Never invent information.

Document:
${documentText || "No document uploaded."}

Student's question:
${question}
`;


let response;

for (let attempt = 1; attempt <= 3; attempt++) {
    try {
        response = await ai.models.generateContent({
       model:" gemini-3.5-flash-lite",
            contents: prompt
        });

        break;

    } catch (error) {
        if (error.status !== 503 || attempt === 3) {
            throw error;
        }

        console.log(`Gemini busy. Retrying (${attempt}/3)...`);

        await new Promise(resolve =>
            setTimeout(resolve, attempt * 3000)
        );
    }
}

        console.log("GEMINI RESPONSE:", response.text);

        res.json({
            answer: response.text
        });

    } catch (error) {
        console.error("AI assistant error:", error);

        res.status(503).json({
    error: "StudySpace AI is temporarily unavailable. Please try again later."
});
    }
});
app.use((error, req, res, next) => {
    console.error(error);

    res.status(400).json({
        error: error.message || "Something went wrong."
    });
});

// ======================================
// START SERVER
// ======================================

app.listen(PORT, "0.0.0.0", () => {
    console.log(`StudySpace running at http://127.0.0.1:${PORT}`);
});
