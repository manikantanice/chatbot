document.addEventListener("DOMContentLoaded", function () {

    const cursor = document.querySelector(".ai-cursor");

    if (!cursor) {
        console.log("AI cursor element not found");
        return;
    }

    const trails = document.querySelectorAll(".cursor-trail");

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    let cursorX = mouseX;
    let cursorY = mouseY;

    const trailX = [];
    const trailY = [];

    trails.forEach(function () {
        trailX.push(mouseX);
        trailY.push(mouseY);
    });


    /* =========================
       MOUSE MOVE
    ========================= */

    document.addEventListener("mousemove", function (e) {

        mouseX = e.clientX;
        mouseY = e.clientY;

        cursor.style.opacity = "1";

        trails.forEach(function (trail) {
            trail.style.opacity = "1";
        });

    });


    /* =========================
       ANIMATION
    ========================= */

    function animate() {

        cursorX += (mouseX - cursorX) * 0.25;
        cursorY += (mouseY - cursorY) * 0.25;

        cursor.style.left = cursorX + "px";
        cursor.style.top = cursorY + "px";


        let targetX = cursorX;
        let targetY = cursorY;


        trails.forEach(function (trail, index) {

            trailX[index] +=
                (targetX - trailX[index]) * 0.18;

            trailY[index] +=
                (targetY - trailY[index]) * 0.18;


            trail.style.left =
                trailX[index] + "px";

            trail.style.top =
                trailY[index] + "px";


            const scale =
                1 - (index * 0.12);

            const opacity =
                0.65 - (index * 0.08);


            trail.style.transform =
                "translate(-50%, -50%) scale(" +
                scale +
                ")";

            trail.style.opacity =
                opacity;


            targetX = trailX[index];
            targetY = trailY[index];

        });


        requestAnimationFrame(animate);

    }


    animate();


    /* =========================
       HOVER
    ========================= */

    document.addEventListener("mouseover", function (e) {

        const target =
            e.target.closest(
                "a, button, input, textarea, select, .quick-card, .tool-option"
            );

        if (target) {
            document.body.classList.add("cursor-hover");
        }

    });


    document.addEventListener("mouseout", function (e) {

        const target =
            e.target.closest(
                "a, button, input, textarea, select, .quick-card, .tool-option"
            );

        if (target) {
            document.body.classList.remove("cursor-hover");
        }

    });


    /* =========================
       CLICK
    ========================= */

    document.addEventListener("mousedown", function () {

        document.body.classList.add("cursor-click");

    });


    document.addEventListener("mouseup", function () {

        document.body.classList.remove("cursor-click");

    });


    /* =========================
       MOUSE LEAVE
    ========================= */

    document.addEventListener("mouseleave", function () {

        cursor.style.opacity = "0";

        trails.forEach(function (trail) {
            trail.style.opacity = "0";
        });

    });


    /* =========================
       MOUSE ENTER
    ========================= */

    document.addEventListener("mouseenter", function () {

        cursor.style.opacity = "1";

    });

});
