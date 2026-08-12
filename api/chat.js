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

        const body =
            req.body || {};


        const messages =
            body.messages;


        const webSearch =
            body.webSearch || false;


        /* =====================================================
           VALIDATE MESSAGES
        ===================================================== */

        if (
            !messages ||
            !Array.isArray(messages)
        ) {

            return res.status(400).json({

                error:
                    "Messages are missing."
            });

        }


        /* =====================================================
           LAST USER MESSAGE
        ===================================================== */

        const lastMessage =
            messages[messages.length - 1]?.content || "";


        /* =====================================================
           IMAGE REQUEST DETECTION
        ===================================================== */

        const wantsImage =
            /create an image|generate an image|make an image|generate a picture|create a picture|draw|image of|create image|make picture|generate picture|show me an image|show image|generate photo|create photo|make photo|create a photo/i.test(
                lastMessage
            );


        /* =====================================================
           IMAGE GENERATION
        ===================================================== */

        if (wantsImage) {

            const pollinationsKey =
                process.env.POLLINATIONS_API_KEY;


            /* =================================================
               CHECK POLLINATIONS KEY
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
                   IMAGE PROMPT
                ============================================= */

                const imagePrompt =
                    lastMessage
                        .replace(
                            /^(please\s*)?(create|generate|make|draw|show me)\s+(an?\s+)?(image|picture|photo)\s*(of\s*)?/i,
                            ""
                        )
                        .trim();


                const finalPrompt =
                    imagePrompt ||
                    lastMessage;


                console.log(
                    "Generating image:",
                    finalPrompt
                );


                /* =============================================
                   POLLINATIONS REQUEST
                ============================================= */

                const imageUrl =
                    `https://gen.pollinations.ai/image/${encodeURIComponent(finalPrompt)}?model=flux`;


                const imageResponse =
                    await fetch(
                        imageUrl,
                        {

                            method:
                                "GET",

                            headers: {

                                "Authorization":
                                    `Bearer ${pollinationsKey}`,

                                "Accept":
                                    "image/*"
                            }
                        }
                    );


                /* =============================================
                   IMAGE ERROR
                ============================================= */

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


                    return res.status(500).json({

                        error:
                            "Image generation failed. Please check your Pollinations API key."
                    });

                }


                /* =============================================
                   GET IMAGE DATA
                ============================================= */

                const imageBuffer =
                    await imageResponse.arrayBuffer();


                const base64Image =
                    Buffer
                        .from(imageBuffer)
                        .toString("base64");


                const contentType =
                    imageResponse.headers.get(
                        "content-type"
                    ) ||
                    "image/jpeg";


                const imageData =
                    `data:${contentType};base64,${base64Image}`;


                /* =============================================
                   RETURN IMAGE
                ============================================= */

                return res.status(200).json({

                    type:
                        "image",

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
           GROQ API KEY
        ===================================================== */

        const groqApiKey =
            process.env.GROQ_API_KEY;


        if (!groqApiKey) {

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


        /* =====================================================
           READ GROQ RESPONSE
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

                error:
                    groqData?.error?.message ||
                    "Groq API error."
            });

        }


        /* =====================================================
           GET GROQ REPLY
        ===================================================== */

        const reply =
            groqData
                ?.choices?.[0]
                ?.message?.content;


        /* =====================================================
           NO REPLY
        ===================================================== */

        if (!reply) {

            return res.status(500).json({

                error:
                    "No reply received from Groq."
            });

        }


        /* =====================================================
           NORMAL CHAT RESPONSE
        ===================================================== */

     return res.status(200).json({
            type:
                "text",
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
