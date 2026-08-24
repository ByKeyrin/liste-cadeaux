// =========================================================
// INITIALISATION
// =========================================================

console.log("🎄 Application Noël démarrée");


// =========================================================
// FLOCONS
// =========================================================

const snow = document.getElementById("snow");

const snowflakeCount = 45;

if (!snow) {

    console.error(
        "❌ Le conteneur #snow est introuvable."
    );

} else {

    console.log(
        `❄️ Création de ${snowflakeCount} flocons...`
    );

    for (let i = 0; i < snowflakeCount; i++) {

        const flake =
            document.createElement("span");

        flake.classList.add("snowflake");

        flake.textContent = "❄";

        flake.style.left =
            `${Math.random() * 100}%`;

        flake.style.fontSize =
            `${8 + Math.random() * 14}px`;

        flake.style.opacity =
            `${0.25 + Math.random() * 0.5}`;

        flake.style.animationDuration =
            `${8 + Math.random() * 12}s`;

        flake.style.animationDelay =
            `${Math.random() * -20}s`;

        snow.appendChild(flake);
    }

    console.log("✅ Flocons créés.");
}


// =========================================================
// RÉCUPÉRATION DES ÉLÉMENTS
// =========================================================

const wishlistContainer =
    document.getElementById("wishlist");

const modal =
    document.getElementById("dependency-modal");

const modalClose =
    document.getElementById("modal-close");

const modalCancel =
    document.getElementById("modal-cancel");

const modalConfirm =
    document.getElementById("modal-confirm");

const dependencyList =
    document.getElementById("dependency-list");


// =========================================================
// VARIABLE POUR LE LIEN EN ATTENTE
// =========================================================

let pendingUrl = null;


// =========================================================
// AFFICHAGE DES SOUHAITS
// =========================================================

if (!wishlistContainer) {

    console.error(
        "❌ Le conteneur #wishlist est introuvable."
    );

} else if (typeof wishes === "undefined") {

    console.error(
        "❌ La variable 'wishes' est introuvable."
    );

    console.error(
        "Vérifie que wishes.js est chargé AVANT app.js."
    );

} else {

    console.log(
        `🎁 ${wishes.length} souhait(s) trouvé(s).`
    );


    wishes.forEach(wish => {

        // =================================================
        // CARTE
        // =================================================

        const card =
            document.createElement("article");

        card.classList.add("wish-card");


        // =================================================
        // IMAGE
        // =================================================

        const image =
            document.createElement("img");

        image.src =
            wish.image;

        image.alt =
            wish.name;


        // =================================================
        // CONTENU
        // =================================================

        const content =
            document.createElement("div");

        content.classList.add("wish-content");


        // =================================================
        // NOM
        // =================================================

        const title =
            document.createElement("h2");

        title.textContent =
            wish.name;


        // =================================================
        // PRIX
        // =================================================

        const price =
            document.createElement("p");

        price.classList.add("wish-price");

        price.textContent =
            `${wish.price} €`;


        // =================================================
        // BOUTON
        // =================================================

        const link =
            document.createElement("a");

        link.href =
            wish.url;

        link.textContent =
            "Voir le produit";

        link.href =
            wish.url;

        link.target =
            "_blank";

        link.rel =
            "noopener noreferrer";


        // =================================================
        // GESTION DU CLIC
        // =================================================

        link.addEventListener(
            "click",
            function (event) {

                /*
                 * S'il n'y a pas de dépendance,
                 * on laisse le lien fonctionner normalement.
                 */

                if (
                    !wish.requiredWishes ||
                    wish.requiredWishes.length === 0
                ) {
                    return;
                }


                /*
                 * Il y a au moins une dépendance.
                 * On empêche l'ouverture immédiate.
                 */

                event.preventDefault();


                // -----------------------------------------
                // Stockage du lien
                // -----------------------------------------

                pendingUrl =
                    wish.url;


                // -----------------------------------------
                // Nettoyage de la liste
                // -----------------------------------------

                dependencyList.innerHTML =
                    "";


                // -----------------------------------------
                // Recherche des cadeaux nécessaires
                // -----------------------------------------

                wish.requiredWishes.forEach(
                    requiredWishId => {

                        const requiredWish =
                            wishes.find(
                                item =>
                                    item.id === requiredWishId
                            );


                        if (!requiredWish) {

                            console.warn(
                                `⚠️ Le souhait ${requiredWishId} est introuvable.`
                            );

                            return;
                        }


                        // ---------------------------------
                        // Élément de liste
                        // ---------------------------------

                        const dependency =
                            document.createElement("div");

                        dependency.classList.add(
                            "dependency-item"
                        );


                        // ---------------------------------
                        // Icône
                        // ---------------------------------

                        const icon =
                            document.createElement("span");

                        icon.classList.add(
                            "dependency-icon"
                        );

                        icon.textContent =
                            "🎁";


                        // ---------------------------------
                        // Nom
                        // ---------------------------------

                        const name =
                            document.createElement("span");

                        name.textContent =
                            requiredWish.name;


                        // ---------------------------------
                        // Assemblage
                        // ---------------------------------

                        dependency.appendChild(
                            icon
                        );

                        dependency.appendChild(
                            name
                        );

                        dependencyList.appendChild(
                            dependency
                        );
                    }
                );


                // -----------------------------------------
                // Ouverture de la pop-up
                // -----------------------------------------

                openModal();
            }
        );


        // =================================================
        // ASSEMBLAGE DE LA CARTE
        // =================================================

        content.appendChild(title);

        content.appendChild(price);

        content.appendChild(link);

        card.appendChild(image);

        card.appendChild(content);

        wishlistContainer.appendChild(card);

    });


    console.log(
        "✅ Souhaits affichés."
    );
}


// =========================================================
// OUVERTURE DE LA POP-UP
// =========================================================

function openModal() {

    if (!modal) {
        return;
    }

    modal.classList.add("active");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow =
        "hidden";
}


// =========================================================
// FERMETURE DE LA POP-UP
// =========================================================

function closeModal() {

    if (!modal) {
        return;
    }

    modal.classList.remove("active");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow =
        "";

    pendingUrl =
        null;
}


// =========================================================
// BOUTON "X"
// =========================================================

if (modalClose) {

    modalClose.addEventListener(
        "click",
        closeModal
    );
}


// =========================================================
// BOUTON "RETOUR"
// =========================================================

if (modalCancel) {

    modalCancel.addEventListener(
        "click",
        closeModal
    );
}


// =========================================================
// BOUTON "VOIR LE PRODUIT"
// =========================================================

if (modalConfirm) {

    modalConfirm.addEventListener(
        "click",
        function () {

            if (!pendingUrl) {
                return;
            }

            window.open(
                pendingUrl,
                "_blank",
                "noopener,noreferrer"
            );

            closeModal();
        }
    );
}


// =========================================================
// CLIC EN DEHORS DE LA POP-UP
// =========================================================

if (modal) {

    modal.addEventListener(
        "click",
        function (event) {

            if (
                event.target === modal
            ) {
                closeModal();
            }
        }
    );
}


// =========================================================
// TOUCHE ÉCHAP
// =========================================================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape" &&
            modal &&
            modal.classList.contains("active")
        ) {
            closeModal();
        }
    }
);