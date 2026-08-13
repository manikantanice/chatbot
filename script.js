/* =================================================
   RECENT CHAT / CHAT HISTORY
================================================= */

function saveRecentChat(message) {

    if (!message) return;


    /* ---------------------------------------------
       Create ID for this conversation
    --------------------------------------------- */

    if (!currentChatId) {

        currentChatId =
            "chat-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 8);

    }


    /* ---------------------------------------------
       Save complete conversation
    --------------------------------------------- */

    localStorage.setItem(
        "miniAI-" + currentChatId,
        JSON.stringify({
            id: currentChatId,
            title: message.substring(0, 24),
            messages: conversation
        })
    );


    /* ---------------------------------------------
       Check if sidebar item already exists
    --------------------------------------------- */

    let existingItem =
        recentChats.querySelector(
            `[data-chat-id="${currentChatId}"]`
        );


    /* ---------------------------------------------
       Create sidebar item only once
    --------------------------------------------- */

    if (!existingItem) {

        const item =
            document.createElement("button");

        item.type = "button";

        item.className =
            "conversation";

        item.dataset.chatId =
            currentChatId;

        item.innerHTML = `

            <span class="conversation-icon">
                ◇
            </span>

            <span>
                ${escapeHTML(
                    message.substring(0, 24)
                )}
            </span>

        `;


        /* -----------------------------------------
           CLICK → LOAD PREVIOUS CONVERSATION
        ----------------------------------------- */

        item.addEventListener(
            "click",
            () => {

                loadConversation(
                    currentChatId
                );

            }
        );


        recentChats.prepend(item);


        /* -----------------------------------------
           Keep only 5
        ----------------------------------------- */

        while (
            recentChats.children.length > 5
        ) {

            const last =
                recentChats.lastElementChild;

            if (last) {

                const id =
                    last.dataset.chatId;

                if (id) {

                    localStorage.removeItem(
                        "miniAI-" + id
                    );

                }

                last.remove();

            }

        }

    }

}
/* =================================================
   LOAD PREVIOUS CONVERSATION
================================================= */

function loadConversation(chatId) {

    const saved =
        localStorage.getItem(
            "miniAI-" + chatId
        );


    if (!saved) {

        console.log(
            "Conversation not found:",
            chatId
        );

        return;

    }


    try {

        const chatData =
            JSON.parse(saved);


        /* -----------------------------------------
           Set active conversation
        ----------------------------------------- */

        currentChatId =
            chatData.id;


        conversation =
            chatData.messages || [];


        /* -----------------------------------------
           Clear current messages
        ----------------------------------------- */

        chatMessages.innerHTML = "";


        /* -----------------------------------------
           Hide welcome screen
        ----------------------------------------- */

        welcomeScreen.style.display =
            "none";


        /* -----------------------------------------
           Render previous messages
        ----------------------------------------- */

        conversation.forEach(
            message => {

                if (
                    message.role === "user"
                ) {

                    addMessage(
                        "user",
                        message.content
                    );

                }


                if (
                    message.role === "assistant"
                ) {

                    addMessage(
                        "ai",
                        message.content
                    );

                }

            }
        );


        /* -----------------------------------------
           Active sidebar item
        ----------------------------------------- */

        document
            .querySelectorAll(
                ".conversation"
            )
            .forEach(item => {

                item.classList.remove(
                    "active"
                );

            });


        const activeItem =
            recentChats.querySelector(
                `[data-chat-id="${chatId}"]`
            );


        if (activeItem) {

            activeItem.classList.add(
                "active"
            );

        }


        /* -----------------------------------------
           Scroll bottom
        ----------------------------------------- */

        setTimeout(() => {

            chatArea.scrollTo({
                top: chatArea.scrollHeight,
                behavior: "smooth"
            });

        }, 100);


        input.focus();

    } catch (error) {

        console.error(
            "Could not load conversation:",
            error
        );

    }

}
