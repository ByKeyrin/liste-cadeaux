/**
 * @file persistance.spec.js
 * @brief Tests E2E — Persistance localStorage (liste-cadeaux)
 * @author TEMPER — Agent QA
 *
 * @description Vérifie que les préférences (personne, tri, catégorie) sont
 *              sauvegardées dans localStorage puis restaurées après
 *              rechargement, que les ajouts/suppressions de cadeaux
 *              effectués en mode admin persistent, et que les anciennes
 *              clés v1 sont migrées vers le schéma v2.
 *
 * Schéma de l'appex (src/js/app.js) :
 *   - Clé "wishlist.prefs" : JSON { personId, sort, category }
 *     — écrit par défaut au démarrage, mis à jour à chaque action
 *   - Clé "wishlist.state" : schéma v2 { version: 2, added, deleted, lastId }
 *   - Migration v1 → v2 : anciennes clés "selectedPerson", "sort",
 *     "category" lues si le schéma v2 est absent, puis supprimées
 *
 * Données de référence (src/data/wishes.js) :
 *   - Lucie : 3 souhaits — Beauté (1 : parfum 76,95 €),
 *     Maison (2 : bouteilles isothermes 30 € et 10 €)
 *   - Lucie + Maison + tri prix croissant → 2 cartes : "10.00 €" puis
 *     "30.00 €", compteur "2 sur 3 cadeaux"
 *
 * Locateurs : uniquement rôles / libellés / textes (aucun sélecteur CSS).
 * La suppression passe par window.confirm : un écouteur "dialog" accepte
 * automatiquement les boîtes de confirmation natives.
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

/**
 * @brief Lit les prix affichés sur les cartes de la liste
 * @param {import('@playwright/test').Page} page - Page Playwright
 * @returns {Promise<number[]>} Prix extraits du DOM, dans l'ordre d'affichage
 * @description Chaque carte (<article>) contient un unique paragraphe
 *              portant le prix formaté (ex : "10.00 €").
 */
async function getPrixDansLesCartes(page) {
    const textes = await page.getByRole('article').getByRole('paragraph').allTextContents();
    return textes.map(texte => parseFloat(texte.replace(/[^\d.,-]/g, '').replace(',', '.')));
}

