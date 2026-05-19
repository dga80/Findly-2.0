alert("SCRIPT CARGADO - Si ves esto, app.js funciona");
let searchResults = { inventario: [], sonepar: [], sti: [], addedStock: [], of_company: { name: '', data: [] }, others: [] };
let selectedFile = null;
let addedStockFile = null;
let currentInputData = [];
let currentAddedStockData = [];

// Tab logic — "Subir Excel" activo por defecto
document.getElementById('manualTab').addEventListener('click', () => {
    document.getElementById('manualTab').classList.add('active');
    document.getElementById('uploadTab').classList.remove('active');
    document.getElementById('manualInputContainer').classList.remove('hidden');
    document.getElementById('uploadInputContainer').classList.add('hidden');
});

document.getElementById('uploadTab').addEventListener('click', () => {
    document.getElementById('uploadTab').classList.add('active');
    document.getElementById('manualTab').classList.remove('active');
    document.getElementById('uploadInputContainer').classList.remove('hidden');
    document.getElementById('manualInputContainer').classList.add('hidden');
});

// File upload logic
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileNameSpan = fileInfo.querySelector('.file-name');

dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

function handleFile(file) {
    selectedFile = file;
    fileNameSpan.textContent = file.name;
    fileInfo.classList.remove('hidden');
}

document.getElementById('clearFile').addEventListener('click', (e) => {
    e.stopPropagation();
    selectedFile = null;
    fileInput.value = '';
    fileInfo.classList.add('hidden');
});

// Stock Dinámico upload logic
const addedStockDropZone = document.getElementById('addedStockDropZone');
const addedStockInput = document.getElementById('addedStockInput');
const addedStockInfo = document.getElementById('addedStockInfo');
const addedStockFileNameSpan = addedStockInfo.querySelector('.file-name');

addedStockDropZone.addEventListener('click', () => addedStockInput.click());

addedStockInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        addedStockFile = e.target.files[0];
        addedStockFileNameSpan.textContent = addedStockFile.name;
        addedStockInfo.classList.remove('hidden');
    }
});

document.getElementById('clearAddedStock').addEventListener('click', (e) => {
    e.stopPropagation();
    addedStockFile = null;
    addedStockInput.value = '';
    addedStockInfo.classList.add('hidden');
    currentAddedStockData = [];
});

// Dynamic OF highlighting and reordering logic
function updateOfUI() {
    try {
        const manualCont = document.getElementById('manualInputContainer');
        const ofCompManual = document.getElementById('ofCompany');
        const ofCompUpload = document.getElementById('ofCompanyUpload');
        
        if (!manualCont || !ofCompManual || !ofCompUpload) return;

        const isManual = !manualCont.classList.contains('hidden');
        const selectedCompany = isManual ? ofCompManual.value : ofCompUpload.value;

        // Sincronizar selectores
        if (isManual) {
            ofCompUpload.value = selectedCompany;
        } else {
            ofCompManual.value = selectedCompany;
        }

        const cards = Array.from(document.querySelectorAll('.result-card'));
        const allCompanies = ['CESA', 'MES', 'AYC', 'LOESS'];
        
        // --- FLIP: FIRST ---
        const firstPositions = new Map();
        cards.forEach(card => {
            firstPositions.set(card.id, card.getBoundingClientRect());
        });

        // --- ACCIÓN: Cambiar el estado del DOM ---
        const invCard = document.getElementById('card-Cerdanya');
        if (invCard) invCard.style.order = "1";

        allCompanies.forEach((name, index) => {
            const card = document.getElementById(`card-${name}`);
            if (!card) return;
            
            card.classList.remove('of-card');
            
            if (name === selectedCompany) {
                card.classList.add('of-card');
                // Solo actualizar si el contenido ha cambiado para evitar flashes de animación
                const newTitle = `Stock ${name} <span class="of-badge">Prioridad OF</span>`;
                if (card.querySelector('h2').innerHTML !== newTitle) {
                    card.querySelector('h2').innerHTML = newTitle;
                }
                card.style.order = "2"; 
            } else {
                const newTitle = `Stock ${name}`;
                if (card.querySelector('h2').textContent !== newTitle) {
                    card.querySelector('h2').textContent = newTitle;
                }
                card.style.order = (10 + index).toString();
            }
        });

        const ids = {
            'card-Sonepar': "50",
            'card-STI': "51",
            'card-Dinamico': "52"
        };
        
        for (const [id, order] of Object.entries(ids)) {
            const card = document.getElementById(id);
            if (card) card.style.order = order;
        }

        // --- FLIP: LAST, INVERT, PLAY ---
        requestAnimationFrame(() => {
            cards.forEach(card => {
                const firstRect = firstPositions.get(card.id);
                const lastRect = card.getBoundingClientRect();
                
                const dx = firstRect.left - lastRect.left;
                const dy = firstRect.top - lastRect.top;

                if (dx !== 0 || dy !== 0) {
                    // Invertir: moverlo a la posición inicial instantáneamente
                    card.style.transition = 'none';
                    card.style.transform = `translate(${dx}px, ${dy}px) ${card.classList.contains('of-card') ? 'scale(1.02)' : 'scale(1)'}`;
                    
                    // Forzar reflow
                    card.offsetHeight;

                    // Play: permitir que la transición CSS lo devuelva a su posición natural
                    card.style.transition = '';
                    card.style.transform = '';
                }
            });
        });

    } catch (e) {
        console.error("Error updating UI:", e);
    }
}

