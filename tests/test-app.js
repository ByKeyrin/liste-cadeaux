/**
 * Tests QA — Liste de Cadeaux (TEMPER)
 * Exécuter avec : node tests/test-app.js
 *
 * Stratégie : js/app.js est un IIFE fermé (aucun global exposé) et
 * data/wishes.js expose `people` / `wishesByPerson` en globals navigateur.
 * On charge les deux scripts dans un contexte `node:vm` avec un mini-DOM
 * factice et on teste la VRAIE application en boîte noire (clics, rendu DOM) :
 *   1. structure des données (champs obligatoires)
 *   2. tri croissant / décroissant
 *   3. filtres par catégorie
 *   4. système de dépendances (requiredWishes + modale)
 *   5. gestion multi-personnes (wishesByPerson)
 */

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const DATA_SRC = fs.readFileSync(path.join(ROOT, "data", "wishes.js"), "utf8");
const APP_SRC = fs.readFileSync(path.join(ROOT, "js", "app.js"), "utf8");

/* =========================================================
   HARNESS DE TEST
   ========================================================= */

let passed = 0;
let failed = 0;
const failures = [];

function section(title) {
    console.log(`\n=== ${title} ===`);
}

function check(label, condition) {
    if (condition) {
        passed++;
        console.log(`  ✅ ${label}`);
    } else {
        failed++;
        failures.push(label);
        console.log(`  ❌ ${label}`);
    }
}

function eq(label, actual, expected) {
    check(`${label} [obtenu=${JSON.stringify(actual)} attendu=${JSON.stringify(expected)}]`, actual === expected);
}

/* =========================================================
   MINI-DOM FACTICE
   ========================================================= */

function makeClassList() {
    const set = new Set();
    return {
        add: (...cls) => cls.forEach(c => set.add(c)),
        remove: (...cls) => cls.forEach(c => set.delete(c)),
        toggle: (cls, force) => {
            const want = force === undefined ? !set.has(cls) : !!force;
            if (want) set.add(cls); else set.delete(cls);
            return want;
        },
        contains: cls => set.has(cls)
    };
}

// Sélecteurs CSS simples : "tag", ".classe", "#id", "[attr]", [attr="v"]",
// et combinaison "base:not(exclu)" + listes séparées par virgules.
function matchesSelector(el, selector) {
    const sel = String(selector).trim();
    const notIdx = sel.indexOf(":not(");
    if (notIdx !== -1) {
        const base = sel.slice(0, notIdx);
        const inner = sel.slice(notIdx + 5, sel.lastIndexOf(")"));
        return (base === "" || matchesSelector(el, base)) && !matchesSelector(el, inner);
    }
    if (sel.startsWith(".")) return el.classList.contains(sel.slice(1));
    if (sel.startsWith("#")) return el.id === sel.slice(1);
    if (sel.startsWith("[")) {
        const m = /^\[([\w-]+)(?:=["']?([^"'\]]*)["']?)?\]$/.exec(sel);
        if (!m) return false;
        if (!(m[1] in el)) return false;
        return m[2] === undefined ? true : String(el[m[1]]) === m[2];
    }
    return el.tagName === sel.toUpperCase();
}

