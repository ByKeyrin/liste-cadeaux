/**
 * @file modales.spec.js
 * @brief Tests E2E — Modales d'ajout et de dépendance (liste-cadeaux)
 * @author TEMPER — Agent QA
 *
 * @description Vérifie l'ouverture/fermeture de la modale d'ajout
 *              (bouton annuler, clic sur l'arrière-plan), le piège de focus
 *              (accessibilité clavier) et, en bonus, la modale de dépendance.
 *
 * Comportements de l'appex (js/app.js) :
 *   - Le bouton d'ajout "#add-wish-btn" n'est visible qu'en mode admin
 *     (classe "admin-mode" sur <body>, activée via "#admin-toggle")
 *   - Ouverture : classe "active" sur l'overlay, aria-hidden="false",
 *     focus sur le champ "#add-name"
 *   - Fermeture : classe "active" retirée, aria-hidden="true",
 *     focus restitué au bouton déclencheur
 *   - Piège de focus : Tab/Shift+Tab bouclent sur les éléments focusables
 *     de la modale (8 éléments : bouton ×, 5 champs, Annuler, Ajouter)
 *   - La modale de dépendance s'ouvre au clic sur "Voir le produit" d'un
 *     cadeau ayant des "requiredWishes" (ex : "Barre Olympique" → Half Rack)
 *
 * Exécution : npx playwright test --reporter=line
 */

import { test, expect } from '@playwright/test';

/** Alias Jest-style : les suites utilisent describe/it pour la lisibilité */
const it = test;

/**
 * @brief Active le mode admin puis ouvre la modale d'ajout de cadeau
 * @param {import('@playwright/test').Page} page - Page Playwright
 * @description Le bouton d'ajout est masqué hors mode admin : on clique
 *              d'abord sur "#admin-toggle", puis sur "#add-wish-btn".
 */
async function ouvrirModaleAjout(page) {
    await page.locator('#admin-toggle').click();
    await expect(page.locator('#add-wish-btn')).toBeVisible();
    await page.locator('#add-wish-btn').click();
}

