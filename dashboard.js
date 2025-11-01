








document.addEventListener('DOMContentLoaded', () => {
    
    // UI Elements
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content'); 

    // Hamburger Menu Logic
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', (e) => {
            // =============================================
            // YEH HAI FIX: Event ko 'mainContent' tak jaane se rokein
            // =============================================
            e.stopPropagation(); 
            sidebar.classList.toggle('sidebar-visible'); 
        });
    }

    // NAYA CODE: Sidebar ke bahar click karne par use band karein
    if (mainContent && sidebar) {
        mainContent.addEventListener('click', () => {
            // Check karein ki sidebar dikh raha hai ya nahi (mobile par)
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

    // Start listening for real-time data
    listenForDashboardData();
    
});

function listenForDashboardData() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const todayDateStr = `${day}/${month}/${year}`;

    db.collection("invoices")
      .orderBy("createdAt", "desc")
      .limit(5) 
      .onSnapshot(querySnapshot => {
        let todaySalesTotal = 0;
        let todayInvoicesCount = 0;
        let recentInvoices = [];

        querySnapshot.forEach(doc => {
            const invoice = doc.data();
            const invoiceAmount = parseFloat(invoice.grandTotal) || 0;
            
            if (invoice.invoiceDate === todayDateStr) {
                todaySalesTotal += invoiceAmount;
                todayInvoicesCount++;
            }

            recentInvoices.push({
                invoiceNo: invoice.invoiceNo,
                clientName: invoice.clientName || 'N/A',
                clientPhone: invoice.clientPhone || 'N/A', 
                amount: invoiceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                status: invoice.status || 'N/A'
            });
        });

        // Update Summary Cards
        document.getElementById('todaySales').innerText = `₹${todaySalesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        document.getElementById('todayInvoices').innerText = todayInvoicesCount.toString();
        
        // Update Recent Invoices Table
        populateRecentInvoices(recentInvoices);

        // Alag se "Total Due" calculate karein (Poore database se)
        db.collection("invoices")
          .where("status", "in", ["Unpaid", "Partial"])
          .onSnapshot(dueSnapshot => {
            let totalDueAmount = 0;
            dueSnapshot.forEach(doc => {
                totalDueAmount += parseFloat(doc.data().grandTotal) || 0;
            });
            document.getElementById('totalDue').innerText = `₹${totalDueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }, error => {
             console.error("Error getting total due: ", error);
             document.getElementById('totalDue').innerText = 'Error';
          });


    }, error => {
        console.error("Error listening for invoices: ", error);
        document.getElementById('todaySales').innerText = 'Error';
        document.getElementById('recentInvoicesBody').innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Error loading invoice data. Check console.</td></tr>';
    });
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
        if (invoice.status === 'Partial') statusClass = 'status-partial';

        row.innerHTML = `
            <td>${invoice.invoiceNo}</td>
            <td>${invoice.clientName}</td>
            <td>${invoice.clientPhone}</td>
            <td>₹ ${invoice.amount}</td>
            <td><span class="status ${statusClass}">${invoice.status}</span></td>
        `;
        tableBody.appendChild(row);
    });
}







// document.addEventListener('DOMContentLoaded', () => {
    
//     // Hamburger Menu Logic
//     const menuToggle = document.getElementById('menuToggle');
//     const sidebar = document.getElementById('sidebar');
//     if (menuToggle && sidebar) {
//         menuToggle.addEventListener('click', () => {
//             sidebar.classList.toggle('sidebar-visible'); 
//         });
//     }

//     // Logout Logic
//     const logoutBtn = document.getElementById('logoutBtn');
//     if (logoutBtn) {
//         logoutBtn.addEventListener('click', (e) => {
//             e.preventDefault();
//             if (confirm("Are you sure you want to logout?")) {
//                 if (typeof firebase !== 'undefined' && firebase.auth) {
//                     firebase.auth().signOut()
//                         .then(() => {
//                             window.location.href = 'login.html';
//                         })
//                         .catch((error) => {
//                             console.error("Logout Error:", error);
//                             alert("Error logging out.");
//                         });
//                 } else {
//                      alert("Firebase not initialized correctly.");
//                      window.location.href = 'login.html'; // Force redirect
//                 }
//             }
//         });
//     }