function makeElement(tag) {
    const listeners = {};
    const el = {
        tagName: String(tag).toUpperCase(),
        children: [],
        style: {},
        dataset: {},
        attributes: {},
        classList: makeClassList(),
        textContent: "",
        value: "",
        type: "",
        title: "",
        _innerHTML: "",
        _listeners: listeners,
        parentNode: null,
        isFragment: tag === "fragment",
        appendChild(child) {
            if (child.isFragment) {
                // Comme un vrai DocumentFragment : ses enfants migrent dans le parent
                child.children.slice().forEach(c => this.appendChild(c));
                child.children = [];
                return child;
            }
            this.children.push(child);
            child.parentNode = this;
            return child;
        },
        remove() {
            if (this.parentNode) {
                const i = this.parentNode.children.indexOf(this);
                if (i !== -1) this.parentNode.children.splice(i, 1);
            }
        },
        setAttribute(k, v) { this.attributes[k] = String(v); },
        getAttribute(k) { return k in this.attributes ? this.attributes[k] : null; },
        addEventListener(type, fn) {
            (listeners[type] = listeners[type] || []).push(fn);
        },
        dispatch(type, init = {}) {
            const event = {
                type,
                target: this,
                defaultPrevented: false,
                preventDefault() { this.defaultPrevented = true; },
                stopPropagation() {},
                ...init
            };
            (listeners[type] || []).forEach(fn => fn(event));
            return event;
        },
        click() { return this.dispatch("click"); },
        querySelectorAll(selector) {
            const parts = String(selector).split(",").map(s => s.trim()).filter(Boolean);
            const out = [];
            const walk = node => {
                for (const child of node.children) {
                    if (parts.some(p => matchesSelector(child, p))) out.push(child);
                    walk(child);
                }
            };
            walk(this);
            return out;
        },
        querySelector(selector) {
            return this.querySelectorAll(selector)[0] || null;
        },
        focus() { this.focused = true; },
        reset() {
            // Comme un vrai <form> : reset() remet tous les champs à vide
            this.value = "";
            const walk = node => node.children.forEach(c => { c.value = ""; walk(c); });
            walk(this);
        },
        setCustomValidity(msg) { this.customValidityMessage = msg; },
        reportValidity() { this.validityReported = true; return true; }
    };
    Object.defineProperty(el, "innerHTML", {
        get() { return this._innerHTML; },
        set(v) {
            this._innerHTML = String(v);
            if (v === "") this.children = [];
        }
    });
    return el;
}

function makeLocalStorage() {
    const store = new Map();
    return {
        getItem: k => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: k => store.delete(k),
        clear: () => store.clear(),
        _store: store
    };
}

/* =========================================================
   CHARGEMENT DE L'APPLICATION
   ========================================================= */

// data/wishes.js seul (pour les tests de structure des données)
function loadData() {
    const ctx = vm.createContext({});
    vm.runInContext(DATA_SRC, ctx, { filename: "data/wishes.js" });
    return vm.runInContext("({ people, wishesByPerson })", ctx);
}

/**
 * Crée un DOM factice, charge data/wishes.js puis js/app.js dedans.
 * `seed` pré-remplit le localStorage (tests de persistance / préférences).
 */
