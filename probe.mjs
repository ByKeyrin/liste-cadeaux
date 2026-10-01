/** Probe temporaire — vérifie le comportement focus/locators avant d'écrire les specs */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:3000/');
await page.evaluate(() => localStorage.clear());
await page.reload();

// --- 1. Ambiguïté getByLabel('Catégorie') (label vs aria-label nav) ---
const catLabel = page.getByLabel('Catégorie');
console.log('getByLabel(Catégorie) count:', await catLabel.count());
const catLabelExact = page.getByLabel('Catégorie', { exact: true });
console.log('getByLabel(Catégorie, exact) count:', await catLabelExact.count());

// --- 2. Dialog fermé : getByRole('dialog') matche-t-il ? ---
const depDialog = page.getByRole('dialog', { name: 'Attention' });
const addDialog = page.getByRole('dialog', { name: 'Ajouter un cadeau' });
console.log('dep dialog closed count:', await depDialog.count());
console.log('add dialog closed count:', await addDialog.count());

// --- 3. Ouverture modale ajout + état du focus ---
await page.getByRole('button', { name: 'Admin' }).click();
console.log('add-wish-btn visible:', await page.getByRole('button', { name: 'Ajouter un cadeau' }).isVisible());
await page.getByRole('button', { name: 'Ajouter un cadeau' }).click();
const focusInfo = await page.evaluate(() => {
  const input = document.getElementById('add-name');
  const overlay = document.getElementById('add-modal');
  return {
    activeElement: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : 'none',
    inputFocused: document.activeElement === input,
    overlayClass: overlay.className,
    overlayVisibility: getComputedStyle(overlay).visibility,
    inputVisibility: getComputedStyle(input).visibility,
    inputOffsetParent: input.offsetParent ? (input.offsetParent.id || input.offsetParent.tagName) : null,
  };
});
console.log('après ouverture modale ajout:', JSON.stringify(focusInfo, null, 1));
console.log('add dialog open count:', await addDialog.count());
console.log('toBeFocused name input:', await page.getByLabel('Nom du cadeau').evaluate(el => el === document.activeElement));

// --- 4. Clic arrière-plan (5,5) ferme la modale ? ---
await page.mouse.click(5, 5);
console.log('après clic (5,5) — dialog count:', await addDialog.count());

// --- 5. Focus piège : Shift+Tab depuis le nom ---
await page.getByRole('button', { name: 'Ajouter un cadeau' }).click();
await page.getByLabel('Nom du cadeau').focus();
console.log('focus sur nom:', await page.getByLabel('Nom du cadeau').evaluate(el => el === document.activeElement));
await page.keyboard.press('Shift+Tab');
console.log('après Shift+Tab #1:', await page.evaluate(() => document.activeElement.id || document.activeElement.tagName));
await page.keyboard.press('Shift+Tab');
console.log('après Shift+Tab #2 (wrap?):', await page.evaluate(() => document.activeElement.id || document.activeElement.tagName));
await page.keyboard.press('Tab');
console.log('après Tab (wrap retour?):', await page.evaluate(() => document.activeElement.id || document.activeElement.tagName));

// --- 6. Fermeture par Échap + focus restitué ---
await page.keyboard.press('Escape');
console.log('après Échap — add dialog count:', await addDialog.count());
console.log('focus restitué sur add-wish-btn:', await page.getByRole('button', { name: 'Ajouter un cadeau' }).evaluate(el => el === document.activeElement));

// --- 7. Modale dépendance : carte exacte + popup sur lien sans dépendance ---
const carteExacte = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Barre Olympique', exact: true }) });
console.log('cartes Barre Olympique (exact):', await carteExacte.count());
page.on('popup', p => p.close().catch(() => {}));
await carteExacte.getByRole('link', { name: 'Voir le produit' }).click();
console.log('dep dialog ouvert count:', await depDialog.count());
console.log('dépendance Half Rack visible:', await depDialog.getByText('Half Rack', { exact: true }).isVisible());
await depDialog.getByRole('button', { name: 'Retour' }).click();
console.log('après Retour — dep dialog count:', await depDialog.count());
console.log('focus restitué sur lien:', await carteExacte.getByRole('link', { name: 'Voir le produit' }).evaluate(el => el === document.activeElement));

// Lien SANS dépendance (Half Rack) → pas de modale
const carteSansDep = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Half Rack', exact: true }) });
await carteSansDep.getByRole('link', { name: 'Voir le produit' }).click();
console.log('après clic lien sans dépendance — dep dialog count:', await depDialog.count());

// --- 8. Compteur / paragraphes / rôles ---
console.log('articles count:', await page.getByRole('article').count());
console.log('paragraphes dans articles:', await page.getByRole('article').getByRole('paragraph').count());
console.log('premier prix:', await page.getByRole('article').first().getByRole('paragraph').textContent());
console.log('compteur getByText exact:', await page.getByText('24 cadeaux', { exact: true }).count());
console.log('nav Choisir la liste:', await page.getByRole('navigation', { name: 'Choisir la liste' }).count());
console.log('combobox tri:', await page.getByRole('combobox', { name: 'Trier les cadeaux par prix' }).count());
console.log('bouton Filtrer par Tous:', await page.getByRole('button', { name: 'Filtrer par Tous' }).count());
console.log('bouton Kévin (substring):', await page.getByRole('button', { name: 'Kévin' }).count());
console.log('bouton Lucie (substring):', await page.getByRole('button', { name: 'Lucie' }).count());
console.log('heading h1:', await page.getByRole('heading', { level: 1, name: 'Nos listes de cadeaux' }).count());
console.log('main:', await page.getByRole('main').count());
console.log('Filtrer par Sport:', await page.getByRole('button', { name: 'Filtrer par Sport' }).count());

await browser.close();
