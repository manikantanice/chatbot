document.addEventListener("DOMContentLoaded", () => {

    /* =========================================
       ELEMENTS
    ========================================= */

    const input = document.getElementById("messageInput");
    const sendBtn = document.getElementById("sendBtn");
    const chatMessages = document.getElementById("chatMessages");

    const plusBtn = document.getElementById("plusBtn");
    const toolsPopup = document.getElementById("toolsPopup");

    const webBtn = document.getElementById("webBtn");

    const attachBtn = document.getElementById("attachBtn");
    const fileInput = document.getElementById("fileInput");

    const attachmentPreview =
        document.getElementById("attachmentPreview");

    const magicBtn = document.getElementById("magicBtn");

    const micBtn = document.getElementById("micBtn");

    const composerExpand =
        document.getElementById("composerExpand");


    /* =========================================
       STATE
    ========================================= */

    let selectedFiles = [];

    let webMode = false;

    let isSending = false;

    let conversation = [];


    /* =========================================
       AUTO RESIZE TEXTAREA
    ========================================= */

    function autoResize() {

        input.style.height = "auto";

        input.style.height =
            Math.min(input.scrollHeight, 180) + "px";
    }

    input.addEventListener("input", autoResize);


    /* =========================================
       ENTER TO SEND
    ========================================= */

    input.addEventListener("keydown", (event) => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();
        }

    });


    /* =========================================
       SEND BUTTON
    ========================================= */

    sendBtn.addEventListener("click", sendMessage);


    /* =========================================
       SEND MESSAGE
    ========================================= */

    async function sendMessage() {

        if (isSending) return;

        const message =
            input.value.trim();

        if (!message) return;


        /* USER MESSAGE */

        addMessage(
            "user",
            message
        );


        conversation.push({
            role: "user",
            content: message
        });


        /* CLEAR INPUT */

        input.value = "";

        autoResize();


        /* CLOSE TOOLS */

        toolsPopup.classList.remove("show");


        /* LOADING */

        setLoading(true);


        try {

            const response =
                await fetch("/api/chat", {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        message: message,

                        messages:
                            conversation,

                        webSearch:
                            webMode,

                        files:
                            selectedFiles.map(file => ({
                                name: file.name,
                                type: file.type,
                                size: file.size
                            }))

                    })

                });


            if (!response.ok) {

                throw new Error(
                    `Server error: ${response.status}`
                );
            }


            const data =
                await response.json();


            /*
             * Support different API response formats
             */

            const reply =
                data.reply ||
                data.message ||
                data.response ||
                data.content ||
                "I couldn't generate a response.";


            /* AI MESSAGE */

            await typeMessage(
                "ai",
                reply
            );


            conversation.push({
                role: "assistant",
                content: reply
            });


        } catch (error) {

            console.error(error);

            addMessage(
                "ai",
                "⚠️ Something went wrong. Please try again."
            );

        } finally {

            setLoading(false);

        }

    }


    /* =========================================
       ADD MESSAGE
    ========================================= */

    function addMessage(type, text) {

        const wrapper =
            document.createElement("div");

        wrapper.className =
            `message ${type}`;


        const bubble =
            document.createElement("div");

        bubble.className =
            "message-bubble";


        bubble.innerHTML =
            formatMessage(text);


        wrapper.appendChild(bubble);

        chatMessages.appendChild(wrapper);


        scrollToBottom();

        return bubble;
    }


    /* =========================================
       TYPEWRITER AI MESSAGE
    ========================================= */

    async function typeMessage(type, text) {

        const wrapper =
            document.createElement("div");

        wrapper.className =
            `message ${type}`;


        const bubble =
            document.createElement("div");

        bubble.className =
            "message-bubble";


        wrapper.appendChild(bubble);

        chatMessages.appendChild(wrapper);


        const formatted =
            formatMessage(text);


        /*
         * Simple typewriter effect
         */

        let index = 0;

        const temp =
            document.createElement("div");

        temp.innerHTML = formatted;

        const plainText =
            temp.textContent ||
            temp.innerText ||
            text;


        while (index < plainText.length) {

            bubble.textContent =
                plainText.substring(
                    0,
                    index + 1
                );

            index++;

            scrollToBottom();

            await sleep(8);
        }


        /*
         * Restore formatted HTML
         */

        bubble.innerHTML =
            formatted;

        scrollToBottom();

    }


    /* =========================================
       MESSAGE FORMATTER
    ========================================= */

    function formatMessage(text) {

        if (!text) return "";

        let safe =
            escapeHTML(text);


        /*
         * Code blocks
         */

        safe =
            safe.replace(
                /```([\s\S]*?)```/g,
                "<pre><code>$1</code></pre>"
            );


        /*
         * Bold
         */

        safe =
            safe.replace(
                /\*\*(.*?)\*\*/g,
                "<strong>$1</strong>"
            );


        /*
         * New lines
         */

        safe =
            safe.replace(
                /\n/g,
                "<br>"
            );


        return safe;
    }


    /* =========================================
       HTML ESCAPE
    ========================================= */

    function escapeHTML(text) {

        const div =
            document.createElement("div");

        div.textContent = text;

        return div.innerHTML;
    }


    /* =========================================
       SCROLL
    ========================================= */

    function scrollToBottom() {

        requestAnimationFrame(() => {

            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: "smooth"
            });

        });

    }


    /* =========================================
       LOADING
    ========================================= */

    function setLoading(state) {

        isSending = state;

        sendBtn.classList.toggle(
            "loading",
            state
        );

        sendBtn.disabled = state;

    }


    /* =========================================
       PLUS TOOLS
    ========================================= */

    plusBtn.addEventListener("click", (event) => {

        event.stopPropagation();

        toolsPopup.classList.toggle("show");

    });


    /* =========================================
       CLOSE POPUP
    ========================================= */

    document.addEventListener("click", (event) => {

        if (
            !toolsPopup.contains(event.target) &&
            !plusBtn.contains(event.target)
        ) {

            toolsPopup.classList.remove(
                "show"
            );

        }

    });


    /* =========================================
       WEB SEARCH
    ========================================= */

    webBtn.addEventListener("click", () => {

        webMode = !webMode;

        webBtn.classList.toggle(
            "active",
            webMode
        );


        if (webMode) {

            input.placeholder =
                "Search the web with Mini AI...";

        } else {

            input.placeholder =
                "Message Mini AI...";

        }

    });


    /* =========================================
       FILE UPLOAD
    ========================================= */

    attachBtn.addEventListener(
        "click",
        () => {

            fileInput.click();

        }
    );


    fileInput.addEventListener(
        "change",
        () => {

            const files =
                Array.from(
                    fileInput.files
                );

            selectedFiles.push(
                ...files
            );

            renderAttachments();

        }
    );


    /* =========================================
       RENDER ATTACHMENTS
    ========================================= */

    function renderAttachments() {

        attachmentPreview.innerHTML = "";

        selectedFiles.forEach(
            (file, index) => {

                const item =
                    document.createElement("div");

                item.className =
                    "attachment-item";


                item.innerHTML = `

                    <span>📎</span>

                    <span>
                        ${escapeHTML(file.name)}
                    </span>

                    <button
                        class="remove-file"
                        data-index="${index}"
                        type="button"
                    >
                        ×
                    </button>

                `;


                attachmentPreview.appendChild(
                    item
                );

            }
        );


        document
            .querySelectorAll(".remove-file")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const index =
                            Number(
                                button.dataset.index
                            );

                        selectedFiles.splice(
                            index,
                            1
                        );

                        renderAttachments();

                    }
                );

            });

    }


    /* =========================================
       MAGIC AI BUTTON
    ========================================= */

    magicBtn.addEventListener(
        "click",
        () => {

            input.focus();

            input.value =
                "Help me with ";

            autoResize();

        }
    );


    /* =========================================
       TOOL OPTIONS
    ========================================= */

    document
        .querySelectorAll(".tool-option")
        .forEach(option => {

            option.addEventListener(
                "click",
                () => {

                    const action =
                        option.dataset.action;


                    if (action === "image") {

                        input.value =
                            "Create an image of ";

                    }


                    if (action === "code") {

                        input.value =
                            "Write code for ";

                    }


                    if (action === "summarize") {

                        input.value =
                            "Summarize this: ";

                    }


                    autoResize();

                    input.focus();

                    toolsPopup.classList.remove(
                        "show"
                    );

                }
            );

        });


    /* =========================================
       VOICE INPUT
    ========================================= */

    let recognition = null;

    if (
        "SpeechRecognition" in window ||
        "webkitSpeechRecognition" in window
    ) {

        const SpeechRecognition =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;


        recognition =
            new SpeechRecognition();


        recognition.continuous = false;

        recognition.interimResults = true;

        recognition.lang = "en-US";


        recognition.onstart = () => {

            micBtn.classList.add(
                "recording"
            );

            input.placeholder =
                "Listening...";

        };


        recognition.onresult =
            (event) => {

                let transcript = "";

                for (
                    let i = event.resultIndex;
                    i < event.results.length;
                    i++
                ) {

                    transcript +=
                        event.results[i][0]
                            .transcript;

                }

                input.value =
                    transcript;

                autoResize();

            };


        recognition.onend = () => {

            micBtn.classList.remove(
                "recording"
            );

            input.placeholder =
                "Message Mini AI...";

        };


        recognition.onerror =
            (error) => {

                console.error(
                    "Speech recognition:",
                    error
                );

                micBtn.classList.remove(
                    "recording"
                );

            };

    }


    micBtn.addEventListener(
        "click",
        () => {

            if (!recognition) {

                alert(
                    "Voice input is not supported in this browser."
                );

                return;
            }


            if (
                micBtn.classList.contains(
                    "recording"
                )
            ) {

                recognition.stop();

            } else {

                recognition.start();

            }

        }
    );


    /* =========================================
       COMPOSER EXPAND
    ========================================= */

    composerExpand.addEventListener(
        "click",
        () => {

            input.focus();

            input.style.maxHeight =
                "300px";

            input.style.height =
                "200px";

        }
    );


    /* =========================================
       KEYBOARD SHORTCUT
    ========================================= */

    document.addEventListener(
        "keydown",
        (event) => {

            /*
             * Ctrl + K
             * Focus composer
             */

            if (
                event.ctrlKey &&
                event.key.toLowerCase() === "k"
            ) {

                event.preventDefault();

                input.focus();

            }


            /*
             * Escape
             */

            if (event.key === "Escape") {

                toolsPopup.classList.remove(
                    "show"
                );

            }

        }
    );


    /* =========================================
       HELPER
    ========================================= */

    function sleep(ms) {

        return new Promise(
            resolve =>
                setTimeout(resolve, ms)
        );

    }

});
