/**
 * @file chargement.spec.js
 * @brief Tests E2E — Chargement de la page d'accueil (liste-cadeaux)
 * @author TEMPER — Agent QA
 *
 * @description Vérifie que la page se charge, que le titre est correct,
 *              que les éléments principaux (navs, liste, filtres) sont
 *              visibles et que le compteur de résultats s'affiche.
 *
 * Données de référence (data/wishes.js) :
 *   - Personne par défaut : "kevin" (première du tableau `people`)
 *   - Kevin possède 24 souhaits → compteur "24 cadeaux" sans filtre
 *
 * Exécution : npx playwright test --reporter=line
 */

import { test, expect } from '@playwright/test';

/** Alias Jest-style : les suites utilisent describe/it pour la lisibilité */
const it = test;

test.describe('Chargement de la page', () => {

    /**
     * Avant chaque test : nettoyage du localStorage pour garantir
     * l'autonomie des tests (état de départ identique partout).
     * On navigue, on vide le stockage, puis on recharge : l'application
     * repart alors de ses valeurs par défaut.
     */
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => window.localStorage.clear());
        await page.reload();
    });

    /**
     * @test Vérifie que la page d'accueil se charge correctement
     * @scenario Quand on navigue vers la racine du site
     * @expected Le serveur répond 200, l'en-tête et le conteneur de la
     *           liste des cadeaux sont présents et visibles
     */
    it('la page se charge correctement (statut HTTP 200, conteneur principal visible)', async ({ page }) => {
        const response = await page.goto('/');
        expect(response.ok()).toBe(true);

        // En-tête principal
        const titre = page.locator('header h1');
        await expect(titre).toBeVisible();
        await expect(titre).toContainText('Nos listes de cadeaux');

        // Conteneur de la liste des cadeaux
        await expect(page.locator('#wishlist')).toBeVisible();
    });

    /**
     * @test Vérifie que le titre du document est celui attendu
     * @scenario Quand la page est chargée
     * @expected Le <title> est exactement "Nos listes de cadeaux — Kévin & Lucie"
     */
    it('le titre du document est correct', async ({ page }) => {
        await expect(page).toHaveTitle('Nos listes de cadeaux — Kévin & Lucie');
    });

    /**
     * @test Vérifie que les éléments principaux de l'interface sont visibles
     * @scenario Quand la page est chargée (état par défaut, aucun filtre)
     * @expected La nav de sélection de personne, la nav de filtres (avec le
     *           sélecteur de tri et le bouton "Tous"), la liste des cadeaux
     *           et le bouton admin sont tous visibles
     */
    it('les éléments principaux sont visibles (navs, liste, filtres)', async ({ page }) => {
        // Nav de sélection de personne : 2 onglets (Kévin, Lucie)
        await expect(page.locator('#person-selector')).toBeVisible();
        await expect(page.locator('#person-selector .person-tab')).toHaveCount(2);
        await expect(page.locator('.person-tab[data-person="kevin"]')).toBeVisible();
        await expect(page.locator('.person-tab[data-person="lucie"]')).toBeVisible();

        // Nav de filtres : bouton "Tous" + sélecteur de tri
        await expect(page.locator('#category-filters')).toBeVisible();
        await expect(page.locator('.category-button[aria-label="Filtrer par Tous"]')).toBeVisible();
        await expect(page.locator('#sort-select')).toBeVisible();

        // Liste des cadeaux : les 24 souhaits de Kévin sont rendus
        await expect(page.locator('#wishlist .wish-card')).toHaveCount(24);

        // Bouton de bascule du mode admin
        await expect(page.locator('#admin-toggle')).toBeVisible();
    });

    /**
     * @test Vérifie que le compteur de résultats s'affiche
     * @scenario Quand la page est chargée sans filtre actif
     * @expected Le compteur affiche "24 cadeaux" (les 24 souhaits de Kévin)
     */
    it('le compteur de résultats s\'affiche avec le nombre total de cadeaux', async ({ page }) => {
        const compteur = page.locator('#result-counter');
        await expect(compteur).toBeVisible();
        await expect(compteur).toHaveText('24 cadeaux');
    });

});
