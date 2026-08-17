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
        // REQUEST DATA
        // =====================================================

        const body = req.body || {};

        const messages = Array.isArray(body.messages)
            ? body.messages
            : [];

        const message = typeof body.message === "string"
            ? body.message.trim()
            : "";

        const webSearch = Boolean(body.webSearch);

        const images = Array.isArray(body.images)
            ? body.images
            : [];


        // =====================================================
        // API KEYS
        // =====================================================

        const groqApiKey =
            process.env.GROQ_API_KEY;


        if (!groqApiKey) {
            return res.status(500).json({
                type: "error",
                error: "GROQ_API_KEY is not configured in Vercel."
            });
        }


        // =====================================================
        // USER MESSAGE
        // =====================================================

        let userText = message;

        if (!userText && messages.length > 0) {

            const lastMessage =
                messages[messages.length - 1];

            if (
                lastMessage &&
                typeof lastMessage.content === "string"
            ) {
                userText =
                    lastMessage.content.trim();
            }
        }


        // =====================================================
        // IMAGE GENERATION DETECTION
        // =====================================================

        const wantsImage =
            /create\s+(an?\s+)?image|generate\s+(an?\s+)?image|make\s+(an?\s+)?image|create\s+(an?\s+)?picture|generate\s+(an?\s+)?picture|draw|image\s+of|create\s+image|make\s+picture|generate\s+picture|show\s+me\s+(an?\s+)?image|show\s+image|create\s+photo|generate\s+photo|make\s+photo/i
                .test(userText);


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
                        "POLLINATIONS_API_KEY is not configured in Vercel."
                });
            }


            try {

                // -------------------------------------------------
                // CLEAN PROMPT
                // -------------------------------------------------

                let imagePrompt =
                    userText
                        .replace(
                            /^\s*(please\s*)?(create|generate|make|draw|show\s+me)\s+(an?\s+)?(image|picture|photo)\s*(of\s*)?/i,
                            ""
                        )
                        .trim();


                imagePrompt =
                    imagePrompt
                        .replace(
                            /^of\s+/i,
                            ""
                        )
                        .trim();


                const finalPrompt =
                    imagePrompt || userText;


                console.log(
                    "Generating image:",
                    finalPrompt
                );


                // -------------------------------------------------
                // POLLINATIONS IMAGE URL
                // -------------------------------------------------

                const imageUrl =
                    `https://gen.pollinations.ai/image/${encodeURIComponent(
                        finalPrompt
                    )}?model=flux`;


                // -------------------------------------------------
                // REQUEST IMAGE
                // -------------------------------------------------

                const imageResponse =
                    await fetch(
                        imageUrl,
                        {
                            method: "GET",

                            headers: {
                                "Authorization":
                                    `Bearer ${pollinationsKey}`,

                                "Accept":
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

                    return res.status(
                        imageResponse.status
                    ).json({
                        type: "error",
                        error:
                            errorText ||
                            "Image generation failed."
                    });
                }


                // -------------------------------------------------
                // IMAGE BUFFER
                // -------------------------------------------------

                const imageBuffer =
                    await imageResponse.arrayBuffer();


                // -------------------------------------------------
                // BASE64
                // -------------------------------------------------

                const base64Image =
                    Buffer
                        .from(imageBuffer)
                        .toString("base64");


                // -------------------------------------------------
                // CONTENT TYPE
                // -------------------------------------------------

                const contentType =
                    imageResponse.headers.get(
                        "content-type"
                    ) || "image/jpeg";


                const imageData =
                    `data:${contentType};base64,${base64Image}`;


                // -------------------------------------------------
                // RETURN IMAGE
                // -------------------------------------------------

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

        if (images.length > 0) {

            console.log(
                "Uploaded images:",
                images.length
            );


            const selectedImages =
                images.slice(0, 5);


            const imageContents = [];


            // -------------------------------------------------
            // PREPARE IMAGES
            // -------------------------------------------------

            for (
                const image
                of selectedImages
            ) {

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


                // -------------------------------------------------
                // RAW BASE64
                // -------------------------------------------------

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


                // -------------------------------------------------
                // VALID IMAGE
                // -------------------------------------------------

                if (
                    !imageData.startsWith(
                        "data:image/"
                    )
                ) {
                    continue;
                }


                imageContents.push({

                    type:
                        "image_url",

                    image_url: {
                        url:
                            imageData
                    }

                });
            }


            // -------------------------------------------------
            // NO VALID IMAGE
            // -------------------------------------------------

            if (
                imageContents.length === 0
            ) {

                return res.status(400).json({

                    type: "error",

                    error:
                        "No valid image data was received."

                });
            }


            // -------------------------------------------------
            // IMAGE QUESTION
            // -------------------------------------------------

            const analysisPrompt =
                userText ||
                "Analyze this image carefully and describe what you see. Include objects, people, colors, visible text and important details. Do not invent anything that is not visible.";


            // -------------------------------------------------
            // VISION MESSAGE
            // -------------------------------------------------

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
                "Sending image to Groq vision..."
            );


            // =================================================
            // GROQ VISION API
            // =================================================

            const groqResponse =
                await fetch(
                    "https://api.groq.com/openai/v1/chat/completions",
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            "Authorization":
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


            // -------------------------------------------------
            // READ RESPONSE
            // -------------------------------------------------

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

                return res.status(500).json({

                    type: "error",

                    error:
                        "Groq returned an invalid response."

                });
            }


            // -------------------------------------------------
            // GROQ ERROR
            // -------------------------------------------------

            if (!groqResponse.ok) {

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


            // -------------------------------------------------
            // GET REPLY
            // -------------------------------------------------

            const reply =
                groqData
                    ?.choices?.[0]
                    ?.message
                    ?.content;


            if (!reply) {

                return res.status(500).json({

                    type: "error",

                    error:
                        "No image analysis response received."

                });
            }


            // -------------------------------------------------
            // RETURN IMAGE ANALYSIS
            // -------------------------------------------------

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
            !Array.isArray(messages) ||
            messages.length === 0
        ) {

            return res.status(400).json({

                type: "error",

                error:
                    "Messages are missing."

            });
        }


        console.log(
            "Sending normal text request to Groq..."
        );


        // =====================================================
        // GROQ TEXT API
        // =====================================================

        const groqResponse =
            await fetch(
                "https://api.groq.com/openai/v1/chat/completions",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${groqApiKey}`

                    },

                    body:
                        JSON.stringify({

                            model:
                                "llama-3.3-70b-versatile",

                            messages:
                                messages,

                            temperature:
                                0.7,

                            max_tokens:
                                1500

                        })
                }
            );


        // -------------------------------------------------
        // READ RESPONSE
        // -------------------------------------------------

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

            return res.status(500).json({

                type: "error",

                error:
                    "Groq returned an invalid response."

            });
        }


        // -------------------------------------------------
        // GROQ ERROR
        // -------------------------------------------------

        if (!groqResponse.ok) {

            console.error(
                "Groq error:",
                groqData
            );

            return res.status(
                groqResponse.status
            ).json({

                type: "error",

                error:
                    groqData?.error?.message ||
                    "Groq API error."

            });
        }


        // -------------------------------------------------
        // GET TEXT REPLY
        // -------------------------------------------------

        const reply =
            groqData
                ?.choices?.[0]
                ?.message
                ?.content;


        if (!reply) {

            return res.status(500).json({

                type: "error",

                error:
                    "No reply received from Groq."

            });
        }


        // -------------------------------------------------
        // RETURN TEXT
        // -------------------------------------------------

        return res.status(200).json({

            type: "text",

            reply:
                reply,

            webSearch:
                webSearch

        });


    } catch (error) {

        // =================================================
        // GENERAL SERVER ERROR
        // =================================================

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
