const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Pexels API Key
const PEXELS_API_KEY = "t5V6gWPPTy7zuytubDuzaE3WEExgvAsE2PjDNLlgieWOPFX2l7XjrdfY";

app.use(express.json());
app.use(express.static(__dirname));

// Pexels image search
app.get("/api/pexels", async (req, res) => {
    try {
        const query = req.query.query || "nature";

        const response = await fetch(
            `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=12`,
            {
                headers: {
                    Authorization: PEXELS_API_KEY
                }
            }
        );

        if (!response.ok) {
            return res.status(response.status).json({
                error: "Pexels API request failed"
            });
        }

        const data = await response.json();

        res.json(data);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Server error"
        });
    }
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
    console.log(`Mini AI running at http://localhost:${PORT}`);
});
