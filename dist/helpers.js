"use strict";
// === FUNZIONI HELPER PER PARTI COMUNI ===
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDateFilterIndicator = exports.formatDateIta = exports.generateSearchSectionWithDateFilter = exports.generateDateRangeScript = exports.generateDateRangeControls = exports.resetDatabaseScript = exports.generateSearchScript = exports.checkServer = exports.disattivaScript = exports.generateTastierinoNumerico = exports.generateSearchSection = exports.generateBaseHTML = exports.generateAutoRefreshScript = exports.generateStickyHeaderScript = exports.generatePaginationScript = exports.generatePagination = exports.generateCSSLink = exports.generateNavbar = void 0;
// Funzione per generare la navbar comune
function generateNavbar(activePage) {
    const pages = [
        { href: '/sensor-data', icon: '📊', text: 'Dati Sensori' },
        { href: '/spending-dashboard', icon: '💰', text: 'Dashboard Spese' },
        { href: '/tag-owners', icon: '👥', text: 'Possessori Tag' },
        { href: '/utility', icon: '🔧', text: 'Utility' }
    ];
    const navItems = pages.map(page => {
        const isActive = page.href.includes(activePage) ? 'active' : '';
        return `<li><a href="${page.href}" class="${isActive}">${page.icon} ${page.text}</a></li>`;
    }).join('');
    return `
    <nav class="navbar">
        <div class="navbar-container">
         NewHomeEspGen
            <a href="/" class="navbar-brand">🏠 Home</a>
            <ul class="navbar-nav">
                ${navItems}
            </ul>
        </div>
    </nav>
  `;
}
exports.generateNavbar = generateNavbar;
// Funzione per generare il link al file CSS esterno
function generateCSSLink() {
    const version = Date.now(); // Forza il ricaricamento del CSS
    return `<link rel="stylesheet" href="/styles.css?v=${version}">`;
}
exports.generateCSSLink = generateCSSLink;
// Funzione per generare la paginazione comune
function generatePagination(pagination) {
    if (!pagination)
        return '';
    return `
    <div class="pagination">
        <select onchange="changeLimit(this.value)">
            <option value="5" ${pagination.limit === 5 ? 'selected' : ''}>5 per pagina</option>
            <option value="10" ${pagination.limit === 10 ? 'selected' : ''}>10 per pagina</option>
            <option value="25" ${pagination.limit === 25 ? 'selected' : ''}>25 per pagina</option>
            <option value="50" ${pagination.limit === 50 ? 'selected' : ''}>50 per pagina</option>
        </select>
        
        ${pagination.page > 1 ? `<button onclick="goToPage(1)">⏮️ Prima</button>` : ''}
        ${pagination.page > 1 ? `<button onclick="goToPage(${pagination.page - 1})">← Precedente</button>` : ''}
        <span>Pagina ${pagination.page} di ${pagination.totalPages}</span>
        ${pagination.page < pagination.totalPages ? `<button onclick="goToPage(${pagination.page + 1})">Successiva →</button>` : ''}
        ${pagination.page < pagination.totalPages ? `<button onclick="goToPage(${pagination.totalPages})">Ultima ⏭️</button>` : ''}
    </div>
  `;
}
exports.generatePagination = generatePagination;
// Funzione per generare il JavaScript comune per la paginazione
function generatePaginationScript() {
    return `


     // --- Parte aggiunta/modificata per gestire il limite di paginazione da localStorage all'avvio ---
    const currentPath = window.location.pathname;
    // Correzione dell'espressione regolare per il backslash
    const storageKey = 'tableLimit_' + currentPath.replace(/\\//g, '_'); 

    const url = new URL(window.location.href);

    // Se il parametro 'limit' non è già presente nell'URL
    if (!url.searchParams.has('limit')) {
        const savedLimit = localStorage.getItem(storageKey);
        if (savedLimit) {
            // Imposta il parametro 'limit' nell'URL con il valore salvato
            url.searchParams.set('limit', savedLimit);
            // Reindirizza la pagina con il nuovo URL.
            // Usiamo replace() per non aggiungere all'history del browser.
            // Questo assicura che il limite sia sempre nell'URL e la paginazione iniziale sia corretta.
            window.location.replace(url.toString());
            return; // Ferma l'esecuzione dello script per questa iterazione
                    // La pagina si ricaricherà con il limite corretto nell'URL
        }
    }
    // Paginazione AJAX: aggiorna solo la tabella + barra paginazione
    async function loadPageData(page, limit) {
        const currentPath = window.location.pathname;
        let pagination = { page: Number(page) || 1, limit: Number(limit) || 10, total: 0, totalPages: 1 };
        let data = [];

        try {
            if (currentPath.includes('/sensor-data')) {
                const response = await fetch('/api/sensor-data?page=' + pagination.page + '&pageSize=' + pagination.limit);
                const result = await response.json();
                if (result.success) {
                    data = result.data || [];
                    pagination.total = result.pagination.total || data.length;
                    pagination.totalPages = result.pagination.totalPages || Math.max(1, Math.ceil(pagination.total / pagination.limit));
                    renderSensorDataTable(data);
                }
            } else if (currentPath.includes('/tag-owners')) {
                const response = await fetch('/api/tag-owners?page=' + pagination.page + '&pageSize=' + pagination.limit);
                const result = await response.json();
                if (result.success) {
                    data = result.data || [];
                    pagination.total = result.pagination.total || data.length;
                    pagination.totalPages = result.pagination.totalPages || Math.max(1, Math.ceil(pagination.total / pagination.limit));
                    renderTagOwnersTable(data);
                }
            } else if (currentPath.includes('/spending-dashboard') && !currentPath.includes('/spending-dashboard/')) {
                const response = await fetch('/api/spending-stats?page=' + pagination.page + '&pageSize=' + pagination.limit);
                const result = await response.json();
                if (result.success) {
                    data = result.data || [];
                    pagination.total = result.pagination.total || data.length;
                    pagination.totalPages = result.pagination.totalPages || Math.max(1, Math.ceil(pagination.total / pagination.limit));
                    renderSpendingDashboardTable(data);
                }
            } else if (currentPath.includes('/spending-dashboard/')) {
                const uid = currentPath.split('/spending-dashboard/')[1];
                const response = await fetch('/api/sensor-data/uid/' + encodeURIComponent(uid) + '/history?limit=10000');
                const result = await response.json();
                const operations = (result && result.data) ? result.data : [];
                pagination.total = operations.length;
                pagination.totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));
                const startIndex = (pagination.page - 1) * pagination.limit;
                const endIndex = startIndex + pagination.limit;
                renderUidOperationsTable(operations.slice(startIndex, endIndex));
            }
        } catch (error) {
            console.error('Errore nella paginazione AJAX:', error);
        }

        renderPagination(pagination);
    }

    function renderPagination(p) {
        const container = document.querySelector('.pagination');
        if (!container) return;
        let html = '';
        html += '<select onchange="changeLimit(this.value)">';
        html += '<option value="5" ' + (p.limit === 5 ? 'selected' : '') + '>5 per pagina</option>';
        html += '<option value="10" ' + (p.limit === 10 ? 'selected' : '') + '>10 per pagina</option>';
        html += '<option value="25" ' + (p.limit === 25 ? 'selected' : '') + '>25 per pagina</option>';
        html += '<option value="50" ' + (p.limit === 50 ? 'selected' : '') + '>50 per pagina</option>';
        html += '</select>';
        if (p.page > 1) html += '<button onclick="goToPage(1)">⏮️ Prima</button>';
        if (p.page > 1) html += '<button onclick="goToPage(' + (p.page - 1) + ')">← Precedente</button>';
        html += '<span>Pagina ' + p.page + ' di ' + p.totalPages + '</span>';
        if (p.page < p.totalPages) html += '<button onclick="goToPage(' + (p.page + 1) + ')">Successiva →</button>';
        if (p.page < p.totalPages) html += '<button onclick="goToPage(' + p.totalPages + ')">Ultima ⏭️</button>';
        container.innerHTML = html;
    }

    function renderSpendingDashboardTable(stats) {
        const tbody = document.querySelector('tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        stats.forEach(stat => {
            const row = document.createElement('tr');
            if (typeof generateSpendingDashboardRow === 'function') {
                row.innerHTML = generateSpendingDashboardRow(stat);
            }
            tbody.appendChild(row);
        });
    }

    function renderTagOwnersTable(owners) {
        const tbody = document.querySelector('tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        owners.forEach(owner => {
            if (typeof generateTagOwnerRow === 'function') {
                const html = generateTagOwnerRow(owner);
                tbody.insertAdjacentHTML('beforeend', html);
            }
        });
    }

    function renderSensorDataTable(records) {
        const tbody = document.querySelector('tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        records.forEach(record => {
            if (typeof generateSensorDataRow === 'function') {
                const html = generateSensorDataRow(record);
                tbody.insertAdjacentHTML('beforeend', html);
            }
        });
    }

    function renderUidOperationsTable(ops) {
        const bodies = document.querySelectorAll('tbody');
        const tbody = bodies && bodies.length ? bodies[bodies.length - 1] : null;
        if (!tbody) return;
        tbody.innerHTML = '';
        ops.forEach(op => {
            const spesa = Number(op.credito_precedente) - Number(op.credito_attuale);
            const row =
              '<tr>' +
            
                '<td>' + op.datetime + '</td>' +
                '<td>' + Number(op.credito_precedente).toFixed(2) + '€</td>' +
                '<td>' + Number(op.credito_attuale).toFixed(2) + '€</td>' +
                '<td><span class="doccia">' + spesa.toFixed(2) + '€</span></td>' +
                '<td><span class="status ' + op.status + '">' + op.status + '</span></td>' +
              '</tr>';
            tbody.insertAdjacentHTML('beforeend', row);
        });
    }

/*     window.goToPage = function(page) {
        const select = document.querySelector('.pagination select');
        const limit = select ? Number(select.value) : 10;
        loadPageData(Number(page), limit);
    };
    
    window.changeLimit = function(limit) {
        loadPageData(1, Number(limit));
    }; */


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


  `;
}
exports.generatePaginationScript = generatePaginationScript;
// Funzione per generare il JavaScript comune per sticky header
function generateStickyHeaderScript() {
    return `
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
}
exports.generateStickyHeaderScript = generateStickyHeaderScript;
// Funzione per generare il JavaScript comune per il refresh automatico
function generateAutoRefreshScript() {
    return `
    // Variabili per gestire l'aggiornamento intelligente
    let refreshCountdown = 5;
    let isUserEditing = false;
    let refreshInterval;
    let countdownInterval;
    let autoRefreshEnabled = localStorage.getItem('autoRefreshEnabled') !== 'false';
    
    // Mostra un indicatore di aggiornamento
    const countdownElement = document.createElement('div');
    countdownElement.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #2196F3; color: white; padding: 8px 12px; border-radius: 4px; font-size: 12px; z-index: 1000; cursor: pointer;';
    countdownElement.title = "Clicca per interrompere l'aggiornamento automatico";
    countdownElement.addEventListener('click', toggleAutoRefresh);
    document.body.appendChild(countdownElement);
    
    // Imposta lo stato iniziale del countdown
    if (!autoRefreshEnabled) {
        countdownElement.style.background = '#FF5722';
        countdownElement.textContent = 'Aggiornamento disabilitato';
        countdownElement.title = "Clicca per riprendere l'aggiornamento automatico";
    }
    
    // Funzione per controllare se l'utente sta modificando i campi
    function checkUserEditing() {
        if (!autoRefreshEnabled) return;
        
        const activeElement = document.activeElement;
        const isEditing = activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.contentEditable === 'true'
        );
        
        if (isEditing !== isUserEditing) {
            isUserEditing = isEditing;
            if (isUserEditing) {
                // Pausa l'aggiornamento quando l'utente sta modificando
                pauseAutoRefresh();
                countdownElement.style.background = '#FF9800';
                countdownElement.textContent = 'Modifica in corso...';
            } else {
                // Riprendi l'aggiornamento quando l'utente smette di modificare
                resumeAutoRefresh();
                countdownElement.style.background = '#2196F3';
            }
        }
    }
    
    // Funzione per mettere in pausa l'aggiornamento automatico
    function pauseAutoRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
    }
    
    // Funzione per riprendere l'aggiornamento automatico
    function resumeAutoRefresh() {
        if (!refreshInterval && autoRefreshEnabled) {
            refreshCountdown = 5;
            startAutoRefresh();
        }
    }
    
    // Funzione per avviare l'aggiornamento automatico
    function startAutoRefresh() {
        if (!autoRefreshEnabled) return;
        
        refreshInterval = setInterval(async function() {
            if (!isUserEditing && autoRefreshEnabled) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);

                const response = await fetch('/nRecords', { signal: controller.signal });
                clearTimeout(timeoutId);
                const result = await response.json();
                if (result.record.change)
                  location.reload();
                //alert(result.record.record);
            }
                catch (error)
                { console.log(error);};
            }
        }, 5000);
        
        countdownInterval = setInterval(function() {
            if (!isUserEditing && autoRefreshEnabled) {
                refreshCountdown--;
                countdownElement.textContent = 'Aggiornamento in ' + refreshCountdown + 's';
                
                if (refreshCountdown <= 0) {
                    clearInterval(countdownInterval);
                    countdownElement.textContent = 'Aggiornamento...';
                }
            }
        }, 1000);
    }
    
    // Funzione per attivare/disattivare l'aggiornamento automatico
    function toggleAutoRefresh() {
        if (autoRefreshEnabled) {
            // Disabilita l'aggiornamento
            pauseAutoRefresh();
            autoRefreshEnabled = false;
            localStorage.setItem('autoRefreshEnabled', 'false');
            countdownElement.style.background = '#FF5722';
            countdownElement.textContent = 'Aggiornamento disabilitato';
            countdownElement.title = "Clicca per riprendere l'aggiornamento automatico";
        } else {
            // Riabilita l'aggiornamento
            autoRefreshEnabled = true;
            localStorage.setItem('autoRefreshEnabled', 'true');
            refreshCountdown = 5;
            startAutoRefresh();
            countdownElement.style.background = '#2196F3';
            countdownElement.title = "Clicca per interrompere l'aggiornamento automatico";
        }
    }
    
    // Rendi la funzione globale
    window.toggleAutoRefresh = toggleAutoRefresh;
    
    // Controlla periodicamente se l'utente sta modificando
    setInterval(checkUserEditing, 100);
    
    // Avvia l'aggiornamento automatico solo se abilitato
    if (autoRefreshEnabled) {
        startAutoRefresh();
    }
  `;
}
exports.generateAutoRefreshScript = generateAutoRefreshScript;
// Funzione per generare il template HTML base
function generateBaseHTML(title, activePage, content, additionalStyles = '', additionalScripts = '') {
    return `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${generateCSSLink()}
    ${additionalStyles ? `<style>${additionalStyles}</style>` : ''}
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            ${generateAutoRefreshScript()}
            ${generatePaginationScript()}
            ${generateStickyHeaderScript()}
            ${additionalScripts}
        });
    </script>
