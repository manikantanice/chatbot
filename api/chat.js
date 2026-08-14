export default async function handler(req, res) {

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


        /* =====================================================
           API KEY
        ===================================================== */

        const groqApiKey =
            process.env.GROQ_API_KEY;


        if (!groqApiKey) {

            return res.status(500).json({

                type: "error",

                error:
                    "GROQ_API_KEY is not configured in Vercel."

            });

        }


        /* =====================================================
           IMAGE GENERATION DETECTION
        ===================================================== */

        const wantsImage =
            /create\s+(an?\s+)?image|
             generate\s+(an?\s+)?image|
             make\s+(an?\s+)?image|
             generate\s+(an?\s+)?picture|
             create\s+(an?\s+)?picture|
             draw\s+|
             image\s+of|
             create\s+image|
             make\s+picture|
             generate\s+picture|
             generate\s+photo|
             create\s+photo|
             make\s+photo/i
                .test(message);


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

                return res.status(500).json({

                    type: "error",

                    error:
                        "POLLINATIONS_API_KEY is not configured in Vercel."

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
                        .replace(
                            /^of\s+/i,
                            ""
                        )
                        .trim();


                const finalPrompt =
                    imagePrompt || message;


                console.log(
                    "Generating image:",
                    finalPrompt
                );


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


                    return res.status(
                        imageResponse.status
                    ).json({

                        type: "error",

                        error:
                            `Image generation failed: ${errorText || imageResponse.statusText}`

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


                const imageData =
                    `data:${contentType};base64,${base64Image}`;


                return res.status(200).json({

                    type: "image",

                    reply:
                        "✨ Here is the image I created for you:",

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


        /* =====================================================
           UPLOADED IMAGE ANALYSIS
        ===================================================== */

        if (images.length > 0) {

            console.log(
                `Received ${images.length} image(s).`
            );


            /*
             * Groq supports up to 5 images
             * in a vision request.
             */

            const selectedImages =
                images.slice(0, 5);


            const imageContents = [];


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
                    typeof imageData !==
                    "string"
                ) {

                    continue;

                }


                /*
                 * Remove accidental spaces/newlines.
                 */

                imageData =
                    imageData.trim();


                /*
                 * Convert raw base64
                 * into a data URL.
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
                 * Validate image data.
                 */

                if (
                    !imageData.startsWith(
                        "data:image/"
                    )
                ) {

                    console.warn(
                        "Invalid image skipped:",
                        image.name
                    );

                    continue;

                }


                /*
                 * Check approximate Base64 size.
                 *
                 * Groq has a 4MB limit for
                 * base64 encoded image requests.
                 */

                const commaIndex =
                    imageData.indexOf(",");


                if (
                    commaIndex === -1
                ) {

                    continue;

                }


                const base64Part =
                    imageData.substring(
                        commaIndex + 1
                    );


                const estimatedBytes =
                    Math.floor(
                        base64Part.length *
                        0.75
                    );


                /*
                 * 3.5MB safety limit.
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
               NO VALID IMAGE
            ================================================= */

            if (
                imageContents.length === 0
            ) {

                return res.status(400).json({

                    type: "error",

                    error:
                        "The image is too large or invalid. Please upload a JPG/PNG image under about 3.5 MB."

                });

            }


            /* =================================================
               IMAGE QUESTION
            ================================================= */

            const analysisPrompt =
                message ||
                "Analyze this image carefully. Describe what you can see, including objects, people, colors, visible text, layout, and important details. Do not invent information that is not visible.";


            /* =================================================
               VISION MESSAGE
            ================================================= */

            const visionMessage = {

                role: "user",

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


            /* =================================================
               GROQ VISION REQUEST
            ================================================= */

            const groqResponse =
                await fetch(
                    "https://api.groq.com/openai/v1/chat/completions",
                    {

                        method:
                            "POST",

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
                                            "You are Mini AI, a helpful multimodal AI assistant. You can understand images. Carefully inspect uploaded images and answer the user's question. Read visible text when possible. Never claim that you cannot see images. Do not invent details that are not visible."

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
               READ RESPONSE
            ================================================= */

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

            } catch {

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


            /* =================================================
               GROQ ERROR
            ================================================= */

            if (
                !groqResponse.ok
            ) {

                console.error(
                    "Groq Vision Error:",
                    groqData
                );


                return res.status(
                    groqResponse.status
                ).json({

                    type:
                        "error",

                    error:
                        groqData?.error?.message ||
                        "Groq vision request failed."

                });

            }


            /* =================================================
               GET VISION RESPONSE
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

                    type:
                        "error",

                    error:
                        "No image analysis response received."

                });

            }


            /* =================================================
               RETURN IMAGE ANALYSIS
            ================================================= */

            return res.status(200).json({

                type:
                    "text",

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

                type:
                    "error",

                error:
                    "Message is missing."

            });

        }


        console.log(
            "Sending normal text request to Groq..."
        );


        /* =================================================
           NORMAL CHAT REQUEST
        ================================================= */

        const groqResponse =
            await fetch(
                "https://api.groq.com/openai/v1/chat/completions",
                {

                    method:
                        "POST",

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


        /* =================================================
           READ RESPONSE
        ================================================= */

        const responseText =
            await groqResponse.text();


        let groqData;


        try {

            groqData =
                JSON.parse(
                    responseText
                );

        } catch {

            console.error(
                "Invalid Groq response:",
                responseText
            );


            return res.status(500).json({

                type:
                    "error",

                error:
                    "Groq returned an invalid response."

            });

        }


        /* =================================================
           API ERROR
        ================================================= */

        if (
            !groqResponse.ok
        ) {

            console.error(
                "Groq API Error:",
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


        /* =================================================
           GET TEXT RESPONSE
        ================================================= */

        const reply =
            groqData
                ?.choices?.[0]
                ?.message
                ?.content;


        if (!reply) {

            return res.status(500).json({

                type:
                    "error",

                error:
                    "No reply received from Groq."

            });

        }


        /* =================================================
           RETURN NORMAL RESPONSE
        ================================================= */

        return res.status(200).json({

            type:
                "text",

            reply:
                reply,

            webSearch:
                webSearch

        });


    } catch (error) {

        console.error(
            "SERVER ERROR:",
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

}
