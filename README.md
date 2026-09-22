# 🎁 Ma Liste de Cadeaux

Site web de liste de souhaits pour Noël avec animations et fonctionnalités interactives.

## ✨ Fonctionnalités

- 🎄 **Animation flocons** — Ambiance hivernale
- 🏷️ **Filtres par catégorie** — Mode, Sport, Loisir
- 🔽 **Tri par prix** — Croissant / Décroissant
- ⚠️ **Système de dépendances** — Alerte si un cadeau en nécessite un autre
- 📱 **Responsive** — Fonctionne sur mobile et desktop

## 🚀 Installation

```bash
# Cloner le repo
git clone https://github.com/ByKeyrin/liste-cadeaux.git

# Ouvrir dans un navigateur
open index.html
```

Aucune dépendance npm nécessaire — c'est du **HTML/CSS/JS vanilla** !

## 📁 Structure du projet

```
liste-cadeaux/
├── index.html          # Page principale
├── css/
│   └── style.css       # Styles + animations
├── js/
│   └── app.js          # Logique JavaScript
├── data/
│   └── wishes.js       # Données des cadeaux
├── images/
│   └── cadeaux/        # Photos des cadeaux
└── README.md
```

## 🎨 Personnalisation

### Ajouter un cadeau

Éditez `data/wishes.js` :

```javascript
{
    id: 24,
    name: "Nom du cadeau",
    category: "Sport",     // ou "Mode", "Loisir"
    image: "images/cadeaux/image.jpg",
    price: 99.99,
    url: "https://lien-vers-produit.com",
    requiredWishes: null   // ou [id1, id2] pour les dépendances
}
```

### Ajouter une catégorie

Dans `index.html`, ajoutez un bouton :

```html
<button class="category-button" data-category="NouvelleCat">
    🎯 Nouvelle Catégorie
</button>
```

## 🛠️ Développement

| Commande | Description |
|----------|-------------|
| `npx serve .` | Lancer un serveur local |
| `npx eslint js/` | Vérifier le code JS |

## 📄 Licence

MIT

---

*Fait avec ❤️ par Kevin*
