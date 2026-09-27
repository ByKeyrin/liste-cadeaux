/**
 * @file architecture.md
 * @brief Documentation de l'architecture du projet "Ma Liste de Cadeaux"
 * @author Kevin Leca
 * @version 2.0
 * @date 2026
 *
 * @brief Architecture technique complète de l'application.
 */

# 🏗️ Architecture du Projet — Liste de Cadeaux

## Vue d'ensemble

L'application est un site web **vanilla JavaScript** (HTML/CSS/JS) qui gère des listes de souhaits de cadeaux pour Noël, avec support multi-personnes, filtrage, tri et mode admin.

```
┌─────────────────────────────────────────────────────────────┐
│                        NAVIGATEUR                           │
│                                                             │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐               │
│  │  index   │   │   CSS    │   │   JS     │               │
│  │  .html   │──▶│  style   │──▶│  app.js  │               │
│  │          │   │  .css    │   │          │               │
│  └──────────┘   └──────────┘   └────┬─────┘               │
│                                      │                      │
│                                      ▼                      │
│                               ┌──────────┐                 │
│                               │  data/   │                 │
│                               │ wishes.js│                 │
│                               └──────────┘                 │
│                                      │                      │
│                                      ▼                      │
│                              ┌──────────────┐              │
│                              │  localStorage │              │
│                              │  (persistance)│              │
│                              └──────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

## Structure des fichiers

```
liste-cadeaux/
├── index.html              # Page principale (structure HTML + modales)
├── css/
│   └── style.css           # Design system + styles complets (~1500 lignes)
├── js/
│   └── app.js              # Logique applicative (~870 lignes)
├── data/
│   └── wishes.js           # Données des cadeaux (personnes + souhaits)
├── images/
│   ├── chalet.jpg          # Photo de fond (fullscreen)
│   └── cadeaux/            # Photos des cadeaux individuelles
├── docs/
│   ├── html/               # Documentation Doxygen générée
│   └── architecture.md     # Ce fichier
├── tests/
│   ├── test-app.js         # Tests JS
│   └── test-plan.md        # Plan de tests
├── Doxyfile                # Configuration Doxygen
├── README.md               # Documentation du projet
├── CHANGELOG.md            # Historique des versions
├── package.json            # Configuration npm (devDependencies)
├── eslint.config.js        # Configuration ESLint
└── .gitignore
```

## Architecture logicielle

### Principe fondamental : IIFE "use strict"

Toute la logique JS est encapsulée dans une **IIFE** (Immediately Invoked Function Expression) avec `"use strict"`. Cela garantit :

- **Aucune fuite de globals** : toutes les variables sont locales au module
- **Mode strict** : erreurs plus strictes, meilleure qualité de code
- **Isolation** : le code ne pollue pas l'espace global

```javascript
(() => {
    "use strict";
    // ... toute la logique
})();
```

### Modèle de données

Les données sont structurées en deux niveaux :

#### 1. Données statiques (`data/wishes.js`)

```javascript
// Tableau global des personnes
const people = [
    { id: "kevin", name: "Kévin", emoji: "🏋️", color: "#315c4a" },
    { id: "lucie", name: "Lucie", emoji: "💜", color: "#7c3aed" }
];

// Objet global des souhaits par personne
const wishesByPerson = {
    kevin: [
        { id: 1, name: "Half Rack", category: "Sport", price: 329.99, ... },
        ...
    ],
    lucie: [...]
};
```

#### 2. Données persistantes (localStorage)

Schéma v2 :

```javascript
// Préférences utilisateur
wishlist.prefs = {
    personId: "kevin",
    sort: "price-asc",
    category: "Sport"
}

// État des modifications (ajouts/suppressions)
wishlist.state = {
    version: 2,
    added: { "kevin": [{ id: 25, name: "...", ... }] },
    deleted: { "kevin": [3, 7] },
    lastId: 24
}
```

### Système de persistance v2

Le système de persistance utilise un **modèle delta** :

| Type | Stockage | Description |
|------|----------|-------------|
| Base | `data/wishes.js` | Données d'origine (read-only) |
| Ajouts | `wishlist.state.added` | Nouveaux cadeaux ajoutés par l'utilisateur |
| Suppressions | `wishlist.state.deleted` | IDs des cadeaux supprimés |

La **liste effective** est calculée en temps réel :
```
effective = base + added - deleted
```

**Migration** : Les anciennes données (v1) sont automatiquement migrées vers le schéma v2 au premier chargement.

### Système UI

#### État réactif (`state`)

L'objet `state` est la **source de vérité** pour toute l'interface :

```javascript
const state = {
    personId: "kevin",      // Personne sélectionnée
    sort: "price-asc",      // Critère de tri
    category: "Sport",      // Filtre catégorie
    adminMode: false,       // Mode édition
    pendingUrl: null        // URL en attente (modale dépendance)
};
```

#### Pipeline de rendu

Tout changement d'état déclenche `refresh()` :

```
refresh()
  ├── renderPersonTabs()      → Onglets de personne
  ├── renderCategoryFilters() → Boutons de catégorie
  └── renderWishes()          → Grille des cartes
       ├── getWishes()        → Liste effective
       ├── filter(category)   → Filtre catégorie
       ├── sortWishes()       → Tri
       └── createWishCard()   → Carte DOM