function createApp(seed = {}) {
    const els = {};
    const register = (id, tag = "div") => {
        const el = makeElement(tag);
        el.id = id;
        els[id] = el;
        return el;
    };

    register("wishlist");
    register("category-filters");
    register("person-selector");
    register("result-counter");
    register("sort-button", "button");
    register("admin-toggle", "button");
    register("add-wish-btn", "button");
    register("back-to-top", "button");

    // Modale dépendance (les boutons sont des enfants de la modale, comme en HTML)
    const depModal = register("dependency-modal");
    register("dependency-list");
    depModal.appendChild(register("modal-close", "button"));
    depModal.appendChild(register("modal-cancel", "button"));
    depModal.appendChild(register("modal-confirm", "button"));
    depModal.appendChild(els["dependency-list"]);

    // Modale ajout + formulaire
    const addModal = register("add-modal");
    const addForm = register("add-form", "form");
    addModal.appendChild(register("add-modal-close", "button"));
    addModal.appendChild(addForm);
    addModal.appendChild(register("add-cancel", "button"));
    addForm.appendChild(register("add-name", "input"));
    addForm.appendChild(register("add-category", "select"));
    addForm.appendChild(register("add-price", "input"));
    addForm.appendChild(register("add-image", "input"));
    addForm.appendChild(register("add-url", "input"));

    const keydownListeners = [];
    const documentStub = {
        getElementById: id => els[id] || null,
        createElement: tag => makeElement(tag),
        createDocumentFragment: () => makeElement("fragment"),
        addEventListener(type, fn) {
            if (type === "keydown") keydownListeners.push(fn);
        },
        dispatchKey(key, init = {}) {
            const event = { key, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...init };
            keydownListeners.forEach(fn => fn(event));
            return event;
        },
        activeElement: makeElement("button"),
        body: makeElement("body")
    };

    const windowCalls = { open: [], confirm: [] };
    const app = { confirmAnswer: { value: true } };
    const windowStub = {
        addEventListener() {},
        scrollTo() {},
        scrollY: 0,
        open: (...args) => windowCalls.open.push(args),
        confirm: message => {
            windowCalls.confirm.push(message);
            return app.confirmAnswer.value;
        }
    };

    const localStorage = makeLocalStorage();
    Object.entries(seed).forEach(([k, v]) => localStorage.setItem(k, v));
    windowStub.localStorage = localStorage;

    const ctx = vm.createContext({
        console: { log() {}, warn() {}, error() {} },
        document: documentStub,
        window: windowStub
    });

    vm.runInContext(DATA_SRC, ctx, { filename: "data/wishes.js" });
    vm.runInContext(APP_SRC, ctx, { filename: "js/app.js" });

    // Helpers de lecture du DOM rendu
    const wishCards = () => els.wishlist.children.filter(c => c.classList.contains("wish-card"));
    const cardTitle = card => card.children[2].children[0].textContent;
    const cardPrice = card => parseFloat(card.children[2].children[1].textContent);
    const cardCategory = card => card.children[0].textContent;
    const cardLink = card => card.children[2].children[2];
    const cardDeleteBtn = card => card.children[3];

    Object.assign(app, {
        els, documentStub, windowCalls, localStorage,
        wishCards, cardTitle, cardPrice, cardCategory, cardLink, cardDeleteBtn,
        renderedTitles: () => wishCards().map(cardTitle),
        renderedPrices: () => wishCards().map(cardPrice),
        personTabs: () => els["person-selector"].children,
        categoryButtons: () => els["category-filters"].children.filter(b => b.id !== "sort-button"),
        buttonLabel: btn => btn.children[1].textContent,
        findCard: name => wishCards().find(c => cardTitle(c) === name),
        findCategory: name => app.categoryButtons().find(b => app.buttonLabel(b) === name),
        findTab: personId => app.personTabs().find(t => t.dataset.person === personId),
        persistState: () => JSON.parse(localStorage.getItem("wishlist.state") || "null"),
        prefs: () => JSON.parse(localStorage.getItem("wishlist.prefs") || "null")
    });
    return app;
}

/* =========================================================
   1) STRUCTURE DES DONNÉES
   ========================================================= */

section("1. Structure des données (champs obligatoires)");

{
    const { people, wishesByPerson } = loadData();

    check("people est un tableau non vide", Array.isArray(people) && people.length > 0);
    check("au moins 2 personnes (kevin, lucie)", people.length >= 2);
    check("chaque personne a id, name, emoji, color", people.every(p =>
        typeof p.id === "string" && p.id.length > 0 &&
        typeof p.name === "string" && p.name.length > 0 &&
        typeof p.emoji === "string" && p.emoji.length > 0 &&
        typeof p.color === "string" && p.color.length > 0
    ));
    check("ids de personnes uniques", new Set(people.map(p => p.id)).size === people.length);
    eq("wishesByPerson couvre exactement les personnes",
        Object.keys(wishesByPerson).slice().sort().join(","),
        people.map(p => p.id).slice().sort().join(","));
    check("chaque personne a une liste de souhaits non vide",
        Object.values(wishesByPerson).every(list => Array.isArray(list) && list.length > 0));

    const allWishes = Object.values(wishesByPerson).flat();
    check("chaque wish a id(int), name, category, image, price(>0), url(http)", allWishes.every(w =>
        Number.isInteger(w.id) &&
        typeof w.name === "string" && w.name.trim() !== "" &&
        typeof w.category === "string" && w.category.trim() !== "" &&
        typeof w.image === "string" && w.image.length > 0 &&
        typeof w.price === "number" && Number.isFinite(w.price) && w.price > 0 &&
        typeof w.url === "string" && /^https?:\/\//.test(w.url)
    ));
    check("requiredWishes est null ou un tableau d'ids entiers", allWishes.every(w =>
        w.requiredWishes === null ||
        (Array.isArray(w.requiredWishes) && w.requiredWishes.every(id => Number.isInteger(id)))
    ));
    const ids = allWishes.map(w => w.id);
    check("ids de wishes uniques (toutes personnes confondues)", new Set(ids).size === ids.length);

    // Régression sur les données connues
    eq("kevin a 24 souhaits", wishesByPerson.kevin.length, 24);
    eq("lucie a 3 souhaits", wishesByPerson.lucie.length, 3);
    eq("1er souhait de kevin", wishesByPerson.kevin[0].name, "Half Rack");
    check("souhait sans dépendance → requiredWishes null", wishesByPerson.kevin[0].requiredWishes === null);
    eq("champs obligatoires présents sur le 1er souhait",
        ["id", "name", "category", "image", "price", "url", "requiredWishes"].every(k => k in wishesByPerson.kevin[0]),
        true);
}