document.getElementById('ofCompany').addEventListener('change', updateOfUI);
document.getElementById('ofCompanyUpload').addEventListener('change', updateOfUI);

// Ejecutar inmediatamente y en varios eventos para asegurar persistencia
updateOfUI(); 
setTimeout(updateOfUI, 100);
setTimeout(updateOfUI, 500);

document.addEventListener('DOMContentLoaded', updateOfUI);
window.addEventListener('load', updateOfUI);

document.getElementById('manualTab').addEventListener('click', () => {
    setTimeout(updateOfUI, 10);
});
document.getElementById('uploadTab').addEventListener('click', () => {
    setTimeout(updateOfUI, 10);
});

// Diagnóstico
document.getElementById('diagBtn').addEventListener('click', () => {
    try {
        const results = [];
        results.push("Script: OK");
        results.push("Cerdanya: " + (document.getElementById('card-Cerdanya') ? "OK" : "MISSING"));
        results.push("CESA: " + (document.getElementById('card-CESA') ? "OK" : "MISSING"));
        results.push("Dinamico: " + (document.getElementById('card-Dinamico') ? "OK" : "MISSING"));
        results.push("Manual Selector: " + (document.getElementById('ofCompany') ? "OK" : "MISSING"));
        
        alert("DIAGNÓSTICO:\n" + results.join("\n"));
        updateOfUI(); // Forzar actualización al pulsar el botón
    } catch (e) {
        alert("Error en diagnóstico: " + e.message);
    }
});

// Search Logic
document.getElementById('searchBtn').addEventListener('click', async () => {
    let references = [];
    const isManual = !document.getElementById('manualInputContainer').classList.contains('hidden');

    const btn = document.getElementById('searchBtn');
    btn.textContent = "Procesando...";
    btn.disabled = true;
    document.body.classList.add('loading');

    try {
        if (isManual) {
            const text = document.getElementById('refInput').value;
            const refs = text.split('\n').map(r => r.trim()).filter(r => r !== "");
            if (refs.length === 0) throw new Error("Introduce referencias");
            currentInputData = refs.map(r => ({ reference: r, quantity: 1 }));
            references = refs;
        } else {
            if (!selectedFile) throw new Error("Selecciona un archivo");

            const formData = new FormData();
            formData.append('file', selectedFile);

            const uploadRes = await fetch('http://localhost:5000/upload', {
                method: 'POST',
                body: formData
            });

            if (!uploadRes.ok) {
                const err = await uploadRes.json();
                throw new Error(err.error || 'Error al subir archivo');
            }

            currentInputData = await uploadRes.json();
            references = currentInputData;
        }

        const ofCompany = !document.getElementById('manualInputContainer').classList.contains('hidden') 
            ? document.getElementById('ofCompany').value 
            : document.getElementById('ofCompanyUpload').value;

        // Subir Stock Dinámico si existe
        if (addedStockFile) {
            const formDataAdded = new FormData();
            formDataAdded.append('file', addedStockFile);
            const uploadAddedRes = await fetch('http://localhost:5000/upload', {
                method: 'POST',
                body: formDataAdded
            });
            if (uploadAddedRes.ok) {
                currentAddedStockData = await uploadAddedRes.json();
            }
        } else {
            currentAddedStockData = [];
        }

        const response = await fetch('http://localhost:5000/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                references,
                addedStock: currentAddedStockData,
                of_company: ofCompany
            })
        });

        if (!response.ok) throw new Error('Error en la búsqueda');

        searchResults = await response.json();
        renderTables();

        const hasResults = (
            (searchResults.inventario && searchResults.inventario.length > 0) ||
            (searchResults.sonepar && searchResults.sonepar.length > 0) ||
            (searchResults.sti && searchResults.sti.length > 0)
        );

        document.getElementById('exportStockBtn').disabled = !hasResults;
        document.getElementById('exportPdfBtn').disabled = !hasResults;

    } catch (error) {
        console.error(error);
        alert(error.message || "Ocurrió un error.");
    } finally {
        btn.textContent = "Buscar Stock";
        btn.disabled = false;
        document.body.classList.remove('loading');
    }
});

