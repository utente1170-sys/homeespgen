import { Router, Request, Response } from 'express';
import { database, Prodotto } from '../database';

const router = Router();

// Endpoint per ottenere la lista dei prodotti (richiestalistaprodotti)
router.get('/richiestalistaprodotti', async (req: Request, res: Response) => {
  try {
    const prodotti = await database.getAllProdotti();
    
    res.status(200).json({
      success: true,
      data: prodotti,
      message: `Trovati ${prodotti.length} prodotti`
    });
  } catch (error) {
    console.error('Errore nel recupero dei prodotti:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

// Endpoint per ottenere tutti i prodotti (alternativo)
router.get('/', async (req: Request, res: Response) => {
  try {
    const prodotti = await database.getAllProdotti();
    
    res.json({
      success: true,
      data: prodotti,
      count: prodotti.length
    });
  } catch (error) {
    console.error('Errore nel recupero dei prodotti:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

// Endpoint per ottenere un prodotto per ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID prodotto non valido'
      });
    }
    
    const prodotto = await database.getProdottoById(id);
    
    if (!prodotto) {
      return res.status(404).json({
        success: false,
        message: 'Prodotto non trovato'
      });
    }
    
    res.json({
      success: true,
      data: prodotto
    });
  } catch (error) {
    console.error('Errore nel recupero del prodotto:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

// Endpoint per cercare prodotti per nome
router.get('/search/:nome', async (req: Request, res: Response) => {
  try {
    const nome = req.params.nome;
    const prodotti = await database.searchProdotti(nome);
    
    res.json({
      success: true,
      data: prodotti,
      count: prodotti.length,
      searchTerm: nome
    });
  } catch (error) {
    console.error('Errore nella ricerca prodotti:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

// Endpoint per aggiungere un nuovo prodotto
router.post('/', async (req: Request, res: Response) => {
  try {
    const { prodotto, prezzo } = req.body;
    
    // Validazione input
    if (!prodotto || typeof prodotto !== 'string' || prodotto.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Nome prodotto è obbligatorio e deve essere una stringa non vuota'
      });
    }
    
    if (prezzo === undefined || prezzo === null || isNaN(Number(prezzo))) {
      return res.status(400).json({
        success: false,
        message: 'Prezzo è obbligatorio e deve essere un numero valido'
      });
    }
    
    const nuovoProdotto: Prodotto = {
      prodotto: prodotto.trim(),
      prezzo: Number(prezzo)
    };
    
    await database.addProdotto(nuovoProdotto);
    
    res.status(200).json({
      success: true,
      message: 'Prodotto aggiunto con successo',
      data: nuovoProdotto
    });
  } catch (error) {
    console.error('Errore nell\'aggiunta del prodotto:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

// Endpoint per aggiornare un prodotto esistente
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID prodotto non valido'
      });
    }
    
    const { prodotto, prezzo } = req.body;
    
    // Validazione input
    if (prodotto !== undefined && (typeof prodotto !== 'string' || prodotto.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Nome prodotto deve essere una stringa non vuota'
      });
    }
    
    if (prezzo !== undefined && (isNaN(Number(prezzo)))) {
      return res.status(400).json({
        success: false,
        message: 'Prezzo deve essere un numero valido'
      });
    }
    
    const updateData: Partial<Prodotto> = {};
    if (prodotto !== undefined) updateData.prodotto = prodotto.trim();
    if (prezzo !== undefined) updateData.prezzo = Number(prezzo);
    
    const success = await database.updateProdotto(id, updateData);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Prodotto non trovato'
      });
    }
    
    res.json({
      success: true,
      message: 'Prodotto aggiornato con successo'
    });
  } catch (error) {
    console.error('Errore nell\'aggiornamento del prodotto:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

// Endpoint per eliminare un prodotto per ID
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID prodotto non valido'
      });
    }
    
    const success = await database.deleteProdotto(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Prodotto non trovato'
      });
    }
    
    res.json({
      success: true,
      message: 'Prodotto eliminato con successo'
    });
  } catch (error) {
    console.error('Errore nell\'eliminazione del prodotto:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

// Endpoint per eliminare un prodotto per nome
router.delete('/nome/:nome', async (req: Request, res: Response) => {
  try {
    const nome = req.params.nome;
    
    if (!nome || nome.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Nome prodotto è obbligatorio'
      });
    }
    
    const success = await database.deleteProdottoByNome(nome);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Prodotto non trovato'
      });
    }
    
    res.json({
      success: true,
      message: 'Prodotto eliminato con successo'
    });
  } catch (error) {
    console.error('Errore nell\'eliminazione del prodotto per nome:', error);
    res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

export default router;