//     // Check if db is defined (Firebase initialized)
//     if (typeof db === 'undefined') {
//         console.error("Firestore (db) is not initialized. Check Firebase config in index.html.");
//         // Display error messages on dashboard
//         document.getElementById('todaySales').innerText = 'Error';
//         document.getElementById('todayInvoices').innerText = 'Error';
//         document.getElementById('totalDue').innerText = 'Error';
//         // Colspan 4 se 5 kar diya gaya hai
//         document.getElementById('recentInvoicesBody').innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">App config error.</td></tr>';
//         return;
//     }

//     // Start listening for real-time data
//     listenForDashboardData();
    
//     // listenForLowStock() ko yahaan se hata diya gaya hai
// });

// function listenForDashboardData() {
//     const today = new Date();
//     const day = String(today.getDate()).padStart(2, '0');
//     const month = String(today.getMonth() + 1).padStart(2, '0');
//     const year = today.getFullYear();
//     const todayDateStr = `${day}/${month}/${year}`;

//     // Listen to 'invoices' collection
//     db.collection("invoices")
//       .orderBy("createdAt", "desc") // createdAt se sort karein (agar field hai)
//       .limit(5) // Sirf 5 naye invoices
//       .onSnapshot(querySnapshot => {
//         let todaySalesTotal = 0;
//         let todayInvoicesCount = 0;
//         let totalDueAmount = 0;
//         let recentInvoices = [];
//         // let count = 0; // limit(5) ke kaaran iski zaroorat nahi

//         querySnapshot.forEach(doc => {
//             const invoice = doc.data();
//             const invoiceAmount = parseFloat(invoice.grandTotal) || 0;
            
//             // Calculate Stats (Yeh logic poore database par chalna chahiye, isliye hum is logic ko badalte hain)
//             // Ab hum sirf recent invoices dikhayenge. Statistics ke liye alag query behtar hai.
            
//             // Calculate Today Stats
//             if (invoice.invoiceDate === todayDateStr) {
//                 todaySalesTotal += invoiceAmount;
//                 todayInvoicesCount++;
//             }
//             // Calculate Total Due (Iske liye alag query honi chahiye, lekin abhi ke liye isse chalate hain)
//             if (invoice.status === 'Unpaid' || invoice.status === 'Partial') {
//                 // NOTE: Yeh sirf naye 5 invoices ka due dikhayega.
//                 // Poora due dikhane ke liye humein neeche waali alag query chalani hogi.
//                 // totalDueAmount += invoiceAmount; // Isse yahaan se hatayein
//             }

//             // Get top 5 recent invoices (Query pehle se hi 5 laa rahi hai)
//             recentInvoices.push({
//                 invoiceNo: invoice.invoiceNo,
//                 clientName: invoice.clientName || 'N/A',
//                 clientPhone: invoice.clientPhone || 'N/A', // NAYA FIELD
//                 amount: invoiceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
//                 status: invoice.status || 'N/A'
//             });
//         });

//         // Update Summary Cards
//         document.getElementById('todaySales').innerText = `₹${todaySalesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
//         document.getElementById('todayInvoices').innerText = todayInvoicesCount.toString();
//         // document.getElementById('totalDue').innerText = `₹${totalDueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        
//         // Update Recent Invoices Table
//         populateRecentInvoices(recentInvoices);

//         // Alag se "Total Due" calculate karein (Poore database se)
//         db.collection("invoices")
//           .where("status", "in", ["Unpaid", "Partial"])
//           .onSnapshot(dueSnapshot => {
//             let totalDueAmount = 0;
//             dueSnapshot.forEach(doc => {
//                 totalDueAmount += parseFloat(doc.data().grandTotal) || 0;
//             });
//             document.getElementById('totalDue').innerText = `₹${totalDueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
//           }, error => {
//              console.error("Error getting total due: ", error);
//              document.getElementById('totalDue').innerText = 'Error';
//           });


