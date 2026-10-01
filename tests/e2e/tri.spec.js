/**
 * @file tri.spec.js
 * @brief Tests E2E — Tri des cadeaux par prix (liste-cadeaux)
 * @author TEMPER — Agent QA
 *
 * @description Vérifie le tri par prix croissant/décroissant, l'ordre
 *              original par défaut et la sauvegarde du tri dans localStorage.
 *
 * Données de référence (liste de Kévin, 24 souhaits) :
 *   - Prix le plus bas  : 13.99 €  → "Stop disque barre olympique Orange" (id 9)
 *   - Prix le plus haut : 599.00 € → "Appareil Photo - Olympus E-M10 Mark II" (id 24)
 *   - Ordre par défaut  : ordre du fichier data/wishes.js
 *     → premier "Half Rack" (id 1), dernier "Olympus" (id 24)
 *
 * Le tri est appliqué via le <select id="sort-select">
 * (valeurs : "default", "price-asc", "price-desc") et sauvegardé
 * dans localStorage sous la clé "wishlist.prefs".
 *
 * Exécution : npx playwright test --reporter=line
 */

import { test, expect } from '@playwright/test';

/** Alias Jest-style : les suites utilisent describe/it pour la lisibilité */
const it = test;

/**
 * @brief Lit les prix affichés sur les cartes de la liste
 * @param {import('@playwright/test').Page} page - Page Playwright
 * @returns {Promise<number[]>} Prix extraits du DOM, dans l'ordre d'affichage
 * @description Les prix sont formatés par l'appex (ex : "13.99 €") ;
 *              on retire le symbole € et on parse le nombre.
 */
async function getPrixAffiches(page) {
    const textes = await page.locator('#wishlist .wish-card .wish-price').allTextContents();
    return textes.map(texte => parseFloat(texte.replace('€', '').trim()));
}

test.describe('Tri des cadeaux par prix', () => {

    /**
     * Avant chaque test : nettoyage du localStorage (tests autonomes,
     * état de départ par défaut : personne "kevin", tri "default").
     */
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => window.localStorage.clear());
        await page.reload();
    });

    /**
     * @test Vérifie le tri par prix croissant
     * @scenario Quand on sélectionne "Prix croissant" dans le sélecteur de tri
     * @expected Les prix affichés sont ordonnés du plus petit au plus grand ;
     *           le premier cadeau est le moins cher (13.99 €) et le dernier
     *           le plus cher (599.00 €)
     */
    it('trie les cadeaux par prix croissant', async ({ page }) => {
        await page.locator('#sort-select').selectOption('price-asc');

        const prix = await getPrixAffiches(page);
        expect(prix.length).toBe(24);

        // Vérification monotone croissante
        for (let i = 1; i < prix.length; i++) {
            expect(prix[i], `prix[${i}]=${prix[i]} doit être ≥ prix[${i - 1}]=${prix[i - 1]}`)
                .toBeGreaterThanOrEqual(prix[i - 1]);
        }

        // Bornes de la liste triée
        expect(prix[0]).toBe(13.99);
        expect(prix[prix.length - 1]).toBe(599);

        // Premier élément identifié par son nom
        await expect(page.locator('#wishlist .wish-card h2').first())
            .toHaveText('Stop disque barre olympique Orange');

        // Le sélecteur reflète la valeur choisie
        await expect(page.locator('#sort-select')).toHaveValue('price-asc');
    });

    /**
     * @test Vérifie le tri par prix décroissant
     * @scenario Quand on sélectionne "Prix décroissant" dans le sélecteur de tri
     * @expected Les prix affichés sont ordonnés du plus grand au plus petit ;
     *           le premier cadeau est le plus cher (599.00 €) et le dernier
     *           le moins cher (13.99 €)
     */
    it('trie les cadeaux par prix décroissant', async ({ page }) => {
        await page.locator('#sort-select').selectOption('price-desc');

        const prix = await getPrixAffiches(page);
        expect(prix.length).toBe(24);

        // Vérification monotone décroissante
        for (let i = 1; i < prix.length; i++) {
            expect(prix[i], `prix[${i}]=${prix[i]} doit être ≤ prix[${i - 1}]=${prix[i - 1]}`)
                .toBeLessThanOrEqual(prix[i - 1]);
        }

        // Bornes de la liste triée
        expect(prix[0]).toBe(599);
        expect(prix[prix.length - 1]).toBe(13.99);

        // Premier élément identifié par son nom
        await expect(page.locator('#wishlist .wish-card h2').first())
            .toHaveText('Appareil Photo - Olympus E-M10 Mark II');

        // Le sélecteur reflète la valeur choisie
        await expect(page.locator('#sort-select')).toHaveValue('price-desc');
    });

    /**
     * @test Vérifie que l'ordre par défaut est l'ordre original des données
     * @scenario Quand la page est chargée sans aucune préférence (localStorage vide)
     * @expected Le tri est "default", la liste suit l'ordre de data/wishes.js :
     *           premier "Half Rack", dernier "Olympus", 24 cartes au total
     */
    it('affiche l\'ordre original par défaut (ordre du fichier de données)', async ({ page }) => {
        // Aucune action de tri : l'état de départ doit être "default"
        await expect(page.locator('#sort-select')).toHaveValue('default');

        const cartes = page.locator('#wishlist .wish-card h2');
        await expect(cartes).toHaveCount(24);

        // Premier et dernier cadeau de la liste d'origine
        await expect(cartes.first()).toHaveText('Half Rack');
        await expect(cartes.last()).toHaveText('Appareil Photo - Olympus E-M10 Mark II');
    });

    /**
     * @test Vérifie que la valeur du tri est sauvegardée dans localStorage
     * @scenario Quand on change le tri en "Prix décroissant"
     * @expected La clé "wishlist.prefs" contient un JSON dont le champ sort
     *           vaut "price-desc" (les autres préférences restent par défaut)
     */
    it('sauvegarde la valeur du tri dans localStorage', async ({ page }) => {
        await page.locator('#sort-select').selectOption('price-desc');

        const brut = await page.evaluate(() => window.localStorage.getItem('wishlist.prefs'));
        expect(brut).not.toBeNull();

        const prefs = JSON.parse(brut);
        expect(prefs.sort).toBe('price-desc');
        expect(prefs.personId).toBe('kevin');
        expect(prefs.category).toBe('Tous');
    });

});
