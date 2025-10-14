# Gestione Prodotti - Documentazione

## Panoramica
È stata implementata una gestione completa dei prodotti nel sistema ESP Home Server. I prodotti possono essere gestiti attraverso l'interfaccia web nella sezione Utility e tramite API REST.

## Struttura Database

### Tabella `prodotti`
```sql
CREATE TABLE IF NOT EXISTS prodotti (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prodotto TEXT UNIQUE NOT NULL,
  prezzo REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Interfaccia TypeScript
```typescript
interface Prodotto {
  id?: number;              // ID autoincrementale
  prodotto: string;         // Nome del prodotto (UNIQUE NOT NULL)
  prezzo: number;           // Prezzo del prodotto (REAL NOT NULL)
  created_at?: string;      // Data di creazione
  updated_at?: string;      // Data di ultimo aggiornamento
}
```

## API Endpoints

### 1. Ottieni Lista Prodotti
**GET** `/api/prodotti/richiestalistaprodotti`

Risposta:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "prodotto": "Caffè",
      "prezzo": 1.50,
      "created_at": "2025-01-03 10:30:00",
      "updated_at": "2025-01-03 10:30:00"
    }
  ],
  "message": "Trovati 1 prodotti"
}
```

### 2. Ottieni Tutti i Prodotti
**GET** `/api/prodotti`

### 3. Ottieni Prodotto per ID
**GET** `/api/prodotti/:id`

### 4. Cerca Prodotti
**GET** `/api/prodotti/search/:nome`

### 5. Aggiungi Prodotto
**POST** `/api/prodotti`
```json
{
  "prodotto": "Nome Prodotto",
  "prezzo": 15.99
}
```

### 6. Aggiorna Prodotto
**PUT** `/api/prodotti/:id`
```json
{
  "prodotto": "Nuovo Nome",
  "prezzo": 20.00
}
```

### 7. Elimina Prodotto per ID
**DELETE** `/api/prodotti/:id`

### 8. Elimina Prodotto per Nome
**DELETE** `/api/prodotti/nome/:nome`

## Interfaccia Web

### Pagina Utility
Accessibile tramite `/utility`, include una sezione dedicata alla gestione prodotti con:

- **Form di aggiunta**: Nome prodotto e prezzo
- **Tabella prodotti**: Visualizzazione di tutti i prodotti con azioni
- **Funzionalità CRUD**: Aggiungi, modifica, elimina prodotti
- **Aggiornamento automatico**: Lista si aggiorna dopo ogni operazione

### Funzionalità JavaScript
- `loadProducts()`: Carica la lista prodotti
- `addProduct()`: Aggiunge un nuovo prodotto
- `editProduct(id)`: Modifica un prodotto esistente
- `deleteProduct(id)`: Elimina un prodotto
- `showProductStatus(message, type)`: Mostra messaggi di stato

## Funzioni Database

### Metodi CRUD
- `addProdotto(prodotto: Prodotto)`: Aggiunge/aggiorna prodotto (INSERT OR REPLACE)
- `getAllProdotti()`: Ottiene tutti i prodotti ordinati per nome
- `getProdottoById(id: number)`: Ottiene prodotto per ID
- `getProdottoByNome(nome: string)`: Ottiene prodotto per nome
- `updateProdotto(id: number, prodotto: Partial<Prodotto>)`: Aggiorna prodotto
- `deleteProdotto(id: number)`: Elimina prodotto per ID
- `deleteProdottoByNome(nome: string)`: Elimina prodotto per nome
- `searchProdotti(searchTerm: string)`: Cerca prodotti per nome (ricerca parziale)

## Caratteristiche

### Validazione
- Nome prodotto obbligatorio e non vuoto
- Prezzo obbligatorio e deve essere un numero valido
- Nome prodotto univoco (UNIQUE constraint)

### Gestione Errori
- Validazione input lato client e server
- Messaggi di errore descrittivi
- Gestione errori di connessione

### Interfaccia Utente
- Design responsive
- Feedback visivo per le operazioni
- Conferma per operazioni di eliminazione
- Aggiornamento automatico della lista

## Test

Per testare le funzionalità, esegui:
```bash
node test_prodotti.js
```

Il file di test include:
- Aggiunta prodotti
- Recupero lista prodotti
- Ricerca prodotti
- Verifica endpoint API

## Note Tecniche

- Utilizza `INSERT OR REPLACE` per gestire duplicati
- Timestamp automatici per created_at e updated_at
- Ordinamento alfabetico per nome prodotto
- Supporto per ricerca parziale con LIKE
- Gestione transazioni per operazioni multiple

## Integrazione

Le funzionalità sono integrate nel sistema esistente:
- Route aggiunte in `src/routes/prodotti.ts`
- Database aggiornato in `src/database.ts`
- Interfaccia web in `src/index.ts` (pagina utility)
- Stili CSS personalizzati per la sezione prodotti
