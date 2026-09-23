/* =========================================================
   INITIALISATION
   ========================================================= */

console.log("🎄 Application Noël démarrée");

// =========================================================
// VARIABLE POUR LE TRI
// =========================================================

let currentSort = localStorage.getItem("sort") || "default";
let currentCategory = localStorage.getItem("category") || "Tous";


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

const categoryFilters =
    document.getElementById("category-filters");

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

const resultCounter =
    document.getElementById("result-counter");


// =========================================================
// VARIABLE POUR LE LIEN EN ATTENTE
// =========================================================

let pendingUrl = null;
let modalTriggerElement = null;


// =========================================================
// FONCTION : AFFICHER LES SOUHAITS
// =========================================================

function displayWishes(category = "Tous") {
    try {
    if (!wishlistContainer) {
        return;
    }


    // -----------------------------------------------------
    // Nettoyage de la grille
    // -----------------------------------------------------

    wishlistContainer.innerHTML = "";


    // -----------------------------------------------------
    // Filtrage
    // -----------------------------------------------------

    const filteredWishes =
        category === "Tous"
            ? wishes
            : wishes.filter(
                wish => wish.category === category
            );

    // -----------------------------------------------------
    // Tri par prix
    // -----------------------------------------------------

    let sortedWishes = [...filteredWishes];

    if (currentSort === "price-asc") {
        sortedWishes.sort((a, b) => a.price - b.price);
    } else if (currentSort === "price-desc") {
        sortedWishes.sort((a, b) => b.price - a.price);
    }

    console.log(
        `🎁 Tri : ${currentSort} | Affichage de ${sortedWishes.length} souhait(s)`
    );

    // -----------------------------------------------------
    // Compteur de résultats
    // -----------------------------------------------------

    if (resultCounter) {
        const count = sortedWishes.length;
        resultCounter.textContent =
            count === 1
                ? "1 cadeau affiché"
                : `${count} cadeaux affichés`;
    }

    // -----------------------------------------------------
    // Génération des cartes
    // -----------------------------------------------------

    sortedWishes.forEach(wish => {
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

        image.loading = "lazy";

        // Fallback image for broken images
        image.onerror = function() {
            this.onerror = null; // Prevent infinite loop
            this.src = 'data:image/svg+xml,' + encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">' +
                '<rect width="400" height="300" fill="#f5f0e8"/>' +
                '<text x="200" y="140" text-anchor="middle" font-size="48" fill="#b18a4a">🎁</text>' +
                '<text x="200" y="180" text-anchor="middle" font-size="16" fill="#706f68">Image non disponible</text>' +
                '</svg>'
            );
            this.alt = wish.name + ' - Image non disponible';
        };

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

    } catch (error) {
        console.error("Erreur displayWishes:", error);
    }
}


// =========================================================
// CRÉATION DES FILTRES DE CATÉGORIES
// =========================================================

function createCategoryFilters() {

    if (!categoryFilters) {

        console.error(
            "❌ Le conteneur #category-filters est introuvable."
        );

        return;
    }


    // -----------------------------------------------------
    // Nettoyage (supprimer uniquement les boutons catégorie, pas le bouton tri)
    // -----------------------------------------------------

    const existingButtons = categoryFilters.querySelectorAll('.category-button:not(#sort-button)');
    existingButtons.forEach(btn => btn.remove());


    // -----------------------------------------------------
    // Récupération des catégories
    // -----------------------------------------------------

    const categories =
        [
            "Tous",
            ...new Set(
                wishes
                    .map(wish => wish.category)
                    .filter(category => category)
            )
        ];


    console.log(
        "🏷️ Catégories détectées :",
        categories
    );


    // -----------------------------------------------------
    // Création des boutons
    // -----------------------------------------------------

    categories.forEach(category => {

        const button =
            document.createElement("button");

        button.type =
            "button";

        button.classList.add(
            "category-button"
        );


        // Activer le bouton correspondant à la catégorie sauvegardée
        if (category === currentCategory) {

            button.classList.add(
                "active"
            );
        }


        // -------------------------------------------------
        // Icône
        // -------------------------------------------------

        const icon =
            document.createElement("span");

        icon.classList.add(
            "category-icon"
        );


        const categoryIcons = {
            "Tous": "🎁",
            "Mode": "👕",
            "Sport": "🏋️",
            "Loisir": "🎮"
        };


        icon.textContent =
            categoryIcons[category] || "🎁";


        // -------------------------------------------------
        // Nom
        // -------------------------------------------------

        const name =
            document.createElement("span");

        name.classList.add(
            "category-name"
        );

        name.textContent =
            category;


        // -------------------------------------------------
        // Assemblage
        // -------------------------------------------------

        button.appendChild(icon);

        button.appendChild(name);


        // -------------------------------------------------
        // Clic sur une catégorie
        // -------------------------------------------------

        button.setAttribute("aria-label", "Filtrer par " + category);
        button.addEventListener(
            "click",
            function () {

                document
                    .querySelectorAll(
                        ".category-button"
                    )
                    .forEach(
                        btn =>
                            btn.classList.remove(
                                "active"
                            )
                    );


                button.classList.add(
                    "active"
                );

                currentCategory = category;
                localStorage.setItem("category", category);

                displayWishes(category);
            }
        );


        categoryFilters.appendChild(
            button
        );
    });
}


// =========================================================
// VÉRIFICATION DE LA LISTE DES SOUHAITS
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


    // -----------------------------------------------------
    // Création des filtres
    // -----------------------------------------------------

    createCategoryFilters();

    // -----------------------------------------------------
    // Écoute du tri par prix (bouton)
    // -----------------------------------------------------

    const sortButton = document.getElementById("sort-button");

    if (sortButton) {
        const sortOptions = ["default", "price-asc", "price-desc"];
        const sortLabels = {
            "default": "🔽 Trier par",
            "price-asc": "💰 Prix ↑",
            "price-desc": "💎 Prix ↓"
        };
        const sortAriaLabels = {
            "default": "Trier par prix",
            "price-asc": "Trier par prix croissant",
            "price-desc": "Trier par prix décroissant"
        };

        // Restaurer le label du tri au chargement
        sortButton.textContent = sortLabels[currentSort] || sortLabels["default"];
        sortButton.setAttribute("aria-pressed", currentSort !== "default" ? "true" : "false");
        sortButton.setAttribute("aria-label", sortAriaLabels[currentSort] || sortAriaLabels["default"]);

        sortButton.addEventListener("click", function () {
            const currentIndex = sortOptions.indexOf(currentSort);
            const nextIndex = (currentIndex + 1) % sortOptions.length;
            currentSort = sortOptions[nextIndex];
            localStorage.setItem("sort", currentSort);
            sortButton.textContent = sortLabels[currentSort];
            sortButton.setAttribute("aria-pressed", currentSort !== "default" ? "true" : "false");
            sortButton.setAttribute("aria-label", sortAriaLabels[currentSort]);
            console.log(`🔽 Tri changé : ${currentSort}`);
            displayWishes(currentCategory);
        });
    }

    // -----------------------------------------------------
    // Affichage initial
    // -----------------------------------------------------

    displayWishes(currentCategory);


    console.log(
        "✅ Souhaits affichés."
    );
}


