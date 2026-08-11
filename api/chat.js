```javascript
export default async function handler(req, res) {

    // Only allow POST requests
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {

        // Check API key
        if (!process.env.GROQ_API_KEY) {

            return res.status(500).json({
                error: "GROQ_API_KEY is missing in Vercel Environment Variables"
            });

        }

        // Get messages from frontend
        const { messages } = req.body || {};

        if (!messages || !Array.isArray(messages)) {

            return res.status(400).json({
                error: "Messages are required"
            });

        }

        // Call Groq API
        const groqResponse = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
                },

                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 1000
                })
            }
        );


        // Get Groq response
        const data = await groqResponse.json();


        // Groq returned an error
        if (!groqResponse.ok) {

            console.error("Groq API Error:", data);

            return res.status(groqResponse.status).json({
                error: data?.error?.message || "Groq API request failed"
            });
        }


        // Check response
        if (
            !data.choices ||
            !data.choices.length ||
            !data.choices[0].message
        ) {

            console.error("Invalid Groq response:", data);

            return res.status(500).json({
                error: "Invalid response from Groq"
            });
        }


        // Send AI response to frontend
        return res.status(200).json({

            reply: data.choices[0].message.content

        });


    } catch (error) {

        console.error("Server Error:", error);

        return res.status(500).json({

            error: error.message || "Something went wrong"

        });

    }
}
```
