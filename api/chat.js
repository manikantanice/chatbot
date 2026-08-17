// =========================================================
// MINI AI - /api/chat.js
// GROQ CHAT + IMAGE ANALYSIS
// =========================================================

module.exports = async function handler(req, res) {

    // ---------------------------------------------------------
    // CORS
    // ---------------------------------------------------------

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "POST, OPTIONS"
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    // ---------------------------------------------------------
    // ONLY POST
    // ---------------------------------------------------------

    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            error: "Method not allowed"
        });
    }

    try {

        // -----------------------------------------------------
        // CHECK API KEY
        // -----------------------------------------------------

        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            console.error("GROQ_API_KEY is missing");

            return res.status(500).json({
                success: false,
                error: "GROQ_API_KEY is not configured"
            });
        }

        // -----------------------------------------------------
        // REQUEST BODY
        // -----------------------------------------------------

        const body = req.body || {};

        const message =
            typeof body.message === "string"
                ? body.message.trim()
                : "";

        const images =
            Array.isArray(body.images)
                ? body.images
                : [];

        const history =
            Array.isArray(body.messages)
                ? body.messages
                : [];

        // -----------------------------------------------------
        // VALIDATE REQUEST
        // -----------------------------------------------------

        if (!message && images.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Message or image is required"
            });
        }

        // -----------------------------------------------------
        // LIMIT IMAGES
        // -----------------------------------------------------

        const safeImages = images
            .filter(img => {
                return (
                    img &&
                    typeof img.data === "string" &&
                    img.data.startsWith("data:image/")
                );
            })
            .slice(0, 5);

        // -----------------------------------------------------
        // IMAGE SIZE CHECK
        // -----------------------------------------------------

        for (const image of safeImages) {

            // Base64 can become very large.
            // Keep each image below ~15 MB.
            if (image.data.length > 20 * 1024 * 1024) {

                return res.status(400).json({
                    success: false,
                    error: "Image is too large. Please use an image below 15MB."
                });
            }
        }

        // -----------------------------------------------------
        // SELECT MODEL
        // -----------------------------------------------------

        const model =
            safeImages.length > 0
                ? "qwen/qwen3.6-27b"
                : "llama-3.3-70b-versatile";

        // -----------------------------------------------------
        // BUILD USER CONTENT
        // -----------------------------------------------------

        const userContent = [];

        if (message) {

            userContent.push({
                type: "text",
                text: message
            });

        } else {

            userContent.push({
                type: "text",
                text: "Please analyze this image."
            });

        }

        // -----------------------------------------------------
        // ADD IMAGES
        // -----------------------------------------------------

        for (const image of safeImages) {

            userContent.push({
                type: "image_url",
                image_url: {
                    url: image.data
                }
            });

        }

        // -----------------------------------------------------
        // BUILD MESSAGES
        // -----------------------------------------------------

        const messages = [];

        // Add limited previous conversation
        if (history.length > 0) {

            const previousMessages =
                history
                    .filter(item => {
                        return (
                            item &&
                            typeof item.role === "string" &&
                            typeof item.content === "string"
                        );
                    })
                    .slice(-10);

            for (const item of previousMessages) {

                messages.push({
                    role:
                        item.role === "assistant"
                            ? "assistant"
                            : "user",
                    content: item.content
                });

            }
        }

        // Current message
        messages.push({
            role: "user",
            content: userContent
        });

        // -----------------------------------------------------
        // GROQ REQUEST
        // -----------------------------------------------------

        const groqResponse = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },

                body: JSON.stringify({

                    model: model,

                    messages: messages,

                    temperature: 0.7,

                    max_completion_tokens:
                        safeImages.length > 0
                            ? 2048
                            : 4096

                })
            }
        );

        // -----------------------------------------------------
        // READ RESPONSE
        // -----------------------------------------------------

        const responseText =
            await groqResponse.text();

        let groqData;

        try {

            groqData =
                JSON.parse(responseText);

        } catch (parseError) {

            console.error(
                "Groq returned invalid JSON:",
                responseText
            );

            return res.status(500).json({
                success: false,
                error: "Invalid response received from Groq",
                details: responseText.slice(0, 500)
            });
        }

        // -----------------------------------------------------
        // GROQ ERROR
        // -----------------------------------------------------

        if (!groqResponse.ok) {

            console.error(
                "Groq API error:",
                groqData
            );

            return res.status(groqResponse.status).json({
                success: false,
                error:
                    groqData?.error?.message ||
                    "Groq API request failed",
                details:
                    groqData?.error || null
            });
        }

        // -----------------------------------------------------
        // GET AI MESSAGE
        // -----------------------------------------------------

        const answer =
            groqData?.choices?.[0]?.message?.content;

        if (!answer) {

            console.error(
                "No AI response:",
                groqData
            );

            return res.status(500).json({
                success: false,
                error: "AI returned an empty response"
            });
        }

        // -----------------------------------------------------
        // SUCCESS
        // -----------------------------------------------------

        return res.status(200).json({

            success: true,

            message: answer,

            response: answer,

            model: model,

            hasImages:
                safeImages.length > 0,

            imageCount:
                safeImages.length

        });

    } catch (error) {

        // -----------------------------------------------------
        // SERVER ERROR
        // -----------------------------------------------------

        console.error(
            "API /api/chat ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            error:
                error?.message ||
                "Internal server error",

            details:
                process.env.NODE_ENV === "development"
                    ? error?.stack
                    : undefined

        });
    }
};
