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


        /* =====================================================
           VALIDATE
        ===================================================== */

        if (!Array.isArray(messages) || messages.length === 0) {

            return res.status(400).json({
                error: "Messages are missing."
            });

        }


        /* =====================================================
           LAST MESSAGE
        ===================================================== */

        const lastMessage =
            String(
                messages[messages.length - 1]?.content || ""
            ).trim();


        if (!lastMessage) {

            return res.status(400).json({
                error: "Message is empty."
            });

        }


        /* =====================================================
           IMAGE REQUEST DETECTION
        ===================================================== */

        const wantsImage =
            /create\s+(an?\s+)?image|generate\s+(an?\s+)?image|make\s+(an?\s+)?image|create\s+(an?\s+)?picture|generate\s+(an?\s+)?picture|make\s+(an?\s+)?picture|create\s+(an?\s+)?photo|generate\s+(an?\s+)?photo|make\s+(an?\s+)?photo|draw|image\s+of|picture\s+of|photo\s+of/i
                .test(lastMessage);


        /* =====================================================
           IMAGE GENERATION
        ===================================================== */

        if (wantsImage) {

            const pollinationsKey =
                process.env.POLLINATIONS_API_KEY;


            /* =================================================
               CHECK KEY
            ================================================= */

            if (!pollinationsKey) {

                console.error(
                    "POLLINATIONS_API_KEY is missing."
                );

                return res.status(500).json({

                    error:
                        "POLLINATIONS_API_KEY is not configured in Vercel."

                });

            }


            try {

                /* =============================================
                   CLEAN PROMPT
                ============================================= */

                let imagePrompt =
                    lastMessage
                        .replace(
                            /^(please\s*)?(create|generate|make|draw|show me)\s+(an?\s+)?(image|picture|photo)\s*(of\s*)?/i,
                            ""
                        )
                        .trim();


                /*
                   Handle:
                   "generate img of panda"
                */

                imagePrompt =
                    imagePrompt
                        .replace(
                            /^img\s+(of\s+)?/i,
                            ""
                        )
                        .trim();


                const finalPrompt =
                    imagePrompt || lastMessage;


                console.log(
                    "Generating image:",
                    finalPrompt
                );


                /* =============================================
                   POLLINATIONS URL
                ============================================= */

                const imageUrl =
                    `https://gen.pollinations.ai/image/${encodeURIComponent(finalPrompt)}?model=flux`;


                console.log(
                    "Pollinations request started."
                );


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


                console.log(
                    "Pollinations status:",
                    imageResponse.status
                );


                /* =============================================
                   IMAGE ERROR
                ============================================= */

                if (!imageResponse.ok) {

                    const errorText =
                        await imageResponse.text();


                    console.error(
                        "Pollinations API Error:",
                        imageResponse.status,
                        errorText
                    );


                    return res.status(500).json({

                        error:
                            `Pollinations error ${imageResponse.status}: ${errorText || "Image generation failed."}`

                    });

                }


                /* =============================================
                   IMAGE BUFFER
                ============================================= */

                const imageBuffer =
                    await imageResponse.arrayBuffer();


                if (!imageBuffer || imageBuffer.byteLength === 0) {

                    throw new Error(
                        "Pollinations returned an empty image."
                    );

                }


                /* =============================================
                   BASE64
                ============================================= */

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


                /* =============================================
                   RETURN IMAGE
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

                    error:
                        imageError.message ||
                        "Image generation failed."

                });

            }

        }


        /* =====================================================
           GROQ
        ===================================================== */

        const groqApiKey =
            process.env.GROQ_API_KEY;


        if (!groqApiKey) {

            console.error(
                "GROQ_API_KEY is missing."
            );

            return res.status(500).json({

                error:
                    "GROQ_API_KEY is not configured in Vercel."

            });

        }


        /* =====================================================
           GROQ REQUEST
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


        let groqData;


        try {

            groqData =
                JSON.parse(responseText);

        } catch (parseError) {

            console.error(
                "Groq invalid response:",
                responseText
            );

            return res.status(500).json({

                error:
                    "Groq returned an invalid response."

            });

        }


        /* =====================================================
           GROQ ERROR
        ===================================================== */

        if (!groqResponse.ok) {

            console.error(
                "Groq API Error:",
                groqData
            );

            return res.status(
                groqResponse.status
            ).json({

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
                ?.message?.content;


        if (!reply) {

            return res.status(500).json({

                error:
                    "No reply received from Groq."

            });

        }


        /* =====================================================
           NORMAL RESPONSE
        ===================================================== */

        return res.status(200).json({

            type: "text",

            reply: reply,

            webSearch:
                webSearch

        });


    } catch (error) {

        console.error(
            "API ERROR:",
            error
        );


        return res.status(500).json({

            error:
                error.message ||
                "Server error."

        });

    }

}