/* =========================================================
   2) TRI CROISSANT / DÉCROISSANT
   ========================================================= */

section("2. Tri croissant / décroissant");

{
    const data = loadData();
    const kevin = data.wishesByPerson.kevin;
    const originalOrder = kevin.map(w => w.name).join("|");

    // État par défaut : ordre d'origine préservé
    const app = createApp();
    eq("ordre d'origine conservé en mode default", app.renderedTitles().join("|"), originalOrder);

    // Bouton tri : default → price-asc → price-desc → default
    const sortBtn = app.els["sort-button"];
    eq("libellé initial du bouton tri", sortBtn.textContent, "🔽 Trier par");

    sortBtn.click(); // price-asc
    const ascPrices = app.renderedPrices();
    eq("un clic → price-asc", app.prefs().sort, "price-asc");
    eq("tri ascendant : tous les cadeaux rendus", ascPrices.length, kevin.length);
    check("tri ascendant : prix non décroissants", ascPrices.every((p, i) => i === 0 || ascPrices[i - 1] <= p));
    eq("tri ascendant : prix minimum en tête", ascPrices[0], Math.min(...kevin.map(w => w.price)));
    eq("tri ascendant : prix maximum en fin", ascPrices[ascPrices.length - 1], Math.max(...kevin.map(w => w.price)));
    check("libellé du bouton mis à jour (Prix ↑)", sortBtn.textContent.includes("Prix ↑"));
    eq("aria-pressed=true quand tri actif", sortBtn.getAttribute("aria-pressed"), "true");

    // Prix égaux → départage alphabétique stable (3 t-shirts à 37 €)
    const ascTitles = app.renderedTitles();
    const tshirts = kevin
        .filter(w => w.price === 37)
        .map(w => w.name)
        .sort((a, b) => a.localeCompare(b, "fr"));
    const renderedTshirts = ascTitles.filter(t => tshirts.includes(t));
    eq("prix égaux → départage alphabétique (tri asc)", renderedTshirts.join("|"), tshirts.join("|"));

    sortBtn.click(); // price-desc
    const descPrices = app.renderedPrices();
    eq("deux clics → price-desc", app.prefs().sort, "price-desc");
    check("tri descendant : prix non croissants", descPrices.every((p, i) => i === 0 || descPrices[i - 1] >= p));
    eq("tri descendant : prix maximum en tête", descPrices[0], Math.max(...kevin.map(w => w.price)));
    check("tri descendant : aucun cadeau perdu ni dupliqué",
        app.renderedTitles().slice().sort().join("|") === kevin.map(w => w.name).slice().sort().join("|"));

    sortBtn.click(); // default
    eq("trois clics → retour à default", app.prefs().sort, "default");
    eq("retour default : ordre d'origine", app.renderedTitles().join("|"), originalOrder);
    eq("aria-pressed=false en mode default", sortBtn.getAttribute("aria-pressed"), "false");

    // Le tri ne modifie pas les données source
    eq("tri non destructif sur les données", kevin.map(w => w.name).join("|"), originalOrder);

    // Préférence de tri mémorisée au démarrage
    const app2 = createApp({
        "wishlist.prefs": JSON.stringify({ personId: "kevin", sort: "price-asc", category: "Tous" })
    });
    const restored = app2.renderedPrices();
    check("préférence price-asc restaurée au démarrage",
        restored.every((p, i) => i === 0 || restored[i - 1] <= p));
}

/* =========================================================
   3) FILTRES PAR CATÉGORIE
   ========================================================= */

section("3. Filtres par catégorie");