test.describe('Modales (ajout & dépendance)', () => {

    /**
     * Avant chaque test : nettoyage du localStorage (tests autonomes,
     * état de départ par défaut).
     */
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => window.localStorage.clear());
        await page.reload();
    });

    /**
     * @test Vérifie l'ouverture de la modale d'ajout
     * @scenario Quand on active le mode admin puis qu'on clique sur le bouton "+"
     * @expected La modale #add-modal devient visible (classe "active",
     *           aria-hidden="false"), le formulaire s'affiche et le focus
     *           est placé sur le champ nom
     */
    it('ouvre la modale d\'ajout depuis le mode admin', async ({ page }) => {
        await ouvrirModaleAjout(page);

        const modale = page.locator('#add-modal');
        await expect(modale).toHaveClass(/active/);
        await expect(modale).toHaveAttribute('aria-hidden', 'false');
        await expect(modale.locator('.modal')).toBeVisible();
        await expect(modale.locator('#add-form')).toBeVisible();

        // Accessibilité : le focus est sur le premier champ à remplir
        await expect(page.locator('#add-name')).toBeFocused();
    });

    /**
     * @test Vérifie la fermeture de la modale via le bouton "Annuler"
     * @scenario Quand la modale est ouverte et qu'on clique sur "Annuler"
     * @expected La modale se ferme (aria-hidden="true") et le focus revient
     *           sur le bouton d'ajout qui l'a ouverte
     */
    it('ferme la modale d\'ajout avec le bouton Annuler', async ({ page }) => {
        await ouvrirModaleAjout(page);

        await page.locator('#add-cancel').click();

        const modale = page.locator('#add-modal');
        await expect(modale).toHaveAttribute('aria-hidden', 'true');
        await expect(modale).not.toHaveClass(/active/);

        // Accessibilité : le focus est restitué au déclencheur
        await expect(page.locator('#add-wish-btn')).toBeFocused();
    });

    /**
     * @test Vérifie la fermeture de la modale par clic sur l'arrière-plan
     * @scenario Quand la modale est ouverte et qu'on clique sur le fond sombre
     *           (padding de l'overlay, hors carte de la modale)
     * @expected La modale se ferme (aria-hidden="true", sans classe "active")
     */
    it('ferme la modale d\'ajout en cliquant sur l\'arrière-plan', async ({ page }) => {
        await ouvrirModaleAjout(page);

        // L'overlay a 20px de padding (--sp-5) : le coin (5,5) est du fond sombre
        const modale = page.locator('#add-modal');
        await modale.click({ position: { x: 5, y: 5 } });

        await expect(modale).toHaveAttribute('aria-hidden', 'true');
        await expect(modale).not.toHaveClass(/active/);
    });

    /**
     * @test Vérifie que le focus reste piégé dans la modale (accessibilité)
     * @scenario Quand la modale est ouverte et qu'on navigue au clavier
     *           (Tab / Shift+Tab) sur tous ses éléments focusables
     * @expected Le focus boucle sans jamais sortir de la modale :
     *           - depuis le premier élément (bouton ×), Shift+Tab va au dernier (Ajouter)
     *           - depuis le dernier (Ajouter), Tab revient au premier (bouton ×)
     *           - 8 Tab consécutifs depuis le bouton × restent tous dans la modale
     */
    it('piège le focus dans la modale d\'ajout (accessibilité clavier)', async ({ page }) => {
        await ouvrirModaleAjout(page);

        // 1. Premier élément focusable : le focus initial est sur #add-name,
        //    mais on se place explicitement sur le premier (bouton ×)
        const premier = page.locator('#add-modal-close');
        await premier.focus();
        await expect(premier).toBeFocused();

        // 2. Shift+Tab depuis le premier élément → wrap vers le dernier (submit "Ajouter")
        await page.keyboard.press('Shift+Tab');
        const dansModale = await page.evaluate(() => !!document.activeElement.closest('#add-modal'));
        expect(dansModale).toBe(true);
        const texteActif = await page.evaluate(() => (document.activeElement.textContent || '').trim());
        expect(texteActif).toBe('Ajouter');

        // 3. Tab depuis le dernier élément → wrap vers le premier (bouton ×)
        await page.keyboard.press('Tab');
        const idActif = await page.evaluate(() => document.activeElement.id);
        expect(idActif).toBe('add-modal-close');

        // 4. Boucle complète : 8 éléments focusables → 8 Tab ramènent au point de départ,
        //    sans jamais sortir de la modale
        for (let i = 0; i < 8; i++) {
            await page.keyboard.press('Tab');
            const toujoursDansModale = await page.evaluate(
                () => !!document.activeElement.closest('#add-modal')
            );
            expect(toujoursDansModale, `Tab n°${i + 1} : le focus doit rester dans la modale`)
                .toBe(true);
        }
        await expect(premier).toBeFocused();
    });

    /**
     * @test Vérifie l'ouverture/fermeture de la modale de dépendance (bonus)
     * @scenario Quand on clique sur "Voir le produit" d'un cadeau ayant des
     *           dépendances ("Barre Olympique" exige "Half Rack") puis qu'on
     *           clique sur "Retour"
     * @expected La modale #dependency-modal s'ouvre avec la liste des dépendances,
     *           et se ferme au clic sur "Retour"
     */
    it('ouvre la modale de dépendance avant d\'accéder à un produit lié (bonus)', async ({ page }) => {
        // Carte "Barre Olympique" (requiredWishes: [1] → Half Rack)
        const carte = page.locator('.wish-card').filter({
            has: page.locator('h2', { hasText: 'Barre Olympique' })
        });
        await carte.locator('a').click();

        const modaleDep = page.locator('#dependency-modal');
        await expect(modaleDep).toHaveClass(/active/);
        await expect(modaleDep).toHaveAttribute('aria-hidden', 'false');
        await expect(modaleDep.locator('#dependency-list .dependency-item')).toHaveCount(1);
        await expect(modaleDep.locator('#dependency-list')).toContainText('Half Rack');

        // Fermeture via le bouton "Retour"
        await page.locator('#modal-cancel').click();
        await expect(modaleDep).toHaveAttribute('aria-hidden', 'true');
        await expect(modaleDep).not.toHaveClass(/active/);
    });

});
