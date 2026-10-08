/**
 * @file tri.spec.js
 * @brief Tests E2E — Tri des cadeaux par prix (liste-cadeaux)
 * @author TEMPER — Agent QA
 *
 * @description Vérifie le tri par prix croissant/décroissant, l'ordre
 *              original par défaut, la combinaison tri + filtre, et la
 *              sauvegarde du tri dans localStorage.
 *
 * Données de référence (liste de Kévin, 30 souhaits) :
 *   - Prix le plus bas  : 5.50 €   → "Med picks Fender Classic Celluloid" (id 28)
 *   - Prix le plus haut : 599.00 € → "Appareil Photo - Olympus E-M10 Mark II" (id 24)
 *   - Ordre par défaut  : ordre du fichier src/data/wishes.js
 *     → premier "Half Rack" (id 1), dernier "Étui guitare" (id 30)
 *   - Catégorie Sport   : 15 souhaits (inchangée, le moins cher y est à 13.99 €)
 *
 * Le tri est appliqué via le <select> "Trier les cadeaux par prix"
 * (valeurs : "default", "price-asc", "price-desc") et sauvegardé
 * dans localStorage sous la clé "wishlist.prefs".
 *
 * Locateurs : uniquement rôles / libellés / textes (aucun sélecteur CSS).
 * Les prix sont lus via le rôle "paragraph" de chaque carte (article).
 *
 * Exécution : npx playwright test --reporter=line
 */

import { test, expect } from '@playwright/test';

/**
 * @brief Lit les prix affichés sur les cartes de la liste
 * @param {import('@playwright/test').Page} page - Page Playwright
 * @returns {Promise<number[]>} Prix extraits du DOM, dans l'ordre d'affichage
 * @description Chaque carte (<article>) contient un unique paragraphe
 *              portant le prix formaté par l'appex (ex : "13.99 €").
 *              On retire le symbole € et on parse le nombre.
 */