test.describe('Persistance localStorage', () => {

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

    test.describe('Préférences utilisateur', () => {

        /**
         * @test Vérifie l'enregistrement des défauts au chargement
         * @scenario Quand la page se charge (localStorage vidé)
         * @expected L'app écrit ses préférences par défaut dans
         *           "wishlist.prefs" : kevin / default / Tous, et le
         *           sélecteur de tri affiche "default"
         */
        test('enregistre les préférences par défaut au premier chargement', async ({ page }) => {
            await test.step('Lire wishlist.prefs', async () => {
                const prefs = await lirePrefs(page);
                expect(prefs).toEqual({
                    personId: 'kevin',
                    sort: 'default',
                    category: 'Tous'
                });
            });

            await test.step('Vérifier le sélecteur de tri', async () => {
                await expect(page.getByRole('combobox', { name: 'Trier les cadeaux par prix' }))
                    .toHaveValue('default');
            });
        });

        /**
         * @test Vérifie la sauvegarde de la sélection de personne
         * @scenario Quand on clique sur l'onglet "Lucie"
         * @expected Le champ personId de "wishlist.prefs" vaut "lucie"
         *           (tri et catégorie restent par défaut)
         */
        test('sauvegarde la sélection de personne', async ({ page }) => {
            await test.step('Sélectionner Lucie', async () => {
                await page.getByRole('button', { name: 'Lucie' }).click();
            });

            await test.step('Vérifier wishlist.prefs', async () => {
                const prefs = await lirePrefs(page);
                expect(prefs.personId).toBe('lucie');
                expect(prefs.sort).toBe('default');
                expect(prefs.category).toBe('Tous');
            });
        });

        /**
         * @test Vérifie la sauvegarde du tri et de la catégorie
         * @scenario Quand on sélectionne "Prix décroissant" puis le filtre
         *           "Loisir"
         * @expected Les champs sort et category de "wishlist.prefs" valent
         *           "price-desc" et "Loisir"
         */
        test('sauvegarde le tri et la catégorie', async ({ page }) => {
            await test.step('Choisir le tri prix décroissant', async () => {
                await page.getByRole('combobox', { name: 'Trier les cadeaux par prix' })
                    .selectOption('price-desc');
            });

            await test.step('Filtrer par Loisir', async () => {
                await page.getByRole('button', { name: 'Filtrer par Loisir' }).click();
            });

            await test.step('Vérifier wishlist.prefs', async () => {
                const prefs = await lirePrefs(page);
                expect(prefs.sort).toBe('price-desc');
                expect(prefs.category).toBe('Loisir');
                expect(prefs.personId).toBe('kevin');
            });
        });

        /**
         * @test Vérifie la restauration complète après rechargement
         * @scenario Quand on choisit Lucie + catégorie "Maison" + tri
         *           "Prix croissant", puis qu'on recharge la page
         * @expected Après le rechargement : onglet Lucie actif, tri
         *           "price-asc", catégorie "Maison" active, 2 cartes
         *           (bouteilles isothermes de Lucie) triées 10 € → 30 €,
         *           compteur "2 sur 3 cadeaux" et prefs intactes
         */
        test('restaure toutes les préférences après rechargement', async ({ page }) => {
            await test.step('Construire l\'état : Lucie + Maison + prix croissant', async () => {
                await page.getByRole('button', { name: 'Lucie' }).click();
                await page.getByRole('button', { name: 'Filtrer par Maison' }).click();
                await page.getByRole('combobox', { name: 'Trier les cadeaux par prix' })
                    .selectOption('price-asc');
            });

            await test.step('Recharger la page', async () => {
                await page.reload();
            });

            await test.step('Vérifier la restauration de l\'interface', async () => {
                await expect(page.getByRole('button', { name: 'Lucie' }))
                    .toHaveAttribute('aria-pressed', 'true');
                await expect(page.getByRole('combobox', { name: 'Trier les cadeaux par prix' }))
                    .toHaveValue('price-asc');
                await expect(page.getByRole('button', { name: 'Filtrer par Maison' }))
                    .toHaveAttribute('aria-pressed', 'true');
            });

            await test.step('Vérifier le contenu restauré (2 cartes, prix 10 → 30)', async () => {
                await expect(page.getByRole('article')).toHaveCount(2);

                const prix = await getPrixDansLesCartes(page);
                expect(prix).toEqual([10, 30]);

                await expect(page.getByText('2 sur 3 cadeaux', { exact: true })).toBeVisible();
            });

            await test.step('Vérifier que le stockage reflète l\'état restauré', async () => {
                const prefs = await lirePrefs(page);
                expect(prefs).toEqual({
                    personId: 'lucie',
                    sort: 'price-asc',
                    category: 'Maison'
                });
            });
        });

    });

    test.describe('Ajouts et suppressions (mode admin)', () => {

        /**
         * @test Vérifie la persistance d'un ajout via le mode admin
         * @scenario Quand on ajoute un cadeau via la modale (nom, catégorie,
         *           prix, lien) puis qu'on recharge la page
         * @expected Le cadeau apparaît immédiatement (compteur 31), la
         *           modale se ferme, et le cadeau est TOUJOURS présent
         *           après rechargement (schéma v2 "added")
         */
        test('persiste l\'ajout d\'un cadeau via le mode admin', async ({ page }) => {
            await test.step('Activer le mode admin et ouvrir la modale d\'ajout', async () => {
                await page.getByRole('button', { name: 'Admin' }).click();
                await page.getByRole('button', { name: 'Ajouter un cadeau' }).click();
                await expect(page.getByRole('dialog', { name: 'Ajouter un cadeau' })).toBeVisible();
            });

            await test.step('Remplir et soumettre le formulaire', async () => {
                const modale = page.getByRole('dialog', { name: 'Ajouter un cadeau' });
                await modale.getByLabel('Nom du cadeau').fill('Cadeau Test E2E');
                await modale.getByLabel('Catégorie', { exact: true }).selectOption('Maison');
                await modale.getByLabel('Prix (€)').fill('42.5');
                await modale.getByLabel('Lien du produit').fill('https://example.com/cadeau');
                await modale.getByRole('button', { name: 'Ajouter', exact: true }).click();

                await expect(modale).toBeHidden();
            });

            await test.step('Vérifier la nouvelle carte et le compteur', async () => {
                const carte = page.getByRole('article').filter({
                    has: page.getByRole('heading', { name: 'Cadeau Test E2E', exact: true })
                });
                await expect(carte).toBeVisible();
                await expect(page.getByText('31 cadeaux', { exact: true })).toBeVisible();
            });

            await test.step('Recharger et vérifier la persistance', async () => {
                await page.reload();

                const carte = page.getByRole('article').filter({
                    has: page.getByRole('heading', { name: 'Cadeau Test E2E', exact: true })
                });
                await expect(carte).toBeVisible();
                await expect(page.getByText('31 cadeaux', { exact: true })).toBeVisible();
            });
        });

        /**
         * @test Vérifie la persistance d'une suppression via le mode admin
         * @scenario Quand on supprime le cadeau "Banc Plat" (confirmation
         *           native acceptée) puis qu'on recharge la page
         * @expected Le cadeau disparaît immédiatement (29 cartes, compteur
         *           "29 cadeaux") et reste supprimé après rechargement
         *           (schéma v2 "deleted" contient l'id 2)
         */
        test('persiste la suppression d\'un cadeau via le mode admin', async ({ page }) => {
            // window.confirm : accepter automatiquement les confirmations
            page.on('dialog', dialogue => dialogue.accept());

            await test.step('Activer le mode admin', async () => {
                await page.getByRole('button', { name: 'Admin' }).click();
                await expect(page.getByRole('button', { name: 'Quitter' })).toBeVisible();
            });

            await test.step('Supprimer le cadeau "Banc Plat"', async () => {
                const carte = page.getByRole('article').filter({
                    has: page.getByRole('heading', { name: 'Banc Plat', exact: true })
                });
                await expect(carte).toBeVisible();
                await carte.getByRole('button', { name: 'Supprimer Banc Plat' }).click();
            });

            await test.step('Vérifier la disparition immédiate', async () => {
                await expect(page.getByRole('article')).toHaveCount(29);
                await expect(page.getByText('29 cadeaux', { exact: true })).toBeVisible();
                await expect(page.getByRole('heading', { name: 'Banc Plat', exact: true }))
                    .toHaveCount(0);
            });

            await test.step('Recharger et vérifier la persistance de la suppression', async () => {
                await page.reload();

                await expect(page.getByRole('article')).toHaveCount(29);
                await expect(page.getByRole('heading', { name: 'Banc Plat', exact: true }))
                    .toHaveCount(0);

                const etat = await page.evaluate(() =>
                    JSON.parse(window.localStorage.getItem('wishlist.state'))
                );
                expect(etat.deleted.kevin).toContain(2);
            });
        });

    });

    test.describe('Migration v1 → v2', () => {

        /**
         * @test Vérifie la migration des anciennes clés localStorage
         * @scenario Quand le schéma v2 est absent mais que les anciennes
         *           clés v1 existent (selectedPerson=lucie, sort=price-desc,
         *           category=Beauté) avant le chargement de la page
         * @expected L'app migre l'état legacy : onglet Lucie actif, tri
         *           "price-desc", catégorie "Beauté" active, compteur
         *           "1 sur 3 cadeaux", les clés legacy sont supprimées et
         *           "wishlist.prefs" contient le schéma v2 migré
         */
        test('migre les anciennes clés localStorage (v1 → v2)', async ({ page }) => {
            await test.step('Injecter un état legacy v1 puis recharger', async () => {
                // addInitScript s'exécute AVANT les scripts de la page :
                // l'app doit voir les clés legacy au démarrage
                await page.addInitScript(() => {
                    window.localStorage.removeItem('wishlist.prefs');
                    window.localStorage.removeItem('wishlist.state');
                    window.localStorage.setItem('selectedPerson', 'lucie');
                    window.localStorage.setItem('sort', 'price-desc');
                    window.localStorage.setItem('category', 'Beauté');
                });
                await page.reload();
            });

            await test.step('Vérifier l\'état migré dans l\'interface', async () => {
                await expect(page.getByRole('button', { name: 'Lucie' }))
                    .toHaveAttribute('aria-pressed', 'true');
                await expect(page.getByRole('combobox', { name: 'Trier les cadeaux par prix' }))
                    .toHaveValue('price-desc');
                await expect(page.getByRole('button', { name: 'Filtrer par Beauté' }))
                    .toHaveAttribute('aria-pressed', 'true');
                await expect(page.getByText('1 sur 3 cadeaux', { exact: true })).toBeVisible();
            });

            await test.step('Vérifier la migration des clés de stockage', async () => {
                const legacy = await page.evaluate(() => ({
                    person: window.localStorage.getItem('selectedPerson'),
                    sort: window.localStorage.getItem('sort'),
                    category: window.localStorage.getItem('category')
                }));
                expect(legacy).toEqual({ person: null, sort: null, category: null });

                const prefs = await lirePrefs(page);
                expect(prefs).toEqual({
                    personId: 'lucie',
                    sort: 'price-desc',
                    category: 'Beauté'
                });
            });
        });

    });

});
