# 🎁 Ma Liste de Cadeaux

> Application web de gestion de listes de souhaits pour Noël — multi-personnes, responsive, avec mode admin.

![Version](https://img.shields.io/badge/version-2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Doxygen](https://img.shields.io/badge/Documentation-Doxygen-purple)

---

## ✨ Fonctionnalités

| Fonctionnalité | Description |
|----------------|-------------|
| 🎄 **Animation flocons** | Ambiance hivernale avec 35 flocons animés |
| 👥 **Multi-personnes** | Onglets Kévin / Lucie avec accent coloré dynamique |
| 🏷️ **Filtres par catégorie** | Tous, Sport, Mode, Loisir, Maison, Beauté, Cuisine |
| 🔽 **Tri par prix** | Croissant / Décroissant / Par défaut |
| ⚠️ **Système de dépendances** | Alerte si un cadeau nécessite un autre en premier |
| ✏️ **Mode admin** | Ajout / suppression de cadeaux en temps réel |
| 💾 **Persistance locale** | Préférences et modifications sauvegardées (localStorage) |
| 📱 **Responsive** | Mobile-first, 5 breakpoints adaptés |
| ♿ **Accessibilité** | Focus trap, ARIA, reduced motion, contraste WCAG AA |
| 🔄 **Migration v1→v2** | Mise à jour automatique des anciennes données |

## 🚀 Installation

```bash
# Cloner le repo
git clone https://github.com/ByKeyrin/liste-cadeaux.git
cd liste-cadeaux

# Aucune dépendance npm nécessaire — c'est du HTML/CSS/JS vanilla !

# Lancer un serveur local
npx serve .
# ou
python3 -m http.server 8000

# Ouvrir dans le navigateur
open http://localhost:3000
```

## 📁 Structure du projet

```
liste-cadeaux/
├── index.html              # Page principale (240 lignes)
├── css/
│   └── style.css           # Design system + styles (~1500 lignes)
├── js/
│   └── app.js              # Logique applicative (~900 lignes)
├── data/
│   └── wishes.js           # Données des cadeaux (24 cadeaux, 2 personnes)
├── images/
│   ├── chalet.jpg          # Photo de fond fullscreen
│   └── cadeaux/            # Photos des cadeaux (30+ images)
├── docs/
│   ├── architecture.md     # Documentation architecture
│   └── html/               # Documentation Doxygen générée
├── tests/
│   ├── test-app.js         # Tests unitaires
│   └── test-plan.md        # Plan de tests
├── Doxyfile                # Configuration Doxygen
├── README.md               # Ce fichier
├── CHANGELOG.md            # Historique des versions
├── package.json            # Configuration npm
├── eslint.config.js        # Configuration ESLint
└── .gitignore
```

## 🎨 Personnalisation

### Ajouter un cadeau

Éditez `data/wishes.js` :

```javascript
{
    id: 25,                           // ID unique (ne pas réutiliser)
    name: "Nom du cadeau",
    category: "Sport",                // Sport, Mode, Loisir, Maison, Beauté, Cuisine
    image: "images/cadeaux/image.jpg",
    price: 99.99,
    url: "https://lien-vers-produit.com",
    requiredWishes: null              // ou [id1, id2] pour les dépendances
}
```

### Ajouter une personne

Dans `data/wishes.js`, ajoutez dans le tableau `people` :

```javascript
{
    id: "nouvelle-personne",
    name: "Prénom",
    emoji: "🎉",
    color: "#hex-color",
    colorLight: "rgba(...)"
}
```

Puis créez sa liste dans `wishesByPerson` :

```javascript
wishesByPerson["nouvelle-personne"] = [
    { id: 200, name: "Cadeau 1", ... },
    { id: 201, name: "Cadeau 2", ... }
];
```

### Ajouter une catégorie

Dans `css/style.css`, ajoutez l'icône dans `CATEGORY_ICONS` (dans `js/app.js`) :

```javascript
const CATEGORY_ICONS = {
    // ... existantes ...
    "NouvelleCat": "🎯"
};
```

Les catégories sont détectées automatiquement depuis les données.

## 🛠️ Développement

| Commande | Description |
|----------|-------------|
| `npx serve .` | Lancer un serveur local |
| `npx eslint js/` | Vérifier le code JS |
| `doxygen Doxyfile` | Générer la documentation |

## 📖 Documentation

La documentation Doxygen est accessible dans `docs/html/index.html` après génération :

```bash
doxygen Doxyfile
open docs/html/index.html
```

Elle contient :
- Documentation de chaque fonction JavaScript
- Documentation des variables CSS
- Diagrammes d'architecture
- Index de tous les symboles

## 🏗️ Architecture

Voir [docs/architecture.md](docs/architecture.md) pour la documentation technique complète.

### Résumé

- **Pattern** : IIFE "use strict" — aucun global
- **Persistance** : localStorage avec schéma v2 (delta : ajouts + suppressions)
- **Rendu** : DOM dynamique avec DocumentFragment pour les performances
- **Design** : CSS Variables + glassmorphism + accent dynamique
- **Accessibilité** : Focus trap, ARIA, reduced motion

## 📊 Statistiques

| Métrique | Valeur |
|----------|--------|
| Lignes de code JS | ~900 |
| Lignes de CSS | ~1500 |
| Lignes HTML | ~240 |
| Cadeaux | 24 (2 personnes) |
| Catégories | 6 |
| Animations CSS | 5 |
| Breakpoints responsive | 5 |

## 📄 Licence

MIT — Voir [LICENSE](LICENSE)

## 👨‍💻 Auteur

**Kevin Leca** — [GitHub @ByKeyrin](https://github.com/ByKeyrin)

---

*Fait avec ❤️ pour Kévin & Lucie*
# CI trigger