{
    const data = loadData();
    const kevin = data.wishesByPerson.kevin;
    const cats = ["Sport", "Mode", "Loisir"];

    const app = createApp();
    eq("boutons = Tous + catégories présentes",
        app.categoryButtons().map(app.buttonLabel).join(","), ["Tous", ...cats].join(","));
    eq("filtre Tous (défaut) : tous les cadeaux", app.wishCards().length, kevin.length);

    for (const cat of cats) {
        app.findCategory(cat).click();
        const cards = app.wishCards();
        eq(`filtre "${cat}" : nombre de cartes`, cards.length, kevin.filter(w => w.category === cat).length);
        check(`filtre "${cat}" : que des cartes de cette catégorie`, cards.every(c => app.cardCategory(c) === cat));
        check(`filtre "${cat}" : bouton actif`, app.findCategory(cat).classList.contains("active"));
    }

    // Compteur de résultats
    app.findCategory("Sport").click();
    const nSport = kevin.filter(w => w.category === "Sport").length;
    eq("compteur filtré", app.els["result-counter"].textContent, `${nSport} sur ${kevin.length} cadeaux`);

    // Retour à "Tous"
    app.findCategory("Tous").click();
    eq("retour Tous : compteur complet", app.els["result-counter"].textContent, `${kevin.length} cadeaux`);
    eq("retour Tous : toutes les cartes", app.wishCards().length, kevin.length);

    // Persistance du filtre
    eq("filtre mémorisé dans les préférences", app.prefs().category, "Tous");
    app.findCategory("Mode").click();
    eq("filtre Mode mémorisé", app.prefs().category, "Mode");

    // Filtre + tri combinés
    app.els["sort-button"].click(); // → price-asc
    const prices = app.renderedPrices();
    check("filtre Mode + tri croissant combinés",
        prices.length === kevin.filter(w => w.category === "Mode").length &&
        prices.every((p, i) => i === 0 || prices[i - 1] <= p) &&
        app.wishCards().every(c => app.cardCategory(c) === "Mode"));

    // Catégories propres à chaque personne (Lucie)
    app.findTab("lucie").click();
    eq("catégories de lucie",
        app.categoryButtons().map(app.buttonLabel).join(","), ["Tous", "Loisir", "Maison", "Mode"].join(","));
    app.findCategory("Maison").click();
    eq('filtre "Maison" pour lucie', app.wishCards().length, 1);
    eq('carte affichée pour "Maison"', app.cardTitle(app.wishCards()[0]), "Bougie parfumée - Vanille & Cannelle");

    // Catégorie mémorisée devenue invalide → repli sur "Tous"
    const app2 = createApp({
        "wishlist.prefs": JSON.stringify({ personId: "kevin", sort: "default", category: "Beauté" })
    });
    eq("catégorie invalide mémorisée → repli sur Tous", app2.wishCards().length, kevin.length);
    eq("état interne repassé à Tous", app2.prefs().category, "Tous");
    check('bouton "Tous" actif', app2.findCategory("Tous").classList.contains("active"));

    // Catégorie vide → empty-state (tout supprimer via l'admin)
    const app3 = createApp({
        "wishlist.state": JSON.stringify({
            version: 2, added: {}, deleted: { kevin: kevin.map(w => w.id) }, lastId: 24
        })
    });
    check("catégorie sans résultat → message empty-state",
        app3.els.wishlist.children.some(c => c.classList.contains("empty-state")));
    eq("catégorie sans résultat → 0 carte", app3.wishCards().length, 0);
    eq("compteur à 0", app3.els["result-counter"].textContent, "0 cadeaux");
}

/* =========================================================
   4) SYSTÈME DE DÉPENDANCES
   ========================================================= */

section("4. Système de dépendances (requiredWishes)");