// =========================================================
// HELPER : ÉLÉMENTS FOCUSABLES
// =========================================================

function getFirstFocusableElement(container) {
    const focusableSelectors = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const elements = container.querySelectorAll(focusableSelectors);
    return elements.length > 0 ? elements[0] : null;
}

function getFocusableElements(container) {
    const focusableSelectors = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(container.querySelectorAll(focusableSelectors));
}

// =========================================================
// OUVERTURE DE LA POP-UP
// =========================================================

function openModal() {

    if (!modal) {
        return;
    }

    modalTriggerElement = document.activeElement;
    modal.classList.add("active");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow =
        "hidden";

    // Focus the first focusable element inside the modal
    const modalDialog = modal.querySelector("[role='dialog']");
    if (modalDialog) {
        const firstFocusable = getFirstFocusableElement(modalDialog);
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }
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

    // Restore focus to the trigger element
    if (modalTriggerElement && typeof modalTriggerElement.focus === "function") {
        modalTriggerElement.focus();
    }
    modalTriggerElement = null;
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

        // Focus trap for modal
        if (
            event.key === "Tab" &&
            modal &&
            modal.classList.contains("active")
        ) {
            const modalDialog = modal.querySelector("[role='dialog']");
            if (!modalDialog) {
                return;
            }

            const focusableElements = getFocusableElements(modalDialog);
            if (focusableElements.length === 0) {
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey) {
                // Shift+Tab: if focus is on first element, wrap to last
                if (document.activeElement === firstElement) {
                    event.preventDefault();
                    lastElement.focus();
                }
            } else {
                // Tab: if focus is on last element, wrap to first
                if (document.activeElement === lastElement) {
                    event.preventDefault();
                    firstElement.focus();
                }
            }
        }
    }
);

// =========================================================
// BOUTON RETOUR EN HAUT
// =========================================================

const backToTop =
    document.getElementById("back-to-top");


// ---------------------------------------------------------
// Affichage du bouton après défilement
// ---------------------------------------------------------

window.addEventListener(
    "scroll",
    function () {

        if (!backToTop) {
            return;
        }


        if (window.scrollY > 400) {

            backToTop.classList.add(
                "visible"
            );

        } else {

            backToTop.classList.remove(
                "visible"
            );
        }
    }
);


// ---------------------------------------------------------
// Retour en haut
// ---------------------------------------------------------

if (backToTop) {

    backToTop.addEventListener(
        "click",
        function () {

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        }
    );
}