</head>
<body>
    ${generateNavbar(activePage)}
    ${content}
</body>
</html>
  `;
}
exports.generateBaseHTML = generateBaseHTML;
// Funzione per generare la sezione di ricerca comune
function generateSearchSection(searchId, placeholder, clearFunction) {
    return `
    <div class="search-section">
        <input type="text" id="${searchId}" placeholder="${placeholder}" class="search-input">
        <button onclick="${clearFunction}" class="clear-btn">❌</button>
    </div>
  `;
}
exports.generateSearchSection = generateSearchSection;
function generateTastierinoNumerico(targetInputId, // ID della textbox numerica a cui il tastierino deve scrivere
confirmFunction, // Funzione JavaScript da chiamare quando si clicca "Conferma"
addFunction, // Funzione JavaScript da chiamare quando si clicca "Aggiungi"
removeFunction, // Funzione JavaScript da chiamare quando si clicca "Togli"
causaleInputId = "causaleInput", // ID della textbox per la causale
causalePlaceholder = "Inserisci causale" // Placeholder per la textbox causale
) {
    return `
  <div class="numeric-keypad-container">
      <div class="causale-section">
          <input type="text" id="${causaleInputId}" placeholder="${causalePlaceholder}" class="causale-input">
      </div>

      <div class="keypad-display">
          <input type="text" id="${targetInputId}" class="keypad-input" value="0" readonly>
          <button class="clear-display-btn" onclick="clearKeypadDisplay('${targetInputId}')">C</button>
      </div>
      
      <div class="keypad-grid">
          <button class="keypad-btn" onclick="appendToKeypadDisplay('${targetInputId}', '1')">1</button>
          <button class="keypad-btn" onclick="appendToKeypadDisplay('${targetInputId}', '2')">2</button>
          <button class="keypad-btn" onclick="appendToKeypadDisplay('${targetInputId}', '3')">3</button>
          <button class="keypad-action-btn action-add" onclick="${addFunction}">+</button>

          <button class="keypad-btn" onclick="appendToKeypadDisplay('${targetInputId}', '4')">4</button>
          <button class="keypad-btn" onclick="appendToKeypadDisplay('${targetInputId}', '5')">5</button>
          <button class="keypad-btn" onclick="appendToKeypadDisplay('${targetInputId}', '6')">6</button>
          <button class="keypad-action-btn action-remove" onclick="${removeFunction}">-</button>

          <button class="keypad-btn" onclick="appendToKeypadDisplay('${targetInputId}', '7')">7</button>
          <button class="keypad-btn" onclick="appendToKeypadDisplay('${targetInputId}', '8')">8</button>
          <button class="keypad-btn" onclick="appendToKeypadDisplay('${targetInputId}', '9')">9</button>
          <button class="keypad-action-btn action-confirm" onclick="${confirmFunction}">Conferma</button>

          <button class="keypad-btn double-width" onclick="appendToKeypadDisplay('${targetInputId}', '0')">0</button>
          <button class="keypad-btn" onclick="appendToKeypadDisplay('${targetInputId}', '.')">.</button>
          <button class="keypad-backspace-btn" onclick="backspaceKeypadDisplay('${targetInputId}')">&#x232b;</button> <!-- Backspace Unicode -->
      </div>
  </div>
