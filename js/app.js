/* =========================================================
   INITIALISATION
   ========================================================= */

console.log("🎁 Application démarrée");

// État global
let currentPerson = localStorage.getItem("selectedPerson") || "kevin";
let currentSort = localStorage.getItem("sort") || "default";
let currentCategory = localStorage.getItem("category") || "Tous";
let adminMode = false;
let pendingUrl = null;
let modalTriggerElement = null;


/* =========================================================
   FLOCONS
   ========================================================= */

const snow = document.getElementById("snow");
const snowflakeCount = 35;

if (snow) {
    for (let i = 0; i < snowflakeCount; i++) {
        const flake = document.createElement("span");
        flake.classList.add("snowflake");
        flake.textContent = "❄";
        flake.style.left = `${Math.random() * 100}%`;
        flake.style.fontSize = `${6 + Math.random() * 12}px`;
        flake.style.opacity = `${0.15 + Math.random() * 0.3}`;
        flake.style.animationDuration = `${10 + Math.random() * 15}s`;
        flake.style.animationDelay = `${Math.random() * -25}s`;
        snow.appendChild(flake);
    }
    console.log("❄️ Flocons créés.");
}


/* =========================================================
   ÉLÉMENTS DOM
   ========================================================= */

const wishlistContainer = document.getElementById("wishlist");
const categoryFilters = document.getElementById("category-filters");
const personSelector = document.getElementById("person-selector");
const resultCounter = document.getElementById("result-counter");
const adminToggle = document.getElementById("admin-toggle");
const addWishBtn = document.getElementById("add-wish-btn");

// Modals
const depModal = document.getElementById("dependency-modal");
const depModalClose = document.getElementById("modal-close");
const depModalCancel = document.getElementById("modal-cancel");
const depModalConfirm = document.getElementById("modal-confirm");
const dependencyList = document.getElementById("dependency-list");

const addModal = document.getElementById("add-modal");
const addModalClose = document.getElementById("add-modal-close");
const addForm = document.getElementById("add-form");
const addCancel = document.getElementById("add-cancel");


/* =========================================================
   DONNÉES — Accès avec modifications locales
   ========================================================= */

// Copie profonde des wishes initiaux pour permettre ajout/suppression
let localWishes = JSON.parse(JSON.stringify(wishesByPerson));

function getWishes() {
    return localWishes[currentPerson] || [];
}

function saveLocalWishes() {
    try {
        localStorage.setItem("localWishes", JSON.stringify(localWishes));
    } catch (e) {
        console.warn("⚠️ Impossible de sauvegarder dans localStorage:", e);
    }
}

// Charger les modifications locales au démarrage
try {
    const saved = localStorage.getItem("localWishes");
    if (saved) {
        const parsed = JSON.parse(saved);
        // Fusionner : garder les clés existantes + ajouter les nouvelles
        for (const key of Object.keys(parsed)) {
            if (localWishes[key]) {
                // Fusionner : ajouter les wishes locaux qui ne sont pas dans les originaux
                const originalIds = new Set(wishesByPerson[key].map(w => w.id));
                const extraWishes = parsed[key].filter(w => !originalIds.has(w.id));
                localWishes[key] = [...wishesByPerson[key], ...extraWishes];
            } else {
                localWishes[key] = parsed[key];
            }
        }
    }
} catch (e) {
    console.warn("⚠️ Erreur chargement localStorage:", e);
}


/* =========================================================
   SÉLECTEUR DE PERSONNE
   ========================================================= */

function createPersonSelector() {
    if (!personSelector) return;
    personSelector.innerHTML = "";

    people.forEach(person => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.classList.add("person-tab");
        btn.dataset.person = person.id;

        if (person.id === currentPerson) {
            btn.classList.add("active");
        }

        // Emoji
        const emoji = document.createElement("span");
        emoji.classList.add("person-emoji");
        emoji.textContent = person.emoji;

        // Nom
        const name = document.createElement("span");
        name.classList.add("person-name");
        name.textContent = person.name;

        // Badge nombre
        const badge = document.createElement("span");
        badge.classList.add("badge");
        const count = (localWishes[person.id] || []).length;
        badge.textContent = count;

        btn.appendChild(emoji);
        btn.appendChild(name);
        btn.appendChild(badge);

        btn.addEventListener("click", function () {
            currentPerson = person.id;
            localStorage.setItem("selectedPerson", person.id);
            currentCategory = "Tous";
            localStorage.setItem("category", "Tous");
            createPersonSelector();
            createCategoryFilters();
            displayWishes();
        });

        personSelector.appendChild(btn);
    });
}


