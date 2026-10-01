/**
 * @file filtres.spec.js
 * @brief Tests E2E — Filtres par catégorie et par personne (liste-cadeaux)
 * @author TEMPER — Agent QA
 *
 * @description Vérifie le filtrage par catégorie (Sport, Loisir, …), le
 *              retour au filtre "Tous", le changement de personne
 *              (Kévin ↔ Lucie), la réinitialisation du filtre catégorie au
 *              changement de personne, et la sauvegarde des filtres dans
 *              localStorage.
 *
 * Données de référence (src/data/wishes.js) :
 *   - Kévin : 24 souhaits — Sport (15), Mode (6), Loisir (3)
 *   - Lucie :  3 souhaits — Beauté (1), Maison (2)
 *   - Compteur filtré : "X sur 24 cadeaux" (format giftLabel de l'appex)
 *   - Changer de personne réinitialise la catégorie à "Tous" et supprime
 *     les boutons de catégorie qui n'existent plus pour la nouvelle liste
 *
 * Locateurs : uniquement rôles / libellés / textes (aucun sélecteur CSS).
 * Les badges de catégorie sont lus via getByText(..., { exact: true })
 * dans le scope de chaque carte (<article>).
 *
 * Exécution : npx playwright test --reporter=line
 */

import { test, expect } from '@playwright/test';

/**
 * @brief Lit les préférences sauvegardées dans localStorage
 * @param {import('@playwright/test').Page} page - Page Playwright
 * @returns {Promise<Object>} Objet parsé de la clé "wishlist.prefs"
 */
