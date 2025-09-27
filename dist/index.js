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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attivaServer = void 0;
// Configurazione Scenari di Conservazione Dati
// const SCENARIO = 1;  // Periodo di Conservazione Configurabile
const SCENARIO = 2; // Backup delle Statistiche (attivo)
exports.attivaServer = true;
const fs = require('fs');
const logger_1 = require("./middleware/logger");
const auth_1 = require("./middleware/auth");
const logs_1 = __importDefault(require("./routes/logs"));
const database_1 = require("./database");
const helpers_1 = require("./helpers");
const WebSocket = require('ws');
const http = require('http');
const https = require('https');
const express = require('express');
//const io = require('socket.io')(https);
//let io = require('socket.io')
//const SocketIOServer = require('socket.io').Server; // Importa la CLASSE Server di Socket.IO
const app = express();
const port = 3000;
const path = require('path');
// Autenticazione per tutte le rotte (inclusi asset statici e homepage)
//app.use(conditionalBasicAuth); //basicAuth);
app.use(auth_1.basicAuth);
const os = require('os'); // Modulo Node.js per informazioni sul sistema operativo
app.use(express.static(path.join(__dirname, '../public')));
let test = (process.env.TEST || 'false') == 'true' ? true : false;
let server;
let ioInstance;
if (test) 
//***** ******************TEST**********************+
{
    console.log(" SSL");
    const sslOptions = {
        key: fs.readFileSync('key.key'),
        cert: fs.readFileSync('key.crt')
    };
    server = https.createServer(sslOptions, app);
    // server = http.createServer(app);
    // ioInstance = new SocketIOServer(server, { // *** CORREZIONE QUI ***
    //   cors: {
    //     origin: "*",
    //     methods: ["GET", "POST"]
    //   }
    // });
}
//**************************************************
else {
    console.log(" NO SSL");
    server = http.createServer(app);
    // ioInstance = new SocketIOServer(server, { // *** CORREZIONE QUI ***
    //   cors: {
    //     origin: "*",
    //     methods: ["GET", "POST"]
    //   }
    // });
}
//const WebSocket = require('ws')
const PORT = process.env.PORT || 3000;
/* ioInstance.use((socket, next) => {
  // Implementa la logica di autenticazione qui per le connessioni Socket.IO
  // Esempio: Controlla un token JWT o credenziali passate nel handshake
  // const token = socket.handshake.auth.token;
  // if (isValidToken(token)) {
  //   next();
  // } else {
  //   next(new Error('Authentication error'));
  // }
  next(); // Per ora, per test, permetti tutte le connessioni
}); */
// const wss = new WebSocket.Server({ server: server , cors: {
//   origin: "*",
//   methods: ["GET", "POST"]
// } })
// Crea un'istanza del server WebSocket che NON ascolta sulla sua propria porta
// ma usa l'evento 'upgrade' del server HTTP/HTTPS.
const wss = new WebSocket.Server({ noServer: true });
// Server Node.js (con ws, senza HTTPS, senza Socket.IO)
// ... (basicAuth e static assets - per ora commentati per test) ...
// Cambiamo il nome per chiarezza, non è più ioInstance
// Poiché `test` è false, questo blocco verrà eseguito:
let UID = "";
let nome;
// --- Gestione dell'Upgrade a WebSocket ---
// Il server HTTP cattura le richieste di upgrade e le passa a wss
server.on('upgrade', (request, socket, head) => {
    console.log("sono dentro upgrade");
    // Verifichiamo il percorso della richiesta WebSocket
    // Il client si connetterà a ws://192.168.1.24:3000/ws
    if (request.url === '/ws') { // *** PUNTO CRITICO: Controlla che il percorso sia /ws ***
        wss.handleUpgrade(request, socket, head, clientWs => {
            wss.emit('connection', clientWs, request);
        });
    }
    else {
        // Se la richiesta di upgrade non è per il percorso /ws, chiudiamo la connessione
        console.log(`Richiesta di upgrade non valida per: ${request.url}`);
        socket.destroy();
    }
});
/**
 * Ottiene l'indirizzo IP IPv4 non interno che corrisponde a un prefisso IP specifico.
 * @param {string} ipPrefix Il prefisso IP da cercare (es. '192.168.1.').
 * @returns {string} L'indirizzo IP locale del server, o 'localhost' come fallback.
 */
function getFilteredLocalIpAddress(ipPrefix) {
    const interfaces = os.networkInterfaces();
    console.log(interfaces);
    for (const interfaceName in interfaces) {
        const iface = interfaces[interfaceName];
        console.log(iface);
        for (const alias of iface) {
            if (alias.family === 'IPv4' && !alias.internal && alias.address.startsWith(ipPrefix)) {
                return alias.address;
            }
        }
    }
    return 'localhost';
}
// Funzione per ottenere l'IP locale della macchina
/**
 * Ottiene l'indirizzo IP locale del server con un ordine di preferenza.
 * @returns {string} L'indirizzo IP locale del server.
 */
function getRobustLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    // Nomi di interfacce preferiti (specifici del tuo SO/hardware)
    const preferredInterfaceNames = ['EthernetPC', 'eth0', 'Ethernet', 'Wi-Fi', 'wlan0', 'en0'];
    const preferredIpPrefix = '';
    // 1. Cerca per nomi preferiti
    for (const name of preferredInterfaceNames) {
        const iface = interfaces[name];
        if (iface) {
            for (const alias of iface) {
                if (alias.family === 'IPv4' && !alias.internal) {
                    console.log(`[IP_RESOLVER] Trovato IP da interfaccia preferita "${name}": ${alias.address}`);
                    return alias.address;
                }
            }
        }
    }
}
let serverIp = getFilteredLocalIpAddress("");
console.log(serverIp);
serverIp = getRobustLocalIpAddress();
console.log(serverIp);
// Avvio del server HTTP
server.listen(port, "0.0.0.0", () => {
    console.log("Server is running on port " + port);
    const protocol = test ? 'https' : 'http';
    console.log(`Server ${protocol} WebSocket in ascolto su ${protocol}://localhost:${port}`);
    //console.log(`Per connetterti dall'ESP32: ${test ? 'wss' : 'ws'}://YOUR_SERVER_IP_OR_DOMAIN:${port}/socket.io/?EIO=4&transport=websocket`);
});
// Gestione errori del server
server.on('error', (error) => {
    console.log("errore1");
    console.error('Errore del server:', error);
});
server.on('connection', (socket) => {
    // console.log('Nuova connessione da:', socket.remoteAddress + ':' + socket.remotePort);
    const clientIp = socket.remoteAddress;
    const clientPort = socket.remotePort;
    // if (clientIp!=serverIp) 
    //   console.log(`[SERVER_CONN] Nuova connessione da: ${clientIp}:${clientPort}`);
    //   socket.on('data', (data) => {
    //     console.log(`[SERVER_CONN] Dati RAW ricevuti da ${clientIp}:${clientPort}:`);
    //     console.log(data.toString('hex')); // Logga i dati in formato esadecimale
    //     // console.log(data.toString('utf8')); // Prova a loggarlo come testo (potrebbe essere illeggibile)
    //     console.log(data);
    //   });
    socket.on('error', (error) => {
        console.log("errore2");
        console.error(`[SERVER_CONN] Errore sul socket da ${clientIp}:${clientPort}:`, error);
        console.error('Errore socket:', error);
    });
    socket.on('close', (hadError) => {
        if (hadError) {
            //  console.log('Connessione chiusa con errore da:', socket.remoteAddress + ':' + socket.remotePort);
        }
        else {
            // console.log('Connessione chiusa normalmente da:', socket.remoteAddress + ':' + socket.remotePort);
        }
    });
});
// Gestione connessioni WebSocket standard
let ledState = false;
try {
    wss.on('connection', ws => {
        //  console.log(`Un client si è connesso via WebSocket (standard)!${ws.id}`); // Log aggiornato
        ws.on('message', message => {
            const msgStr = message.toString(); // Converti il Buffer ricevuto in Stringa
            console.log(`Ricevuto messaggio => ${msgStr} da ${ws.id}`);
            try {
                if (msgStr === "toggle") {
                    // Implementa la tua logica di toggle qui
                    // Ad esempio, potresti voler aggiornare lo stato di un LED e poi notificare tutti
                    // let ledState = getLedState(); // Funzione per ottenere lo stato attuale
                    // ledState = !ledState;         // Cambia lo stato
                    // updateLedHardware(ledState);  // Aggiorna l'hardware
                    ws.send('toggle_ack'); // Invia un ACK specifico al mittente se preferisci
                    // Invia lo stato aggiornato a tutti i client connessi, incluso il mittente
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            // client.send(msgStr); // O client.send(ledState ? "1" : "0");
                            ledState = !ledState;
                            client.send((ledState) ? "1" : "0");
                        }
                    });
                }
                if (JSON.parse(msgStr).type === "Nome") {
                    // Esegui JSON.parse una sola volta e memorizzalo in una variabile per efficienza e chiarezza
                    const messageData = JSON.parse(msgStr);
                    // database.getTagOwnerByUID restituisce Promise<TagOwner | null>
                    database_1.database.getTagOwnerByUID(messageData.source)
                        .then((record) => {
                        console.log("ricevuto il messaggio invio risposta");
                        if (record) { // Controlla se il record esiste (non è null)
                            ws.send(JSON.stringify({ type: 'nomeUID', nome: record.nominativo, espId: "Server" }));
                        }
                        else {
                            // Se record è null (non trovato), invia una stringa vuota
                            ws.send(JSON.stringify({ type: 'nomeUID', nome: "", espId: "Server" }));
                        }
                    })
                        .catch((error) => {
                        console.error("Errore durante il recupero del TagOwner:", error);
                        // In caso di errore (reject), invia una stringa vuota
                        ws.send(JSON.stringify({ type: 'nomeUID', nome: "", espId: "Server" }));
                    });
                }
                else {
                    // Nessun handler specifico per questo tipo di messaggio JSON
                    console.log("Messaggio JSON ricevuto con tipo non gestito:", msgStr.type);
                    ws.send(JSON.stringify({ type: 'error', message: 'Tipo di messaggio non riconosciuto', receivedType: msgStr.type }));
                }
            }
            catch (e) { // Cattura specificamente l'errore di parsing JSON
                console.error(`Errore parsing JSON: ${e.message} - Messaggio ricevuto: ${msgStr}`);
                ws.send(JSON.stringify({ type: 'error', message: `Errore parsing JSON: ${e.message}`, receivedMessage: msgStr }));
            }
        });
        // Messaggio iniziale al client appena connesso
        ws.send(JSON.stringify({ type: 'ack', message: 'OK', espId: "Server" }));
        //ws.send({"type":"ack","meesage":'Hello! Message From Server!!'});
        // Se vuoi inviare lo stato iniziale del LED
        // ws.send(getLedState() ? "1" : "0");
        ws.on('close', () => {
            console.log("WebSocket client disconnected.");
        });
        ws.on('error', (err) => {
            console.error("WebSocket error:", err);
        });
    });
}
catch (error) {
    console.log(error);
}
// wss.on('connection', ws => {
//   ws.on('message', message => {
//     // console.log(`Received message => ${message}`)
//   })
//   ws.send('Hello! Message From Server!!')
//   ws.on('close', () => {
//     console.log("close"); // Ferma l'intervallo quando il client si disconnette
//   });
// })
/* wss.on('connection', (socket) => {
  console.log('Un client si è connesso via Socket :', socket.id);
  socket.emit('message', 'Benvenuto al server Socket   !');
  socket.on('message', (msg) => {
    console.log('Messaggio ricevuto dal client %s: %s', socket.id, msg);
    socket.broadcast.emit('message', `Client ${socket.id}: ${msg}`);
  });
  socket.on('disconnect', () => {
    console.log('Il client si è disconnesso:', socket.id);
  });
}); */
// ioInstance.on('connection', (socket) => {
//   console.log('Un client si è connesso via Socket.IO:', socket.id);
//   socket.emit('message', 'Benvenuto al server Socket.IO sicuro!');
//   socket.on('message', (msg) => {
//     console.log('Messaggio ricevuto dal client %s: %s', socket.id, msg);
//     socket.broadcast.emit('message', `Client ${socket.id}: ${msg}`);
//   });
//   socket.on('disconnect', () => {
//     console.log('Il client si è disconnesso:', socket.id);
//   });
// });
app.use(express.json());
// Middleware per loggare le azioni degli utenti
app.use(logger_1.userLogger);
// Route per i log
app.use('/api', logs_1.default);
/************************************************** */
/****************************************************************** */
app.use(express.urlencoded({ extended: true }));
// Funzione per aggiungere zero iniziale se necessario
function pad(num) {
    return String(num).padStart(2, '0');
}
function formatDataIta(date) {
    let x = date.split('-');
    return pad(x[2]) + "-" + pad(x[1]) + "-" + pad(x[0]);
}
// Funzione per formattare data e ora da SQLite (YYYY-MM-DD HH:MM:SS) a formato italiano (GG-MM-YYYY HH:MM:SS)
function formatDateTimeIta(dateTime) {
    if (!dateTime || dateTime === '-')
        return '-';
    // Separa data e ora
    const [datePart, timePart] = dateTime.split(' ');
    if (!datePart)
        return '-';
    // Formatta la data usando formatDataIta
    const formattedDate = formatDataIta(datePart);
    // Se c'è anche l'ora, aggiungila
    return timePart ? `${formattedDate} ${timePart}` : formattedDate;
}
app.post("/postjson", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (exports.attivaServer) {
        try {
            console.log("Richiesta POST ricevuta su /postjson");
            console.log("Headers:", req.headers);
            console.log("Body completo:", JSON.stringify(req.body, null, 2));
            const { DEVICE, uid, timestamp, datetime, credito_precedente, credito_attuale, status } = req.body;
            // Validazione dei dati ricevuti
            if (!uid || !timestamp || !datetime || credito_precedente === undefined || credito_attuale === undefined || !status) {
                console.error("Dati mancanti o invalidi:", req.body);
                return res.status(400).json({
                    success: false,
                    message: "Dati mancanti o invalidi",
                    required: ["DEVICE", "uid", "timestamp", "datetime", "credito_precedente", "credito_attuale", "status"]
                });
            }
            const record = req.body;
            console.log("Dati ricevuti:", {
                DEVICE,
                uid,
                timestamp,
                datetime,
                credito_precedente,
                credito_attuale,
                status
            });
            // Salva i dati nel file JSON e nel database SQLite
            yield saveRecordToFile(record);
            res.json({
                success: true,
                message: "Dati ricevuti correttamente",
                received: req.body
            });
        }
        catch (error) {
            console.error("Errore nel processing dei dati:", error);
            res.status(500).json({
                success: false,
                message: "Errore interno del server",
                error: error instanceof Error ? error.message : 'Errore sconosciuto'
            });
        }
    }
    else
        res.status(500);
}));
// Funzione per salvare i record in un file JSON e nel database SQLite
function saveRecordToFile(record) {
    return __awaiter(this, void 0, void 0, function* () {
        /*   const dataFile = 'sensor_data.json';
          let records: recor[] = [];
        
          // Leggi i dati esistenti se il file esiste
          if (fs.existsSync(dataFile)) {
            try {
              const fileContent = fs.readFileSync(dataFile, 'utf8');
              records = JSON.parse(fileContent);
            } catch (error) {
              console.error('Errore nella lettura del file:', error);
              records = [];
            }
          }
        
          // Aggiungi il nuovo record
          records.push(record);
        
          // Mantieni solo gli ultimi 100 record per evitare file troppo grandi
          // if (records.length > 100) {
          //   records = records.slice(-100);
          // }
        
          // Salva i dati nel file JSON (mantiene compatibilità)
          try {
            fs.writeFileSync(dataFile, JSON.stringify(records, null, 2));
            console.log('Record salvato nel file:', dataFile);
          } catch (error) {
            console.error('Errore nel salvataggio del file:', error);
          } */
        // Salva anche nel database SQLite
        try {
            yield database_1.database.addSensorRecord(record);
            console.log('Record salvato anche nel database SQLite');
        }
        catch (error) {
            console.error('Errore nel salvataggio nel database:', error);
        }
    });
}
// Endpoint per visualizzare i dati dei sensori in una tabella HTML (dal database SQLite)
app.get('/sensor-data', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        let records;
        let total;
        // Se sono specificati i filtri delle date, usa la funzione specifica
        if (startDate && endDate) {
            const filteredRecords = yield database_1.database.getSensorRecordsByDateRange(startDate, endDate);
            records = filteredRecords;
            total = filteredRecords.length;
        }
        else {
            // Altrimenti usa la funzione normale con paginazione
            const result = yield database_1.database.getAllSensorRecords(page, limit);
            records = result.records;
            total = result.total;
        }
        // Ottieni tutti i possessori dei tag per mostrare i nominativi
        const tagOwners = yield database_1.database.getAllTagOwners();
        // Crea una mappa per accesso rapido ai possessori per UID
        const tagOwnersMap = new Map();
        tagOwners.forEach(owner => {
            tagOwnersMap.set(owner.uid, owner);
        });
        // Genera la tabella HTML con i dati dei possessori e paginazione
        const html = generateSensorDataTable(records, tagOwnersMap, {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }, { startDate, endDate });
        res.send(html);
    }
    catch (error) {
        console.error('Errore nel recupero dei dati dal database:', error);
        res.status(500).send('Errore nel recupero dei dati');
    }
}));
// Endpoint per ottenere i dati dei sensori in formato JSON (dal database SQLite)
app.get('/api/sensor-data', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 50;
        const result = yield database_1.database.getAllSensorRecords(page, pageSize);
        res.json({
            success: true,
            data: result.records,
            pagination: {
                page,
                pageSize,
                total: result.total,
                totalPages: Math.ceil(result.total / pageSize)
            }
        });
    }
    catch (error) {
        console.error('Errore nel recupero dei dati dal database:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei dati'
        });
    }
}));
// Endpoint per ottenere un record specifico per UID (ultima operazione)
app.get('/api/sensor-data/uid/:uid', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uid = req.params.uid;
        const record = yield database_1.database.getSensorRecordByUID(uid);
        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Record non trovato'
            });
        }
        res.json({
            success: true,
            data: record
        });
    }
    catch (error) {
        console.error('Errore nel recupero del record per UID:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero del record'
        });
    }
}));
// Endpoint per ottenere tutte le operazioni di un UID specifico
app.get('/api/sensor-data/uid/:uid/history', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uid = req.params.uid;
        const limit = parseInt(req.query.limit) || 100;
        const records = yield database_1.database.getSensorRecordsByUID(uid, limit);
        if (records.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Nessuna operazione trovata per questo UID'
            });
        }
        res.json({
            success: true,
            data: records,
            count: records.length,
            uid: uid
        });
    }
    catch (error) {
        console.error('Errore nel recupero dello storico per UID:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dello storico'
        });
    }
}));
// Endpoint per pulire i dati vecchi dei sensori
app.delete('/api/sensor-data/cleanup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const daysToKeep = parseInt(req.query.days) || 30;
        const deletedCount = yield database_1.database.cleanOldSensorRecords(daysToKeep);
        res.json({
            success: true,
            message: `Puliti ${deletedCount} record più vecchi di ${daysToKeep} giorni`,
            deletedCount
        });
    }
    catch (error) {
        console.error('Errore nella pulizia dei dati:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella pulizia dei dati'
        });
    }
}));
// Funzione per generare la tabella HTML dei dati dei sensori
function generateSensorDataTable(records, tagOwnersMap, pagination, filters) {
    const tableRows = records.map(record => {
        var _a;
        const nominativo = ((_a = tagOwnersMap === null || tagOwnersMap === void 0 ? void 0 : tagOwnersMap.get(record.uid)) === null || _a === void 0 ? void 0 : _a.nominativo) || '';
        const uidCell = `
        <div>
            <a href="/spending-dashboard/${record.uid}" class="uid-link">${record.uid}</a>
            ${nominativo ? `<br><small class="nominativo">👤 ${nominativo}</small>` : ''}
        </div>
    `;
        return `
        <tr>
            <td>${record.DEVICE}</td>
            <td>${uidCell}</td>
            <td>${record.datetime}</td>
            <td>${Number(record.credito_precedente).toFixed(2)}€</td>
            <td>${Number(record.credito_attuale).toFixed(2)}€</td>
            <td><span class="status ${record.status}">${record.status}</span></td>
        </tr>
    `;
    }).join('');
    // Stili aggiuntivi specifici per questa pagina (solo quelli non presenti nel CSS comune)
    const additionalStyles = "";
    //  `
    //   .filter-info {
    //     background: #e3f2fd;
    //     border: 1px solid #2196f3;
    //     border-radius: 6px;
    //     padding: 15px;
    //     margin: 20px 0;
    //     text-align: center;
    //   }
    //   .filter-info p {
    //     margin: 5px 0;
    //     color: #1976d2;
    //   }
    //   .filter-info p:first-child {
    //     font-weight: bold;
    //     font-size: 16px;
    //   }
    // `;
    //${generateSearchScript('searchInput', 'clearSearch')}
    // Script aggiuntivi specifici per questa pagina
    const additionalScripts = `
    
    ${(0, helpers_1.generateSearchScript)('searchOperations', 'clearOperationsSearch')}
    ${(0, helpers_1.generateDateRangeScript)('startDate', 'endDate', 'applyDateFilter')}
    ${(0, helpers_1.disattivaScript)('btn-a', 'disattiva')}
    ${(0, helpers_1.checkServer)('btn-a', 'checkServer')}
    ${(0, helpers_1.resetDatabaseScript)('btn-reset-db', 'resetDatabase')}
    
  `;
    // Contenuto della pagina
    const content = `
    ${(0, helpers_1.generatePagination)(pagination)}
    <div class="container">
        <h1>📊 Raccolta Dati</h1>
        
        <!-- Controlli per il filtro delle date -->
       
      <!--  ${(0, helpers_1.generateSearchSectionWithDateFilter)('searchInput', '🔍 Cerca per UID o nominativo possessore...', 'clearSearch', 'startDate', 'endDate', 'applyDateFilter')} -->
        <button id='btn-a' class="server-btn" onclick="disattiva()"> Disattiva/Attiva</button>
        <button id='btn-reset-db' class="danger-btn" onclick="resetDatabase()">🗑️ Azzera Database</button>
          ${(0, helpers_1.generateDateRangeControls)('startDate', 'endDate', 'applyDateFilter', (0, helpers_1.generateDateFilterIndicator)(filters === null || filters === void 0 ? void 0 : filters.startDate, filters === null || filters === void 0 ? void 0 : filters.endDate))}
       <!--   ${(filters === null || filters === void 0 ? void 0 : filters.startDate) && (filters === null || filters === void 0 ? void 0 : filters.endDate) ? `
          <div class="filter-info">
            <p>📅 Filtro Date Applicato</p>
            <p>Periodo: Dal ${filters.startDate} al ${filters.endDate}</p>
            <p><em>I dati mostrati si riferiscono solo a questo intervallo temporale</em></p>
          </div>
        ` : ''} -->
            ${(0, helpers_1.generateSearchSection)('searchOperations', '🔍 Cerca per UID o nominativo possessore...', 'clearOperationsSearch()')}
         
     
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>DEVICE</th>
                        <th>UID</th>
                        <th>Data/Ora</th>
                        <th>Credito Precedente</th>
                        <th>Credito Attuale</th>
                        <th>Stato</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.length > 0 ? tableRows : '<tr><td colspan="5" class="no-data">Nessun dato disponibile</td></tr>'}
                </tbody>
            </table>
        </div>
    </div>
  `;
    return (0, helpers_1.generateBaseHTML)('Dati Sensori', 'sensor-data', content, additionalStyles, additionalScripts);
}
// Endpoint per ottenere tutti i possessori dei tag
app.get('/api/tag-owners', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const allTagOwners = yield database_1.database.getAllTagOwners();
        const total = allTagOwners.length;
        const totalPages = Math.ceil(total / pageSize) || 1;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const tagOwners = allTagOwners.slice(startIndex, endIndex);
        res.json({
            success: true,
            data: tagOwners,
            pagination: {
                page,
                pageSize,
                total,
                totalPages
            }
        });
    }
    catch (error) {
        console.error('Errore nel recupero dei possessori dei tag:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei possessori dei tag'
        });
    }
}));
// Endpoint per ottenere un possessore specifico per UID
app.get('/api/tag-owners/:uid', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uid = req.params.uid;
        const tagOwner = yield database_1.database.getTagOwnerByUID(uid);
        if (!tagOwner) {
            return res.status(404).json({
                success: false,
                message: 'possessore non trovato'
            });
        }
        res.json({
            success: true,
            data: tagOwner
        });
    }
    catch (error) {
        console.error('Errore nel recupero del possessore:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero del possessore'
        });
    }
}));
// Endpoint per cercare possessori per nominativo
app.get('/api/tag-owners/search/:nominativo', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const nominativo = req.params.nominativo;
        const tagOwners = yield database_1.database.searchTagOwnersByNominativo(nominativo);
        res.json({
            success: true,
            data: tagOwners,
            count: tagOwners.length
        });
    }
    catch (error) {
        console.error('Errore nella ricerca dei possessori:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella ricerca dei possessori'
        });
    }
}));
// Endpoint per aggiungere/aggiornare un possessore
app.post('/api/tag-owners', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { uid, nominativo, indirizzo, note, created_at } = req.body;
        // Validazione dei dati
        if (!uid || !nominativo || !indirizzo) {
            return res.status(400).json({
                success: false,
                message: 'Dati mancanti',
                required: ['uid', 'nominativo', 'indirizzo']
            });
        }
        const tagOwner = {
            uid,
            nominativo,
            indirizzo,
            note: note || undefined,
            created_at
        };
        yield database_1.database.addTagOwner(tagOwner);
        res.json({
            success: true,
            message: 'possessore salvato con successo',
            data: tagOwner
        });
    }
    catch (error) {
        console.error('Errore nel salvataggio del possessore:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel salvataggio del possessore'
        });
    }
}));
// Endpoint per eliminare un possessore
app.delete('/api/tag-owners/:uid', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uid = req.params.uid;
        const deleted = yield database_1.database.deleteTagOwner(uid);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'possessore non trovato'
            });
        }
        res.json({
            success: true,
            message: 'possessore eliminato con successo'
        });
    }
    catch (error) {
        console.error('Errore nell\'eliminazione del possessore:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'eliminazione del possessore'
        });
    }
}));
// Endpoint per visualizzare i possessori dei tag in formato HTML
app.get('/tag-owners', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        // Ottieni tutti i possessori dei tag
        const allTagOwners = yield database_1.database.getAllTagOwners();
        // Calcola la paginazione
        const total = allTagOwners.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        // Estrai solo i record per la pagina corrente
        const tagOwners = allTagOwners.slice(startIndex, endIndex);
        const html = generateTagOwnersTable(tagOwners, {
            page,
            limit,
            total,
            totalPages
        });
        res.send(html);
    }
    catch (error) {
        console.error('Errore nel recupero dei possessori dei tag:', error);
        res.status(500).send('Errore nel recupero dei dati');
    }
}));
// === ENDPOINT PER LA DASHBOARD SPESE ===
// Endpoint per ottenere la spesa totale di un UID specifico
app.get('/api/spending/:uid', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { uid } = req.params;
        const spendingData = yield database_1.database.getTotalSpendingByUID(uid);
        res.json({
            success: true,
            data: spendingData
        });
    }
    catch (error) {
        console.error('Errore nel calcolo della spesa per UID:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel calcolo della spesa'
        });
    }
}));
// Endpoint per ottenere le statistiche di spesa di tutti gli UID
app.get('/api/spending-stats', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const stats = yield database_1.database.getAllSpendingStats();
        // Enrich con nominativo per coerenza con le viste
        const tagOwners = yield database_1.database.getAllTagOwners();
        const tagOwnersMap = new Map();
        tagOwners.forEach(owner => tagOwnersMap.set(owner.uid, owner));
        const enriched = stats.map(s => {
            var _a;
            return (Object.assign(Object.assign({}, s), { nominativo: ((_a = tagOwnersMap.get(s.uid)) === null || _a === void 0 ? void 0 : _a.nominativo) || null }));
        });
        const total = enriched.length;
        const totalPages = Math.ceil(total / pageSize) || 1;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginated = enriched.slice(startIndex, endIndex);
        res.json({
            success: true,
            data: paginated,
            pagination: {
                page,
                pageSize,
                total,
                totalPages
            }
        });
    }
    catch (error) {
        console.error('Errore nel recupero delle statistiche di spesa:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle statistiche'
        });
    }
}));
// Endpoint per cercare nelle statistiche di spesa
app.get('/api/spending-stats/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const searchTerm = req.query.q;
        if (!searchTerm) {
            return res.json({
                success: true,
                data: []
            });
        }
        const stats = yield database_1.database.getAllSpendingStats();
        // Ottieni tutti i possessori dei tag per mostrare i nominativi
        const tagOwners = yield database_1.database.getAllTagOwners();
        const tagOwnersMap = new Map();
        tagOwners.forEach(owner => {
            tagOwnersMap.set(owner.uid, owner);
        });
        // Filtra i risultati
        const filteredStats = stats.filter(stat => {
            const tagOwner = tagOwnersMap.get(stat.uid);
            const searchFields = [
                stat.uid,
                (tagOwner === null || tagOwner === void 0 ? void 0 : tagOwner.nominativo) || '',
                (tagOwner === null || tagOwner === void 0 ? void 0 : tagOwner.indirizzo) || '',
                stat.totalSpent.toString(),
                stat.totalOperations.toString(),
                stat.lastOperation
            ];
            return searchFields.some(field => field.toLowerCase().includes(searchTerm.toLowerCase()));
        });
        // Aggiungi i nominativi ai risultati filtrati
        const enrichedStats = filteredStats.map(stat => {
            var _a;
            return (Object.assign(Object.assign({}, stat), { nominativo: ((_a = tagOwnersMap.get(stat.uid)) === null || _a === void 0 ? void 0 : _a.nominativo) || null }));
        });
        res.json({
            success: true,
            data: enrichedStats
        });
    }
    catch (error) {
        console.error('Errore nella ricerca delle statistiche di spesa:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella ricerca'
        });
    }
}));
// Endpoint per visualizzare la dashboard di spesa di un UID specifico
app.get('/spending-dashboard/:uid', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { uid } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        let spendingData;
        let monthlyStats;
        // Se sono specificati i filtri delle date, usa la funzione specifica
        if (startDate && endDate) {
            spendingData = yield database_1.database.getTotalSpendingByUIDAndDateRange(uid, startDate, endDate);
            monthlyStats = yield database_1.database.getMonthlyStatsByUIDAndDateRange(uid, startDate, endDate);
        }
        else {
            // Altrimenti usa la funzione normale
            spendingData = yield database_1.database.getTotalSpendingByUID(uid);
            monthlyStats = yield database_1.database.getMonthlyStatsByUID(uid);
        }
        // Calcola la paginazione per le operazioni
        const total = spendingData.operations.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        // Estrai solo le operazioni per la pagina corrente
        const paginatedOperations = spendingData.operations.slice(startIndex, endIndex);
        // Crea una copia dei dati con le operazioni paginate
        const paginatedSpendingData = Object.assign(Object.assign({}, spendingData), { operations: paginatedOperations, monthlyStats // aggiunto per la tabella mensile
         });
        const html = generateSpendingDashboard(paginatedSpendingData, {
            page,
            limit,
            total,
            totalPages
        }, { startDate, endDate });
        res.send(html);
    }
    catch (error) {
        console.error('Errore nella generazione della dashboard:', error);
        res.status(500).send('Errore nella generazione della dashboard');
    }
}));
// Endpoint per visualizzare la dashboard generale delle spese
app.get('/spending-dashboard', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        let stats;
        // Se sono specificati i filtri delle date, usa la funzione specifica
        if (startDate && endDate) {
            stats = yield database_1.database.getSpendingStatsByDateRange(startDate, endDate);
        }
        else {
            // Altrimenti usa la funzione normale
            stats = yield database_1.database.getAllSpendingStats();
        }
        // Ottieni tutti i possessori dei tag per mostrare i nominativi
        const tagOwners = yield database_1.database.getAllTagOwners();
        // Crea una mappa per accesso rapido ai possessori per UID
        const tagOwnersMap = new Map();
        tagOwners.forEach(owner => {
            tagOwnersMap.set(owner.uid, owner);
        });
        // Calcola i totali GLOBALI (indipendenti dalla paginazione)
        const globalTotalSpent = stats.reduce((sum, stat) => sum + stat.totalSpent, 0);
        const globalTotalOperations = stats.reduce((sum, stat) => sum + stat.totalOperations, 0);
        const globalTotalSpendingOperations = stats.reduce((sum, stat) => sum + stat.spendingOperations, 0);
        const globalTotalAccrediti = stats.reduce((sum, stat) => sum + stat.totalAccrediti, 0);
        // Calcola la paginazione
        const total = stats.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        // Estrai solo i record per la pagina corrente
        const paginatedStats = stats.slice(startIndex, endIndex);
        const html = generateGeneralSpendingDashboard(paginatedStats, tagOwnersMap, {
            page,
            limit,
            total,
            totalPages
        }, {
            totalSpent: globalTotalSpent,
            totalOperations: globalTotalOperations,
            totalSpendingOperations: globalTotalSpendingOperations,
            totalAccrediti: globalTotalAccrediti
        }, { startDate, endDate });
        res.send(html);
    }
    catch (error) {
        console.error('Errore nella generazione della dashboard generale:', error);
        res.status(500).send('Errore nella generazione della dashboard generale');
    }
}));
// Funzione per generare la tabella HTML dei possessori dei tag
// Funzione per generare la dashboard di spesa per un UID specifico
function generateSpendingDashboard(spendingData, pagination, filters) {
    const operationsRows = spendingData.operations.map(op => {
        return `
      <tr>
        <td>${op.DEVICE}</td> 
        <td>${op.datetime}</td>
        <td>${Number(op.credito_precedente).toFixed(2)}€</td>
        <td>${Number(op.credito_attuale).toFixed(2)}€</td>
        <td><span class="spesa">${op.spesa.toFixed(2)}€</span></td>
        <td><span class="status ${op.status}">${op.status}</span></td>
      </tr>
    `;
    }).join('');
    // Tabella riepilogo mensile
    const monthlyRows = (spendingData.monthlyStats || []).map(row => `
    <tr>
      <td>${row.yearMonth}</td>
      <td>${row.totalOperations}</td>
      <td>${row.totalSpendingOperations}</td>
      <td>${row.totalSpent.toFixed(2)}€</td>
      <td>${row.totalAccrediti.toFixed(2)}€</td>
    </tr>
  `).join('');
    // Stili aggiuntivi specifici per questa pagina (solo quelli non presenti nel CSS comune)
    const additionalStyles = ``;
    // Script aggiuntivi specifici per questa pagina
    const additionalScripts = `
    ${(0, helpers_1.generateSearchScript)('searchOperations', 'clearOperationsSearch')}
    ${(0, helpers_1.generateDateRangeScript)('startDate', 'endDate', 'applyDateFilter')}
  `;
    // Contenuto della pagina
    const content = `
    ${(0, helpers_1.generatePagination)(pagination)}
    <div class="container">
        <h1>💰 Dashboard Spese - UID: ${spendingData.uid}</h1>
        
        <!-- Controlli per il filtro delle date -->
        ${(0, helpers_1.generateDateRangeControls)('startDate', 'endDate', 'applyDateFilter', (0, helpers_1.generateDateFilterIndicator)(filters === null || filters === void 0 ? void 0 : filters.startDate, filters === null || filters === void 0 ? void 0 : filters.endDate))}
        ${spendingData.fromBackup ? '<div class="backup-notice">📊 Dati completati con backup delle statistiche</div>' : ''}
        
        ${spendingData.tagOwner ? `
        <div class="tag-owner-info">
            <h2>👤 Possessore Tag</h2>
            <div class="owner-details">
                <p><strong>Nominativo:</strong> ${spendingData.tagOwner.nominativo}</p>
                <p><strong>Indirizzo:</strong> ${spendingData.tagOwner.indirizzo}</p>
                ${spendingData.tagOwner.note ? `<p><strong>Note:</strong> ${spendingData.tagOwner.note}</p>` : ''}
                <p><strong>Assegnato il:</strong> ${formatDateTimeIta(spendingData.tagOwner.created_at || '')}</p>
            </div>
        </div>
        ` : ''}
        <div class="stats-grid">
           <div class="stat-card">
                <div class="stat-value">${Number(spendingData.lastOperation ? (spendingData.lastOperation.credito_attuale) : 0).toFixed(2)}€</div>
                <div class="stat-label">Credito Attuale</div>
            </div>
             <div class="stat-card">
                 <div class="stat-value">${spendingData.totalSpent.toFixed(2)}€</div>
                 <div class="stat-label">Spesa Totale</div>
             </div>
             
        <div class="stat-card">
            <div class="stat-value">${spendingData.averageSpentPerSpending.toFixed(2)}€</div>
            <div class="stat-label">Spesa Media</div>
        </div>

             <div class="stat-card">
                 <div class="stat-value">${spendingData.totalOperations}</div>
                 <div class="stat-label">Operazioni Totali</div>
             </div>
                     <div class="stat-card">
            <div class="stat-value">${spendingData.spendingOperations}</div>
            <div class="stat-label">Operazioni di Spesa</div>
        </div>
       
            <div class="stat-card">
                <div class="stat-value-op">${spendingData.firstOperation ? spendingData.firstOperation.datetime : 'N/A'}</div>
                <div class="stat-label">Prima Operazione</div>
            </div>
            <div class="stat-card">
                <div class="stat-value-op">${spendingData.lastOperation ? spendingData.lastOperation.datetime : 'N/A'}</div>
                <div class="stat-label">Ultima Operazione</div>
            </div>
         
        </div>
        <h2 class="section-title">📅 Riepilogo Mensile</h2>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Mese</th>
                <th>Operazioni Totali</th>
                <th>Operazioni di Spesa</th>
                <th>Spesa Totale</th>
                <th>Accrediti Totali</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyRows || '<tr><td colspan="5">Nessun dato mensile disponibile</td></tr>'}
            </tbody>
          </table>
        </div>
        <h2 class="section-title">📊 Dettaglio Operazioni</h2>
        ${(0, helpers_1.generateSearchSection)('searchOperations', '🔍 Cerca nelle operazioni...', 'clearOperationsSearch()')}
        <div class="table-container">
            <table>
                <thead> 
                    <tr> 
                        <th>DEVICE</th> 
                        <th>Data/Ora ESP32</th>
                        <th>Credito Precedente</th>
                        <th>Credito Attuale</th>
                        <th>Valore Operaz.</th>
                        <th>Operazione</th>
                    </tr>
                </thead>
                <tbody>
                    ${spendingData.operations.length > 0 ? operationsRows : '<tr><td colspan="5" class="no-data">Nessuna operazione disponibile</td></tr>'}
                </tbody>
            </table>
        </div>
    </div>
  `;
    return (0, helpers_1.generateBaseHTML)(`Dashboard Spese - UID ${spendingData.uid}`, 'spending-dashboard', content, additionalStyles, additionalScripts);
}
// Funzione per generare la dashboard generale delle spese
function generateGeneralSpendingDashboard(stats, tagOwnersMap, pagination, globalTotals, filters) {
    const tableRows = stats.map(stat => {
        // Controlla se esiste un possessore per questo UID
        const tagOwner = tagOwnersMap === null || tagOwnersMap === void 0 ? void 0 : tagOwnersMap.get(stat.uid);
        const nominativo = tagOwner ? tagOwner.nominativo : null;
        // Genera il contenuto della cella UID con link e nominativo
        const uidCell = `
        <div>
            <a href="/spending-dashboard/${stat.uid}" class="uid-link">${stat.uid}</a>${stat.fromBackup ? ' 📊' : ''}
            ${nominativo ? `<br><small class="nominativo">👤 ${nominativo}</small>` : ''}
        </div>
    `;
        return `
      <tr>
        
        <td>${uidCell}</td>
        <td>${stat.creditoAttuale.toFixed(2)}€${stat.fromBackup ? ' 📊' : ''}</td>
        <td>${stat.totalSpent.toFixed(2)}€</td>
        <td>${stat.totalOperations}</td>
                    <td>${stat.averageSpentPerSpending.toFixed(2)}€</td>
        <td>${stat.totalAccrediti.toFixed(2)}€</td>
        <td>${stat.lastOperation}</td>
      </tr>
    `;
    }).join('');
    const totalSpent = globalTotals ? globalTotals.totalSpent : stats.reduce((sum, stat) => sum + stat.totalSpent, 0);
    const totalOperations = globalTotals ? globalTotals.totalOperations : stats.reduce((sum, stat) => sum + stat.totalOperations, 0);
    const totalSpendingOperations = globalTotals ? globalTotals.totalSpendingOperations : stats.reduce((sum, stat) => sum + stat.spendingOperations, 0);
    const totalAccrediti = globalTotals ? globalTotals.totalAccrediti : stats.reduce((sum, stat) => sum + stat.totalAccrediti, 0);
    // Stili aggiuntivi specifici per questa pagina
    const additionalStyles = "";
    //  `
    //   .filter-info {
    //     background: #e3f2fd;
    //     border: 1px solid #2196f3;
    //     border-radius: 6px;
    //     padding: 15px;
    //     margin: 20px 0;
    //     text-align: center;
    //   }
    //   .filter-info p {
    //     margin: 5px 0;
    //     color: #1976d2;
    //   }
    //   .filter-info p:first-child {
    //     font-weight: bold;
    //     font-size: 16px;
    //   }
    // `;
    // Script aggiuntivi specifici per questa pagina
    const additionalScripts = `
    ${(0, helpers_1.generateSearchScript)('searchOperations', 'clearOperationsSearch')}
    ${(0, helpers_1.generateDateRangeScript)('startDate', 'endDate', 'applyDateFilter')}
    
    // Funzione per gestire il sticky header
    function initStickyHeader() {
        const tableContainer = document.querySelector('.table-container');
        const thead = tableContainer?.querySelector('thead');
        
        if (tableContainer && thead) {
            // Aggiungi ombra quando si fa scroll
            tableContainer.addEventListener('scroll', function() {
                if (this.scrollTop > 0) {
                    thead.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                } else {
                    thead.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }
            });
            
            // Evidenzia la colonna quando si passa sopra con il mouse
            const thElements = thead.querySelectorAll('th');
            thElements.forEach((th, index) => {
                th.addEventListener('mouseenter', function() {
                    const tbody = tableContainer.querySelector('tbody');
                    const rows = tbody?.querySelectorAll('tr');
                    rows?.forEach(row => {
                        const cell = row.cells[index];
                        if (cell) {
                            cell.style.backgroundColor = '#e8f5e8';
                            cell.style.transition = 'background-color 0.2s';
                        }
                    });
                });
                
                th.addEventListener('mouseleave', function() {
                    const tbody = tableContainer.querySelector('tbody');
                    const rows = tbody?.querySelectorAll('tr');
                    rows?.forEach((row, rowIndex) => {
                        const cell = row.cells[index];
                        if (cell) {
                            cell.style.backgroundColor = rowIndex % 2 === 0 ? 'white' : '#f2f2f2';
                        }
                    });
                });
            });
        }
    }
    
    // Inizializza il sticky header quando la pagina è caricata
    document.addEventListener('DOMContentLoaded', function() {
        initStickyHeader();
    });
  `;
    // Contenuto della pagina
    const content = `
    ${(0, helpers_1.generatePagination)(pagination)}
    <div class="container">
        <h1>💰 Dashboard Generale Spese</h1>
        
        
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${pagination ? pagination.total : stats.length}</div>
                <div class="stat-label">UID Attivi</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-value">${totalAccrediti.toFixed(2)}€</div>
                <div class="stat-label">Accrediti Totali</div>
            </div>

            <div class="stat-card">
                <div class="stat-value">${totalSpent.toFixed(2)}€</div>
                <div class="stat-label">Spesa Totale</div>
            </div>
          
            <div class="stat-card">
                <div class="stat-value">${totalOperations}</div>
                <div class="stat-label">Operazioni Totali</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${totalSpendingOperations}</div>
                <div class="stat-label">Operazioni di Spesa</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${totalSpendingOperations > 0 ? (totalSpent / totalSpendingOperations).toFixed(2) : '0.00'}€</div>
                <div class="stat-label">Spesa Media</div>
            </div>
        </div>

        <h2 class="section-title">📊 Riepilogo per UID</h2>
        <p class="backup-info">
          📊 = Dati provenienti da backup (record operativi cancellati)
        </p>
        <!-- Controlli per il filtro delle date -->
        ${(0, helpers_1.generateDateRangeControls)('startDate', 'endDate', 'applyDateFilter', (0, helpers_1.generateDateFilterIndicator)(filters === null || filters === void 0 ? void 0 : filters.startDate, filters === null || filters === void 0 ? void 0 : filters.endDate))}
        
       <!-- ${(filters === null || filters === void 0 ? void 0 : filters.startDate) && (filters === null || filters === void 0 ? void 0 : filters.endDate) ? `
          <div class="filter-info">
            <p>📅 Filtro Date Applicato</p>
            <p>Periodo: Dal ${filters.startDate} al ${filters.endDate}</p>
            <p><em>I dati mostrati si riferiscono solo a questo intervallo temporale</em></p>
          </div>
        ` : ''} -->
        ${(0, helpers_1.generateSearchSection)('searchOperations', '🔍 Cerca per UID o nominativo possessore...', 'clearOperationsSearch()')}
        
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>UID</th>
                        <th>Credito Attuale</th>
                        <th>Spesa Totale</th>
                        <th>Operazioni</th>
                        <th>Spesa media</th>
                        <th>Accrediti Totali</th>
                        <th>Ultima Operazione</th>
                    </tr>
                </thead>
                <tbody>
                    ${stats.length > 0 ? tableRows : '<tr><td colspan="7" class="no-data">Nessun dato disponibile</td></tr>'}
                </tbody>
            </table>
        </div>
    </div>
  `;
    return (0, helpers_1.generateBaseHTML)('Dashboard Generale Spese', 'spending-dashboard', content, additionalStyles, additionalScripts);
}
function generateTagOwnersTable(tagOwners, pagination) {
    const tableRows = tagOwners.map(tagOwner => {
        // Controlla se il tag è stato assegnato automaticamente ma non ancora configurato
        const isAutoAssigned = tagOwner.nominativo === 'INSERISCI' || tagOwner.indirizzo === 'INSERISCI';
        const rowClass = isAutoAssigned ? 'auto-assigned' : '';
        const statusIcon = isAutoAssigned ? '⚠️ ' : '';
        // Genera input fields per tutti i campi editabili - rimuovi "INSERISCI" e lascia vuoti
        const nominativoValue = tagOwner.nominativo === 'INSERISCI' ? '' : tagOwner.nominativo;
        const indirizzoValue = tagOwner.indirizzo === 'INSERISCI' ? '' : tagOwner.indirizzo;
        const nominativoField = `<input type="text" class="edit-field" id="nominativo_${tagOwner.uid}" value="${nominativoValue}" placeholder="Inserisci nominativo" oninput="checkSaveButton('${tagOwner.uid}')">`;
        const indirizzoField = `<textarea class="edit-field" id="indirizzo_${tagOwner.uid}" placeholder="Inserisci indirizzo">${indirizzoValue}</textarea>`;
        const noteField = `<textarea class="edit-field" id="note_${tagOwner.uid}" placeholder="Inserisci note">${tagOwner.note || ''}</textarea>`;
        const created_at = `${tagOwner.created_at};`;
        const create_atField = `<input type="hidden" id="created_at_${tagOwner.uid}" value="${tagOwner.created_at}">`;
        // Pulsanti di azione con migliore posizionamento
        const actionButtons = `
      <div class="action-buttons">
        <button class="save-btn" id="save_${tagOwner.uid}" onclick="window.saveTagOwner('${tagOwner.uid}')" ${nominativoValue === '' ? 'disabled' : ''}>💾 Salva</button>
        <button class="delete-btn" onclick="window.deleteTagOwner('${tagOwner.uid}')">🗑️ Elimina</button>
      </div>
    `;
        return `
    
    ${create_atField}
    
      <tr class="${rowClass}">
        <td>
          <div>
            <a href="/spending-dashboard/${tagOwner.uid}" class="uid-link">${statusIcon}${tagOwner.uid}</a>
            ${nominativoValue ? `<br><small class="nominativo">👤 ${nominativoValue}</small>` : ''}
          
            </div>
        </td>
        <td>${nominativoField}</td>
        <td>${indirizzoField}</td>
        <td>${noteField}</td>
        <td>${formatDateTimeIta(tagOwner.created_at || '')}</td>
        <td>${formatDateTimeIta(tagOwner.updated_at || '')}</td>
        <td>${actionButtons}</td>
      </tr>
    `;
    }).join('');
    // Stili aggiuntivi specifici per questa pagina
    const additionalStyles = ``;
    // Script aggiuntivi specifici per questa pagina
    const additionalScripts = `
    ${(0, helpers_1.generateSearchScript)('searchOperations', 'clearOperationsSearch')}
    window.refreshUid = async function () {  
    const uidInput = document.getElementById('uids');
    
    if (!uidInput) {
      //  console.error("Errore: Elemento input 'uids' non trovato.");
        return;
    }

    try {
        // Effettua la richiesta AJAX al tuo ESP32
        const response = await fetch('/UID');  
        if (!response.ok) {
       //     throw new Error('HTTP error! status: \${response.status}');
        }

        // Assumiamo che il server /UID restituisca il valore UID come testo puro
        const uidValue = await response.text();  
      //  console.log(uidValue);
        
        uidInput.value = uidValue; // Aggiorna il valore dell'input
        

    } catch (error) {
      //  console.error("Errore durante l'aggiornamento dell\'UID:", error);
       // alert('Errore durante il recupero dell\\'UID: ' + error.message);
        uidInput.value = "Errore!"; // Mostra un messaggio di errore nell'input
    }
        
}
  
//     window.handleConferma = function() {
//     const value = document.getElementById('displayValue').value;
//     const causale = document.getElementById('causaleInput').value;
//     console.log(\`Conferma: \${value}, Causale: \${causale}\`);
//     // Invia al Node.js server via WebSocket
//     socket.emit('conferma_transazione', { value: value, causale: causale });
//     clearKeypadDisplay('displayValue'); // Resetta il display dopo l'invio
//     document.getElementById('causaleInput').value = ''; // Resetta la causale
// }

// window.handleAdd = function() {
//     const value = document.getElementById('displayValue').value;
//     const causale = document.getElementById('causaleInput').value;
//     console.log(\`Aggiungi: \${value}, Causale: \${causale}\`);
//     // Invia al Node.js server via WebSocket
//     socket.emit('aggiungi_voce', { value: value, causale: causale });
//     clearKeypadDisplay('displayValue');
//     document.getElementById('causaleInput').value = '';
// }

// window.handleRemove=function() {
//     const value = document.getElementById('displayValue').value;
//     const causale = document.getElementById('causaleInput').value;
//     console.log(\`Togli: \${value}, Causale: \${causale}\`);
//     // Invia al Node.js server via WebSocket
//     socket.emit('togli_voce', { value: value, causale: causale });
//     clearKeypadDisplay('displayValue');
//     document.getElementById('causaleInput').value = '';
// }
//      window.appendToKeypadDisplay=function(inputId, value)  {
//             const input = document.getElementById(inputId);
//             if (input.value === '0' && value !== '.') {
//                 input.value = value;
//             } else if (value === '.' && input.value.includes('.')) {
//                 // Non aggiungere un altro punto decimale
//             } else {
//                 input.value += value;
//             }
//         }

//        window.clearKeypadDisplay = function(inputId) {
//             document.getElementById(inputId).value = '0';
//         }

//         window.backspaceKeypadDisplay=function(inputId) {
//             const input = document.getElementById(inputId);
//             if (input.value.length > 1) {
//                 input.value = input.value.slice(0, -1);
//             } else {
//                 input.value = '0';
//             }
//         }
    function formatDateTimeForJSON(dateObject) {
    const day = String(dateObject.getDate()).padStart(2, '0');
    const month = String(dateObject.getMonth() + 1).padStart(2, '0'); // Mese e' 0-based
    const year = dateObject.getFullYear();
    const hours = String(dateObject.getHours()).padStart(2, '0');
    const minutes = String(dateObject.getMinutes()).padStart(2, '0');
    const seconds = String(dateObject.getSeconds()).padStart(2, '0');
    return \`\${year}-\${month}-\${day} \${hours}:\${seconds}\`;
}
    window.addTagOwner = async function(uid) {
        //const nominativo = document.getElementById('nominativo_' + uid).value.trim();
        //const indirizzo = document.getElementById('indirizzo_' + uid).value.trim();
        //const note = document.getElementById('note_' + uid).value.trim();
        //const created_at = document.getElementById('created_at_' + uid).value.trim();
        const UID = document.getElementById('uids').value.trim();
        // Validazione
        if (UID=='') {
            window.showStatus('Inserisci un nominativo valido', 'error');
            return;
        }
        
        
        
        try {  //XXXX
            const response = await fetch('/api/tag-owners', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    uid: UID,
                    nominativo: "-",
                    indirizzo: "-",
                    note: "-",
                    created_at: formatDateTimeForJSON(new Date()) 
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                window.showStatus('Tag possessore aggiornato con successo!', 'success');
                // Ricarica la pagina dopo 2 secondi per mostrare i dati aggiornati
                setTimeout(() => {
                    location.reload();
                }, 2000);
            } else {
                window.showStatus("Errore durante il salvataggio: " + result.message, 'error');
                
               
            }
        } catch (error) {
            window.showStatus("Errore di connessione: " + error.message, 'error');
        }
    }

    window.saveTagOwner = async function(uid) {
        const nominativo = document.getElementById('nominativo_' + uid).value.trim();
        const indirizzo = document.getElementById('indirizzo_' + uid).value.trim();
        const note = document.getElementById('note_' + uid).value.trim();
        const created_at = document.getElementById('created_at_' + uid).value.trim();
        // Validazione
        if (!nominativo) {
            window.showStatus('Inserisci un nominativo valido', 'error');
            return;
        }
        
        if (!indirizzo) {
            window.showStatus('Inserisci un indirizzo valido', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/tag-owners', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    uid: uid,
                    nominativo: nominativo,
                    indirizzo: indirizzo,
                    note: note,
                    created_at
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                window.showStatus('Tag possessore aggiornato con successo!', 'success');
                // Ricarica la pagina dopo 2 secondi per mostrare i dati aggiornati
                setTimeout(() => {
                    location.reload();
                }, 2000);
            } else {
                window.showStatus("Errore durante il salvataggio: " + result.message, 'error');
                 const nominativo = document.getElementById('nominativo_' + uid);
                nominativo.value="";
               
            }
        } catch (error) {
            window.showStatus("Errore di connessione: " + error.message, 'error');
        }
    }
    
    window.showStatus = function(message, type) {
        const statusDiv = document.getElementById('statusMessage');
        statusDiv.innerHTML = '<div class="status-message status-' + type + '">' + message + '</div>';
        
        setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 5000);
    }
    
    // Funzioni globali per la ricerca e controllo pulsanti
    // Le funzioni di ricerca sono già rese globali da generateSearchScript
    
    window.checkSaveButton = function(uid) {
        const nominativoInput = document.getElementById('nominativo_' + uid);
        const saveButton = document.getElementById('save_' + uid);
        
        if (nominativoInput && saveButton) {
            const nominativo = nominativoInput.value.trim();
            if (nominativo === '') {
                saveButton.disabled = true;
            } else {
                saveButton.disabled = false;
            }
        }
    }
    
    window.deleteTagOwner = async function(uid) {
        if (!confirm('Sei sicuro di voler eliminare questo possessore tag?')) {
            return;
        }
        
        try {
            const response = await fetch('/api/tag-owners/' + uid, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                window.showStatus('Possessore tag eliminato con successo!', 'success');
                // Ricarica la pagina dopo 2 secondi
                setTimeout(() => {
                    location.reload();
                }, 2000);
            } else {
                window.showStatus("Errore durante l'eliminazione: " + result.message, 'error');
            }
        } catch (error) {
            window.showStatus("Errore di connessione: " + error.message, 'error');
        }
    }
    
    // Funzioni per la paginazione
    window.goToPage = function(page) {
        const url = new URL(window.location);
        url.searchParams.set('page', page);
        
        // Usa il limite salvato se non è specificato nell'URL
        if (!url.searchParams.has('limit')) {
            const currentPath = window.location.pathname;
            const storageKey = 'tableLimit_' + currentPath.replace(/\\//g, '_');
            
             const savedLimit = localStorage.getItem(storageKey);
            if (savedLimit) {
                url.searchParams.set('limit', savedLimit);
            }
        }
        
        window.location.href = url.toString();
    };
    
    window.changeLimit = function(limit) {
        // Salva il nuovo limite nel localStorage
        const currentPath = window.location.pathname;
        const storageKey = 'tableLimit_' + currentPath.replace(/\\//g, '_');
        localStorage.setItem(storageKey, limit.toString());
        
        const url = new URL(window.location);
        url.searchParams.set('limit', limit);
        url.searchParams.set('page', '1'); // Torna alla prima pagina
        window.location.href = url.toString();
    };
    
    // Funzione per gestire il sticky header
    function initStickyHeader() {
        const tableContainer = document.querySelector('.table-container');
        const thead = tableContainer?.querySelector('thead');
        
        if (tableContainer && thead) {
            // Aggiungi ombra quando si fa scroll
            tableContainer.addEventListener('scroll', function() {
                if (this.scrollTop > 0) {
                    thead.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                } else {
                    thead.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }
            });
            
            // Evidenzia la colonna quando si passa sopra con il mouse
            const thElements = thead.querySelectorAll('th');
            thElements.forEach((th, index) => {
                th.addEventListener('mouseenter', function() {
                    const tbody = tableContainer.querySelector('tbody');
                    const rows = tbody?.querySelectorAll('tr');
                    rows?.forEach(row => {
                        const cell = row.cells[index];
                        if (cell) {
                            cell.style.backgroundColor = '#e8f5e8';
                            cell.style.transition = 'background-color 0.2s';
                        }
                    });
                });
                
                th.addEventListener('mouseleave', function() {
                    const tbody = tableContainer.querySelector('tbody');
                    const rows = tbody?.querySelectorAll('tr');
                    rows?.forEach((row, rowIndex) => {
                        const cell = row.cells[index];
                        if (cell) {
                            cell.style.backgroundColor = rowIndex % 2 === 0 ? 'white' : '#f2f2f2';
                        }
                    });
                });
            });
        }
    }
    //setInterval(function(){
    //  refreshUid();  },2000);
    function loop(){
    refreshUid();
    setTimeout(loop,2000);
    }
    loop();

    // Inizializza il sticky header quando la pagina è caricata
    document.addEventListener('DOMContentLoaded', function() {
        initStickyHeader();
         //handleConferma();
        //handleAdd();
        //handleRemove();
         //appendToKeypadDisplay(inputId, value);
        //clearKeypadDisplay(inputId);
        //backspaceKeypadDisplay(inputId);
        
}); 
          // Poi programma aggiornamenti successivi
          
         
  `;
    // Contenuto della pagina
    const content = `
    ${(0, helpers_1.generatePagination)(pagination)}
    <div class="container">
        <h1>Possessori Tag NFC</h1>
        <div id="statusMessage"></div>
       <!-- generateTastierinoNumerico -->
        ${(0, helpers_1.generateSearchSection)('searchOperations', '🔍 Cerca per UID, nominativo o indirizzo...', 'clearOperationsSearch()')}
      <!--  \${generateTastierinoNumerico("displayValue", "handleConferma()", "handleAdd()", "handleRemove()") }  -->
       <div class='uid-controls' >
        <input class='uid-input-field' type="text"  id='uids' value='` + UID + `'> 
        <button class="refresh2-btn " onclick= "refreshUid()">🔄 Aggiorna</button>
        <span>  </span>
        <button class="refresh2-btn" onclick="addTagOwner()">🔄 Aggiungi</button>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>UID</th>
                        <th>Nominativo</th>
                        <th>Indirizzo</th>
                        <th>Note</th>
                        <th>Data Creazione</th>
                        <th>Ultimo Aggiornamento</th>
                        <th>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    ${tagOwners.length > 0 ? tableRows : '<tr><td colspan="7" class="no-data">Nessun possessore trovato</td></tr>'}
                </tbody>
            </table>
        </div>
    </div>
  `;
    return (0, helpers_1.generateBaseHTML)('possessori Tag NFC', 'tag-owners', content, additionalStyles, additionalScripts);
}
// Endpoint per la pagina utility/impostazioni
app.get('/utility', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Ottieni statistiche del database per mostrare info utili
        const backupTablesStats = yield database_1.database.getBackupTablesStats();
        const allRecords = yield database_1.database.getAllSensorRecords(1, 1); // Solo per contare
        const loggingStatus = database_1.database.isLogAttivo();
        const html = generateUtilityPage({
            backupTablesStats,
            totalRecords: allRecords.total,
            retentionSettings: global.retentionSettings,
            autoCleanupSettings: global.autoCleanupSettings,
            loggingStatus
        });
        res.send(html);
    }
    catch (error) {
        console.error('Errore nella pagina utility:', error);
        res.status(500).send('Errore interno del server');
    }
}));
app.get('/download-db', (req, res) => {
    // *** MODIFICA QUI: 'dati.db' diventa 'logs.db' ***
    //const dbPath = path.join("./", 'logs.db'); // Il tuo database si chiama logs.db
    //const dbPath = process.env.DB_PATH || (process.env.RENDER ? '/tmp/logs.db' : path.join('./', 'logs.db'));
    const dbPath = process.env.DB_PATH;
    //__dirname
    res.download(dbPath, 'logs.db', (err) => {
        if (err) {
            console.error('Errore durante il download del database:', err);
            res.status(500).send('Impossibile scaricare il file del database.');
        }
        else {
            console.log('File logs.db scaricato con successo.');
        }
    });
});
// Endpoint per eseguire pulizia immediata
app.post('/api/utility/cleanup-now', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { daysToKeep } = req.body;
        let days = parseInt(daysToKeep);
        // Scenario 2: Backup delle Statistiche
        if (!days || isNaN(days)) {
            days = global.retentionSettings.operationsRetentionDays;
        }
        // Prima fa il backup delle statistiche
        yield database_1.database.backupStatisticsBeforeCleanup();
        const deletedCount = yield database_1.database.cleanOldSensorRecords(days);
        res.json({
            success: true,
            message: `Backup statistiche + puliti ${deletedCount} record operazioni più vecchi di ${days} giorni`,
            deletedCount
        });
    }
    catch (error) {
        console.error('Errore nella pulizia immediata:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella pulizia del database'
        });
    }
}));
// Endpoint per attivare/disattivare pulizia automatica
app.post('/api/utility/auto-cleanup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { enabled, intervalHours, daysToKeep } = req.body;
        // Per ora salviamo le impostazioni in memoria
        // In futuro potremmo salvarle in un file di configurazione
        global.autoCleanupSettings = {
            enabled: enabled === 'true',
            intervalHours: parseInt(intervalHours) || 24,
            daysToKeep: parseInt(daysToKeep) || 30
        };
        // Se abilitato, avvia il timer
        if (global.autoCleanupSettings.enabled) {
            startAutoCleanup();
        }
        else {
            stopAutoCleanup();
        }
        res.json({
            success: true,
            message: `Pulizia automatica ${enabled === 'true' ? 'attivata' : 'disattivata'} (con backup statistiche)`,
            settings: global.autoCleanupSettings
        });
    }
    catch (error) {
        console.error('Errore nella configurazione pulizia automatica:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella configurazione'
        });
    }
}));
// Endpoint per configurare i periodi di conservazione
app.post('/api/utility/retention-settings', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { operationsRetentionDays, statisticsRetentionDays } = req.body;
        global.retentionSettings = {
            operationsRetentionDays: parseInt(operationsRetentionDays) || 30,
            statisticsRetentionDays: parseInt(statisticsRetentionDays) || 365
        };
        res.json({
            success: true,
            message: `Periodi di conservazione aggiornati (con backup statistiche)`,
            settings: global.retentionSettings
        });
    }
    catch (error) {
        console.error('Errore nella configurazione periodi di conservazione:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella configurazione'
        });
    }
}));
// === ENDPOINT PER CONTROLLO LOGGING ===
// Endpoint per controllare lo stato del logging
app.get('/api/logging/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const isActive = database_1.database.isLogAttivo();
        res.json({
            success: true,
            loggingActive: isActive,
            message: `Logging ${isActive ? 'attivo' : 'disattivato'}`
        });
    }
    catch (error) {
        console.error('Errore nel controllo stato logging:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel controllo stato logging'
        });
    }
}));
// Endpoint per attivare il logging
app.post('/api/logging/activate', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        database_1.database.attivaLogging();
        res.json({
            success: true,
            message: 'Logging attivato con successo'
        });
    }
    catch (error) {
        console.error('Errore nell\'attivazione logging:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'attivazione logging'
        });
    }
}));
// Endpoint per disattivare il logging
app.post('/api/logging/deactivate', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        database_1.database.disattivaLogging();
        res.json({
            success: true,
            message: 'Logging disattivato con successo'
        });
    }
    catch (error) {
        console.error('Errore nella disattivazione logging:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella disattivazione logging'
        });
    }
}));
// Inizializza le impostazioni globali
global.autoCleanupSettings = {
    enabled: false,
    intervalHours: 24,
    daysToKeep: 30
};
global.autoCleanupTimer = null;
global.retentionSettings = {
    operationsRetentionDays: 30,
    statisticsRetentionDays: 365 // Conserva statistiche per 1 anno
};
// Funzione per avviare la pulizia automatica
function startAutoCleanup() {
    if (global.autoCleanupTimer) {
        clearInterval(global.autoCleanupTimer);
    }
    const intervalMs = global.autoCleanupSettings.intervalHours * 60 * 60 * 1000;
    global.autoCleanupTimer = setInterval(() => __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Esecuzione pulizia automatica...');
            // Scenario 2: Backup delle Statistiche
            try {
                // 1. Prima fa il backup delle statistiche
                yield database_1.database.backupStatisticsBeforeCleanup();
                // 2. Poi elimina i record vecchi
                const deletedCount = yield database_1.database.cleanOldSensorRecords(global.retentionSettings.operationsRetentionDays);
                console.log(`Pulizia automatica completata: backup statistiche + eliminati ${deletedCount} record operazioni (conservazione: ${global.retentionSettings.operationsRetentionDays} giorni)`);
            }
            catch (error) {
                console.error('Errore nel backup delle statistiche:', error);
            }
        }
        catch (error) {
            console.error('Errore nella pulizia automatica:', error);
        }
    }), intervalMs);
    console.log(`Pulizia automatica avviata: ogni ${global.autoCleanupSettings.intervalHours} ore`);
}
// Funzione per fermare la pulizia automatica
function stopAutoCleanup() {
    if (global.autoCleanupTimer) {
        clearInterval(global.autoCleanupTimer);
        global.autoCleanupTimer = null;
        console.log('Pulizia automatica fermata');
    }
}
// Funzione per generare la homepage generale
function generateHomePage() {
    const content = `
    <div class="welcome-section">
        <h1>🏠 ESP Home Server</h1>
        <p>Sistema di gestione integrato per sensori NFC</p>
    </div>
<div class="container">
    <div class="quick-stats">
        <a href="/sensor-data" class="nav-card">
            <h3><span class="icon">📊</span>Dati Sensori</h3>
            <p>Visualizza e gestisci tutti i dati dei sensori NFC, operazioni di credito e storico transazioni.</p>
        </a>

        <a href="/spending-dashboard" class="nav-card">
            <h3><span class="icon">💰</span>Dashboard Spese</h3>
            <p>Analizza le spese per UID, statistiche aggregate e monitoraggio del credito con backup automatico.</p>
        </a>

        <a href="/tag-owners" class="nav-card">
            <h3><span class="icon">👥</span>Possessori Tag</h3>
            <p>Gestisci i possessori dei tag NFC, associa UID a nominativi e indirizzi.</p>
        </a>

        <a href="/utility" class="nav-card">
            <h3><span class="icon">⚙️</span>Utility & Impostazioni</h3>
            <p>Configura periodi di conservazione, pulizia automatica e monitora lo stato del database.</p>
        </a>
         
        <a href="/api/logs-view" class="nav-card">
            <h3><span class="icon">📝</span>Log Sistema</h3>
            <p>Visualizza i log delle attività del sistema e monitora le operazioni degli utenti.</p>
        </a>

        <div class="nav-card" onclick="window.open('/api/sensor-data', '_blank')">
            <h3><span class="icon">🔗</span>API JSON</h3>
            <p>Accedi direttamente alle API JSON per integrazione con altri sistemi o sviluppo.</p>
        </div>
    </div>

    
        <h2  style="text-align: center;" >  Stato Sistema</h2>
        <div class="stats-grid">
         
            <div class="stat-card">
                <div class="stat-value">✅ Attivo</div>
                <div class="stat-label">Backup Statistiche</div>
            </div> 
            <div class="stat-card">
                <div class="stat-value">⚙️ Configurabile</div>
                <div class="stat-label">Pulizia Automatica</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">SQLite</div>
                <div class="stat-label">Database</div>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>ESP Home Server v3.0 - Sistema di gestione integrato</p>
        <p>Backup automatico statistiche • Periodi conservazione configurabili • Dashboard avanzate</p>
    </div>
  `;
    return (0, helpers_1.generateBaseHTML)('ESP Home Server - Dashboard Principale', 'home', content);
}
// Funzione per generare la pagina utility/impostazioni
function generateUtilityPage(data) {
    const content = `
    <div class="container">
        <h1>🔧 Utility e Impostazioni Database</h1>
        
        <!-- Sezione Statistiche Database -->
        <div class="utility-section">
            <h2>📊 Statistiche Database</h2>
            <div class="status-message status-success">
                <strong>Record totali nel database:</strong> ${data.totalRecords.toLocaleString()}
            </div>
            
            <h3>💾 Tabelle di Backup Statistiche</h3>
            <p><em>Statistiche aggregate conservate per Scenario 2 (Backup delle Statistiche).</em></p>
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>Tabella</th>
                        <th>Record Conservati</th>
                        <th>Descrizione</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.backupTablesStats.map(stat => {
        let description = '';
        if (stat.table === 'spending_summary') {
            description = 'Statistiche aggregate per UID (Scenario 2)';
        }
        else if (stat.table === 'spending_monthly_stats') {
            description = 'Backup mensili delle statistiche (Scenario 2)';
        }
        return `
                            <tr>
                                <td><strong>${stat.table}</strong></td>
                                <td>${stat.recordCount.toLocaleString()}</td>
                                <td>${description}</td>
                            </tr>
                        `;
    }).join('')}
                </tbody>
            </table>
             <p class="save-btn" style="text-align: center;">
                <a href="/download-db" download="logs.db" class="button-link">Scarica database SQLite</a>
            
            <!-- <p class="save-btn" style="text-align: center; display: flex; gap: 10px; justify-content: center; align-items: center; flex-wrap: wrap;">
        <a href="/download-db" download="logs.db" class="button-link">Scarica database SQLite</a> -->
        </p>
        <p class="save-btn" style="text-align: center;">
        <label class="button-link" style="cursor: pointer;">
          Carica database SQLite
          <input id="logsdbFile" type="file" accept=".db,.sqlite" style="display:none" />
        </label>
        </p>
      <!--   <button id="uploadDbBtn" class="save-btn" eba>Carica</button> -->
      
        </div>
        
        <!-- Sezione Controllo Logging -->
        <div class="utility-section">
            <h2>📝 Controllo Logging</h2>
            <p>Gestisci la memorizzazione dei log delle attività nel database.</p>
            
            <div class="status-message status-success">
                <strong>Stato attuale:</strong> 
                <span class="status ${data.loggingStatus ? 'success' : 'error'}">
                    ${data.loggingStatus ? '✅ Attivo' : '❌ Disattivato'}
                </span>
            </div>
            
            <div class="button-group">
                <button onclick="toggleLogging(true)" class="save-btn" ${data.loggingStatus ? 'disabled' : ''}>
                    ✅ Attiva Logging
                </button>
                <button onclick="toggleLogging(false)" class="reset-btn" ${!data.loggingStatus ? 'disabled' : ''}>
                    ❌ Disattiva Logging
                </button>
            </div>
            
            <div class="info-box">
                <h4>ℹ️ Informazioni</h4>
                <ul>
                    <li><strong>Attivo:</strong> I log delle attività vengono memorizzati nel database</li>
                    <li><strong>Disattivato:</strong> I log non vengono memorizzati (risparmio spazio)</li>
                    <li>Le operazioni di sistema continuano a funzionare normalmente</li>
                    <li>I log esistenti rimangono disponibili anche se disattivato</li>
                </ul>
            </div>
        </div>
        
        <!-- Sezione Pulizia Immediata -->
        <div class="utility-section">
            <h2>🧹 Pulizia Immediata</h2>
            <p>Elimina i record più vecchi di un numero specifico di giorni.</p>
            
            <div class="setting-item">
                <label for="daysToKeep">Giorni da mantenere:</label>
                <input type="number" id="daysToKeep" value="${data.retentionSettings.operationsRetentionDays}" min="1" max="365">
            </div>
            
            <button onclick="cleanupNow()" id="cleanupBtn" class="save-btn">Esegui Pulizia Immediata</button>
            <div id="cleanupStatus"></div>
        </div>
        
        <!-- Sezione Periodi di Conservazione -->
        <div class="utility-section">
            <h2>📅 Periodi di Conservazione</h2>
            <p>Configura i periodi di conservazione per operazioni e statistiche (con backup automatico delle statistiche).</p>
            
            <div class="setting-item">
                <label for="operationsRetentionDays">Conservazione Operazioni (giorni):</label>
                <input type="number" id="operationsRetentionDays" value="${data.retentionSettings.operationsRetentionDays}" min="1" max="3650">
                <small>Record delle operazioni verranno eliminati dopo questo periodo</small>
            </div>
            
            <div class="setting-item disabled-section">
                <label for="statisticsRetentionDays" class="disabled-label">Conservazione Statistiche (giorni):</label>
                <input type="number" id="statisticsRetentionDays" value="${data.retentionSettings.statisticsRetentionDays}" min="1" max="3650" disabled>
                <small class="disabled-text">⚠️ <strong>DISATTIVATO</strong> - Le statistiche non vengono mai eliminate (crescono indefinitamente)</small>
            </div>
            
            <button onclick="configureRetentionSettings()" id="retentionBtn" class="save-btn">Salva Configurazione</button>
            <div id="retentionStatus"></div>
        </div>
        
        <!-- Sezione Pulizia Automatica -->
        <div class="utility-section">
            <h2>⏰ Pulizia Automatica</h2>
            <p>Configura la pulizia automatica del database a intervalli regolari.</p>
            
            <div class="setting-item">
                <div class="checkbox-group">
                    <input type="checkbox" id="autoCleanupEnabled" ${data.autoCleanupSettings.enabled ? 'checked' : ''}>
                    <label for="autoCleanupEnabled">Abilita pulizia automatica</label>
                </div>
            </div>
            
            <div class="setting-item">
                <label for="intervalHours">Intervallo (ore):</label>
                <input type="number" id="intervalHours" value="${data.autoCleanupSettings.intervalHours}" min="1" max="168">
            </div>
            
            <div class="setting-item">
                <label for="autoDaysToKeep">Giorni da mantenere:</label>
                <input type="number" id="autoDaysToKeep" value="${data.autoCleanupSettings.daysToKeep}" min="1" max="365">
            </div>
            
            <button onclick="configureAutoCleanup()" id="autoCleanupBtn" class="save-btn">Salva Configurazione</button>
            <div id="autoCleanupStatus"></div>
        </div>
    </div>

    <script>
 
          (function(){
            const fileInput = document.getElementById('logsdbFile');
            if (fileInput) {
              fileInput.addEventListener('change', async function(){
                if (!fileInput.files || fileInput.files.length === 0) return;
                if (!confirm('⚠️ Stai per sostituire il database corrente. Procedere?')) return;
                try {
                  const formData = new FormData();
                  formData.append('logsdb', fileInput.files[0]);
                  const resp = await fetch('/upload-db', { method: 'POST', body: formData });
                  const result = await resp.json();
                  if (result.success) {
                    alert('Database caricato con successo. ricarico.');
                    location.reload();
                  } else {
                    alert('Errore: ' + (result.message || 'Upload fallito'));
                  }
                } catch (e) {
                  alert('Errore durante l\\'upload del database');
                } finally {
                  fileInput.value = '';
                }
              });
            }
          })();
         


        async function cleanupNow() {
            const daysToKeep = document.getElementById('daysToKeep').value;
            const btn = document.getElementById('cleanupBtn');
            const status = document.getElementById('cleanupStatus');
            
            btn.disabled = true;
            btn.textContent = 'Pulizia in corso...';
            status.innerHTML = '<div class="status-message status-success">Pulizia in corso...</div>';
            
            try {
                const response = await fetch('/api/utility/cleanup-now', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ daysToKeep: parseInt(daysToKeep) })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    status.innerHTML = \`<div class="status-message status-success">\${result.message}</div>\`;
                    // Ricarica la pagina per aggiornare le statistiche
                    setTimeout(() => location.reload(), 2000);
                } else {
                    status.innerHTML = \`<div class="status-message status-error">Errore: \${result.message}</div>\`;
                }
            } catch (error) {
                status.innerHTML = '<div class="status-message status-error">Errore di connessione</div>';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Esegui Pulizia Immediata';
            }
        }
        
        async function configureAutoCleanup() {
            const enabled = document.getElementById('autoCleanupEnabled').checked;
            const intervalHours = document.getElementById('intervalHours').value;
            const daysToKeep = document.getElementById('autoDaysToKeep').value;
            const btn = document.getElementById('autoCleanupBtn');
            const status = document.getElementById('autoCleanupStatus');
            
            btn.disabled = true;
            btn.textContent = 'Salvataggio...';
            
            try {
                const response = await fetch('/api/utility/auto-cleanup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        enabled: enabled.toString(),
                        intervalHours: parseInt(intervalHours),
                        daysToKeep: parseInt(daysToKeep)
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    status.innerHTML = \`<div class="status-message status-success">\${result.message}</div>\`;
                } else {
                    status.innerHTML = \`<div class="status-message status-error">Errore: \${result.message}</div>\`;
                }
            } catch (error) {
                status.innerHTML = '<div class="status-message status-error">Errore di connessione</div>';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Salva Configurazione';
            }
        }
        
        async function configureRetentionSettings() {
            const operationsRetentionDays = document.getElementById('operationsRetentionDays').value;
            const statisticsRetentionDays = document.getElementById('statisticsRetentionDays').value;
            const btn = document.getElementById('retentionBtn');
            const status = document.getElementById('retentionStatus');
            
            btn.disabled = true;
            btn.textContent = 'Salvataggio...';
            
            try {
                const response = await fetch('/api/utility/retention-settings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        operationsRetentionDays: parseInt(operationsRetentionDays),
                        statisticsRetentionDays: parseInt(statisticsRetentionDays)
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    status.innerHTML = \`<div class="status-message status-success">\${result.message}</div>\`;
                } else {
                    status.innerHTML = \`<div class="status-message status-error">Errore: \${result.message}</div>\`;
                }
            } catch (error) {
                status.innerHTML = '<div class="status-message status-error">Errore di connessione</div>';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Salva Configurazione';
            }
        }
        
        async function toggleLogging(activate) {
            const action = activate ? 'activate' : 'deactivate';
            const actionText = activate ? 'Attivazione' : 'Disattivazione';
            
            try {
                const response = await fetch(\`/api/logging/\${action}\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Mostra messaggio di successo
                    alert(\`\${actionText} logging completata con successo!\`);
                    // Ricarica la pagina per aggiornare lo stato
                    location.reload();
                } else {
                    alert(\`Errore durante \${actionText.toLowerCase()} logging: \${result.message}\`);
                }
            } catch (error) {
                alert(\`Errore di connessione durante \${actionText.toLowerCase()} logging\`);
            }
        }
    </script>
  `;
    return (0, helpers_1.generateBaseHTML)('Utility e Impostazioni', 'utility', content);
}
app.get("/nRecords", (req, res) => {
    database_1.database.RecordsChanged()
        .then(record => { res.status(200).json({ record }); })
        .catch(err => res.status(500).json({ record: false }));
});
/*

app.get("/nRecods", async (req, res) => {
  try {
    const record = await database.getNumberRecords();
    res.status(200).json({ total: record });
  } catch (err) {
    res.status(500).json({ error: "Errore nel conteggio dei record" });
  }
});

*/
app.post('/api/toggle-server', (req, res) => {
    exports.attivaServer = !exports.attivaServer;
    console.log(`Server ${exports.attivaServer ? 'attivato' : 'disattivato'}`);
    res.status(200).json({ success: true, attivaServer: exports.attivaServer });
});
app.post('/api/check-server', (req, res) => {
    console.log(`Server ${exports.attivaServer ? 'attivato' : 'disattivato'}`);
    res.status(200).json({ success: true, attivaServer: exports.attivaServer });
});
app.get('/health', (req, res) => {
    res.status(200).send('<html><h1>ok</h1> </html>');
});
// Endpoint per la homepage generale
app.get('/', (req, res) => {
    const html = generateHomePage();
    res.send(html);
});
// Endpoint per cercare nei possessori dei tag
app.get('/api/tagowners/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const searchTerm = req.query.q;
        if (!searchTerm) {
            return res.json({
                success: true,
                data: []
            });
        }
        const tagOwners = yield database_1.database.getAllTagOwners();
        // Filtra i risultati
        const filteredOwners = tagOwners.filter(owner => {
            const searchFields = [
                owner.uid,
                owner.nominativo || '',
                owner.indirizzo || '',
                owner.note || ''
            ];
            return searchFields.some(field => field.toLowerCase().includes(searchTerm.toLowerCase()));
        });
        res.json({
            success: true,
            data: filteredOwners
        });
    }
    catch (error) {
        console.error('Errore nella ricerca dei possessori dei tag:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella ricerca'
        });
    }
}));
// Endpoint per cercare nei dati dei sensori
app.get('/api/sensor-data/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const searchTerm = req.query.q;
        if (!searchTerm) {
            return res.json({
                success: true,
                data: []
            });
        }
        // Ottieni tutti i record (senza paginazione per la ricerca)
        const result = yield database_1.database.getAllSensorRecords(1, 10000); // Numero grande per ottenere tutti i record
        // Ottieni tutti i possessori dei tag per mostrare i nominativi
        const tagOwners = yield database_1.database.getAllTagOwners();
        const tagOwnersMap = new Map();
        tagOwners.forEach(owner => {
            tagOwnersMap.set(owner.uid, owner);
        });
        // Filtra i risultati
        const filteredRecords = result.records.filter(record => {
            var _a, _b, _c, _d, _e, _f, _g;
            const tagOwner = tagOwnersMap.get(record.uid);
            const searchFields = [
                // record.DEVICE,
                // record.uid,
                // tagOwner?.nominativo || '',
                // record.datetime,
                // record.status,
                // record.credito_precedente.toString(),
                // record.credito_attuale.toString()
                ((_a = record.DEVICE) !== null && _a !== void 0 ? _a : '').toString(),
                ((_b = record.uid) !== null && _b !== void 0 ? _b : '').toString(),
                ((_c = tagOwner === null || tagOwner === void 0 ? void 0 : tagOwner.nominativo) !== null && _c !== void 0 ? _c : '').toString(),
                ((_d = record.datetime) !== null && _d !== void 0 ? _d : '').toString(),
                ((_e = record.status) !== null && _e !== void 0 ? _e : '').toString(),
                ((_f = record.credito_precedente) !== null && _f !== void 0 ? _f : '').toString(),
                ((_g = record.credito_attuale) !== null && _g !== void 0 ? _g : '').toString()
            ];
            return searchFields.some(field => field.toLowerCase().includes(searchTerm.toLowerCase()));
        });
        // Aggiungi i nominativi ai risultati filtrati
        const enrichedRecords = filteredRecords.map(record => {
            var _a;
            return (Object.assign(Object.assign({}, record), { nominativo: ((_a = tagOwnersMap.get(record.uid)) === null || _a === void 0 ? void 0 : _a.nominativo) || null }));
        });
        res.json({
            success: true,
            data: enrichedRecords
        });
    }
    catch (error) {
        console.error('Errore nella ricerca dei dati dei sensori:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella ricerca'
        });
    }
}));
// Endpoint per ottenere un possessore specifico per UID
/* app.get('/api/tag-owners/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;

    const tagOwner = await database.getTagOwnerByUID(uid);

    if (!tagOwner) {
      return res.status(404).json({
        success: false,
        message: 'possessore non trovato'
      });
    }

    res.json({
      success: true,
      data: tagOwner
    });
  } catch (error) {
    console.error('Errore nel recupero del possessore:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero del possessore'
    });
  }
});
 */
