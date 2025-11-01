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




// document.addEventListener('DOMContentLoaded', () => {
//     // Check if db is defined
//     if (typeof db === 'undefined') {
//         console.error("Firestore (db) is not initialized.");
//         document.getElementById('reportTitle').innerText = "Application Config Error.";
//         return;
//     }

//     // UI elements
//     const reportNavList = document.getElementById('reportNavList');
//     const reportTitle = document.getElementById('reportTitle');
//     const reportPlaceholder = document.getElementById('reportPlaceholder');
//     const reportLoader = document.getElementById('reportLoader');
//     const reportMessage = document.getElementById('reportMessage');
//     const invoiceListContainer = document.getElementById('invoiceListContainer');
//     const invoiceListTableBody = document.getElementById('invoiceListTableBody');

//     // Data storage
//     let reportsData = {}; // Format: { "2025": { "10": { totalInvoices: 2, invoices: [...] } } }
//     const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

//     // Start loading data
//     loadAllInvoices();

//     async function loadAllInvoices() {
//         showLoader("Loading invoice data...");

//         reportsData = {}; // Reset data

//         try {
//             const querySnapshot = await db.collection("invoices").orderBy("createdAt", "desc").get();

//             if (querySnapshot.empty) {
//                 showEmpty("No invoices found in the database.");
//                 return;
//             }

//             // Process all invoices into the reportsData object
//             querySnapshot.forEach(doc => {
//                 const invoice = doc.data();
//                 const createdAt = invoice.createdAt?.toDate(); // Firestore timestamp ko Date object mein convert karein

//                 if (createdAt) {
//                     const year = createdAt.getFullYear().toString();
//                     const month = createdAt.getMonth(); // 0-11

//                     // Year level
//                     if (!reportsData[year]) {
//                         reportsData[year] = {};
//                     }
//                     // Month level
//                     if (!reportsData[year][month]) {
//                         reportsData[year][month] = {
//                             totalInvoices: 0,
//                             invoices: []
//                         };
//                     }

//                     // Add invoice to data
//                     reportsData[year][month].totalInvoices++;
//                     reportsData[year][month].invoices.push({
//                         date: invoice.invoiceDate || 'N/A',
//                         invoiceNo: invoice.invoiceNo || doc.id,
//                         clientName: invoice.clientName || 'N/A',
//                         clientPhone: invoice.clientPhone || 'N/A',
//                         pdfUrl: invoice.pdfUrl || '#'
//                     });
//                 }
//             });

//             renderReportNav();
//             hideLoader();
            
//         } catch (error) {
//             console.error("Error loading all invoices: ", error);
//             showEmpty("Error loading reports.");
//         }
//     }

//     function renderReportNav() {
//         reportNavList.innerHTML = '';
//         const years = Object.keys(reportsData).sort((a, b) => b - a); // Naye saal oopar

//         if (years.length === 0) {
//              showEmpty("No data to display.");
//              return;
//         }

//         years.forEach(year => {
//             // 1. Create Year LI
//             const yearLi = document.createElement('li');
//             yearLi.className = 'year-item';
            
//             // 2. Create Year Label (clickable)
//             const yearLabel = document.createElement('div');
//             yearLabel.className = 'year-label';
//             yearLabel.innerHTML = `
//                 <span>${year}</span>
//                 <span class="year-arrow">▶</span>
//             `;
//             yearLabel.addEventListener('click', (e) => {
//                 // Expand/collapse
//                 yearLi.classList.toggle('expanded');
                
//                 // Active state
//                 const allYearLabels = reportNavList.querySelectorAll('.year-label');
//                 allYearLabels.forEach(label => label.style.fontWeight = '600'); // Reset all
//                 e.currentTarget.style.fontWeight = '700'; // Bold active
//             });
            
//             // 3. Create nested Month UL
//             const monthUl = document.createElement('ul');
//             monthUl.className = 'month-list-nested';
            
//             const yearData = reportsData[year];
//             const months = Object.keys(yearData).sort((a, b) => b - a); // Naye mahine oopar (11, 10, 9...)

//             if (months.length > 0) {
//                 months.forEach(monthIndex => {
//                     const monthData = yearData[monthIndex];
//                     const monthLi = document.createElement('li');
//                     monthLi.className = 'month-item';
//                     monthLi.dataset.year = year;
//                     monthLi.dataset.month = monthIndex;
//                     monthLi.innerHTML = `
//                         <span>${monthNames[monthIndex]}</span>
//                         <span class="invoice-count">${monthData.totalInvoices}</span>
//                     `;
                    