//     }, error => {
//         console.error("Error listening for invoices: ", error);
//         document.getElementById('todaySales').innerText = 'Error';
//         document.getElementById('recentInvoicesBody').innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Error loading invoice data. Check console.</td></tr>';
//     });
// }

// function populateRecentInvoices(invoices) {
//     const tableBody = document.getElementById('recentInvoicesBody');
//     tableBody.innerHTML = ''; // Clear table

//     if (!invoices || invoices.length === 0) {
//         // Colspan 4 se 5 kar diya gaya hai
//         tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No recent invoices found.</td></tr>';
//         return;
//     }

//     invoices.forEach(invoice => {
//         const row = document.createElement('tr');
//         let statusClass = 'status-unpaid'; // Default
//         if (invoice.status === 'Paid') statusClass = 'status-paid';
//         if (invoice.status === 'Partial') statusClass = 'status-partial';

//         // Naya 'clientPhone' cell add kiya gaya hai
//         row.innerHTML = `
//             <td>${invoice.invoiceNo}</td>
//             <td>${invoice.clientName}</td>
//             <td>${invoice.clientPhone}</td>
//             <td>₹ ${invoice.amount}</td>
//             <td><span class="status ${statusClass}">${invoice.status}</span></td>
//         `;
//         tableBody.appendChild(row);
//     });
// }

// // listenForLowStock() function poora hata diya gaya hai


















// document.addEventListener('DOMContentLoaded', () => {
    
//     // Hamburger Menu Logic
//     const menuToggle = document.getElementById('menuToggle');
//     const sidebar = document.getElementById('sidebar');
//     if (menuToggle && sidebar) {
//         menuToggle.addEventListener('click', () => {
//             sidebar.classList.toggle('sidebar-visible'); 
//         });
//     }

//     // Logout Logic
//     const logoutBtn = document.getElementById('logoutBtn');
//     if (logoutBtn) {
//         logoutBtn.addEventListener('click', (e) => {
//             e.preventDefault();
//             if (confirm("Are you sure you want to logout?")) {
//                 if (typeof firebase !== 'undefined' && firebase.auth) {
//                     firebase.auth().signOut()
//                         .then(() => {
//                             window.location.href = 'login.html';
//                         })
//                         .catch((error) => {
//                             console.error("Logout Error:", error);
//                             alert("Error logging out.");
//                         });
//                 } else {
//                      alert("Firebase not initialized correctly.");
//                      window.location.href = 'login.html'; // Force redirect
//                 }
//             }
//         });
//     }


//     // Check if db is defined (Firebase initialized)
//     if (typeof db === 'undefined') {
//         console.error("Firestore (db) is not initialized. Check Firebase config in index.html.");
//         // Display error messages on dashboard
//         document.getElementById('todaySales').innerText = 'Error';
//         document.getElementById('todayInvoices').innerText = 'Error';
//         document.getElementById('totalDue').innerText = 'Error';
//         document.getElementById('recentInvoicesBody').innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">App config error.</td></tr>';
//         document.getElementById('lowStockList').innerHTML = '<li style="color: red;">App config error.</li>';
//         return;
//     }

//     // Start listening for real-time data
//     listenForDashboardData();
//     listenForLowStock();
// });

// function listenForDashboardData() {
//     const today = new Date();
//     const day = String(today.getDate()).padStart(2, '0');
//     const month = String(today.getMonth() + 1).padStart(2, '0');
//     const year = today.getFullYear();
//     const todayDateStr = `${day}/${month}/${year}`;

//     // Listen to 'invoices' collection
//     db.collection("invoices")
//       .orderBy("invoiceDate", "desc") // Order by date descending initially for recent ones
//       .onSnapshot(querySnapshot => {
//         let todaySalesTotal = 0;
//         let todayInvoicesCount = 0;
//         let totalDueAmount = 0;
//         let recentInvoices = [];
//         let count = 0;

