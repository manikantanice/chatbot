export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {
        const body = req.body || {};

        const messages = body.messages;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                error: "Messages are missing."
            });
        }

        /* =====================================================
           GET LAST USER MESSAGE
        ===================================================== */

        const lastMessage =
            messages[messages.length - 1]?.content || "";

        /* =====================================================
           IMAGE REQUEST DETECTION
        ===================================================== */

        const wantsImage =
            /create an image|generate an image|make an image|generate a picture|create a picture|draw|image of|create image|make picture|generate picture|show me an image/i.test(
                lastMessage
            );

        /* =====================================================
           IMAGE GENERATION
        ===================================================== */

        if (wantsImage) {

            const prompt = encodeURIComponent(lastMessage);

            const imageUrl =
                `https://gen.pollinations.ai/image/${prompt}?model=flux`;

            return res.status(200).json({

                type: "image",

                reply:
                    "✨ Here is the image I created for you:",

                image:
                    imageUrl
            });
        }

        /* =====================================================
           GROQ API
        ===================================================== */

        const apiKey =
            process.env.GROQ_API_KEY;

        if (!apiKey) {

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
                            "Bearer " + apiKey
                    },

                    body: JSON.stringify({

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

        const text =
            await groqResponse.text();

        let data;

        try {

            data =
                JSON.parse(text);

        } catch {

            console.error(
                "Invalid Groq response:",
                text
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
                "Groq API error:",
                data
            );

            return res.status(
                groqResponse.status
            ).json({

                error:
                    data.error?.message ||
                    "Groq API error"
            });
        }

        /* =====================================================
           GET AI REPLY
        ===================================================== */

        const reply =
            data
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

            reply:
                reply
        });

    } catch (error) {

        console.error(
            "API ERROR:",
            error
        );

        return res.status(500).json({

            error:
                error.message ||
                "Server error"
        });
    }
}
