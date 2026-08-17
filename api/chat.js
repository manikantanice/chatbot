// =========================================================
// MINI AI - /api/chat.js
// GROQ CHAT + IMAGE ANALYSIS
// AI FINAL ANSWER ONLY
// =========================================================

module.exports = async function handler(req, res) {

    // =====================================================
    // CORS
    // =====================================================

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
        "Content-Type"
    );


    // =====================================================
    // OPTIONS
    // =====================================================

    if (req.method === "OPTIONS") {

        return res
            .status(200)
            .end();

    }


    // =====================================================
    // ONLY POST
    // =====================================================

    if (req.method !== "POST") {

        return res.status(405).json({

            success: false,

            error: "Method not allowed"

        });

    }


    try {

        // =================================================
        // GROQ API KEY
        // =================================================

        const apiKey =
            process.env.GROQ_API_KEY;


        if (!apiKey) {

            console.error(
                "GROQ_API_KEY is missing"
            );

            return res.status(500).json({

                success: false,

                error:
                    "GROQ_API_KEY is not configured"

            });

        }


        // =================================================
        // REQUEST BODY
        // =================================================

        const body =
            req.body || {};


        const message =
            typeof body.message === "string"
                ? body.message.trim()
                : "";


        const history =
            Array.isArray(body.messages)
                ? body.messages
                : [];


        const images =
            Array.isArray(body.images)
                ? body.images
                : [];


        const webSearch =
            body.webSearch === true;


        // =================================================
        // VALIDATION
        // =================================================

        if (
            !message &&
            images.length === 0
        ) {

            return res.status(400).json({

                success: false,

                error:
                    "Message or image is required"

            });

        }


        // =================================================
        // VALIDATE IMAGES
        // =================================================

        const safeImages =
            images
                .filter(image => {

                    return (
                        image &&
                        typeof image.data === "string" &&
                        image.data.startsWith(
                            "data:image/"
                        )
                    );

                })
                .slice(0, 3);


        // =================================================
        // IMAGE SIZE CHECK
        // =================================================

        const MAX_IMAGE_SIZE =
            20 * 1024 * 1024;


        for (
            const image of safeImages
        ) {

            if (
                image.data.length >
                MAX_IMAGE_SIZE
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Image is too large. Please upload a smaller image."

                });

            }

        }


        // =================================================
        // SELECT MODEL
        // =================================================

        const model =
            safeImages.length > 0

                ? "qwen/qwen3.6-27b"

                : "llama-3.3-70b-versatile";


        // =================================================
        // SYSTEM MESSAGE
        // =================================================

        const systemMessage = {

            role: "system",

            content:
                `You are Mini AI, a helpful, friendly and intelligent AI assistant.

Rules:
- Answer clearly and accurately.
- Give only the final answer to the user.
- Do not expose internal API data.
- Do not return JSON unless the user specifically asks for JSON.
- Keep answers easy to understand.
- If the user asks for code, provide clean working code.
- If an image is provided, carefully analyze it.
- Describe only what you can actually determine from the image.
- Do not claim that you generated an image unless an actual image generation API was used.
- If the user speaks Telugu, reply in Telugu.
- If the user speaks English, reply in English.
- You can understand Telugu, English and mixed Telugu-English.`

        };


        // =================================================
        // BUILD MESSAGES
        // =================================================

        const messages = [

            systemMessage

        ];


        // =================================================
        // ADD PREVIOUS CONVERSATION
        // =================================================

        const previousMessages =
            history
                .filter(item => {

                    return (
                        item &&
                        (
                            item.role === "user" ||
                            item.role === "assistant"
                        ) &&
                        typeof item.content === "string" &&
                        item.content.trim()
                    );

                })
                .slice(-10);


        for (
            const item of previousMessages
        ) {

            messages.push({

                role:
                    item.role,

                content:
                    item.content

            });

        }


        // =================================================
        // CURRENT USER CONTENT
        // =================================================

        const userContent = [];


        // =================================================
        // USER TEXT
        // =================================================

        userContent.push({

            type: "text",

            text:
                message ||
                (
                    safeImages.length === 1
                        ? "Please analyze this image carefully and describe what you see."
                        : "Please analyze these images carefully and describe what you see."
                )

        });


        // =================================================
        // USER IMAGES
        // =================================================

        for (
            const image of safeImages
        ) {

            userContent.push({

                type: "image_url",

                image_url: {

                    url:
                        image.data

                }

            });

        }


        // =================================================
        // CURRENT USER MESSAGE
        // =================================================

        messages.push({

            role: "user",

            content:
                safeImages.length > 0
                    ? userContent
                    : message

        });


        // =================================================
        // GROQ REQUEST
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
                            `Bearer ${apiKey}`

                    },

                    body: JSON.stringify({

                        model:
                            model,

                        messages:
                            messages,

                        temperature:
                            safeImages.length > 0
                                ? 0.5
                                : 0.7,

                        max_completion_tokens:
                            safeImages.length > 0
                                ? 2048
                                : 4096,

                        stream:
                            false

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

        } catch (parseError) {

            console.error(
                "Groq invalid JSON:",
                responseText
            );

            return res.status(502).json({

                success: false,

                error:
                    "Invalid response received from Groq"

            });

        }


        // =================================================
        // GROQ API ERROR
        // =================================================

        if (
            !groqResponse.ok
        ) {

            console.error(
                "Groq API Error:",
                groqData
            );


            const groqError =
                groqData?.error?.message ||
                "Groq API request failed";


            return res.status(
                groqResponse.status
            ).json({

                success: false,

                error:
                    groqError

            });

        }


        // =================================================
        // GET AI FINAL ANSWER
        // =================================================

        let answer =
            groqData
                ?.choices
                ?.[0]
                ?.message
                ?.content;


        // =================================================
        // SAFETY CHECK
        // =================================================

        if (
            typeof answer !== "string"
        ) {

            answer = "";

        }


        answer =
            answer.trim();


        // =================================================
        // EMPTY RESPONSE
        // =================================================

        if (!answer) {

            console.error(
                "Empty Groq response:",
                groqData
            );

            return res.status(502).json({

                success: false,

                error:
                    "AI returned an empty response"

            });

        }


        // =================================================
        // SUCCESS
        // =================================================
        // IMPORTANT:
        // Frontend should display ONLY `reply`.
        // =================================================

        return res.status(200).json({

            success: true,

            reply:
                answer

        });


    } catch (error) {

        // =================================================
        // SERVER ERROR
        // =================================================

        console.error(
            "API /api/chat ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            error:
                error?.message ||
                "Internal server error"

        });

    }

};
