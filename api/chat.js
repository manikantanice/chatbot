import { useState, useRef, useEffect } from "react";

export default function Chat() {
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content:
                "It's nice to meet you. Is there something I can help you with, or would you like to chat?",
            type: "text",
        },
    ]);

    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [webSearch, setWebSearch] = useState(false);

    const messagesEndRef = useRef(null);

    /* =====================================================
       AUTO SCROLL
    ===================================================== */

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, [messages, loading]);


    /* =====================================================
       IMAGE REQUEST DETECTION
    ===================================================== */

    const isImageRequest = (text) => {
        return /create an image|generate an image|make an image|generate a picture|create a picture|draw|image of|create image|make picture|generate picture|show me an image|show image|generate photo|create photo|make photo|create a photo|generate img|create img|make img/i.test(
            text
        );
    };


    /* =====================================================
       SEND MESSAGE
    ===================================================== */

    const sendMessage = async () => {
        const text = input.trim();

        if (!text || loading) {
            return;
        }

        /* ================================================
           ADD USER MESSAGE
        ================================================ */

        const userMessage = {
            role: "user",
            content: text,
            type: "text",
        };

        const updatedMessages = [
            ...messages,
            userMessage,
        ];

        setMessages(updatedMessages);
        setInput("");
        setLoading(true);


        try {

            /* ============================================
               CALL API
            ============================================ */

            const response = await fetch("/api/chats", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify({
                    messages: updatedMessages.map((message) => ({
                        role: message.role,
                        content: message.content,
                    })),

                    webSearch: webSearch,
                }),
            });


            /* ============================================
               READ RESPONSE
            ============================================ */

            const responseText = await response.text();

            let data;

            try {
                data = JSON.parse(responseText);
            } catch (parseError) {

                console.error(
                    "Invalid JSON from server:",
                    responseText
                );

                throw new Error(
                    `Server returned invalid response (${response.status}).`
                );
            }


            /* ============================================
               API ERROR
            ============================================ */

            if (!response.ok) {

                console.error(
                    "API Error:",
                    data
                );

                throw new Error(
                    data?.error ||
                    `Server returned an invalid response (${response.status}).`
                );
            }


            /* ============================================
               IMAGE RESPONSE
            ============================================ */

            if (
                data?.type === "image" &&
                data?.image
            ) {

                setMessages((prev) => [
                    ...prev,

                    {
                        role: "assistant",
                        content:
                            data.reply ||
                            "✨ Here is the image I created for you:",

                        type: "image",

                        image:
                            data.image,
                    },
                ]);

                return;
            }


            /* ============================================
               TEXT RESPONSE
            ============================================ */

            if (data?.type === "text") {

                setMessages((prev) => [
                    ...prev,

                    {
                        role: "assistant",

                        content:
                            data.reply ||
                            "Sorry, I couldn't generate a response.",

                        type: "text",
                    },
                ]);

                return;
            }


            /* ============================================
               UNKNOWN RESPONSE
            ============================================ */

            setMessages((prev) => [
                ...prev,

                {
                    role: "assistant",

                    content:
                        "⚠️ Unexpected response from server.",

                    type: "text",
                },
            ]);

        } catch (error) {

            console.error(
                "CHAT ERROR:",
                error
            );


            /* ============================================
               ERROR MESSAGE
            ============================================ */

            setMessages((prev) => [
                ...prev,

                {
                    role: "assistant",

                    content:
                        `⚠️ ${error.message || "Something went wrong."}`,

                    type: "error",
                },
            ]);

        } finally {

            setLoading(false);

        }
    };


    /* =====================================================
       ENTER KEY
    ===================================================== */

    const handleKeyDown = (event) => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();
        }
    };


    /* =====================================================
       NEW CHAT
    ===================================================== */

    const newChat = () => {

        setMessages([
            {
                role: "assistant",

                content:
                    "It's nice to meet you. Is there something I can help you with, or would you like to chat?",

                type: "text",
            },
        ]);

        setInput("");
    };


    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <div className="chat-page">

            <div className="chat-container">

                {/* =========================================
                    CHAT MESSAGES
                ========================================= */}

                <div className="messages-container">

                    {messages.map(
                        (message, index) => (

                            <div
                                key={index}
                                className={
                                    message.role === "user"
                                        ? "message-row user-row"
                                        : "message-row assistant-row"
                                }
                            >

                                <div
                                    className={
                                        message.role === "user"
                                            ? "message user-message"
                                            : "message assistant-message"
                                    }
                                >

                                    {/* =========================
                                        IMAGE
                                    ========================= */}

                                    {message.type === "image" &&
                                        message.image && (
                                            <div className="image-response">

                                                {message.content && (
                                                    <p className="image-text">
                                                        {message.content}
                                                    </p>
                                                )}

                                                <img
                                                    src={message.image}
                                                    alt="AI generated"
                                                    className="generated-image"
                                                />

                                            </div>
                                        )}


                                    {/* =========================
                                        TEXT
                                    ========================= */}

                                    {message.type !== "image" && (
                                        <div className="message-text">
                                            {message.content}
                                        </div>
                                    )}

                                </div>

                            </div>

                        )
                    )}


                    {/* =========================================
                        LOADING
                    ========================================= */}

                    {loading && (
                        <div className="message-row assistant-row">

                            <div className="message assistant-message loading-message">

                                <span className="loading-dot"></span>
                                <span className="loading-dot"></span>
                                <span className="loading-dot"></span>

                            </div>

                        </div>
                    )}

                    <div ref={messagesEndRef}></div>

                </div>


                {/* =========================================
                    INPUT AREA
                ========================================= */}

                <div className="input-wrapper">

                    <textarea
                        value={input}
                        onChange={(event) =>
                            setInput(event.target.value)
                        }
                        onKeyDown={handleKeyDown}
                        placeholder="Message Mini AI..."
                        rows={1}
                        disabled={loading}
                    />


                    {/* =====================================
                        BOTTOM OPTIONS
                    ===================================== */}

                    <div className="input-bottom">

                        <div className="input-tools">

                            <button
                                type="button"
                                title="Add"
                                onClick={() => {}}
                            >
                                +
                            </button>


                            <button
                                type="button"
                                title="Web Search"
                                className={
                                    webSearch
                                        ? "tool-active"
                                        : ""
                                }
                                onClick={() =>
                                    setWebSearch(
                                        !webSearch
                                    )
                                }
                            >
                                ◉
                            </button>


                            <button
                                type="button"
                                title="Search"
                                onClick={() => {}}
                            >
                                ⌕
                            </button>


                            <button
                                type="button"
                                title="AI"
                                onClick={() => {}}
                            >
                                ✦
                            </button>

                        </div>


                        <div className="input-actions">

                            <button
                                type="button"
                                className="music-button"
                                title="Music"
                                onClick={() => {}}
                            >
                                ♫
                            </button>


                            <button
                                type="button"
                                className="send-button"
                                onClick={sendMessage}
                                disabled={
                                    loading ||
                                    !input.trim()
                                }
                            >
                                ↑
                            </button>

                        </div>

                    </div>

                </div>


                {/* =========================================
                    NEW CHAT
                ========================================= */}

                <button
                    type="button"
                    onClick={newChat}
                    className="new-chat-hidden"
                >
                    New Chat
                </button>

            </div>


            {/* =============================================
                INLINE STYLES
            ============================================= */}

            <style jsx>{`

                .chat-page {
                    width: 100%;
                    height: 100vh;
                    background: #030616;
                    color: #ffffff;
                    overflow: hidden;
                }


                .chat-container {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }


                .messages-container {
                    flex: 1;
                    width: 100%;
                    max-width: 1100px;
                    margin: 0 auto;
                    padding: 50px 30px 180px;
                    overflow-y: auto;
                    box-sizing: border-box;
                }


                .message-row {
                    width: 100%;
                    display: flex;
                    margin-bottom: 28px;
                }


                .user-row {
                    justify-content: flex-end;
                }


                .assistant-row {
                    justify-content: flex-start;
                }


                .message {
                    max-width: 75%;
                    padding: 15px 18px;
                    border-radius: 14px;
                    font-size: 14px;
                    line-height: 1.7;
                    box-sizing: border-box;
                }


                .user-message {
                    background: linear-gradient(
                        135deg,
                        #743cff,
                        #5542ff
                    );

                    border-radius: 15px 15px 5px 15px;
                }


                .assistant-message {
                    background: #11182e;
                    border: 1px solid rgba(
                        255,
                        255,
                        255,
                        0.06
                    );

                    border-radius: 7px 15px 15px 15px;
                }


                .error {
                    color: #ffffff;
                    background: #11182e;
                    border: 1px solid rgba(
                        255,
                        100,
                        100,
                        0.2
                    );
                }


                .message-text {
                    white-space: pre-wrap;
                    word-break: break-word;
                }


                .image-response {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }


                .image-text {
                    margin: 0;
                }


                .generated-image {
                    display: block;
                    width: 100%;
                    max-width: 700px;
                    height: auto;
                    border-radius: 12px;
                    border: 1px solid rgba(
                        255,
                        255,
                        255,
                        0.1
                    );
                }


                .input-wrapper {
                    position: fixed;
                    left: 50%;
                    bottom: 25px;
                    transform: translateX(-50%);

                    width: min(
                        775px,
                        calc(100% - 40px)
                    );

                    min-height: 105px;

                    background: rgba(
                        22,
                        20,
                        55,
                        0.95
                    );

                    border: 1px solid #7542ff;
                    border-radius: 16px;

                    box-shadow:
                        0 0 35px rgba(
                            111,
                            61,
                            255,
                            0.12
                        );

                    z-index: 50;
                }


                .input-wrapper textarea {
                    width: 100%;
                    height: 65px;
                    resize: none;
                    border: 0;
                    outline: none;

                    background: transparent;
                    color: #ffffff;

                    padding: 18px 55px 5px 16px;

                    box-sizing: border-box;

                    font-size: 14px;
                    font-family: inherit;
                }


                .input-wrapper textarea::placeholder {
                    color: #73758b;
                }


                .input-bottom {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;

                    padding: 4px 12px 10px;
                }


                .input-tools,
                .input-actions {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }


                .input-tools button,
                .music-button {
                    width: 25px;
                    height: 25px;

                    border: 0;
                    background: transparent;
                    color: #8b8da5;

                    cursor: pointer;
                    font-size: 16px;

                    display: flex;
                    align-items: center;
                    justify-content: center;
                }


                .input-tools button:hover,
                .music-button:hover {
                    color: #ffffff;
                }


                .tool-active {
                    color: #9c6cff !important;
                }


                .send-button {
                    width: 38px;
                    height: 38px;

                    border: 0;
                    border-radius: 50%;

                    background: linear-gradient(
                        135deg,
                        #7542ff,
                        #6254ff
                    );

                    color: #ffffff;

                    font-size: 22px;
                    cursor: pointer;

                    display: flex;
                    align-items: center;
                    justify-content: center;
                }


                .send-button:disabled {
                    opacity: 0.45;
                    cursor: not-allowed;
                }


                .loading-message {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    padding: 14px 18px;
                }


                .loading-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #8d6cff;

                    animation: loading 1.2s infinite;
                }


                .loading-dot:nth-child(2) {
                    animation-delay: 0.15s;
                }


                .loading-dot:nth-child(3) {
                    animation-delay: 0.3s;
                }


                @keyframes loading {

                    0%,
                    80%,
                    100% {
                        opacity: 0.3;
                        transform: translateY(0);
                    }

                    40% {
                        opacity: 1;
                        transform: translateY(-4px);
                    }
                }


                .new-chat-hidden {
                    display: none;
                }


                @media (max-width: 768px) {

                    .messages-container {
                        padding-left: 15px;
                        padding-right: 15px;
                    }


                    .message {
                        max-width: 90%;
                    }


                    .input-wrapper {
                        width: calc(100% - 20px);
                        bottom: 10px;
                    }

                }

            `}</style>

        </div>
    );
}