{
    const data = loadData();
    const { wishesByPerson } = data;

    // 4a. Intégrité des données de dépendance
    for (const [personId, list] of Object.entries(wishesByPerson)) {
        const idSet = new Set(list.map(w => w.id));
        check(`[${personId}] dépendances → ids existants, pas d'auto-référence`,
            list.every(w => w.requiredWishes === null ||
                w.requiredWishes.every(reqId => idSet.has(reqId) && reqId !== w.id)));
    }

    let hasCycle = false;
    for (const list of Object.values(wishesByPerson)) {
        const byId = new Map(list.map(w => [w.id, w]));
        for (const w of list) {
            const seen = new Set([w.id]);
            let cur = w;
            while (cur.requiredWishes && cur.requiredWishes.length > 0) {
                const next = byId.get(cur.requiredWishes[0]);
                if (!next) break;
                if (seen.has(next.id)) { hasCycle = true; break; }
                seen.add(next.id);
                cur = next;
            }
            if (hasCycle) break;
        }
        if (hasCycle) break;
    }
    check("aucun cycle de dépendances", !hasCycle);

    // Données de référence : Disques(4) → Barre(3) → Half Rack(1)
    const kevin = wishesByPerson.kevin;
    eq("wish #3", kevin.find(w => w.id === 3).name, "Barre Olympique");
    eq("wish #3 dépend de [1]", JSON.stringify(kevin.find(w => w.id === 3).requiredWishes), "[1]");
    eq("wish #4 dépend de [3]", JSON.stringify(kevin.find(w => w.id === 4).requiredWishes), "[3]");

    // 4b. Comportement réel de l'app
    const app = createApp();

    // Clic sur un cadeau SANS dépendance → lien direct
    const ev1 = app.cardLink(app.findCard("Half Rack")).click();
    check("sans dépendance : clic non intercepté (lien direct)", ev1.defaultPrevented === false);
    check("sans dépendance : modale fermée", !app.els["dependency-modal"].classList.contains("active"));

    // Clic sur un cadeau AVEC dépendance → modale
    const ev2 = app.cardLink(app.findCard("Disques Olympiques 25kg x4")).click();
    check("avec dépendance : clic intercepté (preventDefault)", ev2.defaultPrevented === true);
    check("modale de dépendance ouverte", app.els["dependency-modal"].classList.contains("active"));
    eq("aria-hidden=false sur la modale", app.els["dependency-modal"].getAttribute("aria-hidden"), "false");
    eq("1 dépendance listée", app.els["dependency-list"].children.length, 1);
    eq("dépendance listée = Barre Olympique",
        app.els["dependency-list"].children[0].children[1].textContent, "Barre Olympique");

    // Confirmation → ouverture de l'URL du produit
    app.els["modal-confirm"].click();
    eq("window.open appelé 1 fois", app.windowCalls.open.length, 1);
    check("URL ouverte = url du souhait",
        app.windowCalls.open[0][0] === kevin.find(w => w.id === 4).url);
    check("modale refermée après confirmation", !app.els["dependency-modal"].classList.contains("active"));

    // Annulation → aucune ouverture
    app.cardLink(app.findCard("Barre Olympique")).click();
    check("modale rouverte (Barre → Half Rack)",
        app.els["dependency-modal"].classList.contains("active") &&
        app.els["dependency-list"].children[0].children[1].textContent === "Half Rack");
    app.els["modal-cancel"].click();
    check("annulation : modale fermée", !app.els["dependency-modal"].classList.contains("active"));
    eq("annulation : aucune nouvelle ouverture", app.windowCalls.open.length, 1);

    // Touche Échap ferme la modale
    app.cardLink(app.findCard("Barre Olympique")).click();
    check("modale ouverte avant Échap", app.els["dependency-modal"].classList.contains("active"));
    app.documentStub.dispatchKey("Escape");
    check("Échap ferme la modale", !app.els["dependency-modal"].classList.contains("active"));
    eq("Échap : aucune ouverture", app.windowCalls.open.length, 1);

    // Dépendance supprimée → plus de modale (résolution des ids obsolètes)
    const app2 = createApp();
    app2.els["admin-toggle"].click(); // mode admin
    app2.findCard("Barre Olympique") && app2.cardDeleteBtn(app2.findCard("Barre Olympique")).click();
    check("suppression de Barre Olympique (admin)", !app2.findCard("Barre Olympique"));
    const ev3 = app2.cardLink(app2.findCard("Disques Olympiques 25kg x4")).click();
    check("dépendance obsolète ignorée → lien direct", ev3.defaultPrevented === false);
    check("dépendance obsolète → pas de modale", !app2.els["dependency-modal"].classList.contains("active"));
}

/* =========================================================
   5) GESTION MULTI-PERSONNES (wishesByPerson)
   ========================================================= */