//                     // Month click listener
//                     monthLi.addEventListener('click', (e) => {
//                         // Active state
//                         reportNavList.querySelectorAll('.month-item').forEach(li => li.classList.remove('active'));
//                         e.currentTarget.classList.add('active');
                        
//                         // Render invoice list
//                         const invoices = reportsData[year][monthIndex].invoices;
//                         renderInvoiceList(invoices, year, monthIndex);
//                     });
                    
//                     monthUl.appendChild(monthLi);
//                 });
//             }

//             // Append all parts
//             yearLi.appendChild(yearLabel);
//             yearLi.appendChild(monthUl);
//             reportNavList.appendChild(yearLi);
//         });
//     }


//     function renderInvoiceList(invoices, year, month) {
//         invoiceListTableBody.innerHTML = ''; // Clear table
        
//         if (!invoices || invoices.length === 0) {
//             showEmpty("No invoices found for this period.");
//             return;
//         }

//         hideLoader(); // Hide placeholder
//         invoiceListContainer.style.display = 'block'; // Show table
//         reportTitle.innerText = `Invoices for ${monthNames[month]} ${year}`;

//         invoices.forEach(invoice => {
//             const row = document.createElement('tr');
//             row.innerHTML = `
//                 <td>${invoice.date}</td>
//                 <td><b>${invoice.invoiceNo}</b></td>
//                 <td>${invoice.clientName}</td>
//                 <td>${invoice.clientPhone}</td>
//                 <td>
//                     <a href="${invoice.pdfUrl}" target="_blank" class="btn-view-pdf">View PDF</a>
//                 </td>
//             `;
//             invoiceListTableBody.appendChild(row);
//         });
//     }

//     // --- Helper functions for loading/empty states ---
//     function showLoader(message) {
//         reportTitle.innerText = "Loading...";
//         invoiceListContainer.style.display = 'none';
//         reportPlaceholder.style.display = 'block';
//         reportLoader.style.display = 'block';
//         reportMessage.innerText = message;
//     }
    
//     function hideLoader() {
//         reportPlaceholder.style.display = 'none';
//         reportLoader.style.display = 'none';
//     }

//     function showEmpty(message) {
//         reportTitle.innerText = "Reports";
//         invoiceListContainer.style.display = 'none';
//         reportPlaceholder.style.display = 'block';
//         reportLoader.style.display = 'none';
//         reportMessage.innerText = message;
//     }
// });












// document.addEventListener('DOMContentLoaded', () => {
//     // Check if db is defined
//     if (typeof db === 'undefined') {
//         console.error("Firestore (db) is not initialized.");
//         document.getElementById('reportTitle').innerText = "Application Config Error.";
//         return;
//     }

//     // UI elements
//     const yearList = document.getElementById('yearList');
//     const monthList = document.getElementById('monthList');
//     const monthListTitle = document.getElementById('monthListTitle');
//     const reportTitle = document.getElementById('reportTitle');
//     const reportLoader = document.getElementById('reportLoader');
//     const reportEmpty = document.getElementById('reportEmpty');
//     const invoiceListContainer = document.getElementById('invoiceListContainer');
//     const invoiceListTableBody = document.getElementById('invoiceListTableBody');

//     // Data storage
//     let reportsData = {}; // Format: { "2025": { "10": { totalInvoices: 2, invoices: [...] } } }
//     const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

//     // Start loading data
//     loadAllInvoices();

//     async function loadAllInvoices() {
//         reportTitle.style.display = 'none';
//         reportEmpty.style.display = 'none';
//         invoiceListContainer.style.display = 'none';
//         reportLoader.style.display = 'block';

//         reportsData = {}; // Reset data

//         try {
//             const querySnapshot = await db.collection("invoices").orderBy("createdAt", "desc").get();

//             if (querySnapshot.empty) {
//                 reportLoader.style.display = 'none';
//                 reportEmpty.style.display = 'block';
//                 reportEmpty.innerText = "No invoices found in the database.";
//                 return;
//             }

//             // Process all invoices into the reportsData object
//             querySnapshot.forEach(doc => {
//                 const invoice = doc.data();
//                 const createdAt = invoice.createdAt?.toDate(); // Firestore timestamp ko Date object mein convert karein

//                 if (createdAt) {
//                     const year = createdAt.getFullYear().toString();
//                     const month = createdAt.getMonth(); // 0-11

//                     // Year level
//                     if (!reportsData[year]) {
//                         reportsData[year] = {};
//                     }
//                     // Month level
//                     if (!reportsData[year][month]) {
//                         reportsData[year][month] = {
//                             totalInvoices: 0,
//                             invoices: []
//                         };
//                     }