`;
}
exports.generateTastierinoNumerico = generateTastierinoNumerico;
function disattivaScript(btnid, disattivaFunction) {
    return `
       function ${disattivaFunction}() {
          console.log('Funzione disattiva chiamata per ${btnid}');
          
          fetch('/api/toggle-server', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              const btn = document.getElementById("${btnid}");
              
              // Usa il valore reale di attivaServer dal server
              if (data.attivaServer) {
                btn.style.backgroundColor = '#4CAF50';
                console.log('Server ATTIVO');
              } else {
                btn.style.backgroundColor = 'red';
                console.log('Server DISATTIVO');
              }
            }
          })
          .catch(error => console.error('Errore:', error));
        }
          window.${disattivaFunction} = ${disattivaFunction};
           
    `;
}
exports.disattivaScript = disattivaScript;
function checkServer(btnid, chekServer) {
    return `
       function ${chekServer}() {
          console.log('Funzione disattiva chiamata per ${btnid}');
          
          fetch('/api/check-server', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              const btn = document.getElementById("${btnid}");
              
              // Usa il valore reale di attivaServer dal server
              if (data.attivaServer) {
                btn.style.backgroundColor = '#4CAF50';
                console.log('Server ATTIVO');
              } else {
                btn.style.backgroundColor = 'red';
                console.log('Server DISATTIVO');
              }
            }
          })
          .catch(error => console.error('Errore:', error));
        };
            window.${chekServer} = ${chekServer};
          window.${chekServer}();
          
    `;
}
exports.checkServer = checkServer;
// Funzione per generare il JavaScript comune per la ricerca
function generateSearchScript(searchId, clearFunction) {
    return `
    // Funzione per la ricerca AJAX nelle tabelle
    let searchTimeout;
    
   function clearHighlights() {
        document.querySelectorAll('mark').forEach(mark => {
            const parent = mark.parentNode;
            if (parent) {
                // Sposta i figli del tag <mark> direttamente nel suo genitore
                while (mark.firstChild) {
                    parent.insertBefore(mark.firstChild, mark);
                }
                // Rimuovi il tag <mark> stesso
                parent.removeChild(mark);
            }
        });
    }


    async function filterTable() {
        //const searchTerm = document.getElementById('${searchId}').value.toLowerCase();
         const rawValue = document.getElementById('${searchId}').value;
        const searchTerm = (rawValue || '').toLowerCase();
        
        // Se il campo è vuoto, ripristina automaticamente lo stato iniziale
        if (!rawValue || rawValue.trim() === '') {
           // try { ${clearFunction}(); } catch (e) { window.location.reload(); }
            clearHighlights()  
          try {
                const currentPath = window.location.pathname;
                let endpoint = '';
                const url = new URL(window.location.href);
                const page = url.searchParams.get('page') || '1';
                const limit = url.searchParams.get('limit') || (currentPath.includes('/sensor-data') ? '50' : '10');
                try {
                const currentPath = window.location.pathname;
                let endpoint = '';
                const url = new URL(window.location.href);
                const page = url.searchParams.get('page') || '1';
                const limit = url.searchParams.get('limit') || (currentPath.includes('/sensor-data') ? '50' : '10');
                if (currentPath.includes('/spending-dashboard') && !currentPath.includes('/spending-dashboard/')) {
                    endpoint = '/api/spending-stats?page=' + page + '&pageSize=' + limit;
                } 

             try {
                const currentPath = window.location.pathname;
                let endpoint = '';
                const url = new URL(window.location.href);
                const page = url.searchParams.get('page') || '1';
                const limit = url.searchParams.get('limit') || (currentPath.includes('/sensor-data') ? '50' : '10');
                if (currentPath.includes('/spending-dashboard') && !currentPath.includes('/spending-dashboard/')) {
                    endpoint = '/api/spending-stats?page=' + page + '&pageSize=' + limit;
                } 
                    else if (currentPath.includes('/tag-owners')) {
                    endpoint = '/api/tag-owners?page=' + page + '&pageSize=' + limit;
                }
                     else if (currentPath.includes('/sensor-data')) {
                    endpoint = '/api/sensor-data?page=' + page + '&pageSize=' + limit;
                }
                if (endpoint) {
                    const response = await fetch(endpoint);
                    const result = await response.json();
                    if (result.success && result.data) {
                        updateTableWithFilteredData(result.data, '', currentPath);
                    }
                } else {
                    // Per pagine non supportate, fallback locale
                    filterTableLocal();
                }
            } catch (e) {
                // Fallback finale
                filterTableLocal();
            }

                if (endpoint) {
                    const response = await fetch(endpoint);
                    const result = await response.json();
                    if (result.success && result.data) {
                        updateTableWithFilteredData(result.data, '', currentPath);
                    }
                } else {
                    // Per pagine non supportate, fallback locale
                    filterTableLocal();
                }
            } catch (e) {
                // Fallback finale
                filterTableLocal();
            }
                if (endpoint) {
                    const response = await fetch(endpoint);
                    const result = await response.json();
                    if (result.success && result.data) {
                        updateTableWithFilteredData(result.data, '', currentPath);
                    }
                } else {
                    // Per pagine non supportate, fallback locale
                    filterTableLocal();
                }
            } catch (e) {
                // Fallback finale
                filterTableLocal();
            }


           
            return;
        }
        // Cancella il timeout precedente per evitare troppe chiamate
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Aspetta 300ms dopo che l'utente smette di digitare
        searchTimeout = setTimeout(async () => {
            try {
                // Determina l'endpoint in base alla pagina corrente
                let endpoint = '';
                const currentPath = window.location.pathname;
                
                if (currentPath.includes('/spending-dashboard') && !currentPath.includes('/spending-dashboard/')) {
                    // Dashboard generale spese - usa endpoint con ricerca
                    endpoint = '/api/spending-stats/search?q=' + encodeURIComponent(searchTerm);
                } else if (currentPath.includes('/tag-owners')) {
                    // possessori tag - usa endpoint con ricerca
                    endpoint = '/api/tagowners/search?q=' + encodeURIComponent(searchTerm);
                } else if (currentPath.includes('/sensor-data')) {
                    // Dati sensori - usa endpoint con ricerca
                    endpoint = '/api/sensor-data/search?q=' + encodeURIComponent(searchTerm);
                } else if (currentPath.includes('/spending-dashboard/')) {
                    // Dashboard specifica UID - usa la ricerca locale
                    filterTableLocal();
                    return;
                }
                
                if (endpoint) {
                    // Chiamata AJAX per ottenere i dati filtrati dal server
                    const response = await fetch(endpoint);
                    const result = await response.json();
                    
                    if (result.success && result.data) {
                        // Aggiorna la tabella con i risultati filtrati
                        updateTableWithFilteredData(result.data, searchTerm, currentPath);
                    } else {
                        // Se non ci sono risultati, mostra messaggio
                        showNoResultsMessage(searchTerm);
                    }
                } else {
                    // Fallback alla ricerca locale per pagine non supportate
                    filterTableLocal();
                }
            } catch (error) {
                console.error('Errore nella ricerca:', error);
                // Fallback alla ricerca locale
                filterTableLocal();
            }
        }, 300);
    }
    
    // Funzione per aggiornare la tabella con i dati filtrati
    function updateTableWithFilteredData(filteredData, searchTerm, currentPath) {
        console.log('updateTableWithFilteredData called with:', { filteredData, searchTerm, currentPath });
        
        const tableBody = document.querySelector('tbody');
        
        if (!tableBody) {
            console.error('Table body not found');
            return;
        }
        
        // Pulisci la tabella
        tableBody.innerHTML = '';
        
        if (filteredData.length === 0) {
            showNoResultsMessage(searchTerm);
               clearHighlights(); 
            return;
        }
        
        console.log('Filtered data length:', filteredData.length);
        
        // Determina il tipo di tabella e genera le righe appropriate
        if (currentPath.includes('/spending-dashboard') && !currentPath.includes('/spending-dashboard/')) {
            // Dashboard generale spese
         //   console.log('Generating spending dashboard rows');
            filteredData.forEach((stat, index) => {
                const row = document.createElement('tr');
                row.innerHTML = generateSpendingDashboardRow(stat);
                tableBody.appendChild(row);
           //     console.log('Added spending dashboard row', index);
            });
        } else if (currentPath.includes('/tag-owners')) {
            // possessori tag - le funzioni restituiscono già l'elemento tr completo
          //  console.log('Generating tag owner rows');
            filteredData.forEach((owner, index) => {
                const html = generateTagOwnerRow(owner);
                //console.log('Generated tag owner HTML:', html);
                tableBody.insertAdjacentHTML('beforeend', html);
           //     console.log('Added tag owner row', index);
            });
        } else if (currentPath.includes('/sensor-data')) {
            // Dati sensori - le funzioni restituiscono già l'elemento tr completo
         //   console.log('Generating sensor data rows');
            filteredData.forEach((record, index) => {
                const html = generateSensorDataRow(record);
           //     console.log('Generated sensor data HTML:', html);
                tableBody.insertAdjacentHTML('beforeend', html);
            //    console.log('Added sensor data row', index);
            });
        }
        
        //console.log('Final table body HTML:', tableBody.innerHTML);
        
        // Evidenzia il termine di ricerca
        console.log("chiamato quiiiiiiiiiiii");
        highlightSearchTerm(searchTerm);
    }
    
    // Funzione per mostrare messaggio "nessun risultato"
    function showNoResultsMessage(searchTerm) {
        const tableBody = document.querySelector('tbody');
        if (tableBody) {
            const currentPath = window.location.pathname;
            let colspan = 6; // Default
            
            if (currentPath.includes('/tag-owners')) {
                colspan = 7; // possessori tag hanno 7 colonne
            } else if (currentPath.includes('/sensor-data')) {
                colspan = 7; // Dati sensori hanno 5 colonne
            } else if (currentPath.includes('/spending-dashboard') && !currentPath.includes('/spending-dashboard/')) {
                colspan = 7; // Dashboard generale spese ha 7 colonne (aggiunta accrediti)
            }
            
            tableBody.innerHTML = '<tr><td colspan="' + colspan + '" class="no-data">Nessun risultato trovato per: <strong>' + searchTerm + '</strong></td></tr>';
        }
    }
    
    // Funzioni helper per generare le righe delle tabelle
    function generateSpendingDashboardRow(stat) {
        // Debug: verifica i dati ricevuti
        console.log('Generating spending dashboard row:', stat);
        
        // Assicurati che il nominativo sia disponibile
        const nominativo = stat.nominativo || '';
        const uidCell = \`
            <div>
                <a href="/spending-dashboard/\${stat.uid}" class="uid-link">\${stat.uid}</a>\${stat.fromBackup ? ' 📊' : ''}
                \${nominativo ? \`<br><small class="nominativo">👤 \${nominativo}</small>\` : ''}
            </div>
        \`;
        
        return \`
             
            <td>\${uidCell}</td>
            <td>\${stat.creditoAttuale ? stat.creditoAttuale.toFixed(2) + '€' : '0.00€'}\${stat.fromBackup ? ' 📊' : ''}</td>
            <td>\${stat.totalSpent ? stat.totalSpent.toFixed(2) + '€' : '0.00€'}</td>
            <td>\${stat.totalOperations || 0}</td>
            <td>\${stat.averageSpentPerSpending ? stat.averageSpentPerSpending.toFixed(2) + '€' : '0.00€'}</td>
            
            <td>\${stat.totalAccrediti ? stat.totalAccrediti.toFixed(2) + '€' : '0.00€'}</td>
            <td>\${stat.lastOperation || '-'}</td>
        \`;
    }
    
    function generateTagOwnerRow(owner) {
        // Debug: verifica i dati ricevuti
        console.log('Generating tag owner row:', owner);
        
        const isAutoAssigned = owner.nominativo === 'INSERISCI' || owner.indirizzo === 'INSERISCI';
        const statusIcon = isAutoAssigned ? '⚠️ ' : '';
        const nominativoValue = owner.nominativo === 'INSERISCI' ? '' : owner.nominativo;
        const indirizzoValue = owner.indirizzo === 'INSERISCI' ? '' : owner.indirizzo;
        const rowClass = isAutoAssigned ? 'auto-assigned' : '';
        
        const nominativoField = \`<input type="text" class="edit-field" id="nominativo_\${owner.uid}" value="\${nominativoValue}" placeholder="Inserisci nominativo" oninput="checkSaveButton('\${owner.uid}')">\`;
        const indirizzoField = \`<textarea class="edit-field" id="indirizzo_\${owner.uid}" placeholder="Inserisci indirizzo">\${indirizzoValue}</textarea>\`;
        const noteField = \`<textarea class="edit-field" id="note_\${owner.uid}" placeholder="Inserisci note">\${owner.note || ''}</textarea>\`;
        
        const actionButtons = \`
            <div class="action-buttons">
                <button class="save-btn" id="save_\${owner.uid}" onclick="window.saveTagOwner('\${owner.uid}')" \${nominativoValue === '' ? 'disabled' : ''}>💾 Salva</button>
                <button class="delete-btn" onclick="window.deleteTagOwner('\${owner.uid}')">🗑️ Elimina</button>
            </div>
        \`;
        
        return \`
            <tr class="\${rowClass}">
                <td>
                    <div>
                        <a href="/spending-dashboard/\${owner.uid}" class="uid-link">\${statusIcon}\${owner.uid}</a>
                        \${nominativoValue ? \`<br><small class="nominativo">👤 \${nominativoValue}</small>\` : ''}
                    </div>
                </td>
                <td>\${nominativoField}</td>
                <td>\${indirizzoField}</td>
                <td>\${noteField}</td>
                <td>\${owner.created_at || ''}</td>
                <td>\${owner.updated_at || ''}</td>
                <td>\${actionButtons}</td>
            </tr>
        \`;
    }
    
    function generateSensorDataRow(record) {
        // Debug: verifica i dati ricevuti
        console.log('Generating sensor data row:', record);
        
        // Controlla se esiste un possessorio per questo UID
        const nominativo = record.nominativo || '';
        const uidCell = \`
            <div>
                <a href="/spending-dashboard/\${record.uid}" class="uid-link">\${record.uid}</a>
                \${nominativo ? \`<br><small class="nominativo">👤 \${nominativo}</small>\` : ''}
            </div>
        \`;
        
        return \`
            <tr> 

               <td>\${record.DEVICE}</td>
                <td>\${uidCell}</td>
                <td>\${record.datetime}</td>
                <td>\${Number(record.credito_precedente).toFixed(2)}€</td>
                <td>\${Number(record.credito_attuale).toFixed(2)}€</td>
     <!-- qui per celle da filtro ricerca -->
                <td><span class="spesa">\${(Number(record.credito_attuale) - Number(record.credito_precedente)).toFixed(2)}€</span></td>
                <td><span class="status \${record.status}">\${record.status}</span></td>
            </tr>
        \`;
    }

    // Funzione ricorsiva per evidenziare il testo nei nodi (spostata fuori dal forEach per efficienza)
function highlightTextInNode(node, searchTerm, regex) {
    if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (regex.test(text)) {
            // MODIFICA QUI: Aggiungi uno stile inline per forzare il colore giallo
            const highlightedText = text.replace(regex, '<mark style="background-color: yellow; color: inherit;">$1</mark>');
            const span = document.createElement('span');
            span.innerHTML = highlightedText;
            
            const fragment = document.createDocumentFragment();
            while (span.firstChild) {
                fragment.appendChild(span.firstChild);
            }
            node.parentNode.replaceChild(fragment, node);
        }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Evita di processare elementi <mark> già esistenti per non annidare o duplicare
        if (node.tagName.toLowerCase() === 'mark') {
            return; 
        }
        const children = Array.from(node.childNodes);
        children.forEach(child => highlightTextInNode(child, searchTerm, regex));
    }
}


function highlightSearchTerm(searchTerm) { 
    if (!searchTerm || searchTerm.trim() === '') {
        console.log("Termine di ricerca vuoto, nessuna evidenziazione.");
        return;
    }

    const tables = document.querySelectorAll('table');
    let targetTable;

    if (tables.length > 1) {
        console.warn("Sono presenti " + tables.length + " tabelle. Evidenziazione sulla SECONDA tabella.");
        targetTable = tables[1]; // Seleziona la seconda tabella (indice 1)
    } else if (tables.length === 1) {
        console.warn("È presente 1 tabella. Evidenziazione sulla PRIMA tabella.");
        targetTable = tables[0]; // Seleziona la prima tabella (indice 0)
    } else {
        console.warn("Nessuna tabella trovata sulla pagina.");
        return; // Nessuna tabella su cui operare
    }
   
    console.log("Tentativo di evidenziazione sulla tabella:", targetTable);
        
    const cells = targetTable.querySelectorAll('td');
    console.log("Numero di celle selezionate nella tabella:", cells.length);

    // Prepara la regex una sola volta
    const regex = new RegExp('(' + searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + ')', 'gi');

    cells.forEach(cell => {
        const originalHTML = cell.innerHTML;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = originalHTML;
        
        // Applica l'evidenziazione a tutto il contenuto della cella
        highlightTextInNode(tempDiv, searchTerm, regex);
        
        // Aggiorna la cella con l'HTML modificato
        cell.innerHTML = tempDiv.innerHTML;
    });
    console.log("Processo di evidenziazione completato per la tabella selezionata.");
}
 
    // // Funzione per evidenziare il termine di ricerca
    // function highlightSearchTerm(searchTerm) {
    //     if (!searchTerm) return;
        
    //     const cells = document.querySelectorAll('td');
    //     cells.forEach(cell => {
    //         // Preserva l'HTML esistente e applica l'evidenziazione solo al testo
    //         const originalHTML = cell.innerHTML;
            
    //         // Crea un elemento temporaneo per manipolare l'HTML
    //         const tempDiv = document.createElement('div');
    //         tempDiv.innerHTML = originalHTML;
            
    //         // Funzione ricorsiva per evidenziare il testo nei nodi
    //         function highlightTextInNode(node) {
    //             if (node.nodeType === Node.TEXT_NODE) {
    //                 // È un nodo di testo, applica l'evidenziazione
    //                 const text = node.textContent;
    //                 const regex = new RegExp('(' + searchTerm + ')', 'gi');
    //                 if (regex.test(text)) {
    //                     const highlightedText = text.replace(regex, '<mark>$1</mark>');
    //                     const span = document.createElement('span');
    //                     span.innerHTML = highlightedText;
                        
    //                     // Sostituisci il nodo di testo con il contenuto evidenziato
    //                     const fragment = document.createDocumentFragment();
    //                     while (span.firstChild) {
    //                         fragment.appendChild(span.firstChild);
    //                     }
    //                     node.parentNode.replaceChild(fragment, node);
    //                 }
    //             } else if (node.nodeType === Node.ELEMENT_NODE) {
    //                 // È un elemento, processa i suoi figli
    //                 const children = Array.from(node.childNodes);
    //                 children.forEach(child => highlightTextInNode(child));
    //             }
    //         }
            
    //         // Applica l'evidenziazione a tutto il contenuto
    //         highlightTextInNode(tempDiv);
            
    //         // Aggiorna la cella con l'HTML modificato
    //         cell.innerHTML = tempDiv.innerHTML;
    //     });
    // }
    
    // Funzione per la ricerca locale (fallback)
    function filterTableLocal() {
        const searchTerm = document.getElementById('${searchId}').value.toLowerCase();
        const tableRows = document.querySelectorAll('tbody tr');
        
        tableRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            let shouldShow = false;
            
            cells.forEach(cell => {
                const cellText = cell.textContent.toLowerCase();
                if (cellText.includes(searchTerm)) {
                    shouldShow = true;
                }
            });
            
            if (shouldShow) {
                row.classList.remove('hidden-row');
            } else {
                row.classList.add('hidden-row');
            }
        });
         highlightSearchTerm(searchTerm);
    }
    
    // Funzione per pulire la ricerca
    function ${clearFunction}() {
        document.getElementById('${searchId}').value = '';
        
        // Ricarica la pagina per mostrare tutti i dati
        window.location.reload();
    }
    
    // Rendi le funzioni globali per essere accessibili dall'HTML
    window.${clearFunction} = ${clearFunction};
    window.filterTable = filterTable;
    
    // Aggiungi event listener per la ricerca in tempo reale
    const searchInput = document.getElementById('${searchId}');
    if (searchInput) {
        searchInput.addEventListener('input', filterTable);
    }
  `;
}
exports.generateSearchScript = generateSearchScript;
function resetDatabaseScript(btnid, resetFunction) {
    return `
       function ${resetFunction}() {
          if (!confirm('⚠️ Sei sicuro di voler azzerare TUTTO il database? Questa operazione è IRREVERSIBILE!')) return;
          const btn = document.getElementById("${btnid}");
          btn.disabled = true;
          btn.textContent = 'Azzero...';
          fetch('/api/reset-db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              alert('Database azzerato con successo!');
              location.reload();
            } else {
              alert('Errore: ' + (data.message || 'Impossibile azzerare il database.'));
              btn.disabled = false;
              btn.textContent = 'Azzera Database';
            }
          })
          .catch(error => {
            alert('Errore: ' + error);
            btn.disabled = false;
            btn.textContent = 'Azzera Database';
          });
        }
        window.${resetFunction} = ${resetFunction};
    `;
}
exports.resetDatabaseScript = resetDatabaseScript;
// Funzione per generare i controlli di data per il filtro
function generateDateRangeControls(startDateId = 'startDate', endDateId = 'endDate', applyFunction = 'applyDateFilter', filterIndicatorHtml = '') {
    return `
    <div class="date-range-controls">
      <div class="date-fields-and-indicator">
        <div class="date-fields-col">
          <div class="date-input-group">
            <label for="${startDateId}">📅 Data Inizio:</label>
            <input type="date" id="${startDateId}" class="date-input" placeholder="Seleziona data inizio">
          </div>
          <div class="date-input-group">
            <label for="${endDateId}">📅 Data Fine:</label>
            <input type="date" id="${endDateId}" class="date-input" placeholder="Seleziona data fine">
          </div>
        </div>
        <div class="filter-indicator-right">
          ${filterIndicatorHtml}
        </div>
      </div>
      <div class="date-buttons">
        <button onclick="${applyFunction}()" class="apply-btn">🔍 Applica Filtro</button>
        <button onclick="clearDateFilter()" class="clear-btn">❌ Rimuovi Filtro</button>
        <button onclick="setDateRange('today')" class="quick-btn">Oggi</button>
        <button onclick="setDateRange('yesterday')" class="quick-btn">Ieri</button>
        <button onclick="setDateRange('lastWeek')" class="quick-btn">Ultima Settimana</button>
        <button onclick="setDateRange('lastMonth')" class="quick-btn">Ultimo Mese</button>
        <button onclick="setDateRange('all')" class="quick-btn">Tutto</button>
      </div>
    </div>
  `;
}
exports.generateDateRangeControls = generateDateRangeControls;
// Funzione per generare il JavaScript per i controlli di data
function generateDateRangeScript(startDateId = 'startDate', endDateId = 'endDate', applyFunction = 'applyDateFilter') {
    return `
    // Funzioni per la gestione dei filtri di data
    window.${applyFunction} = function() {
      const startDate = document.getElementById('${startDateId}').value;
      const endDate = document.getElementById('${endDateId}').value;
      
      if (!startDate || !endDate) {
        alert('⚠️ Seleziona sia la data di inizio che quella di fine!');
        return;
      }
      
      if (startDate > endDate) {
        alert('⚠️ La data di inizio non può essere successiva alla data di fine!');
        return;
      }
      
      // Costruisci l'URL con i parametri del filtro
      const url = new URL(window.location);
      url.searchParams.set('startDate', startDate);
      url.searchParams.set('endDate', endDate);
      url.searchParams.set('page', '1'); // Torna alla prima pagina
      
      // Reindirizza alla pagina con i filtri applicati
      window.location.href = url.toString();
    };
    
    window.setDateRange = function(range) {
      const startDateInput = document.getElementById('${startDateId}');
      const endDateInput = document.getElementById('${endDateId}');
      const today = new Date();
      
      // Controlla se ci sono già filtri attivi nell'URL
      const url = new URL(window.location);
      const hasActiveFilters = url.searchParams.has('startDate') || url.searchParams.has('endDate');
      
      switch(range) {
        case 'today':
          const todayStr = today.toISOString().split('T')[0];
          startDateInput.value = todayStr;
          endDateInput.value = todayStr;
          break;
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          startDateInput.value = yesterdayStr;
          endDateInput.value = yesterdayStr;
          break;
        case 'lastWeek':
          const lastWeek = new Date(today);
          lastWeek.setDate(lastWeek.getDate() - 7);
          const lastWeekStr = lastWeek.toISOString().split('T')[0];
          const todayStr2 = today.toISOString().split('T')[0];
          startDateInput.value = lastWeekStr;
          endDateInput.value = todayStr2;
          break;
        case 'lastMonth':
          const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
          const lastMonthStr = lastMonth.toISOString().split('T')[0];
          const todayStr3 = today.toISOString().split('T')[0];
          startDateInput.value = lastMonthStr;
          endDateInput.value = todayStr3;
          break;
        case 'all':
          startDateInput.value = '';
          endDateInput.value = '';
          // Rimuovi i parametri delle date dall'URL e ricarica
          url.searchParams.delete('startDate');
          url.searchParams.delete('endDate');
          url.searchParams.set('page', '1'); // Torna alla prima pagina
          window.location.href = url.toString();
          return; // Esci dalla funzione per non applicare il filtro
          break;
      }
      
      // Applica automaticamente il filtro per tutti i range predefiniti (tranne "all")
      if (range !== 'all') {
        ${applyFunction}();
      }
    };
    
    window.clearDateFilter = function() {
      const startDateInput = document.getElementById('${startDateId}');
      const endDateInput = document.getElementById('${endDateId}');
      startDateInput.value = '';
      endDateInput.value = '';
      
      // Aggiorna l'indicatore visivo
      updateFilterIndicator();
      
      // Rimuovi i parametri delle date dall'URL prima di ricaricare
      const url = new URL(window.location);
      url.searchParams.delete('startDate');
      url.searchParams.delete('endDate');
      url.searchParams.set('page', '1'); // Torna alla prima pagina
      
      // Reindirizza alla pagina senza i parametri delle date
      window.location.href = url.toString();
    };
    
    // Funzione per validare le date
    function validateDateRange() {
      const startDate = document.getElementById('${startDateId}').value;
      const endDate = document.getElementById('${endDateId}').value;
      
      if (startDate && endDate && startDate > endDate) {
        alert('⚠️ La data di inizio non può essere successiva alla data di fine!');
        return false;
      }
      
      return true;
    }
    
    // Funzione per aggiornare l'indicatore visivo dei filtri
    function updateFilterIndicator() {
      const url = new URL(window.location);
      const hasActiveFilters = url.searchParams.has('startDate') || url.searchParams.has('endDate');
      
      // Aggiorna il testo del pulsante "Rimuovi Filtro"
      const clearBtn = document.querySelector('.clear-btn');
      if (clearBtn) {
        if (hasActiveFilters) {
          clearBtn.textContent = '❌ Rimuovi Filtro';
          clearBtn.style.background = '#f44336';
          clearBtn.disabled = false;
        } else {
          clearBtn.textContent = '✅ Nessun Filtro';
          clearBtn.style.background = '#4caf50';
          clearBtn.disabled = true;
        }
      }
      
      // Mostra/nascondi messaggio informativo
      let infoMessage = document.querySelector('.filter-status-message');
      if (!infoMessage) {
        infoMessage = document.createElement('div');
        infoMessage.className = 'filter-status-message';
        infoMessage.style.cssText = 'text-align: center; margin: 10px 0; padding: 10px; border-radius: 6px; font-size: 14px;';
        
        const controlsContainer = document.querySelector('.date-range-controls');
        if (controlsContainer) {
          controlsContainer.appendChild(infoMessage);
        }
      }
      
      if (hasActiveFilters) {
        const startDate = url.searchParams.get('startDate');
        const endDate = url.searchParams.get('endDate');
        infoMessage.innerHTML = \`<span style="color: #2196f3;">📅 Filtro attivo: dal \${startDate} al \${endDate}</span>\`;
        infoMessage.style.background = '#e3f2fd';
        infoMessage.style.border = '1px solid #2196f3';
      } else {
        infoMessage.innerHTML = '<span style="color: #4caf50;">✅ Nessun filtro temporale applicato - Mostrando tutti i dati</span>';
        infoMessage.style.background = '#e8f5e8';
        infoMessage.style.border = '1px solid #4caf50';
      }
    }
    
    // Aggiungi validazione agli input di data
    document.addEventListener('DOMContentLoaded', function() {
      const startDateInput = document.getElementById('${startDateId}');
      const endDateInput = document.getElementById('${endDateId}');
      
      if (startDateInput && endDateInput) {
        // Inizializza i controlli con i valori dell'URL se presenti
        const url = new URL(window.location);
        const startDate = url.searchParams.get('startDate');
        const endDate = url.searchParams.get('endDate');
        
        if (startDate) startDateInput.value = startDate;
        if (endDate) endDateInput.value = endDate;
        
        // Aggiorna l'indicatore visivo
        updateFilterIndicator();
        
        // Aggiungi validazione
        startDateInput.addEventListener('change', validateDateRange);
        endDateInput.addEventListener('change', validateDateRange);
      }
    });
  `;
}
exports.generateDateRangeScript = generateDateRangeScript;
// Funzione per generare la sezione di ricerca con filtri di data
function generateSearchSectionWithDateFilter(searchId, placeholder, clearFunction, startDateId = 'startDate', endDateId = 'endDate', applyFunction = 'applyDateFilter') {
    return `
    <div class="search-section-with-dates">
      <div class="search-row">
        <div class="search-input-group">
          <input type="text" id="${searchId}" placeholder="${placeholder}" class="search-input">
          <button onclick="${clearFunction}()" class="clear-btn">❌</button>
        </div>
        ${generateDateRangeControls(startDateId, endDateId, applyFunction)}
      </div>
    </div>
  `;
}
exports.generateSearchSectionWithDateFilter = generateSearchSectionWithDateFilter;
// Funzione per formattare una data in formato italiano (YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY -> DD/MM/YYYY)
function formatDateIta(dateString) {
    if (!dateString)
        return '';
    // Gestione formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }
    // Gestione formato DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
        const [day, month, year] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }
    // Gestione formato DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        return dateString;
    }
    // Fallback: restituisci la stringa originale
    return dateString;
}
exports.formatDateIta = formatDateIta;
// Componente centralizzato per l'indicatore filtro date
function generateDateFilterIndicator(startDate, endDate) {
    if (startDate && endDate) {
        return `
      <div class="filter-info">
        <p>📅 Filtro Date Applicato </p>
        <p>Periodo: Dal <strong>${formatDateIta(startDate)}</strong> al <strong>${formatDateIta(endDate)}</strong></p>
        <p><em>I dati mostrati si riferiscono solo a questo intervallo temporale</em></p>
      </div>
    `;
    }
    return '';
}
exports.generateDateFilterIndicator = generateDateFilterIndicator;