function renderTables() {
    const invTableBody = document.querySelector('#invTable tbody');
    const sonTableBody = document.querySelector('#sonTable tbody');
    const stiTableBody = document.querySelector('#stiTable tbody');
    const dynamicTableBody = document.querySelector('#dynamicTable tbody');

    const updateHeaders = (tableId) => {
        const table = document.getElementById(tableId);
        if (!table) return;
        const thead = table.querySelector('thead tr');
        if (thead && !thead.querySelector('.encargo-header')) {
            const th = document.createElement('th');
            th.className = 'encargo-header';
            th.textContent = 'Cant. Encargo';
            thead.appendChild(th);
        }
    };

    ['invTable', 'sonTable', 'dynamicTable', 'table-CESA', 'table-MES', 'table-AYC', 'table-LOESS'].forEach(updateHeaders);

    // Recolectar todas las referencias encontradas para el resaltado
    const allFoundRefs = new Map(); // Ref -> Count

    const countRef = (ref) => {
        const r = String(ref).trim().toUpperCase();
        allFoundRefs.set(r, (allFoundRefs.get(r) || 0) + 1);
    };

    (searchResults.inventario || []).forEach(item => countRef(item.Referencia));
    if (searchResults.of_company && searchResults.of_company.data) {
        searchResults.of_company.data.forEach(item => countRef(item.Referencia));
    }
    (searchResults.sonepar || []).forEach(item => countRef(item.Referencia));
    (searchResults.sti || []).forEach(ref => countRef(ref));
    (searchResults.addedStock || []).forEach(item => countRef(item.Referencia));
    (searchResults.others || []).forEach(comp => {
        comp.data.forEach(item => countRef(item.Referencia));
    });

    const isCommon = (ref) => allFoundRefs.get(String(ref).trim().toUpperCase()) > 1;

    // Renderizar Inventario Cerdanya
    invTableBody.innerHTML = (searchResults.inventario || []).length > 0
        ? searchResults.inventario.map(item => `
            <tr>
                <td>${item.Referencia}</td>
                <td>${item.Ubicacion || '-'}</td>
                <td><span class="${isCommon(item.Referencia) ? 'common-stock-badge' : ''}">${item.Cantidad}</span></td>
                <td><span class="cant-encargo">${item.CantEncargo || '-'}</span></td>
            </tr>
        `).join('')
        : '<tr><td colspan="4" style="text-align:center">No se encontraron resultados</td></tr>';

    // Función para renderizar una empresa específica
    const renderCompany = (name, data) => {
        const tableBody = document.querySelector(`#table-${name} tbody`);
        if (!tableBody) return;
        tableBody.innerHTML = (data || []).length > 0
            ? data.map(item => `
                <tr>
                    <td>${item.Referencia}</td>
                    <td>${item.Empresa || '-'}</td>
                    <td><span class="${isCommon(item.Referencia) ? 'common-stock-badge' : ''}">${item.Cantidad}</span></td>
                    <td><span class="cant-encargo">${item.CantEncargo || '-'}</span></td>
                </tr>
            `).join('')
            : '<tr><td colspan="4" style="text-align:center">Sin stock en esta empresa</td></tr>';
    };

    // Renderizar todas las empresas
    const allCompanies = ['CESA', 'MES', 'AYC', 'LOESS'];
    allCompanies.forEach(name => {
        let data = [];
        if (searchResults.of_company && searchResults.of_company.name === name) {
            data = searchResults.of_company.data;
        } else {
            const otherComp = (searchResults.others || []).find(c => c.name === name);
            if (otherComp) data = otherComp.data;
        }
        renderCompany(name, data);
    });

    updateOfUI(); // Asegurar que el resaltado y orden se mantengan tras el renderizado

    // Renderizar Stock Sonepar
    sonTableBody.innerHTML = (searchResults.sonepar || []).length > 0
        ? searchResults.sonepar.map(item => `
            <tr>
                <td>${item.Referencia}</td>
                <td>${item.Empresa || '-'}</td>
                <td><span class="${isCommon(item.Referencia) ? 'common-stock-badge' : ''}">${item.Cantidad}</span></td>
                <td><span class="cant-encargo">${item.CantEncargo || '-'}</span></td>
            </tr>
        `).join('')
        : '<tr><td colspan="4" style="text-align:center">No se encontraron resultados</td></tr>';

    // Renderizar Stock STI
    const stiTableBody = document.querySelector('#stiTable tbody');
    const stiSet = new Set((searchResults.sti || []).map(r => String(r).trim().toUpperCase()));
    const allInputRefs = [...new Set(currentInputData.map(item => String(item.reference || item).trim()))];
    const stiRows = allInputRefs.filter(ref => stiSet.has(ref.toUpperCase()));

    stiTableBody.innerHTML = stiRows.length > 0
        ? stiRows.map(ref => `
            <tr>
                <td><span class="${isCommon(ref) ? 'common-stock-badge' : ''}">${ref}</span></td>
                <td><span class="sti-badge">✔ Disponible</span></td>
            </tr>
        `).join('')
        : '<tr><td colspan="2" style="text-align:center">Sin coincidencias en STI</td></tr>';

    // Renderizar Stock Dinámico
    dynamicTableBody.innerHTML = (searchResults.addedStock || []).length > 0
        ? searchResults.addedStock.map(item => `
            <tr>
                <td><span class="${isCommon(item.Referencia) ? 'common-stock-badge' : ''}">${item.Referencia}</span></td>
                <td><span class="${isCommon(item.Referencia) ? 'common-stock-badge' : ''}">${item.Cantidad}</span></td>
                <td><span class="cant-encargo">${item.CantEncargo || '-'}</span></td>
            </tr>
        `).join('')
        : '<tr><td colspan="3" style="text-align:center">Sin coincidencias en Stock Dinámico</td></tr>';
}