section("5. Gestion multi-personnes (wishesByPerson)");

{
    const data = loadData();
    const { people, wishesByPerson } = data;

    const app = createApp();

    // Onglets générés pour chaque personne, avec compteurs
    eq("1 onglet par personne", app.personTabs().length, people.length);
    eq("onglet 1 = kevin", app.personTabs()[0].dataset.person, "kevin");
    eq("onglet 2 = lucie", app.personTabs()[1].dataset.person, "lucie");
    eq("badge kevin", String(app.findTab("kevin").children[2].textContent), String(wishesByPerson.kevin.length));
    eq("badge lucie", String(app.findTab("lucie").children[2].textContent), String(wishesByPerson.lucie.length));
    check("onglet actif = personne courante", app.findTab("kevin").classList.contains("active"));
    eq("aria-pressed de l'onglet actif", app.findTab("kevin").getAttribute("aria-pressed"), "true");

    // Changement de personne via l'onglet Lucie
    app.findTab("lucie").click();
    eq("rendu = liste de lucie", app.wishCards().length, wishesByPerson.lucie.length);
    eq("1er cadeau lucie", app.cardTitle(app.wishCards()[0]), "Livre - Le Petit Prince (édition collector)");
    check("que des cadeaux de lucie", app.renderedTitles().join("|") === wishesByPerson.lucie.map(w => w.name).join("|"));
    eq("compteur lucie", app.els["result-counter"].textContent, `${wishesByPerson.lucie.length} cadeaux`);
    check("onglet actif passe à lucie",
        app.findTab("lucie").classList.contains("active") && !app.findTab("kevin").classList.contains("active"));
    eq("personne mémorisée", app.prefs().personId, "lucie");

    // Retour sur kevin : liste intacte
    app.findTab("kevin").click();
    eq("retour kevin : liste complète", app.wishCards().length, wishesByPerson.kevin.length);
    check("listes non mélangées entre personnes",
        app.renderedTitles().join("|") === wishesByPerson.kevin.map(w => w.name).join("|"));

    // Le changement de personne réinitialise le filtre catégorie
    app.findCategory("Sport").click();
    eq("filtre Sport actif", app.wishCards().length, wishesByPerson.kevin.filter(w => w.category === "Sport").length);
    app.findTab("lucie").click();
    eq("changement de personne → filtre réinitialisé", app.wishCards().length, wishesByPerson.lucie.length);

    // ---- Ajout via le formulaire admin ----
    app.findTab("kevin").click();
    app.els["admin-toggle"].click(); // mode admin
    check("mode admin : boutons de suppression rendus",
        app.wishCards().every(c => app.cardDeleteBtn(c).classList.contains("btn-delete")));

    app.els["add-wish-btn"].click();
    check("modale d'ajout ouverte", app.els["add-modal"].classList.contains("active"));

    app.els["add-name"].value = "Test QA";
    app.els["add-category"].value = "Loisir";
    app.els["add-price"].value = "12.5";
    app.els["add-image"].value = "";
    app.els["add-url"].value = "https://example.com";
    app.els["add-form"].dispatch("submit");

    eq("ajout : kevin a N+1 souhaits", app.wishCards().length, wishesByPerson.kevin.length + 1);
    eq("ajout : badge onglet mis à jour",
        String(app.findTab("kevin").children[2].textContent), String(wishesByPerson.kevin.length + 1));
    const newCard = app.findCard("Test QA");
    check("ajout : nouvelle carte rendue", !!newCard);
    eq("ajout : prix formaté", app.cardPrice(newCard), 12.5);
    eq("ajout : catégorie", app.cardCategory(newCard), "Loisir");
    check("ajout : modale refermée + formulaire réinitialisé",
        !app.els["add-modal"].classList.contains("active") && app.els["add-name"].value === "");
    eq("ajout : id monotone (max global + 1 = 104)", app.persistState().lastId, 104);
    eq("ajout : persisté (schéma v2)", app.persistState().added.kevin.length, 1);
    check("ajout : sans dépendance (requiredWishes null)",
        app.persistState().added.kevin[0].requiredWishes === null);

    // Formulaire invalide → refus
    app.els["add-wish-btn"].click();
    app.els["add-name"].value = "Prix invalide";
    app.els["add-url"].value = "https://example.com";
    app.els["add-price"].value = "abc";
    app.els["add-form"].dispatch("submit");
    eq("prix invalide : rien d'ajouté", app.wishCards().length, wishesByPerson.kevin.length + 1);
    eq("prix invalide : message de validation", app.els["add-price"].customValidityMessage, "Entrez un prix valide.");
    app.els["add-cancel"].click();

    // ---- Suppression (admin) : uniquement la personne courante ----
    app.cardDeleteBtn(app.findCard("Test QA")).click();
    eq("suppression : kevin redevenu à N", app.wishCards().length, wishesByPerson.kevin.length);
    check("suppression : carte retirée", !app.findCard("Test QA"));
    eq("suppression : message de confirmation", app.windowCalls.confirm.length, 1);
    app.findTab("lucie").click();
    eq("suppression : lucie inchangée", app.wishCards().length, wishesByPerson.lucie.length);

    // Annulation de la suppression
    app.findTab("kevin").click();
    app.confirmAnswer.value = false;
    app.cardDeleteBtn(app.findCard("Half Rack")).click();
    eq("suppression annulée : carte conservée", app.wishCards().length, wishesByPerson.kevin.length);
    app.confirmAnswer.value = true;

    // ---- Persistance à travers un rechargement ----
    // 1. une suppression de la liste de base survit au rechargement
    app.cardDeleteBtn(app.findCard("Half Rack")).click();
    eq("Half Rack supprimé", app.wishCards().length, wishesByPerson.kevin.length - 1);
    const reloaded = createApp({
        "wishlist.state": app.localStorage.getItem("wishlist.state"),
        "wishlist.prefs": app.localStorage.getItem("wishlist.prefs")
    });
    eq("rechargement : suppression persistée", reloaded.wishCards().length, wishesByPerson.kevin.length - 1);
    check("rechargement : Half Rack toujours absent", !reloaded.findCard("Half Rack"));
    eq("rechargement : lucie intacte", reloaded.findTab("lucie").children[2].textContent, wishesByPerson.lucie.length);

    // 2. un id supprimé n'est jamais réutilisé
    reloaded.els["admin-toggle"].click();
    reloaded.els["add-wish-btn"].click();
    reloaded.els["add-name"].value = "Second test";
    reloaded.els["add-category"].value = "Loisir";
    reloaded.els["add-price"].value = "1";
    reloaded.els["add-url"].value = "https://example.com";
    reloaded.els["add-form"].dispatch("submit");
    eq("id jamais réutilisé (lastId = 105)", reloaded.persistState().lastId, 105);

    // ---- Migration des anciennes clés (v1 → v2) ----
    const legacyList = wishesByPerson.kevin.filter(w => w.id !== 1);
    legacyList.push({ id: 999, name: "Cadeau migré", category: "Loisir", image: "img/x.jpg", price: 5, url: "https://example.com", requiredWishes: null });
    const migrated = createApp({
        localWishes: JSON.stringify({ kevin: legacyList, lucie: wishesByPerson.lucie })
    });
    eq("migration v1 : 23 cadeaux de base − 1 supprimé + 1 ajouté",
        migrated.wishCards().length, wishesByPerson.kevin.length);
    check("migration v1 : cadeau ajouté conservé", !!migrated.findCard("Cadeau migré"));
    check("migration v1 : suppression passée conservée", !migrated.findCard("Half Rack"));
    eq("migration v1 : lucie intacte", migrated.findTab("lucie").children[2].textContent, wishesByPerson.lucie.length);
    eq("migration v1 : ancienne clé nettoyée", migrated.localStorage.getItem("localWishes"), null);
}

/* =========================================================
   RÉSUMÉ
   ========================================================= */

console.log("\n=== Résumé ===");
console.log(`Total : ${passed + failed} tests — ✅ ${passed} passés — ❌ ${failed} échoués`);
if (failed > 0) {
    console.log("\nÉchecs :");
    failures.forEach(f => console.log(`  - ${f}`));
    console.log("\n💥 Des tests ont échoué.");
    process.exit(1);
}
console.log("\n🎉 Tous les tests sont passés !");
