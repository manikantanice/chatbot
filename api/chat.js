export default async function handler(req, res) {

    if (req.method !== "POST") {

        return res.status(405).json({
            error: "Method not allowed"
        });

    }


    try {

        const apiKey =
            process.env.GROQ_API_KEY;


        if (!apiKey) {

            return res.status(500).json({
                error:
                    "GROQ_API_KEY is not configured in Vercel."
            });

        }


        const body =
            req.body || {};


        const messages =
            body.messages;


        if (
            !messages ||
            !Array.isArray(messages)
        ) {

            return res.status(400).json({
                error:
                    "Messages are missing."
            });

        }


        const groqResponse =
            await fetch(
                "https://api.groq.com/openai/v1/chat/completions",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " +
                            apiKey

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


        const text =
            await groqResponse.text();


        let data;


        try {

            data =
                JSON.parse(text);

        } catch {

            return res.status(500).json({

                error:
                    "Groq returned an invalid response."

            });

        }


        if (!groqResponse.ok) {

            return res.status(
                groqResponse.status
            ).json({

                error:
                    data.error?.message ||
                    "Groq API error"

            });

        }


        const reply =
            data
                .choices?.[0]
                ?.message
                ?.content;


        if (!reply) {

            return res.status(500).json({

                error:
                    "No reply received from Groq."

            });

        }


        return res.status(200).json({

            reply: reply

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
