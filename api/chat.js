export default async function handler(req, res) {
    /*
    =====================================================
    METHOD CHECK
    =====================================================
    */

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {
        /*
        =====================================================
        REQUEST BODY
        =====================================================
        */

        const body = req.body || {};

        const messages = body.messages || [];
        const webSearch = body.webSearch || false;

        /*
        =====================================================
        VALIDATE MESSAGES
        =====================================================
        */

        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                error: "Messages are missing."
            });
        }

        /*
        =====================================================
        LAST USER MESSAGE
        =====================================================
        */

        const lastMessage =
            messages[messages.length - 1]?.content || "";

        /*
        =====================================================
        IMAGE REQUEST DETECTION
        =====================================================
        */

        const wantsImage =
            /create\s+(an?\s+)?image|generate\s+(an?\s+)?image|make\s+(an?\s+)?image|generate\s+(an?\s+)?picture|create\s+(an?\s+)?picture|draw|image\s+of|create\s+image|make\s+picture|generate\s+picture|show\s+me\s+(an?\s+)?image|show\s+image|generate\s+photo|create\s+photo|make\s+photo/i.test(
                lastMessage
            );

        /*
        =====================================================
        IMAGE GENERATION
        =====================================================
        */

        if (wantsImage) {

            const pollinationsKey =
                process.env.POLLINATIONS_API_KEY;

            /*
            =================================================
            CHECK POLLINATIONS KEY
            =================================================
            */

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

                /*
                =============================================
                CLEAN IMAGE PROMPT
                =============================================
                */

                let imagePrompt = lastMessage
                    .replace(
                        /^\s*(please\s*)?(create|generate|make|draw|show\s+me)\s+(an?\s+)?(image|picture|photo)\s*(of\s*)?/i,
                        ""
                    )
                    .trim();

                /*
                =============================================
                HANDLE "generate image of panda"
                =============================================
                */

                imagePrompt = imagePrompt
                    .replace(/^of\s+/i, "")
                    .trim();

                const finalPrompt =
                    imagePrompt || lastMessage;

                console.log(
                    "Generating image:",
                    finalPrompt
                );

                /*
                =============================================
                POLLINATIONS URL
                =============================================
                */

                const imageUrl =
                    `https://gen.pollinations.ai/image/${encodeURIComponent(
                        finalPrompt
                    )}?model=flux`;

                console.log(
                    "Pollinations request started"
                );

                /*
                =============================================
                FETCH IMAGE
                =============================================
                */

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

                /*
                =============================================
                IMAGE API ERROR
                =============================================
                */

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

                /*
                =============================================
                GET IMAGE BUFFER
                =============================================
                */

                const imageBuffer =
                    await imageResponse.arrayBuffer();

                /*
                =============================================
                CONVERT TO BASE64
                =============================================
                */

                const base64Image =
                    Buffer
                        .from(imageBuffer)
                        .toString("base64");

                /*
                =============================================
                CONTENT TYPE
                =============================================
                */

                const contentType =
                    imageResponse.headers.get(
                        "content-type"
                    ) || "image/jpeg";

                /*
                =============================================
                FINAL IMAGE DATA
                =============================================
                */

                const imageData =
                    `data:${contentType};base64,${base64Image}`;

                /*
                =============================================
                RETURN IMAGE
                =============================================
                */

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

        /*
        =====================================================
        GROQ API KEY
        =====================================================
        */

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

        /*
        =====================================================
        GROQ API
        =====================================================
        */

        console.log(
            "Sending request to Groq..."
        );

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

        /*
        =====================================================
        READ GROQ RESPONSE
        =====================================================
        */

        const responseText =
            await groqResponse.text();

        console.log(
            "Groq status:",
            groqResponse.status
        );

        let groqData = null;

        try {

            groqData =
                JSON.parse(responseText);

        } catch (parseError) {

            console.error(
                "Groq returned non-JSON:",
                responseText
            );

            return res.status(500).json({

                type: "error",

                error:
                    "Groq returned an invalid response.",

                details:
                    responseText

            });
        }

        /*
        =====================================================
        GROQ API ERROR
        =====================================================
        */

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

        /*
        =====================================================
        GET GROQ REPLY
        =====================================================
        */

        const reply =
            groqData
                ?.choices?.[0]
                ?.message?.content;

        /*
        =====================================================
        NO REPLY
        =====================================================
        */

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

        /*
        =====================================================
        NORMAL CHAT RESPONSE
        =====================================================
        */

        return res.status(200).json({

            type: "text",

            reply:
                reply,

            webSearch:
                webSearch

        });

    } catch (error) {

        /*
        =====================================================
        GENERAL SERVER ERROR
        =====================================================
        */

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
