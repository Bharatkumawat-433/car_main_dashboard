document.addEventListener('DOMContentLoaded', () => {
    // Check if db is defined
    if (typeof db === 'undefined') {
        console.error("Firestore (db) is not initialized.");
        document.getElementById('reportTitle').innerText = "Application Config Error.";
        return;
    }

    // UI elements
    const reportNavList = document.getElementById('reportNavList');
    const reportTitle = document.getElementById('reportTitle');
    const reportPlaceholder = document.getElementById('reportPlaceholder');
    const reportLoader = document.getElementById('reportLoader');
    const reportMessage = document.getElementById('reportMessage');
    const invoiceListContainer = document.getElementById('invoiceListContainer');
    const invoiceListTableBody = document.getElementById('invoiceListTableBody');

    // Data storage
    let reportsData = {}; // Format: { "2025": { "7": { totalInvoices: 2, invoices: [...] } } }
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    // Start loading data
    loadAllInvoices();

    async function loadAllInvoices() {
        showLoader("Loading invoice data...");

        reportsData = {}; // Reset data

        try {
            // Hum createdAt se hi sort karenge taaki naye *bane* hue invoices list mein oopar dikhein
            // Lekin group karne ke liye invoiceDate ka istemaal karenge
            const querySnapshot = await db.collection("invoices").orderBy("createdAt", "desc").get();

            if (querySnapshot.empty) {
                showEmpty("No invoices found in the database.");
                return;
            }

            // Process all invoices into the reportsData object
            querySnapshot.forEach(doc => {
                const invoice = doc.data();
                let year, month; // Year aur Month ke liye variables
                
                // =============================================
                // YEH HAI NAYA LOGIC (BUG FIX)
                // =============================================
                // Pehle 'invoiceDate' (jo aapne type ki hai) se Year/Month nikaalne ki koshish karo
                if (invoice.invoiceDate && invoice.invoiceDate.includes('/')) {
                    // Format hai "DD/MM/YYYY"
                    const parts = invoice.invoiceDate.split('/'); // Jaise ["01", "08", "2025"]
                    if (parts.length === 3) {
                        year = parts[2]; // "2025"
                        month = parseInt(parts[1], 10) - 1; // '08' -> 8 -> 7 (August ke liye index 7)
                    }
                }

                // Agar 'invoiceDate' field kharaab hai ya nahi hai, toh fallback ke liye 'createdAt' ka istemaal karo
                if (typeof year === 'undefined' || typeof month === 'undefined') {
                    const createdAt = invoice.createdAt?.toDate(); 
                    if (createdAt) {
                        year = createdAt.getFullYear().toString();
                        month = createdAt.getMonth(); // 0-11
                    }
                }
                // =============================================
                // END OF BUG FIX
                // =============================================

                // Agar year/month sahi se mila hai tabhi aage badho
                if (typeof year !== 'undefined' && typeof month !== 'undefined') {
                    
                    // Year level
                    if (!reportsData[year]) {
                        reportsData[year] = {};
                    }
                    // Month level
                    if (!reportsData[year][month]) {
                        reportsData[year][month] = {
                            totalInvoices: 0,
                            invoices: []
                        };
                    }

                    // Add invoice to data
                    reportsData[year][month].totalInvoices++;
                    reportsData[year][month].invoices.push({
                        date: invoice.invoiceDate || 'N/A',
                        invoiceNo: invoice.invoiceNo || doc.id,
                        clientName: invoice.clientName || 'N/A',
                        clientPhone: invoice.clientPhone || 'N/A',
                        pdfUrl: invoice.pdfUrl || '#'
                    });
                }
            });

            renderReportNav();
            hideLoader();
            
        } catch (error) {
            console.error("Error loading all invoices: ", error);
            showEmpty("Error loading reports.");
        }
    }

    function renderReportNav() {
        reportNavList.innerHTML = '';
        const years = Object.keys(reportsData).sort((a, b) => b - a); // Naye saal oopar

        if (years.length === 0) {
             showEmpty("No data to display.");
             return;
        }

        years.forEach(year => {
            // 1. Create Year LI
            const yearLi = document.createElement('li');
            yearLi.className = 'year-item';
            
            // 2. Create Year Label (clickable)
            const yearLabel = document.createElement('div');
            yearLabel.className = 'year-label';
            yearLabel.innerHTML = `
                <span>${year}</span>
                <span class="year-arrow">▶</span>
            `;
            yearLabel.addEventListener('click', (e) => {
                yearLi.classList.toggle('expanded');
                const allYearLabels = reportNavList.querySelectorAll('.year-label');
                allYearLabels.forEach(label => label.style.fontWeight = '600'); 
                e.currentTarget.style.fontWeight = '700';
            });
            
            // 3. Create nested Month UL
            const monthUl = document.createElement('ul');
            monthUl.className = 'month-list-nested';
            
            const yearData = reportsData[year];
            // Ab humein month ko 0-11 index se sort karna hai
            const months = Object.keys(yearData).sort((a, b) => b - a); // Naye mahine oopar (11, 10, 9...)

            if (months.length > 0) {
                months.forEach(monthIndex => {
                    const monthData = yearData[monthIndex];
                    const monthLi = document.createElement('li');
                    monthLi.className = 'month-item';
                    monthLi.dataset.year = year;
                    monthLi.dataset.month = monthIndex;
                    monthLi.innerHTML = `
                        <span>${monthNames[monthIndex]}</span>
                        <span class="invoice-count">${monthData.totalInvoices}</span>
                    `;
                    
                    // Month click listener
                    monthLi.addEventListener('click', (e) => {
                        reportNavList.querySelectorAll('.month-item').forEach(li => li.classList.remove('active'));
                        e.currentTarget.classList.add('active');
                        
                        const invoices = reportsData[year][monthIndex].invoices;
                        renderInvoiceList(invoices, year, monthIndex);
                    });
                    
                    monthUl.appendChild(monthLi);
                });
            }

            // Append all parts
            yearLi.appendChild(yearLabel);
            yearLi.appendChild(monthUl);
            reportNavList.appendChild(yearLi);
        });
    }


    function renderInvoiceList(invoices, year, month) {
        invoiceListTableBody.innerHTML = ''; // Clear table
        
        if (!invoices || invoices.length === 0) {
            showEmpty("No invoices found for this period.");
            return;
        }

        hideLoader(); // Hide placeholder
        invoiceListContainer.style.display = 'block'; // Show table
        reportTitle.innerText = `Invoices for ${monthNames[month]} ${year}`;

        // Invoices ko date ke hisaab se sort karein (taaki 05/08, 02/08 se pehle aaye)
        // Hum 'date' (DD/MM/YYYY) string ko parse karenge
        invoices.sort((a, b) => {
            try {
                const dateA = new Date(a.date.split('/').reverse().join('-')); // YYYY-MM-DD banayein
                const dateB = new Date(b.date.split('/').reverse().join('-'));
                return dateB - dateA; // Nayi date oopar
            } catch(e) {
                return 0; // Agar date format galat hai toh sort na karein
            }
        });

        invoices.forEach(invoice => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${invoice.date}</td>
                <td><b>${invoice.invoiceNo}</b></td>
                <td>${invoice.clientName}</td>
                <td>${invoice.clientPhone}</td>
                <td>
                    <a href="${invoice.pdfUrl}" target="_blank" class="btn-view-pdf">View PDF</a>
                </td>
            `;
            invoiceListTableBody.appendChild(row);
        });
    }

    // --- Helper functions for loading/empty states ---
    function showLoader(message) {
        reportTitle.innerText = "Loading...";
        invoiceListContainer.style.display = 'none';
        reportPlaceholder.style.display = 'block';
        reportLoader.style.display = 'block';
        reportMessage.innerText = message;
    }
    
    function hideLoader() {
        reportPlaceholder.style.display = 'none';
        reportLoader.style.display = 'none';
    }

    function showEmpty(message) {
        reportTitle.innerText = "Reports";
        invoiceListContainer.style.display = 'none';
        reportPlaceholder.style.display = 'block';
        reportLoader.style.display = 'none';
        reportMessage.innerText = message;
    }
});