//         querySnapshot.forEach(doc => {
//             const invoice = doc.data();
//             const invoiceAmount = parseFloat(invoice.grandTotal) || 0;
            
//             // Calculate Stats
//             if (invoice.invoiceDate === todayDateStr) {
//                 todaySalesTotal += invoiceAmount;
//                 todayInvoicesCount++;
//             }
//             if (invoice.status === 'Unpaid' || invoice.status === 'Partial') {
//                 totalDueAmount += invoiceAmount;
//             }

//             // Get top 5 recent invoices
//             if (count < 5) {
//                 recentInvoices.push({
//                     invoiceNo: invoice.invoiceNo,
//                     clientName: invoice.clientName || 'N/A',
//                     amount: invoiceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
//                     status: invoice.status || 'N/A'
//                 });
//                 count++;
//             }
//         });

//         // Update Summary Cards
//         document.getElementById('todaySales').innerText = `₹${todaySalesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
//         document.getElementById('todayInvoices').innerText = todayInvoicesCount.toString();
//         document.getElementById('totalDue').innerText = `₹${totalDueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
//         // carsWorkshop needs a separate mechanism, keeping it static for now
//         // document.getElementById('carsWorkshop').innerText = "..."; 

//         // Update Recent Invoices Table
//         populateRecentInvoices(recentInvoices);

//     }, error => {
//         console.error("Error listening for invoices: ", error);
//         document.getElementById('todaySales').innerText = 'Error';
//         document.getElementById('recentInvoicesBody').innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Error loading invoice data. Check console.</td></tr>';
//     });
// }

// function populateRecentInvoices(invoices) {
//     const tableBody = document.getElementById('recentInvoicesBody');
//     tableBody.innerHTML = ''; // Clear table

//     if (!invoices || invoices.length === 0) {
//         tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No recent invoices found.</td></tr>';
//         return;
//     }

//     invoices.forEach(invoice => {
//         const row = document.createElement('tr');
//         let statusClass = 'status-unpaid'; // Default
//         if (invoice.status === 'Paid') statusClass = 'status-paid';
//         if (invoice.status === 'Partial') statusClass = 'status-partial';

//         row.innerHTML = `
//             <td>${invoice.invoiceNo}</td>
//             <td>${invoice.clientName}</td>
//             <td>₹ ${invoice.amount}</td>
//             <td><span class="status ${statusClass}">${invoice.status}</span></td>
//         `;
//         tableBody.appendChild(row);
//     });
// }

// function listenForLowStock() {
//     const lowStockThreshold = 5;
    
//     // Listen to 'inventory' collection
//     // ⚠️ Assumes 'inventory' collection exists with 'partName' and 'quantity' fields
//     db.collection("inventory")
//       .where("quantity", "<=", lowStockThreshold)
//       .orderBy("quantity", "asc") // Show lowest stock first
//       .onSnapshot(querySnapshot => {
        
//         const stockList = document.getElementById('lowStockList');
//         stockList.innerHTML = ''; // Clear list
        
//         if (querySnapshot.empty) {
//             stockList.innerHTML = '<li>All parts seem to be in stock!</li>';
//             return;
//         }

//         querySnapshot.forEach(doc => {
//             const item = doc.data();
//             // Ensure data exists before trying to display
//             const partName = item.partName || 'Unknown Part';
//             const quantity = item.quantity !== undefined ? item.quantity : 'N/A';
            
//             const listItem = document.createElement('li');
//             listItem.innerHTML = `
//                 <span class="stock-name">${partName}</span>
//                 <span class="stock-qty">${quantity} left</span>
//             `;
//             stockList.appendChild(listItem);
//         });

//     }, error => {
//         console.error("Error listening for low stock: ", error);
//         document.getElementById('lowStockList').innerHTML = '<li style="color: red;">Error loading stock data. Check console.</li>';
//     });
// }