async function getPrixDansLesCartes(page) {
    const textes = await page.getByRole('article').getByRole('paragraph').allTextContents();
    return textes.map(texte => parseFloat(texte.replace(/[^\d.,-]/g, '').replace(',', '.')));
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
     *           le premier cadeau est le moins cher (5.50 €) et le dernier
     *           le plus cher (599.00 €)
     */
    test('trie les cadeaux par prix croissant', async ({ page }) => {
        await test.step('Sélectionner le tri prix croissant', async () => {
            await page.getByRole('combobox', { name: 'Trier les cadeaux par prix' }).selectOption('price-asc');
        });

        await test.step('Vérifier l\'ordre croissant des 30 prix', async () => {
            const prix = await getPrixDansLesCartes(page);
            expect(prix).toHaveLength(30);

            for (let i = 1; i < prix.length; i++) {
                expect(prix[i], `prix[${i}]=${prix[i]} doit être ≥ prix[${i - 1}]=${prix[i - 1]}`)
                    .toBeGreaterThanOrEqual(prix[i - 1]);
            }

            // Bornes de la liste triée
            expect(prix[0]).toBe(5.5);
            expect(prix[prix.length - 1]).toBe(599);
        });

        await test.step('Vérifier le premier et le dernier cadeau', async () => {
            const cartes = page.getByRole('article');
            await expect(cartes.first().getByRole('heading', { level: 2 }))
                .toHaveText('Med picks Fender Classic Celluloid');
            await expect(cartes.last().getByRole('heading', { level: 2 }))
                .toHaveText('Appareil Photo - Olympus E-M10 Mark II');
        });

        await test.step('Vérifier que le sélecteur reflète le choix', async () => {
            await expect(page.getByRole('combobox', { name: 'Trier les cadeaux par prix' }))
                .toHaveValue('price-asc');
        });
    });

    /**
     * @test Vérifie le tri par prix décroissant
     * @scenario Quand on sélectionne "Prix décroissant" dans le sélecteur de tri
     * @expected Les prix affichés sont ordonnés du plus grand au plus petit ;
     *           le premier cadeau est le plus cher (599.00 €) et le dernier
     *           le moins cher (5.50 €)
     */
    test('trie les cadeaux par prix décroissant', async ({ page }) => {
        await test.step('Sélectionner le tri prix décroissant', async () => {
            await page.getByRole('combobox', { name: 'Trier les cadeaux par prix' }).selectOption('price-desc');
        });

        await test.step('Vérifier l\'ordre décroissant des 30 prix', async () => {
            const prix = await getPrixDansLesCartes(page);
            expect(prix).toHaveLength(30);

            for (let i = 1; i < prix.length; i++) {
                expect(prix[i], `prix[${i}]=${prix[i]} doit être ≤ prix[${i - 1}]=${prix[i - 1]}`)
                    .toBeLessThanOrEqual(prix[i - 1]);
            }

            expect(prix[0]).toBe(599);
            expect(prix[prix.length - 1]).toBe(5.5);
        });

        await test.step('Vérifier le premier et le dernier cadeau', async () => {
            const cartes = page.getByRole('article');
            await expect(cartes.first().getByRole('heading', { level: 2 }))
                .toHaveText('Appareil Photo - Olympus E-M10 Mark II');
            await expect(cartes.last().getByRole('heading', { level: 2 }))
                .toHaveText('Med picks Fender Classic Celluloid');
        });

        await test.step('Vérifier que le sélecteur reflète le choix', async () => {
            await expect(page.getByRole('combobox', { name: 'Trier les cadeaux par prix' }))
                .toHaveValue('price-desc');
        });
    });

    /**
     * @test Vérifie que l'ordre par défaut est l'ordre original des données
     * @scenario Quand la page est chargée sans aucune préférence (localStorage vide)
     * @expected Le tri est "default", la liste suit l'ordre de src/data/wishes.js :
     *           premier "Half Rack", dernier "Étui guitare", 30 cartes au total
     */
    test('affiche l\'ordre original des données par défaut', async ({ page }) => {
        await test.step('Vérifier la valeur par défaut du sélecteur', async () => {
            await expect(page.getByRole('combobox', { name: 'Trier les cadeaux par prix' }))
                .toHaveValue('default');
        });

        await test.step('Vérifier l\'ordre premier/dernier de la liste', async () => {
            const cartes = page.getByRole('article');
            await expect(cartes).toHaveCount(30);
            await expect(cartes.first().getByRole('heading', { level: 2 })).toHaveText('Half Rack');
            await expect(cartes.last().getByRole('heading', { level: 2 }))
                .toHaveText('Étui guitare');
        });
    });

    /**
     * @test Vérifie que le tri fonctionne avec un filtre actif
     * @scenario Quand on filtre par "Sport" puis qu'on trie en prix croissant
     * @expected Seules les 15 cartes Sport sont affichées, leur prix est
     *           croissant (le moins cher : 13.99 €) et le compteur indique
     *           "15 sur 30 cadeaux"
     */
    test('combine le tri et un filtre de catégorie', async ({ page }) => {
        await test.step('Filtrer par Sport', async () => {
            await page.getByRole('button', { name: 'Filtrer par Sport' }).click();
            await expect(page.getByRole('article')).toHaveCount(15);
        });

        await test.step('Trier les prix restants en croissant', async () => {
            await page.getByRole('combobox', { name: 'Trier les cadeaux par prix' }).selectOption('price-asc');
        });

        await test.step('Vérifier l\'ordre croissant sur le sous-ensemble filtré', async () => {
            const prix = await getPrixDansLesCartes(page);
            expect(prix).toHaveLength(15);

            for (let i = 1; i < prix.length; i++) {
                expect(prix[i], `prix[${i}]=${prix[i]} doit être ≥ prix[${i - 1}]=${prix[i - 1]}`)
                    .toBeGreaterThanOrEqual(prix[i - 1]);
            }

            // Le moins cher de la catégorie Sport est à 13.99 €
            expect(prix[0]).toBe(13.99);
        });

        await test.step('Vérifier le compteur filtré et le sélecteur', async () => {
            await expect(page.getByText('15 sur 30 cadeaux', { exact: true })).toBeVisible();
            await expect(page.getByRole('combobox', { name: 'Trier les cadeaux par prix' }))
                .toHaveValue('price-asc');
        });
    });

    /**
     * @test Vérifie que la valeur du tri est sauvegardée dans localStorage
     * @scenario Quand on change le tri en "Prix décroissant"
     * @expected La clé "wishlist.prefs" contient un JSON dont le champ sort
     *           vaut "price-desc" (les autres préférences restent par défaut)
     */
    test('sauvegarde la valeur du tri dans localStorage', async ({ page }) => {
        await test.step('Sélectionner le tri prix décroissant', async () => {
            await page.getByRole('combobox', { name: 'Trier les cadeaux par prix' }).selectOption('price-desc');
        });

        await test.step('Vérifier le contenu de wishlist.prefs', async () => {
            const prefs = await page.evaluate(() =>
                JSON.parse(window.localStorage.getItem('wishlist.prefs'))
            );

            expect(prefs).not.toBeNull();
            expect(prefs.sort).toBe('price-desc');
            expect(prefs.personId).toBe('kevin');
            expect(prefs.category).toBe('Tous');
        });
    });

});