//                     // Add invoice to data
//                     reportsData[year][month].totalInvoices++;
//                     reportsData[year][month].invoices.push({
//                         date: invoice.invoiceDate || 'N/A',
//                         invoiceNo: invoice.invoiceNo || doc.id,
//                         clientName: invoice.clientName || 'N/A',
//                         clientPhone: invoice.clientPhone || 'N/A',
//                         pdfUrl: invoice.pdfUrl || '#'
//                     });
//                 }
//             });

//             renderYears();
//             reportLoader.style.display = 'none';
//             reportTitle.style.display = 'block';
            
//         } catch (error) {
//             console.error("Error loading all invoices: ", error);
//             reportLoader.style.display = 'none';
//             reportTitle.style.display = 'block';
//             reportTitle.innerText = "Error loading reports.";
//         }
//     }

//     function renderYears() {
//         yearList.innerHTML = '';
//         const years = Object.keys(reportsData).sort((a, b) => b - a); // Naye saal oopar

//         if (years.length === 0) {
//              reportTitle.style.display = 'none';
//              reportEmpty.style.display = 'block';
//              reportEmpty.innerText = "No data to display.";
//              return;
//         }

//         years.forEach(year => {
//             const li = document.createElement('li');
//             li.innerText = year;
//             li.dataset.year = year;
//             li.addEventListener('click', handleYearClick);
//             yearList.appendChild(li);
//         });
//     }

//     function handleYearClick(e) {
//         const selectedYear = e.target.dataset.year;

//         // Active class manage karein
//         yearList.querySelectorAll('li').forEach(li => li.classList.remove('active'));
//         e.target.classList.add('active');

//         // Reset lower levels
//         monthList.innerHTML = '';
//         invoiceListContainer.style.display = 'none';
//         reportEmpty.style.display = 'none';

//         // Render months for the selected year
//         const yearData = reportsData[selectedYear];
//         const months = Object.keys(yearData).sort((a, b) => b - a); // Naye mahine oopar (11, 10, 9...)

//         if (months.length > 0) {
//             months.forEach(monthIndex => {
//                 const monthData = yearData[monthIndex];
//                 const li = document.createElement('li');
//                 li.dataset.year = selectedYear;
//                 li.dataset.month = monthIndex;
//                 li.innerHTML = `
//                     ${monthNames[monthIndex]}
//                     <span class="invoice-count">${monthData.totalInvoices}</span>
//                 `;
//                 li.addEventListener('click', handleMonthClick);
//                 monthList.appendChild(li);
//             });
//             monthListTitle.style.display = 'block';
//             reportTitle.innerText = `Select a month for ${selectedYear}`;
//         } else {
//             monthListTitle.style.display = 'none';
//             reportEmpty.style.display = 'block';
//             reportEmpty.innerText = `No invoices found for ${selectedYear}.`;
//         }
//     }

//     function handleMonthClick(e) {
//         const targetLi = e.target.closest('li');
//         const selectedYear = targetLi.dataset.year;
//         const selectedMonth = targetLi.dataset.month;

//         // Active class manage karein
//         monthList.querySelectorAll('li').forEach(li => li.classList.remove('active'));
//         targetLi.classList.add('active');

//         // Render invoice list
//         const invoices = reportsData[selectedYear][selectedMonth].invoices;
//         renderInvoiceList(invoices, selectedYear, selectedMonth);
//     }

//     function renderInvoiceList(invoices, year, month) {
//         invoiceListTableBody.innerHTML = ''; // Clear table
        
//         if (!invoices || invoices.length === 0) {
//             reportEmpty.style.display = 'block';
//             reportEmpty.innerText = "No invoices found for this month.";
//             invoiceListContainer.style.display = 'none';
//             return;
//         }

//         reportEmpty.style.display = 'none';
//         invoiceListContainer.style.display = 'block';
//         reportTitle.innerText = `Invoices for ${monthNames[month]} ${year}`;

//         invoices.forEach(invoice => {
//             const row = document.createElement('tr');
//             row.innerHTML = `
//                 <td>${invoice.date}</td>
//                 <td><b>${invoice.invoiceNo}</b></td>
//                 <td>${invoice.clientName}</td>
//                 <td>${invoice.clientPhone}</td>
//                 <td>
//                     <a href="${invoice.pdfUrl}" target="_blank" class="btn-view-pdf">View PDF</a>
//                 </td>
//             `;
//             invoiceListTableBody.appendChild(row);
//         });
//     }
// });