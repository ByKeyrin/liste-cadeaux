/**
 * @file app.js
 * @brief Logique principale de l'application liste de cadeaux
 * @author Kevin Leca
 * @version 2.0
 * @date 2026
 *
 * @brief Module principal de l'application "Ma Liste de Cadeaux".
 *
 * Ce fichier contient toute la logique côté client :
 * - Gestion du stockage local (localStorage) avec migration v2
 * - Interface utilisateur : onglets personne, filtres catégorie, tri prix
 * - Système de dépendances entre cadeaux (alerte avant achat)
 * - Modales accessibles (focus piégé, retour du focus)
 * - Mode admin : ajout / suppression de cadeaux
 * - Animation flocons
 *
 * Architecture : IIFE ("use strict") — aucune fuite de globals.
 * Données : chargées depuis data/wishes.js (variable globale `wishesByPerson`).
 */

(() => {
    "use strict";

    /* =========================================================
       CONFIGURATION
       ========================================================= */

    /**
     * @brief Clés de stockage localStorage utilisées par l'application
     * @const {Object} STORAGE_KEYS
     * @property {string} prefs - Clé pour les préférences utilisateur (personne, tri, catégorie)
     * @property {string} state - Clé pour l'état persistant v2 (ajouts, suppressions)
     * @property {string} legacyWishes - Ancienne clé des souhaits (migration v1 → v2)
     * @property {string} legacyPerson - Ancienne clé de la personne sélectionnée
     * @property {string} legacySort - Ancien critère de tri
     * @property {string} legacyCategory - Ancienne catégorie sélectionnée
     */
    const STORAGE_KEYS = {
        prefs: "wishlist.prefs",
        state: "wishlist.state",
        // Anciennes clés (migration vers le schéma v2)
        legacyWishes: "localWishes",
        legacyPerson: "selectedPerson",
        legacySort: "sort",
        legacyCategory: "category"
    };

    /**
     * @brief Options de tri disponibles pour la liste des cadeaux
     * @const {string[]} SORT_OPTIONS
     * @description Les libellés visuels sont portés par le `<select id="sort-select">` du HTML.
     *              Valeurs possibles : "default", "price-asc", "price-desc"
     */
    const SORT_OPTIONS = ["default", "price-asc", "price-desc"];

    /**
     * @brief Map des icônes emoji associées à chaque catégorie de cadeaux
     * @const {Object.<string, string>} CATEGORY_ICONS
     * @description Utilisé pour afficher l'emoji à côté du nom de la catégorie
     *              dans les boutons filtre et les badges de carte.
     */
    const CATEGORY_ICONS = {
        "Tous": "🎁",
        "Mode": "👕",
        "Sport": "🏋️",
        "Loisir": "🎮",
        "Maison": "🏠",
        "Beauté": "💄",
        "Cuisine": "🍳"
    };

    /**
     * @brief Catégorie par défaut affichée (toutes les catégories)
     * @const {string} DEFAULT_CATEGORY
     */
    const DEFAULT_CATEGORY = "Tous";

    /**
     * @brief ID de la personne sélectionnée par défaut au premier chargement
     * @const {string} DEFAULT_PERSON
     * @description Prend la première personne du tableau `people` si elle existe,
     *              sinon fallback sur "kevin".
     */
    const DEFAULT_PERSON = people.length ? people[0].id : "kevin";

    /* =========================================================
       STOCKAGE — tolérant aux erreurs
       (localStorage peut être indisponible : quota, navigation
       privée, fichiers locaux restreints…)
       ========================================================= */

    /**
     * @brief Wrapper tolérant aux erreurs autour de localStorage
     * @const {Object} storage
     * @description Enveloppe les appels à localStorage dans des try/catch
     *              pour gérer les cas où le stockage est indisponible
     *              (navigation privée, quota dépassé, etc.)
     */
    const storage = {
        /**
         * @brief Lit une valeur depuis localStorage
         * @function storage.get
         * @param {string} key - Clé à lire
         * @returns {string|null} La valeur stockée ou null si absente/erreur
         */
        get(key) {
            try {
                return window.localStorage.getItem(key);
            } catch {
                return null;
            }
        },
        /**
         * @brief Écrit une valeur dans localStorage
         * @function storage.set
         * @param {string} key - Clé à écrire
         * @param {string} value - Valeur à stocker (sera sérialisée en string)
         */
        set(key, value) {
            try {
                window.localStorage.setItem(key, value);
            } catch (error) {
                console.warn("⚠️ Impossible de sauvegarder dans localStorage:", error);
            }
        },
        /**
         * @brief Supprime une clé de localStorage
         * @function storage.remove
         * @param {string} key - Clé à supprimer
         */
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

    /**
     * @brief Charge les préférences utilisateur depuis le localStorage
     * @function loadPrefs
     * @returns {Object} Objet contenant les préférences (personId, sort, category)
     * @description Gère la migration des anciennes clés localStorage vers le schéma v2.
     *              Si le schéma v2 n'existe pas, tente de récupérer les anciennes
     *              clés individuelles (legacyPerson, legacySort, legacyCategory).
     */
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

    /**
     * @brief Préférences chargées depuis le stockage local
     * @const {Object} prefs
     */
    const prefs = loadPrefs();

    /**
     * @brief État réactif de l'interface utilisateur
     * @const {Object} state
     * @property {string} state.personId - ID de la personne actuellement sélectionnée
     * @property {string} state.sort - Critère de tri actif ("default", "price-asc", "price-desc")
     * @property {string} state.category - Catégorie de filtre active
     * @property {boolean} state.adminMode - Mode édition activé/désactivé
     * @property {string|null} state.pendingUrl - URL en attente de confirmation (modale dépendance)
     * @description Cet objet est la source de vérité pour l'ensemble de l'état UI.
     *              Toute modification déclenche un appel à `refresh()` ou `renderWishes()`.
     */
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

    /**
     * @brief Sauvegarde les préférences utilisateur dans le localStorage
     * @function savePrefs
     * @description Sérialise l'état actuel (personId, sort, category) en JSON
     *              et le stocke sous la clé `wishlist.prefs`.
     */
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

    /**
     * @brief Crée une structure de persistance vide (schéma v2)
     * @function createEmptyPersist
     * @returns {Object} Objet de persistance initialisé avec des structures vides
     * @description Structure : `{ version: 2, added: {}, deleted: {}, lastId: 0 }`
     */
    function createEmptyPersist() {
        return { version: 2, added: {}, deleted: {}, lastId: 0 };
    }

    /**
     * @brief Migre les anciennes données de souhaits (v1) vers le schéma v2
     * @function migrateLegacyWishes
     * @param {Object} target - Objet de persistance v2 à remplir
     * @description Compare les souhaits sauvegardés (v1) avec la base de données
     *              d'origine pour déduire les ajouts et suppressions explicites.
     *              Les ajouts = IDs inconnus du fichier de données.
     *              Les suppressions = IDs du fichier de données absents de la sauvegarde.
     */
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

    /**
     * @brief Charge l'état de persistance depuis le localStorage
     * @function loadPersist
     * @returns {Object} Objet de persistance v2 validé
     * @description Charge le schéma v2 depuis localStorage. Si absent ou invalide,
     *              crée une structure vide et tente la migration depuis les anciennes données.
     *              Valide chaque champ avec des garde-fous (type, existence).
     */
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

    /**
     * @brief Objet de persistance des modifications (ajouts/suppressions)
     * @const {Object} persist
     * @description Contient les ajouts et suppressions locales par personne.
     *              Modifié en place par `addWish()` et `deleteWish()`.
     */
    const persist = loadPersist();

    /**
     * @brief Sauvegarde l'état de persistance dans le localStorage
     * @function savePersist
     * @description Sérialise l'objet `persist` en JSON et le stocke sous la clé `wishlist.state`.
     */
    function savePersist() {
        storage.set(STORAGE_KEYS.state, JSON.stringify(persist));
    }

    /**
     * @brief Initialise le compteur d'IDs globaux à partir des données existantes
     * @function initIdCounter
     * @description Parcourt toutes les personnes et leurs souhaits (base + ajoutés)
     *              pour trouver le maximum d'ID existant. Cela garantit que les nouveaux
     *              IDs générés sont toujours supérieurs à tous les IDs existants.
     *              Un ID supprimé n'est jamais réutilisé (évite les collisions).
     */
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

    /**
     * @brief Génère le prochain ID unique pour un nouveau cadeau
     * @function nextWishId
     * @returns {number} L'ID suivant (monotone croissant)
     * @description Incrémente le compteur `persist.lastId` et retourne la nouvelle valeur.
     */
    function nextWishId() {
        persist.lastId = (persist.lastId || 0) + 1;
        return persist.lastId;
    }

    /* =========================================================
       ACCÈS AUX DONNÉES
       ========================================================= */

    /**
     * @brief Récupère la liste effective des souhaits pour une personne
     * @function getWishes
     * @param {string} [personId=state.personId] - ID de la personne cible
     * @returns {Array<Object>} Liste fusionnée : base (data/) + ajouts locaux − suppressions
     * @description La liste effective est calculée en temps réel en combinant :
     *              1. Les souhaits de base (fichier data/wishes.js)
     *              2. Les ajouts locaux (persist.added[personId])
     *              3. En soustrayant les suppressions (persist.deleted[personId])
     */
    function getWishes(personId = state.personId) {
        const base = wishesByPerson[personId] || [];
        const added = persist.added[personId] || [];
        const deleted = new Set(persist.deleted[personId] || []);
        return base.concat(added).filter(wish => !deleted.has(wish.id));
    }

    /**
     * @brief Recherche un cadeau par son ID
     * @function findWish
     * @param {number} id - ID du cadeau recherché
     * @param {string} [personId=state.personId] - ID de la personne cible
     * @returns {Object|null} Le cadeau trouvé ou null
     */
    function findWish(id, personId = state.personId) {
        return getWishes(personId).find(wish => wish.id === id) || null;
    }

    /**
     * @brief Résout les dépendances d'un cadeau
     * @function getDependencies
     * @param {Object} wish - Le cadeau dont on veut les dépendances
     * @returns {Array<Object>} Liste des cadeaux requis (existe toujours)
     * @description Les IDs obsolètes ou supprimés sont filtrés automatiquement.
     *              Une modale de dépendance ne s'affiche que si des dépendances réelles existent.
     */
    function getDependencies(wish) {
        if (!wish || !Array.isArray(wish.requiredWishes)) return [];
        return wish.requiredWishes
            .map(id => findWish(id))
            .filter(Boolean);
    }

    /**
     * @brief Formate un prix en euros avec 2 décimales
     * @function formatPrice
     * @param {number|string} value - Le prix à formater
     * @returns {string} Prix formaté (ex: "29,99 €")
     * @description Gère les valeurs non numériques en retournant "0,00 €".
     */
    function formatPrice(value) {
        const price = Number(value);
        return `${(Number.isFinite(price) ? price : 0).toFixed(2)} €`;
    }

    /**
     * @brief Génère un libellé de compteur de cadeaux (singulier/pluriel)
     * @function giftLabel
     * @param {number} count - Nombre de cadeaux
     * @returns {string} Libellé formaté (ex: "1 cadeau" ou "3 cadeaux")
     */
    function giftLabel(count) {
        return `${count} cadeau${count === 1 ? "" : "x"}`;
    }

    /* =========================================================
       FLOCONS
       ========================================================= */

    /**
     * @brief Initialise l'animation de flocons de neige
     * @function initSnowfall
     * @description Crée dynamiquement 35 éléments `<span class="snowflake">`
     *              dans le conteneur `#snow`. Chaque flocon a des propriétés
     *              aléatoires (position, taille, opacité, durée de chute)
     *              pour un effet naturel.
     */
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

    /**
     * @brief Conteneur principal de la grille des souhaits
     * @const {HTMLElement|null} wishlistContainer
     */
    const wishlistContainer = document.getElementById("wishlist");

    /**
     * @brief Conteneur des boutons de filtre par catégorie
     * @const {HTMLElement|null} categoryFilters
     */
    const categoryFilters = document.getElementById("category-filters");

    /**
     * @brief Conteneur des onglets de sélection de personne
     * @const {HTMLElement|null} personSelector
     */
    const personSelector = document.getElementById("person-selector");

    /**
     * @brief Élément affichant le compteur de résultats
     * @const {HTMLElement|null} resultCounter
     */
    const resultCounter = document.getElementById("result-counter");

    /**
     * @brief Bouton d'activation du mode admin
     * @const {HTMLElement|null} adminToggle
     */
    const adminToggle = document.getElementById("admin-toggle");

    /**
     * @brief Bouton d'ajout d'un cadeau (visible en mode admin)
     * @const {HTMLElement|null} addWishBtn
     */
    const addWishBtn = document.getElementById("add-wish-btn");

    /**
     * @brief Sélecteur dropdown de tri
     * @const {HTMLSelectElement|null} sortSelect
     */
    const sortSelect = document.getElementById("sort-select");

    /**
     * @brief Bouton de retour en haut de page
     * @const {HTMLElement|null} backToTop
     */
    const backToTop = document.getElementById("back-to-top");

    // Modale dépendance
    /**
     * @brief Overlay de la modale de dépendance
     * @const {HTMLElement|null} depModal
     */
    const depModal = document.getElementById("dependency-modal");

    /**
     * @brief Bouton fermeture (×) de la modale dépendance
     * @const {HTMLElement|null} depModalClose
     */
    const depModalClose = document.getElementById("modal-close");

    /**
     * @brief Bouton "Retour" de la modale dépendance
     * @const {HTMLElement|null} depModalCancel
     */
    const depModalCancel = document.getElementById("modal-cancel");

    /**
     * @brief Bouton "Voir le produit" de la modale dépendance
     * @const {HTMLElement|null} depModalConfirm
     */
    const depModalConfirm = document.getElementById("modal-confirm");

    /**
     * @brief Liste des dépendances affichées dans la modale
     * @const {HTMLElement|null} dependencyList
     */
    const dependencyList = document.getElementById("dependency-list");

    // Modale ajout
    /**
     * @brief Overlay de la modale d'ajout de cadeau
     * @const {HTMLElement|null} addModal
     */
    const addModal = document.getElementById("add-modal");

    /**
     * @brief Bouton fermeture (×) de la modale d'ajout
     * @const {HTMLElement|null} addModalClose
     */
    const addModalClose = document.getElementById("add-modal-close");

    /**
     * @brief Formulaire d'ajout de cadeau
     * @const {HTMLFormElement|null} addForm
     */
    const addForm = document.getElementById("add-form");

    /**
     * @brief Bouton "Annuler" de la modale d'ajout
     * @const {HTMLElement|null} addCancel
     */
    const addCancel = document.getElementById("add-cancel");

    /* =========================================================
       MODALES — ouverture/fermeture génériques + accessibilité
       ========================================================= */

    /**
     * @brief Élément déclencheur de la modale actuellement ouverte
     * @var {HTMLElement|null} modalTriggerElement
     * @description Utilisé pour restituer le focus à l'élément d'origine à la fermeture.
     */
    let modalTriggerElement = null;

    /**
     * @brief Référence vers la modale actuellement ouverte
     * @var {HTMLElement|null} openModalElement
     * @description Utilisée par `trapFocus()` pour maintenir le focus à l'intérieur.
     */
    let openModalElement = null;

    /**
     * @brief Retourne tous les éléments focusables dans un conteneur
     * @function getFocusable
     * @param {HTMLElement} container - Le conteneur à analyser
     * @returns {HTMLElement[]} Liste des éléments focusables visibles et non désactivés
     * @description Sélecteurs : button, a[href], input, select, textarea,
     *              [tabindex]:not([tabindex="-1"])
     */
    function getFocusable(container) {
        return Array.from(container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )).filter(element => !element.disabled && element.offsetParent !== null);
    }

    /**
     * @brief Ouvre une modale avec accessibilité complète
     * @function openModal
     * @param {HTMLElement} modal - L'élément modale à ouvrir
     * @param {HTMLElement} [trigger] - L'élément déclencheur (pour retour du focus)
     * @description Ajoute la classe "active", définit aria-hidden="false",
     *              désactive le scroll du body, et transfère le focus au premier
     *              élément focusable de la modale.
     */
    function openModal(modal, trigger) {
        if (!modal) return;
        modalTriggerElement = trigger || document.activeElement;
        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        openModalElement = modal;
        const focusable = getFocusable(modal);
        if (focusable.length) {
            // Attendre la fin de la transition CSS avant de focus
            requestAnimationFrame(() => {
                setTimeout(() => focusable[0].focus(), 50);
            });
        }
    }

    /**
     * @brief Ferme une modale et restaure l'état precedent
     * @function closeModal
     * @param {HTMLElement} modal - La modale à fermer
     * @description Retire la classe "active", restaure aria-hidden, réactive le scroll,
     *              restitue le focus à l'élément déclencheur, et réinitialise pendingUrl.
     */
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

    /**
     * @brief Piège le focus dans la modale ouverte (accessibilité clavier)
     * @function trapFocus
     * @param {KeyboardEvent} event - L'événement clavier à traiter
     * @description Intercepte Tab/Shift+Tab : si on dépasse le dernier élément,
     *              on revient au premier, et inversement. N'agit que si une modale est ouverte.
     */
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

    /**
     * @brief Affiche la modale de dépendance pour un cadeau donné
     * @function showDependencyModal
     * @param {Object} wish - Le cadeau dont on veut afficher les dépendances
     * @param {HTMLElement} trigger - L'élément déclencheur (lien du produit)
     * @description Remplit la liste des dépendances avec des éléments DOM
     *              et ouvre la modale. Utilise `textContent` pour les noms
     *              (protection XSS, les noms peuvent venir du formulaire admin).
     */
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

    // Écouteurs d'événements pour la modale dépendance
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

    /**
     * @brief Ouvre la modale d'ajout de cadeau
     * @function openAddModal
     * @param {HTMLElement} trigger - L'élément déclencheur
     * @description Réinitialise la validité du champ prix, ouvre la modale
     *              et focus le champ nom.
     */
    function openAddModal(trigger) {
        if (!addModal) return;
        const priceInput = document.getElementById("add-price");
        if (priceInput) priceInput.setCustomValidity("");
        openModal(addModal, trigger);
        const nameInput = document.getElementById("add-name");
        if (nameInput) {
            // Attendre la fin de la transition CSS (visibility) avant de focus
            requestAnimationFrame(() => {
                setTimeout(() => nameInput.focus(), 50);
            });
        }
    }

    /**
     * @brief Ferme la modale d'ajout et réinitialise le formulaire
     * @function closeAddModal
     * @description Ferme la modale puis réinitialise tous les champs du formulaire.
     */
    function closeAddModal() {
        if (!addModal) return;
        closeModal(addModal);
        if (addForm) addForm.reset();
    }

    // Écouteurs d'événements pour la modale ajout
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

    /**
     * @brief Rend les onglets de sélection de personne
     * @function renderPersonTabs
     * @description Génère un bouton `<button class="person-tab">` pour chaque personne
     *              du tableau `people`. Chaque onglet affiche l'emoji, le nom et un badge
     *              avec le nombre de souhaits. L'onglet actif reçoit la classe "active"
     *              et `aria-pressed="true"`.
     */
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

    /**
     * @brief Rend les boutons de filtre par catégorie
     * @function renderCategoryFilters
     * @description Détecte automatiquement les catégories disponibles dans les souhaits
     *              de la personne courante. Crée un bouton pour "Tous" et un par catégorie.
     *              Le bouton actif reçoit la classe "active" et `aria-pressed="true"`.
     *              Si la catégorie mémorisée n'existe plus, réinitialise à "Tous".
     */
    function renderCategoryFilters() {
        if (!categoryFilters) return;

        // Retirer les anciens boutons catégorie (le sélecteur tri reste en place)
        categoryFilters
            .querySelectorAll(".category-button:not(#sort-button):not(#sort-select)")
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
                // Ne pas toucher au sélecteur de tri
                categoryFilters
                    .querySelectorAll(".category-button:not(#sort-button):not(#sort-select)")
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
       SÉLECTEUR DE TRI (dropdown)
       ========================================================= */

    /**
     * @brief Synchronise le select de tri avec l'état courant
     * @function updateSortSelect
     * @description Met à jour la valeur du `<select id="sort-select">`
     *              pour refléter `state.sort`.
     */
    function updateSortSelect() {
        if (!sortSelect) return;
        sortSelect.value = state.sort;
    }

    /**
     * @brief Initialise le sélecteur de tri et attache l'écouteur d'événement
     * @function initSort
     * @description Restaure la valeur mémorisée depuis le localStorage,
     *              puis attache un écouteur "change" qui met à jour `state.sort`,
     *              sauvegarde les préférences et réaffiche les souhaits.
     */
    function initSort() {
        if (!sortSelect) return;

        // Restaurer la valeur mémorisée (localStorage → prefs → state.sort)
        updateSortSelect();

        sortSelect.addEventListener("change", function () {
            const value = sortSelect.value;
            if (!SORT_OPTIONS.includes(value)) return;
            state.sort = value;
            savePrefs();
            renderWishes();
        });
    }

    /**
     * @brief Trie la liste des cadeaux selon le critère actif
     * @function sortWishes
     * @param {Array<Object>} list - Liste des cadeaux à trier
     * @returns {Array<Object>} Nouvelle liste triée (ne modifie pas l'original)
     * @description Pour le tri par prix, un départage alphabétique stable est appliqué
     *              sur les prix égaux (localeCompare français).
     */
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

    /**
     * @brief Crée un élément `<img>` pour un cadeau
     * @function createImage
     * @param {Object} wish - Le cadeau dont on veut l'image
     * @returns {HTMLImageElement} Élément image configuré
     * @description Configure le lazy loading, l'attribut alt, et un fallback SVG
     *              en cas d'erreur de chargement (image non disponible).
     */
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

    /**
     * @brief Crée la carte DOM complète pour un cadeau
     * @function createWishCard
     * @param {Object} wish - Le cadeau à afficher
     * @param {number} index - Index dans la liste (pour l'animation séquentielle)
     * @returns {HTMLElement} Élément `<article>` contenant la carte
     * @description La carte contient :
     *              - Badge catégorie (position absolute, haut-gauche)
     *              - Image avec wrapper
     *              - Contenu : titre, prix, lien "Voir le produit"
     *              - Bouton suppression (uniquement en mode admin)
     *              Le lien déclenche la modale de dépendance si nécessaire.
     */
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

    /**
     * @brief Rend la grille complète des souhaits filtrés et triés
     * @function renderWishes
     * @description Pipeline de rendu :
     *              1. Récupère les souhaits via `getWishes()`
     *              2. Filtre par catégorie (si pas "Tous")
     *              3. Trie selon `state.sort`
     *              4. Met à jour le compteur de résultats
     *              5. Affiche les cartes ou un état vide
     *              Utilise un `DocumentFragment` pour optimiser les performances DOM.
     */
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

    /**
     * @brief Supprime un cadeau de la liste
     * @function deleteWish
     * @param {number} id - ID du cadeau à supprimer
     * @description Stratégie de suppression :
     *              1. Si le cadeau est un ajout local → le retirer de `persist.added`
     *              2. Sinon (cadeau de la base) → ajouter son ID à `persist.deleted`
     *              Puis sauvegarde et rafraîchit l'interface.
     */
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

    /**
     * @brief Ajoute un nouveau cadeau à la liste de la personne courante
     * @function addWish
     * @param {Object} data - Données du formulaire d'ajout
     * @param {string} data.name - Nom du cadeau
     * @param {string} data.category - Catégorie du cadeau
     * @param {string} data.price - Prix du cadeau (string, converti en number)
     * @param {string} data.image - URL de l'image (optionnel)
     * @param {string} data.url - Lien vers le produit
     * @returns {boolean} true si l'ajout a réussi, false sinon
     * @description Valide les données (nom, URL, prix ≥ 0), génère un ID unique
     *              via `nextWishId()`, ajoute à `persist.added[personId]`,
     *              sauvegarde et ferme la modale.
     */
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

    // Écouteur de soumission du formulaire d'ajout
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

    // Écouteur du bouton de basculement mode admin
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

    // Écouteur du bouton d'ajout (visible en mode admin)
    if (addWishBtn) {
        addWishBtn.addEventListener("click", function () {
            openAddModal(addWishBtn);
        });
    }

    /* =========================================================
       BOUTON RETOUR EN HAUT
       ========================================================= */

    // Écouteurs pour le bouton "retour en haut"
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

    /**
     * @brief Gestionnaire d'événements clavier globaux
     * @description Gère :
     *              - Touche Échap : ferme la modale d'ajout ou de dépendance
     *              - Tab : piège le focus dans la modale ouverte (`trapFocus`)
     */
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

    /**
     * @brief Rafraîchit complètement l'interface utilisateur
     * @function refresh
     * @description Appelle les trois fonctions de rendu principales :
     *              1. `renderPersonTabs()` — Onglets de personne
     *              2. `renderCategoryFilters()` — Boutons de catégorie
     *              3. `renderWishes()` — Grille des souhaits
     *              C'est le point d'entrée unique après toute modification d'état.
     */
    function refresh() {
        renderPersonTabs();
        renderCategoryFilters();
        renderWishes();
    }

    /* =========================================================
       LANCEMENT
       ========================================================= */

    // Initialisation au chargement de la page
    initSnowfall();    // Animation flocons
    initIdCounter();   // Compteur d'IDs
    initSort();        // Sélecteur de tri

    // refresh() valide aussi la catégorie mémorisée avant la sauvegarde
    refresh();

    // Normaliser l'état : migration effectuée, anciennes clés retirées
    savePersist();
    savePrefs();
    storage.remove(STORAGE_KEYS.legacyWishes);
    storage.remove(STORAGE_KEYS.legacyPerson);
    storage.remove(STORAGE_KEYS.legacySort);
    storage.remove(STORAGE_KEYS.legacyCategory);

    // Statistiques de chargement
    const totalWishes = people.reduce(
        (sum, person) => sum + getWishes(person.id).length,
        0
    );
    console.log(`🎁 ${people.length} personne(s), ${totalWishes} cadeau(x) au total`);
})();
