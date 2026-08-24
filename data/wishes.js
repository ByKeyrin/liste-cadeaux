const wishes = [
    {
        id: 1,
        name: "Half Rack",
        image: "images/cadeaux/half-rack.jpg",
        price: 329.99,
        url: "https://shop.sveltus.com/fr/p/1390-half-rack-3412181040046.html",
        requiredWishes: null
    },

    {
        id: 2,
        name: "Banc Plat",
        image: "images/cadeaux/banc-plat.jpg",
        price: 129.99,
        url: "https://shop.sveltus.com/fr/p/1614-banc-plat-3412181078049.html",
        requiredWishes: null
    },
	
	{
        id: 3,
        name: "Barre Olympique",
        image: "images/cadeaux/barre-training-homme-220-cm.jpg",
        price: 229.99,
        url: "https://shop.sveltus.com/fr/p/1376-barre-training-homme-220-cm-3412181016751.html",
        requiredWishes: [1]
    },

    {
        id: 4,
        name: "Disques Olympiques 25kg x4",
        image: "images/cadeaux/disque-olympique-competition-25.jpg",
        price: 189.99,
        url: "https://shop.sveltus.com/fr/p/1773-3371-disque-olympique-competition-x1.html#/163-epaisseur_cm_-5/282-poids_kg_1-25_kg/568-durete_shore_a-85/574-couleur_2-rouge_2",
        requiredWishes: [3]
    },
	
	{
        id: 5,
        name: "Disques Olympiques 20kg x2",
        image: "images/cadeaux/disque-olympique-competition-20.jpg",
        price: 159.99,
        url: "https://shop.sveltus.com/fr/p/1773-3370-disque-olympique-competition-x1.html#/272-poids_kg_1-20_kg/453-epaisseur_cm_-4/568-durete_shore_a-85/573-couleur_2-bleu",
        requiredWishes: [3]
    },

    {
        id: 6,
        name: "Disques Olympiques 15kg x2",
        image: "images/cadeaux/disque-olympique-competition-15.jpg",
        price: 123.99,
        url: "https://shop.sveltus.com/fr/p/1773-3369-disque-olympique-competition-x1.html#/262-poids_kg_1-15_kg/452-epaisseur_cm_-35/568-durete_shore_a-85/572-couleur_2-jaune_2",
        requiredWishes: [3]
    },
	
	{
        id: 7,
        name: "Disques Olympiques 10kg x4",
        image: "images/cadeaux/disque-olympique-competition-10.jpg",
        price: 92.99,
        url: "https://shop.sveltus.com/fr/p/1773-3368-disque-olympique-competition-x1.html#/161-epaisseur_cm_-3/252-poids_kg_1-10_kg/568-durete_shore_a-85/571-couleur_2-vert",
        requiredWishes: [3]
    },

    {
        id: 8,
        name: "Disques Olympiques 5kg x2",
        image: "images/cadeaux/disque-olympique-competition-x1.jpg",
        price: 49.99,
        url: "https://shop.sveltus.com/fr/p/1773-3367-disque-olympique-competition-x1.html#/160-epaisseur_cm_-25/242-poids_kg_1-5_kg/567-durete_shore_a-95/570-couleur_2-gris",
        requiredWishes: [3]
    },

    {
        id: 9,
        name: "Stop disque barre olympique Orange",
        image: "images/cadeaux/stop-disque-barre-olympique-x2.jpg",
        price: 13.99,
        url: "https://shop.sveltus.com/fr/p/2077-4542-stop-disque-barre-olympique-x2.html#/810-modele_de_stop_disque-plastique/813-couleur_stop_disque-orange",
        requiredWishes: [3]
    },

    {
        id: 10,
        name: "Haltères hexagonale 25kg x2",
        image: "images/cadeaux/haltere-hexagonale-25.jpg",
        price: 82.50,
        url: "https://shop.sveltus.com/fr/p/1451-712-haltere-hexagonale-x1.html#/181-longueur_cm_apres_poids-36/201-largeur_cm_-185/221-hauteur_cm_-165/233-o_poignee_cm_-35/282-poids_kg_1-25_kg",
        requiredWishes: [2]
    },

    {
        id: 10,
        name: "Haltères hexagonale 30kg x2",
        image: "images/cadeaux/haltere-hexagonale-30.jpg",
        price: 99,
        url: "https://shop.sveltus.com/fr/p/1451-714-haltere-hexagonale-x1.html#/183-longueur_cm_apres_poids-375/203-largeur_cm_-195/222-hauteur_cm_-17/233-o_poignee_cm_-35/292-poids_kg_1-30_kg",
        requiredWishes: [2]
    },

    {
        id: 10,
        name: "Haltères hexagonale 35kg x2",
        image: "images/cadeaux/haltere-hexagonale-35.jpg",
        price: 115.50,
        url: "https://shop.sveltus.com/fr/p/1451-716-haltere-hexagonale-x1.html#/185-longueur_cm_apres_poids-39/205-largeur_cm_-21/224-hauteur_cm_-18/233-o_poignee_cm_-35/302-poids_kg_1-35_kg",
        requiredWishes: [2]
    }
];