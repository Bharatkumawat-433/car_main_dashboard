document.addEventListener('DOMContentLoaded', () => {
    
    // UI Elements
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content'); 

    // Hamburger Menu Logic
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation(); 
            sidebar.classList.toggle('sidebar-visible'); 
        });
    }

    // Sidebar ke bahar click karne par use band karein
    if (mainContent && sidebar) {
        mainContent.addEventListener('click', () => {
            if (sidebar.classList.contains('sidebar-visible')) {
                sidebar.classList.remove('sidebar-visible');
            }
        });
    }

    // Logout Logic
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm("Are you sure you want to logout?")) {
                if (typeof firebase !== 'undefined' && firebase.auth) {
                    firebase.auth().signOut()
                        .then(() => {
                            window.location.href = 'login.html';
                        })
                        .catch((error) => {
                            console.error("Logout Error:", error);
                            alert("Error logging out.");
                        });
                } else {
                     alert("Firebase not initialized correctly.");
                     window.location.href = 'login.html'; // Force redirect
                }
            }
        });
    }

    // Check if db is defined (Firebase initialized)
    if (typeof db === 'undefined') {
        console.error("Firestore (db) is not initialized. Check Firebase config in index.html.");
        document.getElementById('todaySales').innerText = 'Error';
        document.getElementById('todayInvoices').innerText = 'Error';
        document.getElementById('totalDue').innerText = 'Error';
        document.getElementById('recentInvoicesBody').innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">App config error.</td></tr>';
        return;
    }

    // =============================================
    // NAYA DASHBOARD LOGIC (Dono collections ko fetch karega)
    // =============================================
    loadCombinedDashboardStats();
});

async function loadCombinedDashboardStats() {
    // Set loading state
    document.getElementById('todaySales').innerText = '...';
    document.getElementById('todayInvoices').innerText = '...';
    document.getElementById('totalDue').innerText = '...';
    document.getElementById('recentInvoicesBody').innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading...</td></tr>';

    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const todayDateStr = `${day}/${month}/${year}`;

    // Variables for combined data
    let totalTodaySales = 0;
    let totalTodayInvoices = 0;
    let totalTotalDue = 0;
    let allInvoices = []; // Sabhi invoices (GST + Simple)

    try {
        // Step 1: Dono collections se data ek saath fetch karein
        const gstPromise = db.collection("invoices").get();
        const simplePromise = db.collection("simple_invoices").get();

        const [gstSnapshot, simpleSnapshot] = await Promise.all([gstPromise, simplePromise]);

        // Step 2: GST Invoices ko process karein
        gstSnapshot.forEach(doc => {
            const invoice = doc.data();
            const invoiceAmount = parseFloat(invoice.grandTotal) || 0;

            // "Today" stats calculate karein
            if (invoice.invoiceDate === todayDateStr) {
                totalTodaySales += invoiceAmount;
                totalTodayInvoices++;
            }
            // "Due" stats calculate karein
            if (invoice.status === 'Unpaid') { // 'Partial' hata diya gaya
                totalTotalDue += invoiceAmount;
            }
            // Recent list ke liye add karein
            allInvoices.push(invoice);
        });

        // Step 3: Simple Invoices ko process karein
        simpleSnapshot.forEach(doc => {
            const invoice = doc.data();
            const invoiceAmount = parseFloat(invoice.grandTotal) || 0;

            // "Today" stats calculate karein
            if (invoice.invoiceDate === todayDateStr) {
                totalTodaySales += invoiceAmount;
                totalTodayInvoices++;
            }
            // "Due" stats calculate karein
            if (invoice.status === 'Unpaid') { // 'Partial' hata diya gaya
                totalTotalDue += invoiceAmount;
            }
            // Recent list ke liye add karein
            allInvoices.push(invoice);
        });

        // Step 4: Recent invoices ko sort karke top 5 nikaalein
        // createdAt timestamp ke hisaab se sort karein
        allInvoices.sort((a, b) => {
            const dateA = a.createdAt?.toDate() || 0;
            const dateB = b.createdAt?.toDate() || 0;
            return dateB - dateA; // Naya waala pehle
        });

        const top5Invoices = allInvoices.slice(0, 5);

        // Step 5: UI (HTML) ko update karein
        document.getElementById('todaySales').innerText = `₹${totalTodaySales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        document.getElementById('todayInvoices').innerText = totalTodayInvoices.toString();
        document.getElementById('totalDue').innerText = `₹${totalTotalDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        
        populateRecentInvoices(top5Invoices);

    } catch (error) {
        console.error("Error loading combined dashboard stats: ", error);
        document.getElementById('todaySales').innerText = 'Error';
        document.getElementById('todayInvoices').innerText = 'Error';
        document.getElementById('totalDue').innerText = 'Error';
        document.getElementById('recentInvoicesBody').innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Error loading data.</td></tr>';
    }
}


function populateRecentInvoices(invoices) {
    const tableBody = document.getElementById('recentInvoicesBody');
    tableBody.innerHTML = ''; // Clear table

    if (!invoices || invoices.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No recent invoices found.</td></tr>';
        return;
    }

    invoices.forEach(invoice => {
        const row = document.createElement('tr');
        let statusClass = 'status-unpaid'; // Default
        if (invoice.status === 'Paid') statusClass = 'status-paid';
        // Partial status ab nahi hai

        row.innerHTML = `
            <td>${invoice.invoiceNo}</td>
            <td>${invoice.clientName}</td>
            <td>${invoice.clientPhone}</td>
            <td>₹ ${Number(invoice.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td><span class="status ${statusClass}">${invoice.status}</span></td>
        `;
        tableBody.appendChild(row);
    });
}

