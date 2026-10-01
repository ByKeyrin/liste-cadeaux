/**
 * @file modales.spec.js
 * @brief Tests E2E — Modales d'ajout et de dépendance (liste-cadeaux)
 * @author TEMPER — Agent QA
 *
 * @description Vérifie l'ouverture et la fermeture de la modale d'ajout
 *              (bouton Annuler, touche Échap, clic sur l'arrière-plan),
 *              le piège de focus Tab/Shift+Tab (accessibilité clavier),
 *              la modale de dépendance (ouverture, contenu, fermeture)
 *              et la restitution du focus au déclencheur à la fermeture.
 *
 * Comportements de l'appex (src/js/app.js) :
 *   - Le bouton d'ajout n'est visible qu'en mode admin (classe "admin-mode"
 *     sur <body>, activée via le bouton "Admin" → "Quitter")
 *   - Ouverture : classe "active" sur l'overlay, aria-hidden="false",
 *     la modale devient visible puis le focus DOIT atterrir sur le champ
 *     "Nom du cadeau" (openAddModal le déclare explicitement)
 *   - Fermeture : classe "active" retirée, aria-hidden="true",
 *     focus restitué au bouton/liens déclencheur
 *   - Piège de focus : Tab/Shift+Tab bouclent sur les éléments focusables
 *     de la modale (premier = bouton ×, dernier = bouton de soumission)
 *   - La modale de dépendance s'ouvre au clic sur "Voir le produit" d'un
 *     cadeau ayant des "requiredWishes" (ex : "Barre Olympique" → Half Rack)
 *   - Un clic sur un lien SANS dépendance n'ouvre AUCUNE modale
 *
 * Locateurs : uniquement rôles / libellés / textes (aucun sélecteur CSS).
 * Les titres de cartes sont localisés avec un nom EXACT pour éviter les
 * correspondances partielles ("Barre Olympique" vs "Stop disque barre
 * olympique Orange").
 *
 * Exécution : npx playwright test --reporter=line
 */

import { test, expect } from '@playwright/test';

/**
 * @brief Active le mode admin puis ouvre la modale d'ajout de cadeau
 * @param {import('@playwright/test').Page} page - Page Playwright
 * @description Le bouton d'ajout n'est visible qu'en mode admin : on clique
 *              d'abord sur "Admin" (qui devient "Quitter"), puis on clique
 *              sur "Ajouter un cadeau". On attend que la modale soit visible.
 */
async function ouvrirModaleAjout(page) {
    await page.getByRole('button', { name: 'Admin' }).click();
    await expect(page.getByRole('button', { name: 'Ajouter un cadeau' })).toBeVisible();
    await page.getByRole('button', { name: 'Ajouter un cadeau' }).click();
    await expect(page.getByRole('dialog', { name: 'Ajouter un cadeau' })).toBeVisible();
}

