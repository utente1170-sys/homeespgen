// Test script per verificare le funzionalità dei prodotti
const fetch = require('node-fetch');

const BASE_URL = 'https://localhost:3000';

async function testProdottiAPI() {
    console.log('🧪 Test API Prodotti');
    console.log('==================');

    try {
        // Test 1: Aggiungi un prodotto
        console.log('\n1. Test aggiunta prodotto...');
        const addResponse = await fetch(`${BASE_URL}/api/prodotti`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prodotto: 'Test Prodotto',
                prezzo: 15.99
            })
        });
        
        const addResult = await addResponse.json();
        console.log('Risultato aggiunta:', addResult);

        // Test 2: Ottieni lista prodotti
        console.log('\n2. Test lista prodotti...');
        const listResponse = await fetch(`${BASE_URL}/api/prodotti/richiestalistaprodotti`);
        const listResult = await listResponse.json();
        console.log('Lista prodotti:', listResult);

        // Test 3: Aggiungi altri prodotti per test
        console.log('\n3. Aggiunta prodotti aggiuntivi...');
        const prodottiTest = [
            { prodotto: 'Caffè', prezzo: 1.50 },
            { prodotto: 'Brioche', prezzo: 2.00 },
            { prodotto: 'Acqua', prezzo: 0.80 }
        ];

        for (const prodotto of prodottiTest) {
            const response = await fetch(`${BASE_URL}/api/prodotti`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(prodotto)
            });
            const result = await response.json();
            console.log(`Aggiunto ${prodotto.prodotto}:`, result.success ? 'OK' : 'ERRORE');
        }

        // Test 4: Lista finale
        console.log('\n4. Lista finale prodotti...');
        const finalListResponse = await fetch(`${BASE_URL}/api/prodotti/richiestalistaprodotti`);
        const finalListResult = await finalListResponse.json();
        console.log('Lista finale:', finalListResult);

        // Test 5: Cerca prodotti
        console.log('\n5. Test ricerca prodotti...');
        const searchResponse = await fetch(`${BASE_URL}/api/prodotti/search/Caffè`);
        const searchResult = await searchResponse.json();
        console.log('Ricerca "Caffè":', searchResult);

        console.log('\n✅ Test completati con successo!');

    } catch (error) {
        console.error('❌ Errore durante i test:', error.message);
    }
}

// Esegui i test solo se questo file viene eseguito direttamente
if (require.main === module) {
    testProdottiAPI();
}

module.exports = { testProdottiAPI };