export default async function handler(req, res) {

    /* =====================================================
       METHOD CHECK
    ===================================================== */

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {

        /* =====================================================
           REQUEST BODY
        ===================================================== */

        const body = req.body || {};

        const messages = body.messages || [];

        const webSearch = body.webSearch || false;

        /*
         * Images can come from the frontend as:
         *
         * images: [
         *   {
         *      name: "...",
         *      type: "image/jpeg",
         *      data: "data:image/jpeg;base64,..."
         *   }
         * ]
         *
         * We also accept `files` for compatibility.
         */

        const images = Array.isArray(body.images)
            ? body.images
            : [];

        const files = Array.isArray(body.files)
            ? body.files
            : [];


        /* =====================================================
           VALIDATE MESSAGES
        ===================================================== */

        if (!Array.isArray(messages) || messages.length === 0) {

            return res.status(400).json({
                type: "error",
                error: "Messages are missing."
            });

        }


        /* =====================================================
           LAST USER MESSAGE
        ===================================================== */

        const lastMessage =
            messages[messages.length - 1]?.content || "";


        /*
         * Make sure the message is always a string.
         */

        const userText =
            typeof lastMessage === "string"
                ? lastMessage.trim()
                : "";


        /* =====================================================
           IMAGE GENERATION DETECTION
        ===================================================== */

        const wantsImage =
            /create\s+(an?\s+)?image|generate\s+(an?\s+)?image|make\s+(an?\s+)?image|generate\s+(an?\s+)?picture|create\s+(an?\s+)?picture|draw|image\s+of|create\s+image|make\s+picture|generate\s+picture|show\s+me\s+(an?\s+)?image|show\s+image|generate\s+photo|create\s+photo|make\s+photo/i
                .test(userText);


        /* =====================================================
           IMAGE GENERATION
        ===================================================== */

        if (wantsImage && images.length === 0) {

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
                   CLEAN IMAGE PROMPT
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
                   POLLINATIONS IMAGE URL
                ============================================= */

                const imageUrl =
                    `https://gen.pollinations.ai/image/${encodeURIComponent(
                        finalPrompt
                    )}?model=flux`;


                /* =============================================
                   FETCH IMAGE
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
                        "Pollinations ERROR:",
                        imageResponse.status,
                        errorText
                    );

                    return res.status(
                        imageResponse.status
                    ).json({

                        type: "error",

                        error:
                            `Pollinations error ${imageResponse.status}: ${errorText || "Image generation failed."}`

                    });

                }


                /* =============================================
                   GET IMAGE BUFFER
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
                   FINAL IMAGE DATA
                ============================================= */

                const imageData =
                    `data:${contentType};base64,${base64Image}`;


                /* =============================================
                   RETURN GENERATED IMAGE
                ============================================= */

                return res.status(200).json({

                    type: "image",

                    reply:
                        "✨ Here is the image I created for you:",

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
                `Analyzing ${images.length} uploaded image(s)...`
            );


            const groqApiKey =
                process.env.GROQ_API_KEY;


            if (!groqApiKey) {

                return res.status(500).json({

                    type: "error",

                    error:
                        "GROQ_API_KEY is not configured in Vercel."

                });

            }


            /*
             * Maximum 5 images.
             */

            const selectedImages =
                images.slice(0, 5);


            /*
             * Convert uploaded images into
             * Groq vision message format.
             */

            const imageContents = [];


            for (const image of selectedImages) {

                if (!image) {
                    continue;
                }


                /*
                 * Frontend should send:
                 *
                 * data:image/jpeg;base64,...
                 */

                let imageData =
                    image.data ||
                    image.url ||
                    image.base64 ||
                    "";


                if (!imageData) {
                    continue;
                }


                /*
                 * If frontend sends only raw base64,
                 * create the data URL.
                 */

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


                /*
                 * Basic image validation.
                 */

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


            /*
             * No valid images.
             */

            if (imageContents.length === 0) {

                return res.status(400).json({

                    type: "error",

                    error:
                        "No valid image data was received."

                });

            }


            /*
             * User's question.
             */

            const analysisPrompt =
                userText ||
                "Please analyze this image and describe what you see. Include important details, objects, text, colors, and anything useful.";


            /*
             * Text + images in one user message.
             */

            const visionMessage = {

                role: "user",

                content: [

                    {
                        type: "text",

                        text: analysisPrompt

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
                                 * Vision-capable Groq model.
                                 */

                                model:
                                    "qwen/qwen3.6-27b",


                                messages: [

                                    {

                                        role: "system",

                                        content:
                                            "You are Mini AI, a helpful multimodal AI assistant. Carefully analyze uploaded images and answer the user's question. If text appears in the image, read it accurately. Do not invent details that are not visible."

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


            let groqData = null;


            try {

                groqData =
                    JSON.parse(
                        responseText
                    );

            } catch (parseError) {

                console.error(
                    "Groq returned non-JSON:",
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
                    "Groq Vision API ERROR:",
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
                    "Groq vision response has no reply:",
                    groqData
                );

                return res.status(500).json({

                    type: "error",

                    error:
                        "No image analysis response received from Groq."

                });

            }


            /* =================================================
               RETURN IMAGE ANALYSIS
            ================================================= */

            return res.status(200).json({

                type: "text",

                reply: reply,

                imageAnalysis:
                    true

            });

        }


        /* =====================================================
           NORMAL TEXT CHAT
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
           READ GROQ RESPONSE
        ===================================================== */

        const responseText =
            await groqResponse.text();


        console.log(
            "Groq status:",
            groqResponse.status
        );


        let groqData = null;


        try {

            groqData =
                JSON.parse(
                    responseText
                );

        } catch (parseError) {

            console.error(
                "Groq returned non-JSON:",
                responseText
            );

            return res.status(500).json({

                type: "error",

                error:
                    "Groq returned an invalid response."

            });

        }


        /* =====================================================
           GROQ API ERROR
        ===================================================== */

        if (!groqResponse.ok) {

            console.error(
                "Groq API ERROR:",
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
           GET REPLY
        ===================================================== */

        const reply =
            groqData
                ?.choices?.[0]
                ?.message
                ?.content;


        if (!reply) {

            console.error(
                "Groq response has no reply:",
                groqData
            );

            return res.status(500).json({

                type: "error",

                error:
                    "No reply received from Groq."

            });

        }


        /* =====================================================
           NORMAL CHAT RESPONSE
        ===================================================== */

        return res.status(200).json({

            type: "text",

            reply: reply,

            webSearch:
                webSearch

        });


    } catch (error) {

        /* =====================================================
           GENERAL SERVER ERROR
        ===================================================== */

        console.error(
            "API ERROR:",
            error
        );


        return res.status(500).json({

            type: "error",

            error:
                error?.message ||
                "Server error."

        });

    }

}