/* =========================================================
   FILTRES DE CATÉGORIES
   ========================================================= */

function createCategoryFilters() {
    if (!categoryFilters) return;

    // Supprimer les anciens boutons catégorie (pas le bouton tri)
    const existingButtons = categoryFilters.querySelectorAll('.category-button:not(#sort-button)');
    existingButtons.forEach(btn => btn.remove());

    // Catégories dynamiques
    const wishes = getWishes();
    const categories = [
        "Tous",
        ...new Set(
            wishes
                .map(w => w.category)
                .filter(c => c)
        )
    ];

    const categoryIcons = {
        "Tous": "🎁",
        "Mode": "👕",
        "Sport": "🏋️",
        "Loisir": "🎮",
        "Maison": "🏠",
        "Beauté": "💄",
        "Cuisine": "🍳"
    };

    categories.forEach(category => {
        const button = document.createElement("button");
        button.type = "button";
        button.classList.add("category-button");

        if (category === currentCategory) {
            button.classList.add("active");
        }

        const icon = document.createElement("span");
        icon.classList.add("category-icon");
        icon.textContent = categoryIcons[category] || "🎁";

        const name = document.createElement("span");
        name.textContent = category;

        button.appendChild(icon);
        button.appendChild(name);

        button.setAttribute("aria-label", "Filtrer par " + category);
        button.addEventListener("click", function () {
            categoryFilters
                .querySelectorAll(".category-button")
                .forEach(btn => btn.classList.remove("active"));

            button.classList.add("active");
            currentCategory = category;
            localStorage.setItem("category", category);
            displayWishes();
        });

        categoryFilters.appendChild(button);
    });
}


/* =========================================================
   AFFICHAGE DES SOUHAITS
   ========================================================= */

