document.addEventListener('DOMContentLoaded', () => {
     // Check if db is defined
    if (typeof db === 'undefined') {
        console.error("Firestore (db) is not initialized. Check Firebase config in customers.html.");
        document.getElementById('customersTableBody').innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">App config error.</td></tr>';
        document.getElementById('submitBtn').disabled = true; // Disable form submission
        return;
    }

    loadCustomers();
    document.getElementById('addClientForm').addEventListener('submit', handleAddClient);
});

async function loadCustomers() {
    const tableBody = document.getElementById('customersTableBody');
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading...</td></tr>';
    
    try {
        // Fetch clients ordered by name
        const querySnapshot = await db.collection("clients").orderBy("name").get();
        
        tableBody.innerHTML = ''; // Clear loading
        if (querySnapshot.empty) {
             tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No clients found. Add one using the form above!</td></tr>';
             return;
        }
        
        querySnapshot.forEach(doc => {
            const client = doc.data();
            const row = document.createElement('tr');
            // Display data safely, providing defaults for missing fields
            row.innerHTML = `
                <td>${doc.id || 'N/A'}</td>  
                <td>${client.name || 'N/A'}</td>
                <td>${client.address || ''}</td>
                <td>${client.state || ''}</td>
                <td>${client.code || ''}</td>
            `;
            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Error loading clients: ", error);
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Error loading clients: ${error.message}</td></tr>`;
    }
}

async function handleAddClient(e) {
    e.preventDefault(); 
    
    const submitBtn = document.getElementById('submitBtn');
    const formMessage = document.getElementById('formMessage');
    submitBtn.disabled = true;
    submitBtn.innerText = 'Saving...';
    formMessage.innerText = '';
    formMessage.style.color = ''; // Reset color

    const clientPhone = document.getElementById('clientPhone').value.trim(); // Trim whitespace
     // Basic validation for phone number
    if (!clientPhone || !/^\d{10,}$/.test(clientPhone)) { // Example: At least 10 digits
         formMessage.innerText = 'Error: Please enter a valid phone number (at least 10 digits).';
         formMessage.style.color = 'red';
         submitBtn.disabled = false;
         submitBtn.innerText = 'Add Customer';
         return;
    }

    const payload = {
        name: document.getElementById('clientName').value.trim(), // Trim whitespace
        address: document.getElementById('clientAddress').value.trim(),
        state: document.getElementById('clientState').value.trim(),
        code: document.getElementById('clientCode').value.trim()
        // phone is used as ID, so not stored inside the document data itself
    };

    // Basic validation for name
     if (!payload.name) {
         formMessage.innerText = 'Error: Client Name is required.';
         formMessage.style.color = 'red';
         submitBtn.disabled = false;
         submitBtn.innerText = 'Add Customer';
         return;
     }


    try {
        // Use phone number as the document ID to prevent duplicates
        const clientRef = db.collection("clients").doc(clientPhone);
        await clientRef.set(payload); // Use set() to create or overwrite

        formMessage.innerText = 'Client added/updated successfully!';
        formMessage.style.color = 'green';
        document.getElementById('addClientForm').reset(); 
        
        // Update local cache immediately for create-invoice page (if needed)
        if (typeof clientDataCache !== 'undefined') {
             clientDataCache[clientPhone] = {...payload, phone: clientPhone}; // Add phone back for consistency
        }
        
        loadCustomers(); // Refresh table

    } catch (error) {
        console.error("Error adding/updating client: ", error);
        formMessage.innerText = `Error: ${error.message}`;
        formMessage.style.color = 'red';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Add Customer';
    }
}