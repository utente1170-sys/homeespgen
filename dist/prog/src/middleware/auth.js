"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.basicAuth = exports.conditionalBasicAuth = void 0;
// Autenticazione Basic HTTP per proteggere tutte le rotte
// Usa variabili d'ambiente ADMIN_USER e ADMIN_PASSWORD, con default sicuri
const ADMIN_USER = process.env.ADMIN_USER || 'admin0';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'esp32';
const conditionalBasicAuth = (req, res, next) => {
    // Socket.IO usa il percorso "/socket.io/" per il suo handshake
    if (req.url.startsWith('/socket.io/')) {
        return next(); // Salta l'autenticazione per Socket.IO
    }
    basicAuth(req, res, next); // Applica l'autenticazione per le altre rotte
};
exports.conditionalBasicAuth = conditionalBasicAuth;
function basicAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="ESP Home Server"');
        res.status(401).send('Autenticazione richiesta');
        return;
    }
    const base64Credentials = authHeader.split(' ')[1];
    let decoded;
    try {
        decoded = Buffer.from(base64Credentials, 'base64').toString('utf8');
    }
    catch (_a) {
        res.setHeader('WWW-Authenticate', 'Basic realm="ESP Home Server"');
        res.status(401).send('Credenziali non valide');
        return;
    }
    const separatorIndex = decoded.indexOf(':');
    const username = separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : '';
    const password = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : '';
    const isValid = username === ADMIN_USER && password === ADMIN_PASSWORD;
    if (!isValid) {
        res.setHeader('WWW-Authenticate', 'Basic realm="ESP Home Server"');
        res.status(401).send('Accesso negato');
        return;
    }
    // Opzionale: memorizza l'utente autenticato per i log
    req.authenticatedUser = username;
    next();
}
exports.basicAuth = basicAuth;