function displayWishes() {
    if (!wishlistContainer) return;

    wishlistContainer.innerHTML = "";

    const wishes = getWishes();
    const person = people.find(p => p.id === currentPerson);

    // Filtrage
    const filteredWishes = currentCategory === "Tous"
        ? wishes
        : wishes.filter(w => w.category === currentCategory);

    // Tri
    let sortedWishes = [...filteredWishes];
    if (currentSort === "price-asc") {
        sortedWishes.sort((a, b) => a.price - b.price);
    } else if (currentSort === "price-desc") {
        sortedWishes.sort((a, b) => b.price - a.price);
    }

    // Compteur
    if (resultCounter) {
        const count = sortedWishes.length;
        const total = wishes.length;
        if (count === total) {
            resultCounter.textContent = `${count} cadeau${count > 1 ? "x" : ""}`;
        } else {
            resultCounter.textContent = `${count} sur ${total} cadeau${total > 1 ? "x" : ""}`;
        }
    }

    // Empty state
    if (sortedWishes.length === 0) {
        const empty = document.createElement("div");
        empty.classList.add("empty-state");
        empty.innerHTML = `
            <div class="empty-icon">📭</div>
            <p>Aucun cadeau dans cette catégorie</p>
        `;
        wishlistContainer.appendChild(empty);
        return;
    }

    // Génération des cartes
    sortedWishes.forEach((wish, index) => {
        const card = document.createElement("article");
        card.classList.add("wish-card");
        card.style.animationDelay = `${Math.min(index * 0.04, 0.5)}s`;

        // Badge catégorie
        const badge = document.createElement("span");
        badge.classList.add("category-badge");
        badge.textContent = wish.category;

        // Image wrapper
        const imageWrapper = document.createElement("div");
        imageWrapper.classList.add("image-wrapper");

        const image = document.createElement("img");
        image.src = wish.image;
        image.alt = wish.name;
        image.loading = "lazy";

        // Fallback image
        image.onerror = function () {
            this.onerror = null;
            this.src = 'data:image/svg+xml,' + encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">' +
                '<rect width="400" height="300" fill="#f3f1ed"/>' +
                '<text x="200" y="140" text-anchor="middle" font-size="48" fill="#9ca3af">🎁</text>' +
                '<text x="200" y="180" text-anchor="middle" font-size="14" fill="#9ca3af">Image non disponible</text>' +
                '</svg>'
            );
            this.alt = wish.name + " — Image non disponible";
        };

        imageWrapper.appendChild(image);

        // Contenu
        const content = document.createElement("div");
        content.classList.add("wish-content");

        const title = document.createElement("h2");
        title.textContent = wish.name;

        const price = document.createElement("p");
        price.classList.add("wish-price");
        price.textContent = `${wish.price.toFixed(2)} €`;

        // Bouton produit
        const link = document.createElement("a");
        link.href = wish.url;
        link.textContent = "Voir le produit";
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        // Clic avec dépendances
        link.addEventListener("click", function (event) {
            if (!wish.requiredWishes || wish.requiredWishes.length === 0) {
                return;
            }
            event.preventDefault();
            pendingUrl = wish.url;
            showDependencyModal(wish);
        });

        content.appendChild(title);
        content.appendChild(price);
        content.appendChild(link);

        // Assemblage
        card.appendChild(badge);
        card.appendChild(imageWrapper);
        card.appendChild(content);

        // Bouton supprimer (admin)
        if (adminMode) {
            const deleteBtn = document.createElement("button");
            deleteBtn.classList.add("btn-delete");
            deleteBtn.type = "button";
            deleteBtn.setAttribute("aria-label", "Supprimer " + wish.name);
            deleteBtn.title = "Supprimer";
            deleteBtn.textContent = "×";
            deleteBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                if (confirm(`Supprimer "${wish.name}" ?`)) {
                    deleteWish(wish.id);
                }
            });
            card.appendChild(deleteBtn);
        }

        wishlistContainer.appendChild(card);
    });
}


/* =========================================================
   MODALE DÉPENDANCE
   ========================================================= */

function showDependencyModal(wish) {
    if (!depModal) return;

    modalTriggerElement = document.activeElement;
    dependencyList.innerHTML = "";

    wish.requiredWishes.forEach(id => {
        const required = getWishes().find(w => w.id === id);
        if (!required) return;

        const item = document.createElement("div");
        item.classList.add("dependency-item");
        item.innerHTML = `<span class="dependency-icon">🎁</span><span>${required.name}</span>`;
        dependencyList.appendChild(item);
    });

    depModal.classList.add("active");
    depModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    const firstFocusable = depModal.querySelector("button:not(.modal-close)");
    if (firstFocusable) firstFocusable.focus();
}

function closeDepModal() {
    if (!depModal) return;
    depModal.classList.remove("active");
    depModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    pendingUrl = null;
    if (modalTriggerElement && typeof modalTriggerElement.focus === "function") {
        modalTriggerElement.focus();
    }
    modalTriggerElement = null;
}

if (depModalClose) depModalClose.addEventListener("click", closeDepModal);
if (depModalCancel) depModalCancel.addEventListener("click", closeDepModal);
if (depModalConfirm) {
    depModalConfirm.addEventListener("click", function () {
        if (pendingUrl) {
            window.open(pendingUrl, "_blank", "noopener,noreferrer");
            closeDepModal();
        }
    });
}
if (depModal) {
    depModal.addEventListener("click", function (e) {
        if (e.target === depModal) closeDepModal();
    });
}


/* =========================================================
   MODALE AJOUT
   ========================================================= */

function openAddModal() {
    if (!addModal) return;
    addModal.classList.add("active");
    addModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    document.getElementById("add-name").focus();
}

