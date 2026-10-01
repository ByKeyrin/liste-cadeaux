/**
 * @file chargement.spec.js
 * @brief Tests E2E — Chargement de la page d'accueil (liste-cadeaux)
 * @author TEMPER — Agent QA
 *
 * @description Vérifie que la page se charge (HTTP 200), que le titre et
 *              l'en-tête sont corrects, que les éléments principaux (navs,
 *              sélecteur de tri, filtres, liste des cadeaux) sont visibles,
 *              que le compteur de résultats s'affiche et que chaque carte
 *              rendu titre + prix + lien. Un test mocke `data/wishes.js`
 *              via `page.route()` pour valider le rendu piloté par les données.
 *
 * Données de référence (src/data/wishes.js) :
 *   - Personne par défaut : "kevin" (première du tableau `people`)
 *   - Kévin possède 24 souhaits → compteur "24 cadeaux" sans filtre
 *   - Premier cadeau de Kévin : "Half Rack" — 329.99 €
 *
 * Locateurs : uniquement rôles / libellés / textes (aucun sélecteur CSS).
 * Assertions : exclusivement `expect()` auto-retrying d'Playwright.
 *
 * Exécution : npx playwright test --reporter=line
 */

import { test, expect } from '@playwright/test';

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
     * @expected Le serveur répond 200, l'en-tête (h1) et le conteneur
     *           principal (main) de la liste des cadeaux sont visibles
     */
    test('la page se charge correctement (HTTP 200, en-tête et liste visibles)', async ({ page }) => {
        await test.step('Charger la racine du site', async () => {
            const reponse = await page.goto('/');
            expect(reponse.ok()).toBe(true);
        });

        await test.step('Vérifier l\'en-tête et le conteneur principal', async () => {
            const titre = page.getByRole('heading', { level: 1, name: 'Nos listes de cadeaux' });
            await expect(titre).toBeVisible();
            await expect(titre).toContainText('Nos listes de cadeaux');

            await expect(page.getByRole('main')).toBeVisible();
        });
    });

    /**
     * @test Vérifie que le titre du document est celui attendu
     * @scenario Quand la page est chargée
     * @expected Le <title> est exactement "Nos listes de cadeaux — Kévin & Lucie"
     */
    test('le titre du document est correct', async ({ page }) => {
        await expect(page).toHaveTitle('Nos listes de cadeaux — Kévin & Lucie');
    });

    /**
     * @test Vérifie que les éléments principaux de l'interface sont visibles
     * @scenario Quand la page est chargée (état par défaut, aucun filtre)
     * @expected La nav de sélection de personne (2 onglets), la nav de filtres
     *           (sélecteur de tri + bouton "Tous"), les 24 cartes de Kévin et
     *           le bouton Admin sont tous visibles
     */
    test('les éléments principaux de l\'interface sont visibles', async ({ page }) => {
        await test.step('Vérifier les deux navigations', async () => {
            await expect(page.getByRole('navigation', { name: 'Choisir la liste' })).toBeVisible();
            await expect(page.getByRole('navigation', { name: 'Catégories de cadeaux' })).toBeVisible();
        });

        await test.step('Vérifier les onglets de personne (Kévin, Lucie)', async () => {
            await expect(page.getByRole('button', { name: 'Kévin' })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Lucie' })).toBeVisible();
        });

        await test.step('Vérifier le sélecteur de tri et le filtre "Tous"', async () => {
            await expect(page.getByRole('combobox', { name: 'Trier les cadeaux par prix' })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Filtrer par Tous' })).toBeVisible();
        });

        await test.step('Vérifier la liste des cadeaux et le bouton Admin', async () => {
            await expect(page.getByRole('article')).toHaveCount(24);
            await expect(page.getByRole('button', { name: 'Admin' })).toBeVisible();
        });
    });

    /**
     * @test Vérifie que le compteur de résultats s'affiche
     * @scenario Quand la page est chargée sans filtre actif
     * @expected Le compteur affiche "24 cadeaux" (les 24 souhaits de Kévin)
     */
    test('le compteur de résultats affiche le nombre total de cadeaux', async ({ page }) => {
        await expect(page.getByText('24 cadeaux', { exact: true })).toBeVisible();
    });

    /**
     * @test Vérifie le contenu d'une carte de cadeau
     * @scenario Quand la liste est rendue (ordre par défaut)
     * @expected La première carte ("Half Rack") affiche son titre, son prix
     *           exact ("329.99 €") et son lien "Voir le produit"
     */
    test('chaque carte affiche un titre, un prix et un lien produit', async ({ page }) => {
        const premiereCarte = page.getByRole('article').first();

        await expect(premiereCarte.getByRole('heading', { level: 2, name: 'Half Rack' })).toBeVisible();
        await expect(premiereCarte.getByRole('paragraph')).toHaveText('329.99 €');
        await expect(premiereCarte.getByRole('link', { name: 'Voir le produit' })).toBeVisible();
    });

    /**
     * @test Vérifie le rendu piloté par les données via le mock réseau
     * @scenario Quand `data/wishes.js` est intercepté par page.route() et
     *           remplacé par un jeu de données fictif (2 cadeaux Kévin)
     * @expected L'application rend exactement les données mockées : 2 cartes,
     *           compteur "2cadeaux", titres fictifs et filtres dérivés
     */
    test('affiche les données injectées via le routage réseau (page.route mock)', async ({ page }) => {
        const donneesMock = [
            'const people = [',
            "  { id: 'kevin', name: 'Kévin', emoji: '🏋️', color: '#315c4a', colorLight: 'rgba(49, 92, 74, 0.08)' },",
            "  { id: 'lucie', name: 'Lucie', emoji: '💜', color: '#7c3aed', colorLight: 'rgba(124, 58, 237, 0.08)' }",
            '];',
            'const wishesByPerson = {',
            '  kevin: [',
            "    { id: 1, name: 'Cadeau Mock A', category: 'Sport', image: '', price: 10, url: 'https://example.com/a', requiredWishes: null },",
            "    { id: 2, name: 'Cadeau Mock B', category: 'Maison', image: '', price: 20, url: 'https://example.com/b', requiredWishes: null }",
            '  ],',
            '  lucie: []',
            '};'
        ].join('\n');

        await test.step('Intercepter data/wishes.js avec un jeu de données fictif', async () => {
            await page.route('**/data/wishes.js', route => route.fulfill({
                contentType: 'application/javascript',
                body: donneesMock
            }));
            await page.evaluate(() => window.localStorage.clear());
            await page.reload();
        });

        await test.step('Vérifier le rendu des données mockées', async () => {
            await expect(page.getByRole('article')).toHaveCount(2);
            await expect(page.getByRole('heading', { level: 2, name: 'Cadeau Mock A', exact: true })).toBeVisible();
            await expect(page.getByRole('heading', { level: 2, name: 'Cadeau Mock B', exact: true })).toBeVisible();
            await expect(page.getByText('2 cadeaux', { exact: true })).toBeVisible();

            // Les filtres de catégorie sont dérivés des données mockées
            await expect(page.getByRole('button', { name: 'Filtrer par Maison' })).toBeVisible();
        });
    });

});