```

### Système de dépendances

Les cadeaux peuvent avoir des **dépendances** (un cadeau nécessite l'achat d'un autre en premier) :

```javascript
{
    id: 4,
    name: "Disques Olympiques 25kg x4",
    requiredWishes: [3]  // Dépend de la barre olympique
}
```

**Flux** :
1. Clic sur "Voir le produit"
2. `getDependencies(wish)` résout les IDs en objets
3. Si dépendances existent → `showDependencyModal()`
4. Utilisateur confirme → ouvre le lien dans un nouvel onglet

### Accessibilité

| Fonctionnalité | Implémentation |
|----------------|----------------|
| Focus trap | `trapFocus()` — Tab reste dans la modale |
| Restitution du focus | `modalTriggerElement` — retour à l'élément d'origine |
| ARIA | `aria-hidden`, `aria-pressed`, `aria-label`, `aria-modal` |
| Réduced motion | `@media (prefers-reduced-motion: reduce)` |
| Navigation clavier | Échap ferme les modales |
| Contraste WCAG AA | Palette avec contraste renforcé |

### Système de design (CSS)

Le CSS utilise un **design system** basé sur les variables CSS :

| Catégorie | Variables | Description |
|-----------|-----------|-------------|
| Couleurs | `--green`, `--purple`, `--gold`, `--red` | Palette d'identité |
| Accent | `--accent`, `--accent-dark`, `--accent-rgb` | Couleur dynamique par personne |
| Fond | `--bg-primary`, `--bg-card`, `--bg-glass` | Fonds glassmorphism |
| Texte | `--text`, `--text-secondary`, `--text-muted` | Hiérarchie de texte |
| Ombres | `--shadow-sm` à `--shadow-xl` | Échelle d'ombres |
| Espacement | `--sp-1` à `--sp-16` | Grille d'espacement |
| Typographie | `--font-display`, `--font-body` | Polices Fraunces + Inter |

**Accent dynamique** : La couleur d'accent change automatiquement selon la personne sélectionnée (vert pour Kévin, violet pour Lucie) via `:has()`.

### Responsivité

| Breakpoint | Comportement |
|------------|--------------|
| > 1024px | Grille multi-colonnes (auto-fill, minmax 285px) |
| ≤ 1024px | Colonnes réduites (minmax 260px) |
| ≤ 720px | Filtres en ligne défilante, padding réduit |
| ≤ 600px | Grille en colonne unique, modale pleine largeur |
| ≤ 380px | Taille minimale des titres et onglets |

### Animations

| Animation | Utilisation | Description |
|-----------|-------------|-------------|
| `fadeInUp` | Cartes | Apparition avec translation Y |
| `snowfall` | Flocons | Chute avec oscillation X |
| `gift-wiggle` | Emoji titre | Oscillation toutes les 5s |
| `pop-in` | Boutons flottants | Scale de 0.6 à 1 |
| `fade-slide-in` | Items dépendance | Translation X |

### Flux de données complet

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  data/      │    │  localStorage│    │  Interface  │
│  wishes.js  │───▶│  (v2 delta)  │───▶│  (DOM)      │
│  (base)     │    │  added/deleted│    │             │
└─────────────┘    └──────────────┘    └──────┬──────┘
                                              │
                                              ▼
                                       ┌─────────────┐
                                       │   state     │
                                       │  (source de │
                                       │   vérité)   │
                                       └─────────────┘
```

## Points d'entrée

| Fichier | Rôle |
|---------|------|
| `index.html` | Structure HTML + modales + scripts |
| `data/wishes.js` | Chargé en premier, fournit `people` et `wishesByPerson` |
| `js/app.js` | IIFE qui initialise tout au chargement |

## Dépendances

- **Aucune dépendance runtime** — vanilla JS
- **DevDependencies** : ESLint (linting)
- **Polices** : Google Fonts (Fraunces + Inter)

## Génération de la documentation

```bash
# Installer Doxygen
sudo apt install doxygen graphviz

# Générer la documentation
doxygen Doxyfile

# Ouvrir dans le navigateur
open docs/html/index.html
```
