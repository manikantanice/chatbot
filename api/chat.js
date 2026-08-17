// =====================================================
// MINI AI — VERCEL API
// api/chat.js
// =====================================================

module.exports = async function handler(req, res) {

    // =====================================================
    // RESPONSE HEADERS
    // =====================================================

    res.setHeader(
        "Cache-Control",
        "no-store, max-age=0"
    );

    res.setHeader(
        "Access-Control-Allow-Origin",
        "*"
    );

    res.setHeader(
        "Access-Control-Allow-Methods",
        "POST, OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    );


    // =====================================================
    // OPTIONS / CORS
    // =====================================================

    if (req.method === "OPTIONS") {

        return res.status(200).end();

    }


    // =====================================================
    // METHOD CHECK
    // =====================================================

    if (req.method !== "POST") {

        return res.status(405).json({

            type: "error",

            error:
                "Method not allowed. Use POST."

        });

    }


    try {

        // =================================================
        // ENVIRONMENT VARIABLES
        // =================================================

        const groqApiKey =
            process.env.GROQ_API_KEY;

        const pollinationsKey =
            process.env.POLLINATIONS_API_KEY;


        // =================================================
        // GROQ KEY CHECK
        // =================================================

        if (!groqApiKey) {

            console.error(
                "GROQ_API_KEY is missing."
            );

            return res.status(500).json({

                type: "error",

                error:
                    "GROQ_API_KEY is not configured in Vercel."

            });

        }


        // =================================================
        // REQUEST BODY
        // =================================================

        const body =
            req.body && typeof req.body === "object"
                ? req.body
                : {};


        // =================================================
        // MESSAGES
        // =================================================

        const messages =
            Array.isArray(body.messages)
                ? body.messages
                : [];


        // =================================================
        // USER MESSAGE
        // =================================================

        const message =
            typeof body.message === "string"
                ? body.message.trim()
                : "";


        // =================================================
        // WEB SEARCH FLAG
        // =================================================

        const webSearch =
            body.webSearch === true;


        // =================================================
        // IMAGES
        // =================================================

        const images =
            Array.isArray(body.images)
                ? body.images
                : [];


        // =================================================
        // FIND LAST USER MESSAGE
        // =================================================

        let userText =
            message;


        if (!userText && messages.length > 0) {

            for (
                let i = messages.length - 1;
                i >= 0;
                i--
            ) {

                const current =
                    messages[i];


                if (
                    current &&
                    current.role === "user"
                ) {

                    if (
                        typeof current.content === "string"
                    ) {

                        userText =
                            current.content.trim();

                        break;

                    }


                    // -------------------------------------
                    // Handle multimodal content
                    // -------------------------------------

                    if (
                        Array.isArray(
                            current.content
                        )
                    ) {

                        const textPart =
                            current.content.find(
                                item =>
                                    item &&
                                    item.type === "text"
                            );


                        if (
                            textPart &&
                            typeof textPart.text === "string"
                        ) {

                            userText =
                                textPart.text.trim();

                            break;

                        }

                    }

                }

            }

        }


        // =================================================
        // BASIC VALIDATION
        // =================================================

        if (
            !userText &&
            messages.length === 0 &&
            images.length === 0
        ) {

            return res.status(400).json({

                type: "error",

                error:
                    "Please enter a message."

            });

        }


        // =================================================
        // LIMIT CONVERSATION HISTORY
        // =================================================
        //
        // Prevent unnecessarily huge requests.
        //
        // Keep the latest 30 messages.
        // =================================================

        const safeMessages =
            messages
                .filter(message => {

                    if (
                        !message ||
                        typeof message !== "object"
                    ) {
                        return false;
                    }


                    if (
                        !["system", "user", "assistant"]
                            .includes(message.role)
                    ) {
                        return false;
                    }


                    return true;

                })
                .slice(-30);


        // =================================================
        // IMAGE GENERATION DETECTION
        // =================================================

        const wantsImage =
            /create\s+(an?\s+)?image|generate\s+(an?\s+)?image|make\s+(an?\s+)?image|create\s+(an?\s+)?picture|generate\s+(an?\s+)?picture|make\s+(an?\s+)?picture|draw\s+(an?\s+)?|image\s+of|create\s+(an?\s+)?photo|generate\s+(an?\s+)?photo|make\s+(an?\s+)?photo|show\s+me\s+(an?\s+)?image|show\s+image/i
                .test(userText);


        // =================================================
        // IMAGE GENERATION
        // =================================================

        if (
            wantsImage &&
            images.length === 0
        ) {


            // ------------------------------------------------
            // POLLINATIONS KEY
            // ------------------------------------------------

            if (!pollinationsKey) {

                console.error(
                    "POLLINATIONS_API_KEY is missing."
                );

                return res.status(500).json({

                    type: "error",

                    error:
                        "POLLINATIONS_API_KEY is not configured in Vercel."

                });

            }


            try {

                // =================================================
                // CLEAN IMAGE PROMPT
                // =================================================

                let imagePrompt =
                    userText;


                imagePrompt =
                    imagePrompt.replace(
                        /^\s*(please\s*)?(create|generate|make|draw|show\s+me)\s+(an?\s+)?(image|picture|photo)\s*(of\s*)?/i,
                        ""
                    );


                imagePrompt =
                    imagePrompt
                        .replace(
                            /^\s*of\s+/i,
                            ""
                        )
                        .trim();


                const finalPrompt =
                    imagePrompt || userText;


                console.log(
                    "Generating image:",
                    finalPrompt
                );


                // =================================================
                // POLLINATIONS URL
                // =================================================

                const imageUrl =
                    `https://gen.pollinations.ai/image/${encodeURIComponent(
                        finalPrompt
                    )}?model=flux`;


                // =================================================
                // GENERATE IMAGE
                // =================================================

                const imageResponse =
                    await fetch(
                        imageUrl,
                        {

                            method:
                                "GET",

                            headers: {

                                Authorization:
                                    `Bearer ${pollinationsKey}`,

                                Accept:
                                    "image/*"

                            }

                        }
                    );


                // =================================================
                // POLLINATIONS ERROR
                // =================================================

                if (
                    !imageResponse.ok
                ) {

                    const errorText =
                        await imageResponse.text();


                    console.error(
                        "Pollinations error:",
                        imageResponse.status,
                        errorText
                    );


                    return res.status(
                        imageResponse.status
                    ).json({

                        type: "error",

                        error:
                            errorText ||
                            "Image generation failed."

                    });

                }


                // =================================================
                // READ IMAGE
                // =================================================

                const imageBuffer =
                    await imageResponse.arrayBuffer();


                if (
                    !imageBuffer ||
                    imageBuffer.byteLength === 0
                ) {

                    return res.status(500).json({

                        type: "error",

                        error:
                            "Generated image is empty."

                    });

                }


                // =================================================
                // CONTENT TYPE
                // =================================================

                const contentType =
                    imageResponse.headers.get(
                        "content-type"
                    ) ||
                    "image/jpeg";


                // =================================================
                // BASE64
                // =================================================

                const base64Image =
                    Buffer
                        .from(imageBuffer)
                        .toString("base64");


                // =================================================
                // DATA URL
                // =================================================

                const imageData =
                    `data:${contentType};base64,${base64Image}`;


                // =================================================
                // RETURN GENERATED IMAGE
                // =================================================

                return res.status(200).json({

                    type: "image",

                    reply:
                        "✨ Here is the image I created for you.",

                    image:
                        imageData

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

        if (
            images.length > 0
        ) {

            console.log(
                "Uploaded images:",
                images.length
            );


            // =================================================
            // LIMIT IMAGES
            // =================================================

            const selectedImages =
                images.slice(0, 5);


            const imageContents =
                [];


            // =================================================
            // PREPARE IMAGE DATA
            // =================================================

            for (
                const image
                of selectedImages
            ) {

                if (
                    !image ||
                    typeof image !== "object"
                ) {
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


                if (!imageData) {
                    continue;
                }


                // =================================================
                // RAW BASE64 → DATA URL
                // =================================================

                if (
                    !imageData.startsWith(
                        "data:image/"
                    )
                ) {

                    const mimeType =
                        typeof image.type === "string" &&
                        image.type.startsWith("image/")
                            ? image.type
                            : "image/jpeg";


                    imageData =
                        `data:${mimeType};base64,${imageData}`;

                }


                // =================================================
                // IMAGE VALIDATION
                // =================================================

                if (
                    !imageData.startsWith(
                        "data:image/"
                    )
                ) {
                    continue;
                }


                // =================================================
                // ADD IMAGE
                // =================================================

                imageContents.push({

                    type:
                        "image_url",

                    image_url: {

                        url:
                            imageData

                    }

                });

            }


            // =================================================
            // NO VALID IMAGES
            // =================================================

            if (
                imageContents.length === 0
            ) {

                return res.status(400).json({

                    type: "error",

                    error:
                        "No valid image data was received."

                });

            }


            // =================================================
            // IMAGE QUESTION
            // =================================================

            const analysisPrompt =
                userText ||
                "Analyze this image carefully. Describe only what is visible. Include objects, people, colors, visible text and important details. Do not invent anything that cannot be seen.";


            // =================================================
            // VISION MESSAGE
            // =================================================

            const visionMessage = {

                role:
                    "user",

                content: [

                    {

                        type:
                            "text",

                        text:
                            analysisPrompt

                    },

                    ...imageContents

                ]

            };


            console.log(
                "Sending image to Groq vision..."
            );


            // =================================================
            // GROQ VISION API
            // =================================================

            const groqResponse =
                await fetch(
                    "https://api.groq.com/openai/v1/chat/completions",
                    {

                        method:
                            "POST",

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
                                            "You are Mini AI, a helpful multimodal AI assistant. Carefully analyze uploaded images and answer the user's question. Read visible text when possible. Never invent details that are not visible."

                                    },

                                    visionMessage

                                ],

                                temperature:
                                    0.4,

                                max_completion_tokens:
                                    1500

                            })

                    }
                );


            // =================================================
            // READ GROQ RESPONSE
            // =================================================

            const responseText =
                await groqResponse.text();


            let groqData;


            try {

                groqData =
                    JSON.parse(
                        responseText
                    );

            } catch (error) {

                console.error(
                    "Invalid Groq vision response:",
                    responseText
                );


                return res.status(502).json({

                    type: "error",

                    error:
                        "Groq returned an invalid response."

                });

            }


            // =================================================
            // GROQ ERROR
            // =================================================

            if (
                !groqResponse.ok
            ) {

                console.error(
                    "Groq vision error:",
                    groqData
                );


                return res.status(
                    groqResponse.status
                ).json({

                    type: "error",

                    error:
                        groqData?.error?.message ||
                        "Groq vision API error."

                });

            }


            // =================================================
            // GET VISION REPLY
            // =================================================

            const reply =
                groqData
                    ?.choices?.[0]
                    ?.message
                    ?.content;


            if (
                typeof reply !== "string" ||
                !reply.trim()
            ) {

                return res.status(502).json({

                    type: "error",

                    error:
                        "No image analysis response received."

                });

            }


            // =================================================
            // RETURN IMAGE ANALYSIS
            // =================================================

            return res.status(200).json({

                type:
                    "text",

                reply:
                    reply.trim(),

                imageAnalysis:
                    true

            });

        }


        // =====================================================
        // NORMAL TEXT CHAT
        // =====================================================

        if (
            safeMessages.length === 0
        ) {

            if (!userText) {

                return res.status(400).json({

                    type: "error",

                    error:
                        "Messages are missing."

                });

            }


            // -------------------------------------------------
            // Create message when only `message` was sent
            // -------------------------------------------------

            safeMessages.push({

                role:
                    "user",

                content:
                    userText

            });

        }


        // =====================================================
        // SYSTEM PROMPT
        // =====================================================

        const systemMessage = {

            role:
                "system",

            content:
                "You are Mini AI, a helpful, accurate and friendly AI assistant. Answer clearly and naturally. If the user asks for code, provide working code and explain important parts when useful. Do not claim to have searched the web unless actual web-search results were provided."

        };


        // =====================================================
        // FINAL MESSAGE LIST
        // =====================================================

        const finalMessages = [

            systemMessage,

            ...safeMessages

        ];


        console.log(
            "Sending normal text request to Groq...",
            {
                messageCount:
                    finalMessages.length,

                webSearch:
                    webSearch

            }
        );


        // =====================================================
        // GROQ TEXT API
        // =====================================================

        const groqResponse =
            await fetch(
                "https://api.groq.com/openai/v1/chat/completions",
                {

                    method:
                        "POST",

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
                                finalMessages,

                            temperature:
                                0.7,

                            max_tokens:
                                1500

                        })

                }
            );


        // =====================================================
        // READ GROQ RESPONSE
        // =====================================================

        const responseText =
            await groqResponse.text();


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


            return res.status(502).json({

                type:
                    "error",

                error:
                    "Groq returned an invalid response."

            });

        }


        // =====================================================
        // GROQ ERROR
        // =====================================================

        if (
            !groqResponse.ok
        ) {

            console.error(
                "Groq error:",
                groqData
            );


            return res.status(
                groqResponse.status
            ).json({

                type:
                    "error",

                error:
                    groqData?.error?.message ||
                    "Groq API error."

            });

        }


        // =====================================================
        // GET TEXT REPLY
        // =====================================================

        const reply =
            groqData
                ?.choices?.[0]
                ?.message
                ?.content;


        if (
            typeof reply !== "string" ||
            !reply.trim()
        ) {

            return res.status(502).json({

                type:
                    "error",

                error:
                    "No reply received from Groq."

            });

        }


        // =====================================================
        // RETURN TEXT
        // =====================================================

        return res.status(200).json({

            type:
                "text",

            reply:
                reply.trim(),

            webSearch:
                webSearch

        });


    } catch (error) {

        // =====================================================
        // GENERAL SERVER ERROR
        // =====================================================

        console.error(
            "API SERVER ERROR:",
            error
        );


        return res.status(500).json({

            type:
                "error",

            error:
                error?.message ||
                "Internal server error."

        });

    }

};