// Exports logic
document.getElementById('exportStockBtn').addEventListener('click', () => {
    const wb = XLSX.utils.book_new();
    if (searchResults.inventario.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(searchResults.inventario), "Inventario Cerdanya");
    }
    if (searchResults.of_company && searchResults.of_company.data.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(searchResults.of_company.data), `Stock ${searchResults.of_company.name} (OF)`);
    }
    if (searchResults.others) {
        searchResults.others.forEach(comp => {
            if (comp.data.length > 0) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(comp.data), `Stock ${comp.name}`);
            }
        });
    }
    if (searchResults.sonepar.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(searchResults.sonepar), "Stock Sonepar");
    }
    if ((searchResults.sti || []).length > 0) {
        const stiExport = searchResults.sti.map(ref => ({ Referencia: ref, 'En STI': 'Sí' }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stiExport), "Stock STI");
    }
    if (searchResults.addedStock.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(searchResults.addedStock), "Stock Dinámico");
    }

    let fileName = "Findly_Stock.xlsx";
    if (selectedFile) {
        const baseName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.'));
        fileName = `${baseName} STOCK.xlsx`;
    }
    XLSX.writeFile(wb, fileName);
});

document.getElementById('exportPdfBtn').addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    const primaryColor = [30, 41, 59];
    const accentColor = [37, 99, 235];
    const highlightColor = [224, 231, 255];
    const highlightTextColor = [30, 58, 138];

    const allFoundRefs = new Set();
    const duplicateRefs = new Set();
    
    const trackRefs = (data) => {
        (data || []).forEach(item => {
            const ref = String(item.Referencia || item).trim().toUpperCase();
            if (allFoundRefs.has(ref)) duplicateRefs.add(ref);
            else allFoundRefs.add(ref);
        });
    };

    trackRefs(searchResults.inventario);
    if (searchResults.of_company) trackRefs(searchResults.of_company.data);
    (searchResults.others || []).forEach(c => trackRefs(c.data));
    trackRefs(searchResults.sonepar);
    trackRefs(searchResults.sti);
    trackRefs(searchResults.addedStock);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    let titleName = selectedFile ? selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) : "Manual";
    doc.text(`${titleName} / Informe de Stock`, 10, 15);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    const dateStr = new Date().toLocaleString('es-ES', { 
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
    doc.text(`Generado: ${dateStr}`, 10, 20);
    
    doc.setDrawColor(...accentColor);
    doc.setLineWidth(0.4);
    doc.line(10, 23, pageWidth - 10, 23);

    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...highlightTextColor);
    doc.text("* Filas en azul: Referencia encontrada en múltiples stocks.", 10, 28);

    let currentY = 35;
    const paddingX = 10;
    const colWidth = 65;
    const gap = 5;

    const renderTable = (title, data, x, y, width, color = primaryColor, isSti = false, isCerdanya = false) => {
        doc.setFontSize(10);
        doc.setTextColor(...color);
        doc.text(title, x, y - 2);

        let headHeaders = [['Ref', 'Stock', 'Enc', 'Obs']];
        let bodyRows = (data || []).map(item => [item.Referencia, item.Cantidad, item.CantEncargo || '-', '']);

        if (isSti) {
            headHeaders = [['Ref']];
            bodyRows = (data || []).map(ref => [ref]);
        } else if (isCerdanya) {
            headHeaders = [['Ref', 'Ubi', 'Stock', 'Enc', 'Obs']];
            bodyRows = (data || []).map(item => [item.Referencia, item.Ubicacion || '-', item.Cantidad, item.CantEncargo || '-', '']);
        }

        doc.autoTable({
            startY: y,
            margin: { left: x },
            tableWidth: width,
            head: headHeaders,
            body: bodyRows,
            theme: 'grid',
            headStyles: { fillColor: color, textColor: 255, fontSize: 7, cellPadding: 1 },
            styles: { fontSize: 6.5, cellPadding: 0.8 },
            didParseCell: (cellData) => {
                if (cellData.section === 'body' && cellData.row.raw) {
                    const ref = String(cellData.row.raw[0]).trim().toUpperCase();
                    if (!isSti && duplicateRefs.has(ref)) {
                        cellData.cell.styles.fillColor = highlightColor;
                        cellData.cell.styles.textColor = highlightTextColor;
                        cellData.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });
        return doc.lastAutoTable.finalY + 10;
    };

    let nextY = currentY;
    let maxY = nextY;

    maxY = Math.max(maxY, renderTable("Inventario Cerdanya", searchResults.inventario, paddingX, nextY, colWidth, primaryColor, false, true));
    if (searchResults.of_company && searchResults.of_company.name) {
        maxY = Math.max(maxY, renderTable(`Stock ${searchResults.of_company.name} (OF)`, searchResults.of_company.data, paddingX + colWidth + gap, nextY, colWidth, accentColor));
    }
    maxY = Math.max(maxY, renderTable("Stock Sonepar", searchResults.sonepar, paddingX + (colWidth + gap) * 2, nextY, colWidth, [15, 118, 110]));
    maxY = Math.max(maxY, renderTable("Stock STI", searchResults.sti, paddingX + (colWidth + gap) * 3, nextY, 30, [21, 128, 61], true));

    currentY = maxY;
    nextY = currentY;
    let currentX = paddingX;

    (searchResults.others || []).forEach((comp) => {
        if (currentX + colWidth > pageWidth - paddingX) {
            currentX = paddingX;
            nextY = maxY;
        }
        let tableY = renderTable(`Stock ${comp.name}`, comp.data, currentX, nextY, colWidth, [100, 100, 100]);
        maxY = Math.max(maxY, tableY);
        currentX += colWidth + gap;
    });

    if (currentX + colWidth > pageWidth - paddingX) {
        currentX = paddingX;
        nextY = maxY;
    }
    renderTable("Stock Dinámico", searchResults.addedStock, currentX, nextY, colWidth, [3, 105, 161]);

    let fileName = selectedFile 
        ? `${selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.'))}_STOCK.pdf` 
        : "Informe_Stock.pdf";
    doc.save(fileName);
});
