module.exports = async function handler(req, res) {
    // =====================================================
    // METHOD CHECK
    // =====================================================

    if (req.method !== "POST") {
        return res.status(405).json({
            type: "error",
            error: "Method not allowed"
        });
    }

    try {
        // =====================================================
        // REQUEST BODY
        // =====================================================

        const body = req.body || {};

        const message =
            typeof body.message === "string"
                ? body.message.trim()
                : "";

        const messages =
            Array.isArray(body.messages)
                ? body.messages
                : [];

        const webSearch =
            Boolean(body.webSearch);

        const images =
            Array.isArray(body.images)
                ? body.images
                : [];

        // =====================================================
        // ENVIRONMENT VARIABLES
        // =====================================================

        const groqApiKey =
            process.env.GROQ_API_KEY;

        if (!groqApiKey) {
            return res.status(500).json({
                type: "error",
                error:
                    "GROQ_API_KEY is missing. Add GROQ_API_KEY in Vercel Environment Variables."
            });
        }

        // =====================================================
        // IMAGE GENERATION DETECTION
        // =====================================================

        const wantsImage =
            /create\s+(an?\s+)?image|generate\s+(an?\s+)?image|make\s+(an?\s+)?image|create\s+(an?\s+)?picture|generate\s+(an?\s+)?picture|draw\s+|image\s+of|create\s+photo|generate\s+photo|make\s+photo/i
                .test(message);

        // =====================================================
        // IMAGE GENERATION
        // =====================================================

        if (
            wantsImage &&
            images.length === 0
        ) {
            const pollinationsKey =
                process.env.POLLINATIONS_API_KEY;

            if (!pollinationsKey) {
                return res.status(500).json({
                    type: "error",
                    error:
                        "POLLINATIONS_API_KEY is missing in Vercel Environment Variables."
                });
            }

            try {
                let imagePrompt =
                    message
                        .replace(
                            /^\s*(please\s*)?(create|generate|make|draw|show\s+me)\s+(an?\s+)?(image|picture|photo)\s*(of\s*)?/i,
                            ""
                        )
                        .trim();

                imagePrompt =
                    imagePrompt
                        .replace(/^of\s+/i, "")
                        .trim();

                const finalPrompt =
                    imagePrompt || message;

                const imageUrl =
                    `https://gen.pollinations.ai/image/${encodeURIComponent(
                        finalPrompt
                    )}?model=flux`;

                const imageResponse =
                    await fetch(
                        imageUrl,
                        {
                            method: "GET",
                            headers: {
                                Authorization:
                                    `Bearer ${pollinationsKey}`,
                                Accept:
                                    "image/*"
                            }
                        }
                    );

                if (!imageResponse.ok) {
                    const errorText =
                        await imageResponse.text();

                    console.error(
                        "Pollinations error:",
                        imageResponse.status,
                        errorText
                    );

                    return res.status(500).json({
                        type: "error",
                        error:
                            `Image generation failed: ${errorText || imageResponse.status}`
                    });
                }

                const imageBuffer =
                    await imageResponse.arrayBuffer();

                const base64Image =
                    Buffer
                        .from(imageBuffer)
                        .toString("base64");

                const contentType =
                    imageResponse.headers.get(
                        "content-type"
                    ) || "image/jpeg";

                return res.status(200).json({
                    type: "image",

                    reply:
                        "✨ Here is the image I created for you.",

                    image:
                        `data:${contentType};base64,${base64Image}`
                });

            } catch (error) {
                console.error(
                    "IMAGE GENERATION ERROR:",
                    error
                );

                return res.status(500).json({
                    type: "error",
                    error:
                        error?.message ||
                        "Image generation failed."
                });
            }
        }

        // =====================================================
        // UPLOADED IMAGE ANALYSIS
        // =====================================================

        if (images.length > 0) {

            // -----------------------------------------------
            // LIMIT IMAGES
            // -----------------------------------------------

            const selectedImages =
                images.slice(0, 5);

            const imageContents = [];

            // -----------------------------------------------
            // PREPARE IMAGES
            // -----------------------------------------------

            for (const image of selectedImages) {

                if (!image) {
                    continue;
                }

                let imageData =
                    image.data ||
                    image.base64 ||
                    image.url ||
                    "";

                if (
                    typeof imageData !== "string"
                ) {
                    continue;
                }

                imageData =
                    imageData.trim();

                // -------------------------------------------
                // RAW BASE64
                // -------------------------------------------

                if (
                    !imageData.startsWith(
                        "data:image/"
                    )
                ) {
                    const mimeType =
                        image.type ||
                        "image/jpeg";

                    imageData =
                        `data:${mimeType};base64,${imageData}`;
                }

                // -------------------------------------------
                // VALID IMAGE
                // -------------------------------------------

                if (
                    !imageData.startsWith(
                        "data:image/"
                    )
                ) {
                    continue;
                }

                imageContents.push({
                    type: "image_url",

                    image_url: {
                        url: imageData
                    }
                });
            }

            // -----------------------------------------------
            // NO VALID IMAGE
            // -----------------------------------------------

            if (
                imageContents.length === 0
            ) {
                return res.status(400).json({
                    type: "error",
                    error:
                        "No valid image data was received."
                });
            }

            // -----------------------------------------------
            // IMAGE QUESTION
            // -----------------------------------------------

            const analysisPrompt =
                message ||
                "Analyze this image carefully. Describe only what is actually visible. Mention important objects, people, colors, visible text and other useful details.";

            // -----------------------------------------------
            // VISION MESSAGE
            // -----------------------------------------------

            const visionMessage = {
                role: "user",

                content: [
                    {
                        type: "text",
                        text:
                            analysisPrompt
                    },

                    ...imageContents
                ]
            };

            console.log(
                "Sending image to Groq Vision..."
            );

            // =================================================
            // GROQ VISION
            // =================================================

            const groqResponse =
                await fetch(
                    "https://api.groq.com/openai/v1/chat/completions",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Authorization:
                                `Bearer ${groqApiKey}`
                        },

                        body:
                            JSON.stringify({
                                model:
                                    "qwen/qwen3.6-27b",

                                messages: [
                                    {
                                        role:
                                            "system",

                                        content:
                                            "You are Mini AI, a helpful multimodal AI assistant. Analyze uploaded images accurately. Read visible text when possible. Never invent information that is not visible."
                                    },

                                    visionMessage
                                ],

                                temperature:
                                    0.4,

                                max_completion_tokens:
                                    1200,

                                reasoning_effort:
                                    "none"
                            })
                    }
                );

            const responseText =
                await groqResponse.text();

            console.log(
                "Groq Vision Status:",
                groqResponse.status
            );

            let groqData;

            try {
                groqData =
                    JSON.parse(
                        responseText
                    );
            } catch (error) {

                console.error(
                    "Groq returned non-JSON:",
                    responseText
                );

                return res.status(500).json({
                    type: "error",
                    error:
                        `Groq returned an invalid response: ${responseText.substring(0, 300)}`
                });
            }

            // -----------------------------------------------
            // GROQ ERROR
            // -----------------------------------------------

            if (!groqResponse.ok) {

                console.error(
                    "Groq Vision API Error:",
                    groqData
                );

                return res.status(
                    groqResponse.status
                ).json({
                    type: "error",

                    error:
                        groqData?.error?.message ||
                        "Groq Vision API request failed."
                });
            }

            // -----------------------------------------------
            // GET RESPONSE
            // -----------------------------------------------

            const reply =
                groqData
                    ?.choices?.[0]
                    ?.message
                    ?.content;

            if (
                !reply ||
                typeof reply !== "string"
            ) {
                console.error(
                    "Empty Groq vision response:",
                    groqData
                );

                return res.status(500).json({
                    type: "error",
                    error:
                        "Groq did not return an image analysis response."
                });
            }

            // -----------------------------------------------
            // RETURN
            // -----------------------------------------------

            return res.status(200).json({
                type: "text",

                reply:
                    reply,

                imageAnalysis:
                    true
            });
        }

        // =====================================================
        // NORMAL TEXT CHAT
        // =====================================================

        if (
            messages.length === 0 &&
            !message
        ) {
            return res.status(400).json({
                type: "error",
                error:
                    "Please enter a message."
            });
        }

        // =====================================================
        // BUILD SAFE MESSAGES
        // =====================================================

        let chatMessages =
            Array.isArray(messages)
                ? messages
                    .filter(
                        item =>
                            item &&
                            (
                                item.role === "user" ||
                                item.role === "assistant" ||
                                item.role === "system"
                            )
                    )
                    .map(item => ({
                        role:
                            item.role,

                        content:
                            typeof item.content === "string"
                                ? item.content
                                : ""
                    }))
                : [];

        // If frontend sends only message
        if (
            chatMessages.length === 0 &&
            message
        ) {
            chatMessages = [
                {
                    role: "user",
                    content: message
                }
            ];
        }

        // =====================================================
        // GROQ TEXT CHAT
        // =====================================================

        console.log(
            "Sending normal text request to Groq..."
        );

        const groqResponse =
            await fetch(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${groqApiKey}`
                    },

                    body:
                        JSON.stringify({
                            model:
                                "llama-3.3-70b-versatile",

                            messages:
                                chatMessages,

                            temperature:
                                0.7,

                            max_tokens:
                                1500
                        })
                }
            );

        const responseText =
            await groqResponse.text();

        console.log(
            "Groq Text Status:",
            groqResponse.status
        );

        let groqData;

        try {
            groqData =
                JSON.parse(
                    responseText
                );
        } catch (error) {

            console.error(
                "Invalid Groq response:",
                responseText
            );

            return res.status(500).json({
                type: "error",
                error:
                    `Groq returned invalid JSON: ${responseText.substring(0, 300)}`
            });
        }

        // =====================================================
        // GROQ ERROR
        // =====================================================

        if (!groqResponse.ok) {

            console.error(
                "Groq API Error:",
                groqData
            );

            return res.status(
                groqResponse.status
            ).json({
                type: "error",

                error:
                    groqData?.error?.message ||
                    "Groq API request failed."
            });
        }

        // =====================================================
        // TEXT REPLY
        // =====================================================

        const reply =
            groqData
                ?.choices?.[0]
                ?.message
                ?.content;

        if (
            !reply ||
            typeof reply !== "string"
        ) {
            return res.status(500).json({
                type: "error",
                error:
                    "No reply received from Groq."
            });
        }

        // =====================================================
        // FINAL RESPONSE
        // =====================================================

        return res.status(200).json({
            type: "text",

            reply:
                reply,

            webSearch:
                webSearch
        });

    } catch (error) {

        console.error(
            "API SERVER ERROR:",
            error
        );

        return res.status(500).json({
            type: "error",

            error:
                error?.message ||
                "Internal server error."
        });
    }
};