test.describe('Modales (ajout & dépendance)', () => {

    /**
     * Avant chaque test : nettoyage du localStorage (tests autonomes,
     * état de départ par défaut — mode admin désactivé).
     */
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => window.localStorage.clear());
        await page.reload();
    });

    test.describe('Modale d\'ajout', () => {

        /**
         * @test Vérifie l'ouverture de la modale d'ajout
         * @scenario Quand on active le mode admin puis qu'on clique sur
         *           "Ajouter un cadeau"
         * @expected La modale (role=dialog "Ajouter un cadeau") devient
         *           visible et le formulaire (Nom, Catégorie, Prix, Lien)
         *           ainsi que ses boutons s'affichent
         */
        test('ouvre la modale d\'ajout depuis le mode admin', async ({ page }) => {
            await test.step('Activer le mode admin', async () => {
                await page.getByRole('button', { name: 'Admin' }).click();
                await expect(page.getByRole('button', { name: 'Quitter' })).toBeVisible();
            });

            await test.step('Cliquer sur "Ajouter un cadeau"', async () => {
                await page.getByRole('button', { name: 'Ajouter un cadeau' }).click();
            });

            await test.step('Vérifier la modale et son formulaire', async () => {
                const modale = page.getByRole('dialog', { name: 'Ajouter un cadeau' });
                await expect(modale).toBeVisible();

                await expect(modale.getByLabel('Nom du cadeau')).toBeVisible();
                await expect(modale.getByLabel('Catégorie', { exact: true })).toBeVisible();
                await expect(modale.getByLabel('Prix (€)')).toBeVisible();
                await expect(modale.getByLabel('Lien du produit')).toBeVisible();

                await expect(modale.getByRole('button', { name: 'Fermer' })).toBeVisible();
                await expect(modale.getByRole('button', { name: 'Annuler' })).toBeVisible();
                await expect(modale.getByRole('button', { name: 'Ajouter', exact: true })).toBeVisible();
            });
        });

        /**
         * @test Vérifie le transfert du focus à l'ouverture (accessibilité)
         * @scenario Quand la modale d'ajout vient de s'ouvrir
         * @expected Le focus est placé sur le champ "Nom du cadeau"
         *           (documenté dans openAddModal — src/js/app.js)
         */
        test('place le focus sur le champ Nom du cadeau à l\'ouverture (accessibilité)', async ({ page }) => {
            await test.step('Ouvrir la modale d\'ajout', async () => {
                await ouvrirModaleAjout(page);
            });

            await test.step('Vérifier le focus initial dans la modale', async () => {
                await expect(page.getByLabel('Nom du cadeau')).toBeFocused();
            });
        });

        /**
         * @test Vérifie la fermeture via le bouton "Annuler"
         * @scenario Quand la modale est ouverte et qu'on clique sur "Annuler"
         * @expected La modale se ferme (plus visible) et le focus est
         *           restitué au bouton "Ajouter un cadeau" déclencheur
         */
        test('ferme la modale d\'ajout avec le bouton Annuler et restitue le focus', async ({ page }) => {
            await test.step('Ouvrir la modale d\'ajout', async () => {
                await ouvrirModaleAjout(page);
            });

            await test.step('Cliquer sur "Annuler"', async () => {
                const modale = page.getByRole('dialog', { name: 'Ajouter un cadeau' });
                await modale.getByRole('button', { name: 'Annuler' }).click();
                await expect(modale).toBeHidden();
            });

            await test.step('Vérifier la restitution du focus au déclencheur', async () => {
                await expect(page.getByRole('button', { name: 'Ajouter un cadeau' })).toBeFocused();
            });
        });

        /**
         * @test Vérifie la fermeture via la touche Échap
         * @scenario Quand la modale est ouverte et qu'on presse Échap
         * @expected La modale se ferme et le focus est restitué au déclencheur
         */
        test('ferme la modale d\'ajout avec la touche Échap', async ({ page }) => {
            await test.step('Ouvrir la modale d\'ajout', async () => {
                await ouvrirModaleAjout(page);
            });

            await test.step('Presser Échap', async () => {
                await page.keyboard.press('Escape');
                await expect(page.getByRole('dialog', { name: 'Ajouter un cadeau' })).toBeHidden();
            });

            await test.step('Vérifier la restitution du focus au déclencheur', async () => {
                await expect(page.getByRole('button', { name: 'Ajouter un cadeau' })).toBeFocused();
            });
        });

        /**
         * @test Vérifie la fermeture par clic sur l'arrière-plan
         * @scenario Quand la modale est ouverte et qu'on clique sur le fond
         *           sombre (padding de l'overlay, hors carte de la modale)
         * @expected La modale se ferme
         */
        test('ferme la modale d\'ajout en cliquant sur l\'arrière-plan', async ({ page }) => {
            await test.step('Ouvrir la modale d\'ajout', async () => {
                await ouvrirModaleAjout(page);
            });

            await test.step('Cliquer sur l\'arrière-plan de l\'overlay', async () => {
                // L'overlay (position: fixed, inset: 0) a 20px de padding :
                // le coin (5, 5) du viewport est du fond sombre cliquable
                await page.mouse.click(5, 5);
                await expect(page.getByRole('dialog', { name: 'Ajouter un cadeau' })).toBeHidden();
            });
        });

        /**
         * @test Vérifie le piège de focus (accessibilité clavier)
         * @scenario Quand la modale est ouverte et qu'on navigue au clavier
         *           depuis son premier élément focusable (bouton ×)
         * @expected Le focus boucle sans jamais sortir de la modale :
         *           - Shift+Tab depuis le premier élément (×) va au dernier
         *             (bouton de soumission "Ajouter")
         *           - Tab depuis le dernier élément revient au premier (×)
         */
        test('piège le focus dans la modale (Tab / Shift+Tab)', async ({ page }) => {
            await test.step('Ouvrir la modale d\'ajout', async () => {
                await ouvrirModaleAjout(page);
            });

            const modale = page.getByRole('dialog', { name: 'Ajouter un cadeau' });
            const boutonFermer = modale.getByRole('button', { name: 'Fermer' });
            const boutonAjouter = modale.getByRole('button', { name: 'Ajouter', exact: true });

            await test.step('Placer le focus sur le premier élément focusable', async () => {
                await expect(boutonFermer).toBeVisible();
                await boutonFermer.focus();
                await expect(boutonFermer).toBeFocused();
            });

            await test.step('Shift+Tab depuis le premier élément boucle vers le dernier', async () => {
                await page.keyboard.press('Shift+Tab');
                await expect(boutonAjouter).toBeFocused();
            });

            await test.step('Tab depuis le dernier élément boucle vers le premier', async () => {
                await page.keyboard.press('Tab');
                await expect(boutonFermer).toBeFocused();
            });
        });

    });

    test.describe('Modale de dépendance', () => {

        /**
         * @test Vérifie l'ouverture et le contenu de la modale de dépendance
         * @scenario Quand on clique sur "Voir le produit" d'un cadeau ayant
         *           des dépendances ("Barre Olympique" exige "Half Rack")
         * @expected La modale (role=dialog "Attention") s'ouvre, affiche le
         *           cadeau requis "Half Rack", puis se ferme au clic sur
         *           "Retour" avec restitution du focus au lien déclencheur
         */
        test('ouvre la modale de dépendance et affiche les cadeaux requis', async ({ page }) => {
            await test.step('Cliquer sur "Voir le produit" de "Barre Olympique"', async () => {
                // Nom de titre EXACT : "Stop disque barre olympique Orange"
                // contient aussi "barre olympique" en minuscules
                const carte = page.getByRole('article').filter({
                    has: page.getByRole('heading', { name: 'Barre Olympique', exact: true })
                });
                await expect(carte).toBeVisible();
                await carte.getByRole('link', { name: 'Voir le produit' }).click();
            });

            await test.step('Vérifier la modale et sa liste de dépendances', async () => {
                const modale = page.getByRole('dialog', { name: 'Attention' });
                await expect(modale).toBeVisible();
                await expect(modale.getByRole('heading', { name: 'Attention' })).toBeVisible();
                await expect(modale.getByText('Half Rack', { exact: true })).toBeVisible();
                await expect(modale.getByRole('button', { name: 'Retour' })).toBeVisible();
            });

            await test.step('Fermer via "Retour" et vérifier la restitution du focus', async () => {
                const carte = page.getByRole('article').filter({
                    has: page.getByRole('heading', { name: 'Barre Olympique', exact: true })
                });
                await page.getByRole('dialog', { name: 'Attention' })
                    .getByRole('button', { name: 'Retour' }).click();

                await expect(page.getByRole('dialog', { name: 'Attention' })).toBeHidden();
                await expect(carte.getByRole('link', { name: 'Voir le produit' })).toBeFocused();
            });
        });

        /**
         * @test Vérifie la fermeture de la modale de dépendance par Échap
         * @scenario Quand la modale de dépendance est ouverte et qu'on
         *           presse Échap
         * @expected La modale se ferme et le focus est restitué au lien
         *           "Voir le produit" déclencheur
         */
        test('ferme la modale de dépendance avec la touche Échap', async ({ page }) => {
            await test.step('Ouvrir la modale de dépendance', async () => {
                const carte = page.getByRole('article').filter({
                    has: page.getByRole('heading', { name: 'Barre Olympique', exact: true })
                });
                await carte.getByRole('link', { name: 'Voir le produit' }).click();
                await expect(page.getByRole('dialog', { name: 'Attention' })).toBeVisible();
            });

            await test.step('Presser Échap et vérifier la fermeture', async () => {
                await page.keyboard.press('Escape');
                await expect(page.getByRole('dialog', { name: 'Attention' })).toBeHidden();
            });

            await test.step('Vérifier la restitution du focus au lien', async () => {
                const carte = page.getByRole('article').filter({
                    has: page.getByRole('heading', { name: 'Barre Olympique', exact: true })
                });
                await expect(carte.getByRole('link', { name: 'Voir le produit' })).toBeFocused();
            });
        });

        /**
         * @test Vérifie qu'aucune modale ne s'ouvre sans dépendance
         * @scenario Quand on clique sur "Voir le produit" d'un cadeau SANS
         *           dépendances ("Half Rack" n'en a pas)
         * @expected Aucune modale de dépendance ne s'ouvre (le lien ouvre
         *           directement le produit dans un nouvel onglet)
         */
        test('n\'ouvre pas de modale pour un produit sans dépendance', async ({ page }) => {
            // Le lien ouvre un nouvel onglet : on le referme aussitôt
            page.on('popup', popup => popup.close());

            await test.step('Cliquer sur "Voir le produit" de "Half Rack"', async () => {
                const carte = page.getByRole('article').filter({
                    has: page.getByRole('heading', { name: 'Half Rack', exact: true })
                });
                await expect(carte).toBeVisible();
                await carte.getByRole('link', { name: 'Voir le produit' }).click();
            });

            await test.step('Vérifier qu\'aucune modale de dépendance ne s\'est ouverte', async () => {
                await expect(page.getByRole('dialog', { name: 'Attention' })).toBeHidden();
            });
        });

    });

});
