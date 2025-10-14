"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../database");
const router = (0, express_1.Router)();
// Endpoint per ottenere la lista dei prodotti (richiestalistaprodotti)
router.get('/richiestalistaprodotti', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const prodotti = yield database_1.database.getAllProdotti();
        res.json({
            success: true,
            data: prodotti,
            message: `Trovati ${prodotti.length} prodotti`
        });
    }
    catch (error) {
        console.error('Errore nel recupero dei prodotti:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server',
            error: error instanceof Error ? error.message : 'Errore sconosciuto'
        });
    }
}));
// Endpoint per ottenere tutti i prodotti (alternativo)
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const prodotti = yield database_1.database.getAllProdotti();
        res.json({
            success: true,
            data: prodotti,
            count: prodotti.length
        });
    }
    catch (error) {
        console.error('Errore nel recupero dei prodotti:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server',
            error: error instanceof Error ? error.message : 'Errore sconosciuto'
        });
    }
}));
// Endpoint per ottenere un prodotto per ID
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID prodotto non valido'
            });
        }
        const prodotto = yield database_1.database.getProdottoById(id);
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
    }
    catch (error) {
        console.error('Errore nel recupero del prodotto:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server',
            error: error instanceof Error ? error.message : 'Errore sconosciuto'
        });
    }
}));
// Endpoint per cercare prodotti per nome
router.get('/search/:nome', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const nome = req.params.nome;
        const prodotti = yield database_1.database.searchProdotti(nome);
        res.json({
            success: true,
            data: prodotti,
            count: prodotti.length,
            searchTerm: nome
        });
    }
    catch (error) {
        console.error('Errore nella ricerca prodotti:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server',
            error: error instanceof Error ? error.message : 'Errore sconosciuto'
        });
    }
}));
// Endpoint per aggiungere un nuovo prodotto
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const nuovoProdotto = {
            prodotto: prodotto.trim(),
            prezzo: Number(prezzo)
        };
        yield database_1.database.addProdotto(nuovoProdotto);
        res.status(201).json({
            success: true,
            message: 'Prodotto aggiunto con successo',
            data: nuovoProdotto
        });
    }
    catch (error) {
        console.error('Errore nell\'aggiunta del prodotto:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server',
            error: error instanceof Error ? error.message : 'Errore sconosciuto'
        });
    }
}));
// Endpoint per aggiornare un prodotto esistente
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const updateData = {};
        if (prodotto !== undefined)
            updateData.prodotto = prodotto.trim();
        if (prezzo !== undefined)
            updateData.prezzo = Number(prezzo);
        const success = yield database_1.database.updateProdotto(id, updateData);
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
    }
    catch (error) {
        console.error('Errore nell\'aggiornamento del prodotto:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server',
            error: error instanceof Error ? error.message : 'Errore sconosciuto'
        });
    }
}));
// Endpoint per eliminare un prodotto per ID
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID prodotto non valido'
            });
        }
        const success = yield database_1.database.deleteProdotto(id);
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
    }
    catch (error) {
        console.error('Errore nell\'eliminazione del prodotto:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server',
            error: error instanceof Error ? error.message : 'Errore sconosciuto'
        });
    }
}));
// Endpoint per eliminare un prodotto per nome
router.delete('/nome/:nome', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const nome = req.params.nome;
        if (!nome || nome.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Nome prodotto è obbligatorio'
            });
        }
        const success = yield database_1.database.deleteProdottoByNome(nome);
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
    }
    catch (error) {
        console.error('Errore nell\'eliminazione del prodotto per nome:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server',
            error: error instanceof Error ? error.message : 'Errore sconosciuto'
        });
    }
}));
exports.default = router;