async function lirePrefs(page) {
    return page.evaluate(() => JSON.parse(window.localStorage.getItem('wishlist.prefs')));
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
     * @test Vérifie le filtrage par catégorie Sport
     * @scenario Quand on clique sur le bouton de catégorie "Sport"
     * @expected Seules les 15 cartes de catégorie Sport sont affichées
     *           (badge "Sport" sur chacune), le compteur passe à
     *           "15 sur 24 cadeaux" et le bouton Sport est marqué actif
     */
    test('filtre les cadeaux par catégorie Sport', async ({ page }) => {
        await test.step('Activer le filtre Sport', async () => {
            await page.getByRole('button', { name: 'Filtrer par Sport' }).click();
        });

        await test.step('Vérifier les cartes affichées et le compteur', async () => {
            await expect(page.getByRole('article')).toHaveCount(15);
            await expect(page.getByText('15 sur 24 cadeaux', { exact: true })).toBeVisible();

            // Chaque carte affichée porte le badge "Sport"
            await expect(page.getByRole('article').getByText('Sport', { exact: true }))
                .toHaveCount(15);
        });

        await test.step('Vérifier l\'état actif des boutons de filtre', async () => {
            await expect(page.getByRole('button', { name: 'Filtrer par Sport' }))
                .toHaveAttribute('aria-pressed', 'true');
            await expect(page.getByRole('button', { name: 'Filtrer par Tous' }))
                .toHaveAttribute('aria-pressed', 'false');
        });
    });

    /**
     * @test Vérifie le filtrage par catégorie Loisir
     * @scenario Quand on clique sur le bouton de catégorie "Loisir"
     * @expected Seules les 3 cartes Loisir sont affichées et le compteur
     *           passe à "3 sur 24 cadeaux"
     */
    test('filtre les cadeaux par catégorie Loisir', async ({ page }) => {
        await test.step('Activer le filtre Loisir', async () => {
            await page.getByRole('button', { name: 'Filtrer par Loisir' }).click();
        });

        await test.step('Vérifier les cartes affichées et le compteur', async () => {
            await expect(page.getByRole('article')).toHaveCount(3);
            await expect(page.getByText('3 sur 24 cadeaux', { exact: true })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Filtrer par Loisir' }))
                .toHaveAttribute('aria-pressed', 'true');
        });
    });

    /**
     * @test Vérifie que le filtre par défaut "Tous" restaure la liste complète
     * @scenario Quand on clique "Sport" puis le bouton "Tous"
     * @expected La liste complète est restaurée (24 cartes, compteur
     *           "24 cadeaux"), le bouton "Tous" est actif et plusieurs
     *           catégories sont de nouveau présentes
     */
    test('le bouton "Tous" restaure tous les cadeaux', async ({ page }) => {
        await test.step('Filtrer par Sport (état intermédiaire)', async () => {
            await page.getByRole('button', { name: 'Filtrer par Sport' }).click();
            await expect(page.getByRole('article')).toHaveCount(15);
        });

        await test.step('Revenir au filtre "Tous"', async () => {
            await page.getByRole('button', { name: 'Filtrer par Tous' }).click();
        });

        await test.step('Vérifier la liste complète restaurée', async () => {
            await expect(page.getByRole('article')).toHaveCount(24);
            await expect(page.getByText('24 cadeaux', { exact: true })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Filtrer par Tous' }))
                .toHaveAttribute('aria-pressed', 'true');

            // Plusieurs catégories distinctes sont de nouveau présentes
            const badges = await page.getByRole('article').allTextContents();
            const categoriesVues = new Set(
                badges.map(texte => texte.match(/(?:Sport|Mode|Loisir|Maison|Beauté|Cuisine)/)?.[0]).filter(Boolean)
            );
            expect(categoriesVues.size).toBeGreaterThan(1);
        });
    });

    /**
     * @test Vérifie le changement de personne
     * @scenario Quand on clique sur l'onglet "Lucie"
     * @expected La liste de Lucie s'affiche (3 cadeaux), son onglet devient
     *           actif, celui de Kévin devient inactif et le premier cadeau
     *           est le parfum Dolce & Gabbana
     */
    test('change de personne et affiche la liste correspondante', async ({ page }) => {
        await test.step('Sélectionner la personne Lucie', async () => {
            await page.getByRole('button', { name: 'Lucie' }).click();
        });

        await test.step('Vérifier l\'état des onglets de personne', async () => {
            await expect(page.getByRole('button', { name: 'Lucie' }))
                .toHaveAttribute('aria-pressed', 'true');
            await expect(page.getByRole('button', { name: 'Kévin' }))
                .toHaveAttribute('aria-pressed', 'false');
        });

        await test.step('Vérifier la liste de Lucie', async () => {
            await expect(page.getByRole('article')).toHaveCount(3);
            await expect(page.getByText('3 cadeaux', { exact: true })).toBeVisible();
            await expect(page.getByRole('article').first().getByRole('heading', { level: 2 }))
                .toHaveText('Dolce & Gabbana Light Blue Capri In Love Eau de Parfum');
        });
    });

    /**
     * @test Vérifie la réinitialisation du filtre au changement de personne
     * @scenario Quand on filtre par "Sport" (liste de Kévin) puis qu'on
     *           bascule sur Lucie
     * @expected Le filtre catégorie revient à "Tous" (chaque personne a ses
     *           propres catégories) et le bouton "Filtrer par Sport"
     *           disparaît car Lucie n'a aucun cadeau Sport
     */
    test('réinitialise le filtre catégorie au changement de personne', async ({ page }) => {
        await test.step('Filtrer par Sport sur la liste de Kévin', async () => {
            await page.getByRole('button', { name: 'Filtrer par Sport' }).click();
            await expect(page.getByRole('article')).toHaveCount(15);
        });

        await test.step('Basculer vers la personne Lucie', async () => {
            await page.getByRole('button', { name: 'Lucie' }).click();
        });

        await test.step('Vérifier la réinitialisation et la disparition du filtre Sport', async () => {
            await expect(page.getByRole('button', { name: 'Filtrer par Tous' }))
                .toHaveAttribute('aria-pressed', 'true');
            await expect(page.getByRole('button', { name: 'Filtrer par Sport' }))
                .toHaveCount(0);
            await expect(page.getByRole('article')).toHaveCount(3);
            await expect(page.getByText('3 cadeaux', { exact: true })).toBeVisible();
        });
    });

    /**
     * @test Vérifie que les filtres sont sauvegardés dans localStorage
     * @scenario Quand on clique sur "Loisir" puis qu'on passe à Lucie
     * @expected La catégorie "Loisir" est enregistrée dans "wishlist.prefs" ;
     *           après le changement de personne, personId vaut "lucie" et la
     *           catégorie est réinitialisée à "Tous"
     */
    test('sauvegarde les filtres dans localStorage', async ({ page }) => {
        await test.step('Filtrer par Loisir et lire les préférences', async () => {
            await page.getByRole('button', { name: 'Filtrer par Loisir' }).click();

            let prefs = await lirePrefs(page);
            expect(prefs.category).toBe('Loisir');
            expect(prefs.personId).toBe('kevin');
        });

        await test.step('Changer de personne et relire les préférences', async () => {
            await page.getByRole('button', { name: 'Lucie' }).click();

            const prefs = await lirePrefs(page);
            expect(prefs.personId).toBe('lucie');
            expect(prefs.category).toBe('Tous');
        });
    });

});
