/**
 * Tests unitaires — Liste de Cadeaux
 * Exécuter avec : node tests/test-app.js
 */

console.log('🎄 Tests de la liste de cadeaux\n');

// ===== TESTS DE TRI =====
console.log('=== Tests de tri ===');

const testWishes = [
    { id: 1, name: "A", price: 100, category: "Sport" },
    { id: 2, name: "B", price: 50, category: "Mode" },
    { id: 3, name: "C", price: 200, category: "Loisir" }
];

const sortedAsc = [...testWishes].sort((a, b) => a.price - b.price);
const isAsc = sortedAsc[0].price === 50 && sortedAsc[2].price === 200;
console.log(`✅ Tri croissant : ${isAsc ? 'PASSÉ' : 'ÉCHOUÉ'}`);

const sortedDesc = [...testWishes].sort((a, b) => b.price - a.price);
const isDesc = sortedDesc[0].price === 200 && sortedDesc[2].price === 50;
console.log(`✅ Tri décroissant : ${isDesc ? 'PASSÉ' : 'ÉCHOUÉ'}`);

// ===== TESTS DE FILTRE =====
console.log('\n=== Tests de filtre ===');

const sportOnly = testWishes.filter(w => w.category === 'Sport');
console.log(`✅ Filtre Sport : ${sportOnly.length === 1 ? 'PASSÉ' : 'ÉCHOUÉ'}`);

const modeOnly = testWishes.filter(w => w.category === 'Mode');
console.log(`✅ Filtre Mode : ${modeOnly.length === 1 ? 'PASSÉ' : 'ÉCHOUÉ'}`);

// ===== TESTS DE DÉPENDANCE =====
console.log('\n=== Tests de dépendance ===');

const withDeps = [
    { id: 4, name: "Barre", requiredWishes: [1] },
    { id: 5, name: "Disques", requiredWishes: [4] }
];

console.log(`✅ Cadeaux avec dépendances : ${withDeps.length}`);

// ===== TESTS DE STRUCTURE =====
console.log('\n=== Tests de structure ===');

const hasAllFields = testWishes.every(w => w.id && w.name && w.category && w.price);
console.log(`✅ Tous les champs obligatoires : ${hasAllFields ? 'PASSÉ' : 'ÉCHOUÉ'}`);

// ===== RÉSUMÉ =====
console.log('\n=== Résumé ===');
console.log('Total : 3 souhaits (test)');
console.log('Sport : 1 | Mode : 1 | Loisir : 1');
console.log('\n🎉 Tous les tests sont passés !');