// Endpoint per azzerare tutte le tabelle del database (e reset autoincrementali)
app.post('/api/reset-db', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield database_1.database.resetAllTables();
        res.json({ success: true });
    }
    catch (error) {
        console.error('Errore reset database:', error);
        res.status(500).json({ success: false, message: 'Errore nel reset del database' });
    }
}));
// Endpoint per ottenere i dati dei sensori filtrati per intervallo di date
app.get('/api/sensor-data/date-range', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Parametri startDate e endDate sono richiesti'
            });
        }
        const records = yield database_1.database.getSensorRecordsByDateRange(startDate, endDate);
        res.json({
            success: true,
            data: records,
            count: records.length,
            filters: { startDate, endDate }
        });
    }
    catch (error) {
        console.error('Errore nel recupero dei dati filtrati per date:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei dati filtrati'
        });
    }
}));
// Endpoint per ottenere le statistiche di spesa filtrate per intervallo di date
app.get('/api/spending-stats/date-range', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Parametri startDate e endDate sono richiesti'
            });
        }
        const stats = yield database_1.database.getSpendingStatsByDateRange(startDate, endDate);
        // Enrich con nominativo per coerenza con le viste
        const tagOwners = yield database_1.database.getAllTagOwners();
        const tagOwnersMap = new Map();
        tagOwners.forEach(owner => tagOwnersMap.set(owner.uid, owner));
        const enriched = stats.map(s => {
            var _a;
            return (Object.assign(Object.assign({}, s), { nominativo: ((_a = tagOwnersMap.get(s.uid)) === null || _a === void 0 ? void 0 : _a.nominativo) || null }));
        });
        res.json({
            success: true,
            data: enriched,
            count: enriched.length,
            filters: { startDate, endDate }
        });
    }
    catch (error) {
        console.error('Errore nel recupero delle statistiche filtrate per date:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle statistiche filtrate'
        });
    }
}));
// Endpoint per ottenere le statistiche di spesa di un UID specifico filtrate per intervallo di date
app.get('/api/spending-stats/uid/:uid/date-range', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { uid } = req.params;
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Parametri startDate e endDate sono richiesti'
            });
        }
        const spendingData = yield database_1.database.getTotalSpendingByUIDAndDateRange(uid, startDate, endDate);
        res.json({
            success: true,
            data: spendingData,
            filters: { startDate, endDate }
        });
    }
    catch (error) {
        console.error('Errore nel recupero delle statistiche UID filtrate per date:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle statistiche UID filtrate'
        });
    }
}));
// Endpoint per ottenere i dati dei sensori filtrati per intervallo di date con paginazione
app.get('/api/sensor-data/date-range/paginated', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate, page = '1', pageSize = '50' } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Parametri startDate e endDate sono richiesti'
            });
        }
        const pageNum = parseInt(page);
        const limit = parseInt(pageSize);
        const records = yield database_1.database.getSensorRecordsByDateRange(startDate, endDate);
        // Paginazione lato server
        const total = records.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (pageNum - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedRecords = records.slice(startIndex, endIndex);
        res.json({
            success: true,
            data: paginatedRecords,
            pagination: {
                page: pageNum,
                pageSize: limit,
                total,
                totalPages
            },
            filters: { startDate, endDate }
        });
    }
    catch (error) {
        console.error('Errore nel recupero dei dati filtrati per date con paginazione:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei dati filtrati'
        });
    }
}));
// Endpoint di debug per testare i filtri di data
app.get('/api/debug/date-filter', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Parametri startDate e endDate sono richiesti'
            });
        }
        console.log(`[DEBUG] Test filtro date: startDate=${startDate}, endDate=${endDate}`);
        // Test della conversione delle date
        const startTimestamp = database_1.database.convertDateToTimestamp(startDate);
        const endTimestamp = database_1.database.convertDateToEndOfDayTimestamp(endDate);
        const startDateObj = new Date(startTimestamp * 1000); // Converti da secondi a millisecondi
        const endDateObj = new Date(endTimestamp * 1000); // Converti da secondi a millisecondi
        // Ottieni alcuni record di esempio dal database
        const sampleRecords = yield new Promise((resolve, reject) => {
            database_1.database.db.all('SELECT timestamp, datetime, typeof(timestamp) as timestamp_type FROM sensor_data ORDER BY CAST(timestamp AS INTEGER) DESC LIMIT 10', [], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
        // Ottieni informazioni sulla struttura della tabella
        const tableInfo = yield new Promise((resolve, reject) => {
            database_1.database.db.all("PRAGMA table_info(sensor_data)", [], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
        res.json({
            success: true,
            debug: {
                inputDates: { startDate, endDate },
                convertedTimestamps: { startTimestamp, endTimestamp },
                convertedDates: {
                    startDate: startDateObj.toISOString(),
                    endDate: endDateObj.toISOString()
                },
                sampleRecords: sampleRecords,
                tableStructure: tableInfo
            }
        });
    }
    catch (error) {
        console.error('Errore nel debug del filtro date:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel debug del filtro date'
        });
    }
}));
// Upload del database SQLite
const multer = require('multer');
// Assicurati che la cartella uploads esista
const uploadsDir = path.join('./', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
const upload = multer({ dest: uploadsDir });
app.get("/UID", (req, res) => {
    res.status(200).send(UID);
});
app.post('/upload-db', upload.single('logsdb'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Nessun file caricato' });
        }
        // Percorsi
        const tempPath = req.file.path; // file temporaneo creato da Multer in ./uploads
        const DB_PATH = process.env.DB_PATH || '/tmp/logs.db';
        //const targetPath = path.join('./', 'logs.db');
        const targetPath = path.join(DB_PATH);
        const backupPath = path.join('./', `logs.backup.${Date.now()}.db`);
        // Salva una copia persistente del file caricato in ./uploads con nome timestamp
        const keepCopyPath = path.join(uploadsDir, `logs.upload.${Date.now()}.db`);
        fs.copyFileSync(tempPath, keepCopyPath);
        // Effettua un backup dell'attuale DB se esiste
        //if (fs.existsSync(targetPath)) {
        //  fs.copyFileSync(targetPath, backupPath);
        //}
        // Sostituisci con il nuovo DB (move atomico se possibile)
        try {
            fs.renameSync(tempPath, targetPath);
        }
        catch (e) {
            // Fallback: copia e poi elimina il temporaneo
            fs.copyFileSync(tempPath, targetPath);
            try {
                fs.unlinkSync(tempPath);
            }
            catch (_a) { }
        }
        try {
            fs.chmodSync(targetPath, 0o666); // Lettura e scrittura per tutti
        }
        catch (chmodErr) {
            console.warn('Impossibile impostare i permessi di scrittura:', chmodErr);
        }
        console.log('logs.db caricato e sostituito con successo');
        return res.json({ success: true, message: 'Database aggiornato con successo', backup: fs.existsSync(backupPath) ? backupPath : null, keptCopy: keepCopyPath });
    }
    catch (err) {
        console.error('Errore durante l\'upload del database:', err);
        return res.status(500).json({ success: false, message: 'Errore durante l\'upload del database' });
    }
});
/*  // Upload del database SQLite
const multer = require('multer');
const upload = multer({ dest: path.join('./', 'uploads') });

app.post('/upload-db', upload.single('logsdb'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Nessun file caricato' });
    }

    // Verifica nome file suggerito oppure accetta qualsiasi e rinomina a logs.db
    const tempPath = req.file.path;
    const targetPath = path.join('./', 'logs.db');
    const backupPath = path.join('./', `logs.backup.${Date.now()}.db`);

    // Effettua un backup dell'attuale DB se esiste
    if (fs.existsSync(targetPath)) {
      fs.copyFileSync(targetPath, backupPath);
    }

    // Sostituisci con il nuovo DB
    fs.copyFileSync(tempPath, targetPath);

    // Rimuovi il file temporaneo
    fs.unlinkSync(tempPath);

    console.log('logs.db caricato e sostituito con successo');
    return res.json({ success: true, message: 'Database aggiornato con successo', backup: fs.existsSync(backupPath) ? backupPath : null });
  } catch (err) {
    console.error('Errore durante l\'upload del database:', err);
    return res.status(500).json({ success: false, message: 'Errore durante l\'upload del database' });
  }
});
 */
