/**
 * @file persistance.spec.js
 * @brief Tests E2E — Persistance des préférences dans localStorage (liste-cadeaux)
 * @author TEMPER — Agent QA
 *
 * @description Vérifie que les préférences (personne, tri, catégorie) sont
 *              sauvegardées dans localStorage et restaurées après rechargement.
 *
 * Schéma de l'appex (js/app.js) :
 *   - Clé "wishlist.prefs" : JSON { personId, sort, category }
 *   - L'app sauvegarde ses défauts au démarrage (savePrefs() en fin d'init)
 *   - Toute action utilisateur (onglet personne, select tri, bouton catégorie)
 *     met à jour cette clé immédiatement
 *   - Au chargement, loadPrefs() restaure l'état ; une personne obsolète
 *     retombe sur la personne par défaut
 *
 * Données de référence (data/wishes.js) :
 *   - Lucie : 3 souhaits — Beauté (1), Maison (2 : 30 € et 10 €)
 *   - Lucie + Maison + tri prix croissant → 2 cartes : "10.00 €" puis "30.00 €"
 *     et compteur "2 sur 3 cadeaux"
 *
 * Exécution : npx playwright test --reporter=line
 */

import { test, expect } from '@playwright/test';

/** Alias Jest-style : les suites utilisent describe/it pour la lisibilité */
const it = test;

/**
 * @brief Lit les préférences sauvegardées dans localStorage
 * @param {import('@playwright/test').Page} page - Page Playwright
 * @returns {Promise<Object>} Objet parsé de la clé "wishlist.prefs"
 */
async function lirePrefs(page) {
    const brut = await page.evaluate(() => window.localStorage.getItem('wishlist.prefs'));
    return JSON.parse(brut);
}

/**
 * @brief Lit les prix affichés sur les cartes de la liste
 * @param {import('@playwright/test').Page} page - Page Playwright
 * @returns {Promise<number[]>} Prix extraits du DOM, dans l'ordre d'affichage
 */
async function getPrixAffiches(page) {
    const textes = await page.locator('#wishlist .wish-card .wish-price').allTextContents();
    return textes.map(texte => parseFloat(texte.replace('€', '').trim()));
}

test.describe('Persistance des préférences (localStorage)', () => {

    /**
     * Avant chaque test : nettoyage du localStorage (tests autonomes).
     * On navigue, on vide le stockage puis on recharge : l'application
     * repart de ses défauts et réenregistre l'état initial.
     */
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => window.localStorage.clear());
        await page.reload();
    });

    /**
     * @test Vérifie l'enregistrement automatique des défauts au chargement
     * @scenario Quand la page se charge pour la première fois (localStorage vide)
     * @expected L'app écrit ses préférences par défaut dans "wishlist.prefs" :
     *           personne "kevin", tri "default", catégorie "Tous"
     */
    it('enregistre les préférences par défaut au premier chargement', async ({ page }) => {
        const prefs = await lirePrefs(page);
        expect(prefs).toEqual({
            personId: 'kevin',
            sort: 'default',
            category: 'Tous'
        });
        await expect(page.locator('#sort-select')).toHaveValue('default');
    });

    /**
     * @test Vérifie la sauvegarde de la sélection de personne
     * @scenario Quand on clique sur l'onglet "Lucie"
     * @expected Le champ personId de "wishlist.prefs" vaut "lucie"
     */
    it('sauvegarde la sélection de personne dans localStorage', async ({ page }) => {
        await page.locator('.person-tab[data-person="lucie"]').click();

        const prefs = await lirePrefs(page);
        expect(prefs.personId).toBe('lucie');
        expect(prefs.sort).toBe('default');
        expect(prefs.category).toBe('Tous');
    });

    /**
     * @test Vérifie la sauvegarde du tri et de la catégorie
     * @scenario Quand on sélectionne "Prix décroissant" puis le filtre "Loisir"
     * @expected Les champs sort et category de "wishlist.prefs" valent
     *           "price-desc" et "Loisir"
     */
    it('sauvegarde le tri et la catégorie dans localStorage', async ({ page }) => {
        await page.locator('#sort-select').selectOption('price-desc');
        await page.locator('.category-button[aria-label="Filtrer par Loisir"]').click();

        const prefs = await lirePrefs(page);
        expect(prefs.sort).toBe('price-desc');
        expect(prefs.category).toBe('Loisir');
        expect(prefs.personId).toBe('kevin');
    });

    /**
     * @test Vérifie la restauration complète des préférences après rechargement
     * @scenario Quand on choisit Lucie + catégorie "Maison" + tri "Prix croissant",
     *           puis qu'on recharge la page
     * @expected Après le rechargement : onglet Lucie actif, tri "price-asc",
     *           catégorie "Maison" active, 2 cartes (Maison de Lucie) triées
     *           10.00 € → 30.00 € et compteur "2 sur 3 cadeaux"
     */
    it('restaure toutes les préférences après rechargement', async ({ page }) => {
        // Phase d'action : on construit un état complet
        await page.locator('.person-tab[data-person="lucie"]').click();
        await page.locator('.category-button[aria-label="Filtrer par Maison"]').click();
        await page.locator('#sort-select').selectOption('price-asc');

        // Rechargement de la page (même onglet, mêmes cookies)
        await page.reload();

        // Onglet Lucie restauré et actif
        await expect(page.locator('.person-tab[data-person="lucie"]'))
            .toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('.person-tab[data-person="lucie"]')).toHaveClass(/active/);

        // Tri restauré
        await expect(page.locator('#sort-select')).toHaveValue('price-asc');

        // Catégorie restaurée et active
        await expect(page.locator('.category-button[aria-label="Filtrer par Maison"]'))
            .toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('.category-button[aria-label="Filtrer par Maison"]'))
            .toHaveClass(/active/);

        // Contenu restauré : 2 bouteilles isothermes de Lucie, triées 10 € → 30 €
        await expect(page.locator('#wishlist .wish-card')).toHaveCount(2);
        const prix = await getPrixAffiches(page);
        expect(prix).toEqual([10, 30]);
        await expect(page.locator('#result-counter')).toHaveText('2 sur 3 cadeaux');

        // Le stockage reflète bien l'état restauré
        const prefs = await lirePrefs(page);
        expect(prefs).toEqual({
            personId: 'lucie',
            sort: 'price-asc',
            category: 'Maison'
        });
    });

});
