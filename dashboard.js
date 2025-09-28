// dashboard.js
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            // Redirect to login if not authenticated
            window.location.href = 'login.html';
            return;
        }
        
        // Display user info
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        document.getElementById('userWelcome').textContent = `Welcome, ${userData.username || user.email}! (${userData.province || 'No province'})`;

        // Add admin link if user is admin
       if (userData.isAdmin) {
                    const adminLink = document.createElement('a');
                    adminLink.href = 'admin.html';
                    adminLink.textContent = 'Admin Panel';
                    adminLink.className = 'admin-link';
                    adminLink.innerHTML = '<i class="fas fa-cog"></i> Admin Panel';
                    
                    // Insert before logout button
                    const logoutBtn = document.getElementById('logoutBtn');
                    logoutBtn.parentNode.insertBefore(adminLink, logoutBtn);
                }
        
        // Load calculation history from subcollection
        await loadCalculationHistory(user.uid, userData);
        
        // Set up logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            auth.signOut().then(() => {
                window.location.href = 'login.html';
            });
        });
        
        // Toggle history view
        document.getElementById('viewHistoryBtn').addEventListener('click', () => {
            const historySection = document.getElementById('historySection');
            if (historySection.style.display === 'none') {
                historySection.style.display = 'block';
            } else {
                historySection.style.display = 'none';
            }
        });
    });
});

async function loadCalculationHistory(userId, userData) {
    const calculationsList = document.getElementById('calculationsList');
    const totalEmissionsValue = document.getElementById('totalEmissionsValue');
    
    try {
        // Get calculations from the subcollection
        const snapshot = await db.collection('users').doc(userId)
            .collection('calculations')
            .orderBy('timestamp', 'desc')
            .get();
        
        if (snapshot.empty) {
            calculationsList.innerHTML = '<p class="no-data">No calculations yet. Start by creating a new calculation!</p>';
            totalEmissionsValue.textContent = '0';
            return;
        }
        
        // Calculate total emissions and prepare calculations array
        let totalEmissions = 0;
        const calculations = [];
        
        snapshot.forEach(doc => {
            const calc = { id: doc.id, ...doc.data() };
            calculations.push(calc);
            totalEmissions += calc.results.total || 0;
        });
        
        totalEmissionsValue.textContent = totalEmissions.toFixed(1);
        
        // Display calculation history
        calculationsList.innerHTML = '';
        calculations.forEach((calc, index) => {
            const calcElement = document.createElement('div');
            calcElement.className = 'calculation-item';
            
            // Format timestamp
            let timestampText = 'Date not available';
            if (calc.timestamp && calc.timestamp.toDate) {
                timestampText = new Date(calc.timestamp.toDate()).toLocaleDateString();
            } else if (calc.timestamp) {
                timestampText = new Date(calc.timestamp).toLocaleDateString();
            }
            
            calcElement.innerHTML = `
                <div class="calc-header">
                    <h3>${calc.type.charAt(0).toUpperCase() + calc.type.slice(1)} Calculation</h3>
                    <span class="calc-date">${timestampText}</span>
                </div>
                <div class="calc-summary">
                    <p>Total: <strong>${calc.results.total.toFixed(1)} kg CO₂e</strong></p>
                    <button class="view-details-btn" data-index="${index}">View Details</button>
                </div>
                <div class="calc-details" id="details-${index}" style="display: none;">
                    <h4>Inputs:</h4>
                    <pre>${JSON.stringify(calc.inputs, null, 2)}</pre>
                    <h4>Results:</h4>
                    <pre>${JSON.stringify(calc.results, null, 2)}</pre>
                </div>
            `;
            calculationsList.appendChild(calcElement);
        });
        
        // Add event listeners to view details buttons
        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = btn.getAttribute('data-index');
                const detailsElement = document.getElementById(`details-${index}`);
                if (detailsElement.style.display === 'none') {
                    detailsElement.style.display = 'block';
                    btn.textContent = 'Hide Details';
                } else {
                    detailsElement.style.display = 'none';
                    btn.textContent = 'View Details';
                }
            });
        });
        
    } catch (error) {
        console.error('Error loading calculation history:', error);
        calculationsList.innerHTML = '<p class="no-data">Error loading calculations. Please try again.</p>';
        totalEmissionsValue.textContent = '0';
    }
}
