export default async function handler(req, res) {

    if (req.method !== "POST") {

        return res.status(405).json({
            error: "Method not allowed"
        });

    }

    try {

        const { messages } = req.body;

        const response = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization":
                        `Bearer ${process.env.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}`
                },

                body: JSON.stringify({

                    model: "llama-3.3-70b-versatile",

                    messages: messages,

                    temperature: 0.7

                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            return res.status(response.status)
                .json(data);

        }

        return res.status(200).json({

            reply:
                data.choices[0].message.content

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            error: "Something went wrong"

        });

    }
}
