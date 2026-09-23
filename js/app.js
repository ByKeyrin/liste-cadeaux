/* =========================================================
   🎁 Liste de cadeaux — logique principale
   Refactor ROTOR :
   - IIFE ("use strict") : plus aucune fuite de globals
   - Persistance v2 (ajouts + suppressions explicites)
   - Préférences validées (personne / catégorie / tri)
   - Modals accessibles (focus piégé, retour du focus)
   - Rendu factorisé via refresh()
   ========================================================= */
(() => {
    "use strict";

    /* =========================================================
       CONFIGURATION
       ========================================================= */

    const STORAGE_KEYS = {
        prefs: "wishlist.prefs",
        state: "wishlist.state",
        // Anciennes clés (migration vers le schéma v2)
        legacyWishes: "localWishes",
        legacyPerson: "selectedPerson",
        legacySort: "sort",
        legacyCategory: "category"
    };

    const SORT_OPTIONS = ["default", "price-asc", "price-desc"];
    const SORT_LABELS = {
        "default": "🔽 Trier par",
        "price-asc": "💰 Prix ↑",
        "price-desc": "💎 Prix ↓"
    };
    const SORT_ARIA_LABELS = {
        "default": "Trier par prix",
        "price-asc": "Trier par prix croissant",
        "price-desc": "Trier par prix décroissant"
    };

    const CATEGORY_ICONS = {
        "Tous": "🎁",
        "Mode": "👕",
        "Sport": "🏋️",
        "Loisir": "🎮",
        "Maison": "🏠",
        "Beauté": "💄",
        "Cuisine": "🍳"
    };

    const DEFAULT_CATEGORY = "Tous";
    const DEFAULT_PERSON = people.length ? people[0].id : "kevin";

    /* =========================================================
       STOCKAGE — tolérant aux erreurs
       (localStorage peut être indisponible : quota, navigation
       privée, fichiers locaux restreints…)
       ========================================================= */

    const storage = {
        get(key) {
            try {
                return window.localStorage.getItem(key);
            } catch {
                return null;
            }
        },
        set(key, value) {
            try {
                window.localStorage.setItem(key, value);
            } catch (error) {
                console.warn("⚠️ Impossible de sauvegarder dans localStorage:", error);
            }
        },
        remove(key) {
            try {
                window.localStorage.removeItem(key);
            } catch {
                // indisponible : on ignore silencieusement
            }
        }
    };

    /* =========================================================
       ÉTAT DE L'UI + PRÉFÉRENCES (validées)
       ========================================================= */

    function loadPrefs() {
        const raw = storage.get(STORAGE_KEYS.prefs);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === "object") {
                    return parsed;
                }
            } catch (error) {
                console.warn("⚠️ Préférences illisibles, réinitialisation:", error);
            }
        }
        // Migration des anciennes clés individuelles
        return {
            personId: storage.get(STORAGE_KEYS.legacyPerson),
            sort: storage.get(STORAGE_KEYS.legacySort),
            category: storage.get(STORAGE_KEYS.legacyCategory)
        };
    }

    const prefs = loadPrefs();

    const state = {
        personId: typeof prefs.personId === "string" ? prefs.personId : DEFAULT_PERSON,
        sort: SORT_OPTIONS.includes(prefs.sort) ? prefs.sort : "default",
        category: typeof prefs.category === "string" ? prefs.category : DEFAULT_CATEGORY,
        adminMode: false,
        pendingUrl: null
    };

    // Une personne obsolète dans le localStorage ne doit pas vider la page
    if (!people.some(person => person.id === state.personId)) {
        state.personId = DEFAULT_PERSON;
    }

    function savePrefs() {
        storage.set(STORAGE_KEYS.prefs, JSON.stringify({
            personId: state.personId,
            sort: state.sort,
            category: state.category
        }));
    }

    /* =========================================================
       PERSISTANCE DES MODIFICATIONS — schéma v2
       { version: 2, added: {personId: [wish]}, deleted: {personId: [id]}, lastId }

       Les suppressions sont stockées explicitement : auparavant, les
       cadeaux supprimés réapparaissaient au rechargement car la fusion
       remettait systématiquement les données d'origine.
       ========================================================= */

    function createEmptyPersist() {
        return { version: 2, added: {}, deleted: {}, lastId: 0 };
    }

    function migrateLegacyWishes(target) {
        const raw = storage.get(STORAGE_KEYS.legacyWishes);
        if (!raw) return;
        try {
            const legacy = JSON.parse(raw);
            Object.keys(legacy || {}).forEach(personId => {
                const base = wishesByPerson[personId] || [];
                const baseIds = new Set(base.map(wish => wish.id));
                const savedList = Array.isArray(legacy[personId]) ? legacy[personId] : [];
                const savedIds = new Set(savedList.map(wish => wish.id));
                // Ajouts locaux = ids inconnus du fichier de données
                target.added[personId] = savedList.filter(wish => !baseIds.has(wish.id));
                // Suppressions locales = ids du fichier de données absents de la sauvegarde
                target.deleted[personId] = base
                    .filter(wish => !savedIds.has(wish.id))
                    .map(wish => wish.id);
            });
            console.log("♻️ Anciennes données migrées vers le schéma v2.");
        } catch (error) {
            console.warn("⚠️ Anciennes données illisibles, ignorées:", error);
        }
    }

    function loadPersist() {
        const raw = storage.get(STORAGE_KEYS.state);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.version === 2) {
                    return {
                        version: 2,
                        added: parsed.added && typeof parsed.added === "object" ? parsed.added : {},
                        deleted: parsed.deleted && typeof parsed.deleted === "object" ? parsed.deleted : {},
                        lastId: Number.isFinite(parsed.lastId) ? parsed.lastId : 0
                    };
                }
            } catch (error) {
                console.warn("⚠️ État local illisible, réinitialisation:", error);
            }
        }
        const fresh = createEmptyPersist();
        migrateLegacyWishes(fresh);
        return fresh;
    }

    const persist = loadPersist();

    function savePersist() {
        storage.set(STORAGE_KEYS.state, JSON.stringify(persist));
    }

    // Compteur d'IDs global et monotone : un ID supprimé n'est
    // jamais réutilisé (évite les collisions avec les dépendances).
    function initIdCounter() {
        let max = Number.isFinite(persist.lastId) ? persist.lastId : 0;
        Object.keys(wishesByPerson).forEach(personId => {
            const ids = [
                ...(wishesByPerson[personId] || []).map(wish => wish.id),
                ...(persist.added[personId] || []).map(wish => wish.id)
            ];
            ids.forEach(id => {
                if (Number.isFinite(id) && id > max) max = id;
            });
        });
        persist.lastId = max;
    }

    function nextWishId() {
        persist.lastId = (persist.lastId || 0) + 1;
        return persist.lastId;
    }

    /* =========================================================
       ACCÈS AUX DONNÉES
       ========================================================= */

    // Liste effective = base (data/wishes.js) + ajouts locaux − suppressions
    function getWishes(personId = state.personId) {
        const base = wishesByPerson[personId] || [];
        const added = persist.added[personId] || [];
        const deleted = new Set(persist.deleted[personId] || []);
        return base.concat(added).filter(wish => !deleted.has(wish.id));
    }

    function findWish(id, personId = state.personId) {
        return getWishes(personId).find(wish => wish.id === id) || null;
    }

    // Dépendances résolues : les IDs obsolètes/supprimés sont ignorés,
    // une modale vide n'a aucun sens.
    function getDependencies(wish) {
        if (!wish || !Array.isArray(wish.requiredWishes)) return [];
        return wish.requiredWishes
            .map(id => findWish(id))
            .filter(Boolean);
    }

    function formatPrice(value) {
        const price = Number(value);
        return `${(Number.isFinite(price) ? price : 0).toFixed(2)} €`;
    }

    function giftLabel(count) {
        return `${count} cadeau${count === 1 ? "" : "x"}`;
    }

    /* =========================================================
       FLOCONS
       ========================================================= */

    function initSnowfall() {
        const snow = document.getElementById("snow");
        if (!snow) return;
        const snowflakeCount = 35;
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
    const sortButton = document.getElementById("sort-button");
    const backToTop = document.getElementById("back-to-top");

    // Modale dépendance
    const depModal = document.getElementById("dependency-modal");
    const depModalClose = document.getElementById("modal-close");
    const depModalCancel = document.getElementById("modal-cancel");
    const depModalConfirm = document.getElementById("modal-confirm");
    const dependencyList = document.getElementById("dependency-list");

    // Modale ajout
    const addModal = document.getElementById("add-modal");
    const addModalClose = document.getElementById("add-modal-close");
    const addForm = document.getElementById("add-form");
    const addCancel = document.getElementById("add-cancel");

    /* =========================================================
       MODALES — ouverture/fermeture génériques + accessibilité
       ========================================================= */

    let modalTriggerElement = null;
    let openModalElement = null;

    function getFocusable(container) {
        return Array.from(container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )).filter(element => !element.disabled && element.offsetParent !== null);
    }

    function openModal(modal, trigger) {
        if (!modal) return;
        modalTriggerElement = trigger || document.activeElement;
        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        openModalElement = modal;
        const focusable = getFocusable(modal);
        if (focusable.length) focusable[0].focus();
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        if (openModalElement === modal) openModalElement = null;
        state.pendingUrl = null;
        if (modalTriggerElement && typeof modalTriggerElement.focus === "function") {
            modalTriggerElement.focus();
        }
        modalTriggerElement = null;
    }

    // Piège à focus : Tab reste à l'intérieur de la modale ouverte
    function trapFocus(event) {
        if (event.key !== "Tab" || !openModalElement) return;
        const focusable = getFocusable(openModalElement);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    /* =========================================================
       MODALE DÉPENDANCE
       ========================================================= */

    function showDependencyModal(wish, trigger) {
        if (!depModal || !dependencyList) return;

        dependencyList.innerHTML = "";
        getDependencies(wish).forEach(required => {
            const item = document.createElement("div");
            item.classList.add("dependency-item");

            const icon = document.createElement("span");
            icon.classList.add("dependency-icon");
            icon.textContent = "🎁";

            const label = document.createElement("span");
            // textContent : les noms peuvent venir du formulaire admin
            label.textContent = required.name;

            item.appendChild(icon);
            item.appendChild(label);
            dependencyList.appendChild(item);
        });

        openModal(depModal, trigger);
    }

    if (depModalClose) depModalClose.addEventListener("click", () => closeModal(depModal));
    if (depModalCancel) depModalCancel.addEventListener("click", () => closeModal(depModal));
    if (depModalConfirm) {
        depModalConfirm.addEventListener("click", function () {
            const url = state.pendingUrl;
            closeModal(depModal);
            if (url) {
                window.open(url, "_blank", "noopener,noreferrer");
            }
        });
    }
    if (depModal) {
        depModal.addEventListener("click", event => {
            if (event.target === depModal) closeModal(depModal);
        });
    }

    /* =========================================================
       MODALE AJOUT
       ========================================================= */

    function openAddModal(trigger) {
        if (!addModal) return;
        const priceInput = document.getElementById("add-price");
        if (priceInput) priceInput.setCustomValidity("");
        openModal(addModal, trigger);
        const nameInput = document.getElementById("add-name");
        if (nameInput) nameInput.focus();
    }

    function closeAddModal() {
        if (!addModal) return;
        closeModal(addModal);
        if (addForm) addForm.reset();
    }

    if (addModalClose) addModalClose.addEventListener("click", closeAddModal);
    if (addCancel) addCancel.addEventListener("click", closeAddModal);
    if (addModal) {
        addModal.addEventListener("click", event => {
            if (event.target === addModal) closeAddModal();
        });
    }

    /* =========================================================
       SÉLECTEUR DE PERSONNE
       ========================================================= */

    function renderPersonTabs() {
        if (!personSelector) return;
        personSelector.innerHTML = "";

        people.forEach(person => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.classList.add("person-tab");
            btn.dataset.person = person.id;
            btn.setAttribute("aria-pressed", String(person.id === state.personId));

            if (person.id === state.personId) {
                btn.classList.add("active");
            }

            const emoji = document.createElement("span");
            emoji.classList.add("person-emoji");
            emoji.textContent = person.emoji;

            const name = document.createElement("span");
            name.classList.add("person-name");
            name.textContent = person.name;

            const badge = document.createElement("span");
            badge.classList.add("badge");
            badge.textContent = getWishes(person.id).length;

            btn.appendChild(emoji);
            btn.appendChild(name);
            btn.appendChild(badge);

            btn.addEventListener("click", function () {
                if (state.personId === person.id) return;
                state.personId = person.id;
                // Chaque personne a ses propres catégories : on repart de "Tous"
                state.category = DEFAULT_CATEGORY;
                savePrefs();
                refresh();
            });

            personSelector.appendChild(btn);
        });
    }

    /* =========================================================
       FILTRES DE CATÉGORIES
       ========================================================= */

    function renderCategoryFilters() {
        if (!categoryFilters) return;

        // Retirer les anciens boutons catégorie (le bouton tri reste en place)
        categoryFilters
            .querySelectorAll(".category-button:not(#sort-button)")
            .forEach(button => button.remove());

        const wishes = getWishes();
        const categories = [
            DEFAULT_CATEGORY,
            ...new Set(wishes.map(wish => wish.category).filter(Boolean))
        ];

        // Catégorie mémorisée devenue inexistante (données changées…)
        if (!categories.includes(state.category)) {
            state.category = DEFAULT_CATEGORY;
            savePrefs();
        }

        categories.forEach(category => {
            const button = document.createElement("button");
            button.type = "button";
            button.classList.add("category-button");
            button.setAttribute("aria-label", "Filtrer par " + category);
            button.setAttribute("aria-pressed", String(category === state.category));

            if (category === state.category) {
                button.classList.add("active");
            }

            const icon = document.createElement("span");
            icon.classList.add("category-icon");
            icon.textContent = CATEGORY_ICONS[category] || "🎁";

            const name = document.createElement("span");
            name.textContent = category;

            button.appendChild(icon);
            button.appendChild(name);

            button.addEventListener("click", function () {
                if (state.category === category) return;
                state.category = category;
                savePrefs();
                // Ne pas toucher au bouton tri (#sort-button porte aussi .category-button)
                categoryFilters
                    .querySelectorAll(".category-button:not(#sort-button)")
                    .forEach(btn => {
                        btn.classList.remove("active");
                        btn.setAttribute("aria-pressed", "false");
                    });
                button.classList.add("active");
                button.setAttribute("aria-pressed", "true");
                renderWishes();
            });

            categoryFilters.appendChild(button);
        });
    }

    /* =========================================================
       BOUTON TRI
       ========================================================= */

    function updateSortButton() {
        if (!sortButton) return;
        sortButton.textContent = SORT_LABELS[state.sort] || SORT_LABELS["default"];
        sortButton.setAttribute("aria-pressed", state.sort !== "default" ? "true" : "false");
        sortButton.setAttribute(
            "aria-label",
            SORT_ARIA_LABELS[state.sort] || SORT_ARIA_LABELS["default"]
        );
    }

    function initSort() {
        if (!sortButton) return;
        updateSortButton();

        sortButton.addEventListener("click", function () {
            const idx = SORT_OPTIONS.indexOf(state.sort);
            state.sort = SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length];
            savePrefs();
            updateSortButton();
            renderWishes();
        });
    }

    // Tri prix, avec départage alphabétique stable pour les prix égaux
    function sortWishes(list) {
        const sorted = [...list];
        if (state.sort === "price-asc") {
            sorted.sort((a, b) =>
                (Number(a.price) || 0) - (Number(b.price) || 0) ||
                String(a.name).localeCompare(String(b.name), "fr")
            );
        } else if (state.sort === "price-desc") {
            sorted.sort((a, b) =>
                (Number(b.price) || 0) - (Number(a.price) || 0) ||
                String(a.name).localeCompare(String(b.name), "fr")
            );
        }
        return sorted;
    }

    /* =========================================================
       AFFICHAGE DES SOUHAITS
       ========================================================= */

    function createImage(wish) {
        const image = document.createElement("img");
        image.src = wish.image || "";
        image.alt = wish.name;
        image.loading = "lazy";

        // Image de repli si l'URL casse
        image.onerror = function () {
            this.onerror = null;
            this.src = "data:image/svg+xml," + encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">' +
                '<rect width="400" height="300" fill="#f3f1ed"/>' +
                '<text x="200" y="140" text-anchor="middle" font-size="48" fill="#9ca3af">🎁</text>' +
                '<text x="200" y="180" text-anchor="middle" font-size="14" fill="#9ca3af">Image non disponible</text>' +
                "</svg>"
            );
            this.alt = wish.name + " — Image non disponible";
        };
        return image;
    }

    function createWishCard(wish, index) {
        const card = document.createElement("article");
        card.classList.add("wish-card");
        card.style.animationDelay = `${Math.min(index * 0.04, 0.5)}s`;

        const badge = document.createElement("span");
        badge.classList.add("category-badge");
        badge.textContent = wish.category;

        const imageWrapper = document.createElement("div");
        imageWrapper.classList.add("image-wrapper");
        imageWrapper.appendChild(createImage(wish));

        const content = document.createElement("div");
        content.classList.add("wish-content");

        const title = document.createElement("h2");
        title.textContent = wish.name;

        const price = document.createElement("p");
        price.classList.add("wish-price");
        price.textContent = formatPrice(wish.price);

        const link = document.createElement("a");
        link.href = wish.url;
        link.textContent = "Voir le produit";
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        // Clic : avertir des dépendances avant d'ouvrir le lien
        link.addEventListener("click", function (event) {
            // IDs obsolètes ou supprimés → plus de dépendance réelle
            if (getDependencies(wish).length === 0) return;
            event.preventDefault();
            state.pendingUrl = wish.url;
            showDependencyModal(wish, link);
        });

        content.appendChild(title);
        content.appendChild(price);
        content.appendChild(link);

        card.appendChild(badge);
        card.appendChild(imageWrapper);
        card.appendChild(content);

        if (state.adminMode) {
            const deleteBtn = document.createElement("button");
            deleteBtn.classList.add("btn-delete");
            deleteBtn.type = "button";
            deleteBtn.setAttribute("aria-label", "Supprimer " + wish.name);
            deleteBtn.title = "Supprimer";
            deleteBtn.textContent = "×";
            deleteBtn.addEventListener("click", function (event) {
                event.stopPropagation();
                if (window.confirm(`Supprimer « ${wish.name} » ?`)) {
                    deleteWish(wish.id);
                }
            });
            card.appendChild(deleteBtn);
        }

        return card;
    }

    function renderWishes() {
        if (!wishlistContainer) return;
        wishlistContainer.innerHTML = "";

        const wishes = getWishes();
        const filteredWishes = state.category === DEFAULT_CATEGORY
            ? wishes
            : wishes.filter(wish => wish.category === state.category);
        const sortedWishes = sortWishes(filteredWishes);

        // Compteur de résultats
        if (resultCounter) {
            const count = sortedWishes.length;
            const total = wishes.length;
            resultCounter.textContent = count === total
                ? giftLabel(count)
                : `${count} sur ${giftLabel(total)}`;
        }

        // État vide
        if (sortedWishes.length === 0) {
            const empty = document.createElement("div");
            empty.classList.add("empty-state");

            const icon = document.createElement("div");
            icon.classList.add("empty-icon");
            icon.textContent = "📭";

            const message = document.createElement("p");
            message.textContent = "Aucun cadeau dans cette catégorie";

            empty.appendChild(icon);
            empty.appendChild(message);
            wishlistContainer.appendChild(empty);
            return;
        }

        const fragment = document.createDocumentFragment();
        sortedWishes.forEach((wish, index) => {
            fragment.appendChild(createWishCard(wish, index));
        });
        wishlistContainer.appendChild(fragment);
    }

    /* =========================================================
       GESTION DES SOUHAITS (ajout / suppression)
       ========================================================= */

    function deleteWish(id) {
        const exists = getWishes().some(wish => wish.id === id);
        if (!exists) return;

        // Retirer d'éventuels ajouts locaux portant cet ID
        if (persist.added[state.personId]) {
            persist.added[state.personId] =
                persist.added[state.personId].filter(wish => wish.id !== id);
        }

        // Sinon, marquer la suppression d'un cadeau du fichier de données
        const stillExists = getWishes().some(wish => wish.id === id);
        if (stillExists) {
            const deleted = persist.deleted[state.personId] ||
                (persist.deleted[state.personId] = []);
            if (!deleted.includes(id)) deleted.push(id);
        }

        savePersist();
        refresh();
    }

    function addWish(data) {
        const price = Number(data.price);
        if (!data.name || !data.url || !Number.isFinite(price) || price < 0) {
            return false;
        }

        const personId = state.personId;
        if (!persist.added[personId]) persist.added[personId] = [];

        persist.added[personId].push({
            id: nextWishId(),
            name: data.name,
            category: data.category || "Autre",
            image: data.image || "",
            price: price,
            url: data.url,
            requiredWishes: null
        });

        savePersist();
        closeAddModal();
        refresh();
        return true;
    }

    if (addForm) {
        const priceInput = document.getElementById("add-price");
        if (priceInput) {
            // Effacer le message d'erreur dès que l'utilisateur corrige
            priceInput.addEventListener("input", () => priceInput.setCustomValidity(""));
        }

        addForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const data = {
                name: document.getElementById("add-name").value.trim(),
                category: document.getElementById("add-category").value,
                price: document.getElementById("add-price").value,
                image: document.getElementById("add-image").value.trim(),
                url: document.getElementById("add-url").value.trim()
            };

            const price = Number(data.price);
            if (!Number.isFinite(price) || price < 0) {
                if (priceInput) {
                    priceInput.setCustomValidity("Entrez un prix valide.");
                    priceInput.reportValidity();
                }
                return;
            }

            if (!addWish(data)) {
                addForm.reportValidity();
            }
        });
    }

    /* =========================================================
       MODE ADMIN
       ========================================================= */

    if (adminToggle) {
        adminToggle.setAttribute("aria-pressed", "false");
        adminToggle.addEventListener("click", function () {
            state.adminMode = !state.adminMode;
            document.body.classList.toggle("admin-mode", state.adminMode);
            adminToggle.textContent = state.adminMode ? "✕ Quitter" : "✎ Admin";
            adminToggle.setAttribute("aria-pressed", String(state.adminMode));
            renderWishes();
        });
    }

    if (addWishBtn) {
        addWishBtn.addEventListener("click", function () {
            openAddModal(addWishBtn);
        });
    }

    /* =========================================================
       BOUTON RETOUR EN HAUT
       ========================================================= */

    if (backToTop) {
        window.addEventListener("scroll", function () {
            backToTop.classList.toggle("visible", window.scrollY > 400);
        }, { passive: true });

        backToTop.addEventListener("click", function () {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    /* =========================================================
       CLAVIER — Échap ferme la modale active, Tab y reste piégé
       ========================================================= */

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            if (addModal && addModal.classList.contains("active")) {
                closeAddModal();
            } else if (depModal && depModal.classList.contains("active")) {
                closeModal(depModal);
            }
            return;
        }
        trapFocus(event);
    });

    /* =========================================================
       RENDU GLOBAL
       ========================================================= */

    function refresh() {
        renderPersonTabs();
        renderCategoryFilters();
        renderWishes();
    }

    /* =========================================================
       LANCEMENT
       ========================================================= */

    initSnowfall();
    initIdCounter();
    initSort();

    // refresh() valide aussi la catégorie mémorisée avant la sauvegarde
    refresh();

    // Normaliser l'état : migration effectuée, anciennes clés retirées
    savePersist();
    savePrefs();
    storage.remove(STORAGE_KEYS.legacyWishes);
    storage.remove(STORAGE_KEYS.legacyPerson);
    storage.remove(STORAGE_KEYS.legacySort);
    storage.remove(STORAGE_KEYS.legacyCategory);

    const totalWishes = people.reduce(
        (sum, person) => sum + getWishes(person.id).length,
        0
    );
    console.log(`🎁 ${people.length} personne(s), ${totalWishes} cadeau(x) au total`);
})();
