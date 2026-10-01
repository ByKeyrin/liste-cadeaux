/**
 * @file filtres.spec.js
 * @brief Tests E2E — Filtres par catégorie et par personne (liste-cadeaux)
 * @author TEMPER — Agent QA
 *
 * @description Vérifie le filtrage par catégorie (Sport, Loisir, …),
 *              le changement de personne (Kévin ↔ Lucie), le filtre par
 *              défaut "Tous" et la sauvegarde des filtres dans localStorage.
 *
 * Données de référence (data/wishes.js) :
 *   - Kévin : 24 souhaits — Sport (15), Mode (6), Loisir (3)
 *   - Lucie :  3 souhaits — Beauté (1), Maison (2)
 *   - Compteur filtré : "X sur 24 cadeaux" (format giftLabel de l'app)
 *   - Changer de personne réinitialise la catégorie à "Tous"
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

test.describe('Filtres par catégorie et par personne', () => {

    /**
     * Avant chaque test : nettoyage du localStorage (tests autonomes,
     * état de départ par défaut : personne "kevin", catégorie "Tous").
     */
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => window.localStorage.clear());
        await page.reload();
    });

    /**
     * @test Vérifie le filtrage par catégorie
     * @scenario Quand on clique sur le bouton de catégorie "Sport"
     * @expected Seules les cartes de catégorie Sport sont affichées (15 cartes,
     *           badge "Sport" sur chacune) et le compteur passe à "15 sur 24 cadeaux"
     */
    it('filtre les cadeaux par catégorie Sport', async ({ page }) => {
        await page.locator('.category-button[aria-label="Filtrer par Sport"]').click();

        const badges = await page.locator('#wishlist .wish-card .category-badge').allTextContents();
        expect(badges.length).toBe(15);
        badges.forEach(badge => expect(badge).toBe('Sport'));

        // Compteur : "X sur N cadeaux" quand un filtre est actif
        await expect(page.locator('#result-counter')).toHaveText('15 sur 24 cadeaux');

        // Le bouton actif est marqué (classe + aria-pressed)
        await expect(page.locator('.category-button[aria-label="Filtrer par Sport"]'))
            .toHaveClass(/active/);
        await expect(page.locator('.category-button[aria-label="Filtrer par Sport"]'))
            .toHaveAttribute('aria-pressed', 'true');
    });

    /**
     * @test Vérifie le changement de personne
     * @scenario Quand on clique sur l'onglet "Lucie"
     * @expected La liste de Lucie s'affiche (3 cadeaux), son onglet devient actif
     *           et le filtre catégorie revient à "Tous" (chaque personne a ses
     *           propres catégories)
     */
    it('change de personne et affiche la liste correspondante', async ({ page }) => {
        await page.locator('.person-tab[data-person="lucie"]').click();

        // Onglet Lucie actif, onglet Kévin inactif
        await expect(page.locator('.person-tab[data-person="lucie"]'))
            .toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('.person-tab[data-person="lucie"]')).toHaveClass(/active/);
        await expect(page.locator('.person-tab[data-person="kevin"]'))
            .toHaveAttribute('aria-pressed', 'false');

        // La liste de Lucie (3 souhaits) remplace celle de Kévin
        await expect(page.locator('#wishlist .wish-card')).toHaveCount(3);
        await expect(page.locator('#result-counter')).toHaveText('3 cadeaux');
        await expect(page.locator('#wishlist .wish-card h2').first())
            .toHaveText('Dolce & Gabbana Light Blue Capri In Love Eau de Parfum');

        // Le filtre catégorie est réinitialisé à "Tous"
        await expect(page.locator('.category-button[aria-label="Filtrer par Tous"]'))
            .toHaveClass(/active/);
    });

    /**
     * @test Vérifie que le filtre par défaut "Tous" affiche tous les cadeaux
     * @scenario Quand on clique "Sport" puis le bouton "Tous"
     * @expected La liste complète est restaurée (24 cartes, compteur "24 cadeaux",
     *           plusieurs catégories présentes)
     */
    it('le filtre par défaut "Tous" affiche tous les cadeaux', async ({ page }) => {
        // Filtre intermédiaire pour prouver le retour à "Tous"
        await page.locator('.category-button[aria-label="Filtrer par Sport"]').click();
        await expect(page.locator('#wishlist .wish-card')).toHaveCount(15);

        await page.locator('.category-button[aria-label="Filtrer par Tous"]').click();

        await expect(page.locator('#wishlist .wish-card')).toHaveCount(24);
        await expect(page.locator('#result-counter')).toHaveText('24 cadeaux');
        await expect(page.locator('.category-button[aria-label="Filtrer par Tous"]'))
            .toHaveClass(/active/);

        // Plusieurs catégories distinctes sont de nouveau présentes
        const badges = await page.locator('#wishlist .wish-card .category-badge').allTextContents();
        expect(new Set(badges).size).toBeGreaterThan(1);
    });

    /**
     * @test Vérifie que les filtres sont sauvegardés dans localStorage
     * @scenario Quand on clique sur "Loisir" puis qu'on passe à Lucie
     * @expected La catégorie "Loisir" est enregistrée dans "wishlist.prefs" ;
     *           après le changement de personne, personId vaut "lucie" et la
     *           catégorie est réinitialisée à "Tous"
     */
    it('sauvegarde les filtres dans localStorage', async ({ page }) => {
        // Filtre catégorie "Loisir" → enregistré immédiatement
        await page.locator('.category-button[aria-label="Filtrer par Loisir"]').click();

        let prefs = await lirePrefs(page);
        expect(prefs.category).toBe('Loisir');
        expect(prefs.personId).toBe('kevin');

        // Changement de personne → personId enregistré, catégorie réinitialisée
        await page.locator('.person-tab[data-person="lucie"]').click();

        prefs = await lirePrefs(page);
        expect(prefs.personId).toBe('lucie');
        expect(prefs.category).toBe('Tous');
    });

});