function closeAddModal() {
    if (!addModal) return;
    addModal.classList.remove("active");
    addModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (addForm) addForm.reset();
}

if (addModalClose) addModalClose.addEventListener("click", closeAddModal);
if (addCancel) addCancel.addEventListener("click", closeAddModal);
if (addModal) {
    addModal.addEventListener("click", function (e) {
        if (e.target === addModal) closeAddModal();
    });
}


/* =========================================================
   GESTION DES SOUHAITS (ajout/suppression)
   ========================================================= */

function deleteWish(id) {
    if (!localWishes[currentPerson]) return;
    localWishes[currentPerson] = localWishes[currentPerson].filter(w => w.id !== id);
    saveLocalWishes();
    createPersonSelector();
    createCategoryFilters();
    displayWishes();
}

function addWish(data) {
    if (!localWishes[currentPerson]) {
        localWishes[currentPerson] = [];
    }

    // Trouver le prochain ID
    const allIds = Object.values(localWishes).flat().map(w => w.id);
    const nextId = Math.max(...allIds, 0) + 1;

    const newWish = {
        id: nextId,
        name: data.name,
        category: data.category,
        image: data.image || "",
        price: parseFloat(data.price),
        url: data.url,
        requiredWishes: null
    };

    localWishes[currentPerson].push(newWish);
    saveLocalWishes();
    createPersonSelector();
    createCategoryFilters();
    displayWishes();
    closeAddModal();
}

// Formulaire d'ajout
if (addForm) {
    addForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const data = {
            name: document.getElementById("add-name").value.trim(),
            category: document.getElementById("add-category").value,
            price: document.getElementById("add-price").value,
            image: document.getElementById("add-image").value.trim(),
            url: document.getElementById("add-url").value.trim()
        };
        if (!data.name || !data.price || !data.url) return;
        addWish(data);
    });
}


/* =========================================================
   MODE ADMIN
   ========================================================= */

if (adminToggle) {
    adminToggle.addEventListener("click", function () {
        adminMode = !adminMode;
        document.body.classList.toggle("admin-mode", adminMode);
        adminToggle.textContent = adminMode ? "✕ Quitter" : "✎ Admin";
        displayWishes();
    });
}

if (addWishBtn) {
    addWishBtn.addEventListener("click", openAddModal);
}


/* =========================================================
   BOUTON TRI
   ========================================================= */

(function initSort() {
    const sortButton = document.getElementById("sort-button");
    if (!sortButton) return;

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

    sortButton.textContent = sortLabels[currentSort] || sortLabels["default"];
    sortButton.setAttribute("aria-pressed", currentSort !== "default" ? "true" : "false");
    sortButton.setAttribute("aria-label", sortAriaLabels[currentSort] || sortAriaLabels["default"]);

    sortButton.addEventListener("click", function () {
        const idx = sortOptions.indexOf(currentSort);
        currentSort = sortOptions[(idx + 1) % sortOptions.length];
        localStorage.setItem("sort", currentSort);
        sortButton.textContent = sortLabels[currentSort];
        sortButton.setAttribute("aria-pressed", currentSort !== "default" ? "true" : "false");
        sortButton.setAttribute("aria-label", sortAriaLabels[currentSort]);
        displayWishes();
    });
})();


/* =========================================================
   BOUTON RETOUR EN HAUT
   ========================================================= */

const backToTop = document.getElementById("back-to-top");

if (backToTop) {
    window.addEventListener("scroll", function () {
        backToTop.classList.toggle("visible", window.scrollY > 400);
    });

    backToTop.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}


/* =========================================================
   TOUCHE ÉCHAP — fermer les modals
   ========================================================= */

document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;

    if (addModal && addModal.classList.contains("active")) {
        closeAddModal();
    } else if (depModal && depModal.classList.contains("active")) {
        closeDepModal();
    }
});


/* =========================================================
   LANCEMENT
   ========================================================= */

createPersonSelector();
createCategoryFilters();
displayWishes();

console.log(`🎁 ${people.length} personne(s), ${Object.values(localWishes).flat().length} cadeau(x) au total`);