app.get('/ricercauid', (req, res) => {
    // 1. Recupera il parametro 'ricercaUID' dalla query string.
    //    Aggiungi un controllo per assicurarti che sia una stringa e non undefined.
    const uidToSearch = req.query.ricercaUID;
    UID = uidToSearch;
    if (!uidToSearch) { // Se il parametro e' mancante o non e' una stringa valida
        //  console.warn("Richiesta /ricercauid senza parametro 'ricercaUID' o non valido.");
        res.status(400).set('Content-Type', 'text/plain').send('ERROR PARAM');
    }
    //console.log(`Ricevuta richiesta /ricercauid per UID: ${uidToSearch}`);
    database_1.database.getTagOwnerByUID(uidToSearch) // Ora uidToSearch e' garantito essere una stringa
        .then((record) => {
        //    console.log("Ricerca TagOwner completata.");
        if (record) {
            res.status(200).set('Content-Type', 'text/plain').send(record.nominativo);
            //      console.log("record nominativo"); console.log(record.nominativo);
        }
        else {
            //    console.log(`TagOwner per UID ${uidToSearch} non trovato.`);
            res.status(200).set('Content-Type', 'text/plain').send("X");
        }
    })
        .catch((error) => {
        // console.error(`Errore durante il recupero del TagOwner per UID ${uidToSearch}:`, error);
        res.status(500).set('Content-Type', 'text/plain').send('ERROR');
    });
});
// app.get('/ricercauid', (req, res) => {
//   // 1. Recupera il parametro 'ricercaUID' dalla query string.
//   //    Aggiungi un controllo per assicurarti che sia una stringa e non undefined.
//   const uidToSearch: string | undefined = req.query.ricercaUID as string; 
//   if (!uidToSearch) { // Se il parametro e' mancante o non e' una stringa valida
//       console.warn("Richiesta /ricercauid senza parametro 'ricercaUID' o non valido.");
//       return res.status(400).send(JSON.stringify({ type: 'error', message: 'Parametro "ricercaUID" mancante o non valido nella query.' }));
//   }
//   console.log(`Ricevuta richiesta /ricercauid per UID: ${uidToSearch}`);
//   database.getTagOwnerByUID(uidToSearch) // Ora uidToSearch e' garantito essere una stringa
//       .then((record: TagOwner | null) => { 
//           console.log("Ricerca TagOwner completata.");
//           if (record) { 
//               res.status(200).send(JSON.stringify({ type: 'nomeUID', nome: record.nominativo, espId: "Server" }));
//           } else {
//               console.log(`TagOwner per UID ${uidToSearch} non trovato.`);
//               res.status(200).send(JSON.stringify({ type: 'nomeUID', nome: "", espId: "Server" }));
//           }
//       })
//       .catch((error: any) => { 
//           console.error(`Errore durante il recupero del TagOwner per UID ${uidToSearch}:`, error);
//           res.status(500).send(JSON.stringify({ type: 'error', message: 'Errore interno del server durante la ricerca.', details: error.message }));
//       });
// });
