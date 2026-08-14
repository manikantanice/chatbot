module.exports = async function handler(req, res) {

    /* =====================================================
       METHOD CHECK
    ===================================================== */

    if (req.method !== "POST") {
        return res.status(405).json({
            type: "error",
            error: "Method not allowed"
        });
    }

    try {

        /* =====================================================
           REQUEST BODY
        ===================================================== */

        const body = req.body || {};

        const messages = Array.isArray(body.messages)
            ? body.messages
            : [];

        const message = typeof body.message === "string"
            ? body.message.trim()
            : "";

        const webSearch = Boolean(body.webSearch);

        /*
         * Uploaded images
         *
         * Expected:
         *
         * images: [
         *   {
         *     name: "photo.jpg",
         *     type: "image/jpeg",
         *     data: "data:image/jpeg;base64,..."
         *   }
         * ]
         */

        const images = Array.isArray(body.images)
            ? body.images
            : [];


        /* =====================================================
           API KEYS
        ===================================================== */

        const groqApiKey =
            process.env.GROQ_API_KEY;


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


        /* =====================================================
           GET USER TEXT
        ===================================================== */

        let userText = message;


        /*
         * If message is empty, get it
         * from the last conversation message.
         */

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


        /* =====================================================
           IMAGE GENERATION DETECTION
        ===================================================== */

        const wantsImage =
            /create\s+(an?\s+)?image|generate\s+(an?\s+)?image|make\s+(an?\s+)?image|generate\s+(an?\s+)?picture|create\s+(an?\s+)?picture|draw|image\s+of|create\s+image|make\s+picture|generate\s+picture|show\s+me\s+(an?\s+)?image|show\s+image|generate\s+photo|create\s+photo|make\s+photo/i
                .test(userText);


        /* =====================================================
           IMAGE GENERATION
        ===================================================== */

        if (
            wantsImage &&
            images.length === 0
        ) {

            const pollinationsKey =
                process.env.POLLINATIONS_API_KEY;


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

                /* =============================================
                   CLEAN PROMPT
                ============================================= */

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


                /* =============================================
                   POLLINATIONS URL
                ============================================= */

                const imageUrl =
                    `https://gen.pollinations.ai/image/${encodeURIComponent(
                        finalPrompt
                    )}?model=flux`;


                /* =============================================
                   REQUEST IMAGE
                ============================================= */

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
                            `Image generation failed: ${
                                errorText ||
                                imageResponse.statusText
                            }`

                    });

                }


                /* =============================================
                   IMAGE BUFFER
                ============================================= */

                const imageBuffer =
                    await imageResponse.arrayBuffer();


                /* =============================================
                   BASE64
                ============================================= */

                const base64Image =
                    Buffer
                        .from(imageBuffer)
                        .toString("base64");


                /* =============================================
                   CONTENT TYPE
                ============================================= */

                const contentType =
                    imageResponse.headers.get(
                        "content-type"
                    ) || "image/jpeg";


                /* =============================================
                   DATA URL
                ============================================= */

                const imageData =
                    `data:${contentType};base64,${base64Image}`;


                /* =============================================
                   RETURN IMAGE
                ============================================= */

                return res.status(200).json({

                    type: "image",

                    reply:
                        "✨ Here is the image I created for you.",

                    image:
                        imageData

                });


            } catch (imageError) {

                console.error(
                    "IMAGE GENERATION ERROR:",
                    imageError
                );


                return res.status(500).json({

                    type: "error",

                    error:
                        imageError?.message ||
                        "Image generation failed."

                });

            }

        }


        /* =====================================================
           UPLOADED IMAGE ANALYSIS
        ===================================================== */

        if (images.length > 0) {

            console.log(
                `Received ${images.length} uploaded image(s).`
            );


            /*
             * Maximum 5 images.
             */

            const selectedImages =
                images.slice(0, 5);


            const imageContents = [];


            /* =================================================
               PREPARE IMAGES
            ================================================= */

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


                /* =============================================
                   RAW BASE64 -> DATA URL
                ============================================= */

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


                /* =============================================
                   VALIDATE IMAGE
                ============================================= */

                if (
                    !imageData.startsWith(
                        "data:image/"
                    )
                ) {

                    console.warn(
                        "Invalid image:",
                        image.name
                    );

                    continue;

                }


                /* =============================================
                   GET BASE64 PART
                ============================================= */

                const commaIndex =
                    imageData.indexOf(",");


                if (commaIndex === -1) {
                    continue;
                }


                const base64Part =
                    imageData.substring(
                        commaIndex + 1
                    );


                /*
                 * Approximate decoded size.
                 */

                const estimatedBytes =
                    Math.floor(
                        base64Part.length * 0.75
                    );


                /*
                 * Keep a safety limit.
                 */

                if (
                    estimatedBytes >
                    3.5 * 1024 * 1024
                ) {

                    console.warn(
                        "Image too large:",
                        image.name
                    );

                    continue;

                }


                /* =============================================
                   GROQ IMAGE FORMAT
                ============================================= */

                imageContents.push({

                    type:
                        "image_url",

                    image_url: {

                        url:
                            imageData

                    }

                });

            }


            /* =================================================
               NO VALID IMAGES
            ================================================= */

            if (
                imageContents.length === 0
            ) {

                return res.status(400).json({

                    type: "error",

                    error:
                        "No valid image received. Please upload a JPG or PNG image under about 3.5 MB."

                });

            }


            /* =================================================
               IMAGE QUESTION
            ================================================= */

            const analysisPrompt =
                userText ||
                "Please analyze this image carefully and tell me what you can see. Describe the objects, people, colors, visible text, and important details. Do not invent anything that is not visible.";


            /* =================================================
               VISION MESSAGE
            ================================================= */

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
                "Sending image to Groq vision model..."
            );


            /* =================================================
               GROQ VISION REQUEST
            ================================================= */

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

                                /*
                                 * Vision model
                                 */

                                model:
                                    "qwen/qwen3.6-27b",


                                messages: [

                                    {

                                        role:
                                            "system",

                                        content:
                                            "You are Mini AI, a helpful multimodal AI assistant. You can understand uploaded images. Carefully inspect every image and answer the user's question. Read visible text when possible. Never say that you cannot see images when an image has been provided. Do not invent details that are not visible."

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


            /* =================================================
               READ GROQ RESPONSE
            ================================================= */

            const responseText =
                await groqResponse.text();


            console.log(
                "Groq vision status:",
                groqResponse.status
            );


            let groqData;


            try {

                groqData =
                    JSON.parse(
                        responseText
                    );

            } catch (parseError) {

                console.error(
                    "Groq returned invalid JSON:",
                    responseText
                );


                return res.status(500).json({

                    type: "error",

                    error:
                        "Groq returned an invalid response."

                });

            }


            /* =================================================
               GROQ ERROR
            ================================================= */

            if (!groqResponse.ok) {

                console.error(
                    "Groq vision API error:",
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


            /* =================================================
               GET VISION REPLY
            ================================================= */

            const reply =
                groqData
                    ?.choices?.[0]
                    ?.message
                    ?.content;


            if (!reply) {

                console.error(
                    "No vision reply:",
                    groqData
                );


                return res.status(500).json({

                    type: "error",

                    error:
                        "No image analysis response received."

                });

            }


            /* =================================================
               RETURN IMAGE ANALYSIS
            ================================================= */

            return res.status(200).json({

                type: "text",

                reply:
                    reply,

                imageAnalysis:
                    true,

                webSearch:
                    webSearch

            });

        }


        /* =====================================================
           NORMAL TEXT CHAT
        ===================================================== */

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


        /* =====================================================
           NORMAL GROQ REQUEST
        ===================================================== */

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


        /* =====================================================
           READ RESPONSE
        ===================================================== */

        const responseText =
            await groqResponse.text();


        console.log(
            "Groq status:",
            groqResponse.status
        );


        let groqData;


        try {

            groqData =
                JSON.parse(
                    responseText
                );

        } catch (parseError) {

            console.error(
                "Groq returned invalid JSON:",
                responseText
            );


            return res.status(500).json({

                type: "error",

                error:
                    "Groq returned an invalid response."

            });

        }


        /* =====================================================
           GROQ ERROR
        ===================================================== */

        if (!groqResponse.ok) {

            console.error(
                "Groq API error:",
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


        /* =====================================================
           GET NORMAL REPLY
        ===================================================== */

        const reply =
            groqData
                ?.choices?.[0]
                ?.message
                ?.content;


        if (!reply) {

            console.error(
                "No reply received:",
                groqData
            );


            return res.status(500).json({

                type: "error",

                error:
                    "No reply received from Groq."

            });

        }


        /* =====================================================
           RETURN NORMAL CHAT
        ===================================================== */

        return res.status(200).json({

            type: "text",

            reply:
                reply,

            webSearch:
                webSearch

        });


    } catch (error) {

        /* =====================================================
           GENERAL ERROR
        ===================================================== */

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
