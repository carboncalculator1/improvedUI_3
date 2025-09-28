// admin.js
let appointmentsModal;
let appointmentsCloseBtn;



document.addEventListener('DOMContentLoaded', function() {
    // Check if user is admin
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        
        // Check if user is admin (you need to set this in your Firestore)
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.data()?.isAdmin) {
            alert('Access denied. Admin privileges required.');
            window.location.href = 'index.html';
            return;
        }
        
        // Load admin data
        loadAdminData();
        
        
        // Set up logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            auth.signOut().then(() => {
                window.location.href = 'login.html';
            });
        });

        // Set up location filter
        document.getElementById('locationFilter').addEventListener('change', (e) => {
        currentLocationFilter = e.target.value;
        loadAdminData();
        });
        
        // Set up refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            loadAdminData();
        });
    });
    // Initialize appointment modal elements
  appointmentsModal = document.getElementById('appointmentDetailsModal');
  appointmentsCloseBtn = document.querySelector('#appointmentDetailsModal .close');
  
  // Close modal when X is clicked
if (appointmentsCloseBtn) {
  appointmentsCloseBtn.addEventListener('click', function() {
    appointmentsModal.style.display = 'none';
  });
}
  
  // Close modal when clicking outside
window.addEventListener('click', function(event) {
  if (event.target === appointmentsModal) {
    appointmentsModal.style.display = 'none';
  }
});
  
  // Load appointments data
  loadAppointments();
});

const electricityTypeLabels = {
zesco: 'ZESCO (Grid)',
solar: 'Solar',
generator: 'Generator',
hybrid: 'Hybrid'
};

const mealTypeLabels = {
    beef: 'Beef stew with nshima & vegetables',
    chicken: 'Chicken with rice & greens',
    vegetarian: 'Beans & vegetables with nshima/rice'
};

const wasteTypeLabels = {
    plastics: 'Plastics',
    paper: 'Paper/Cardboard',
    food: 'Food Waste',
    garden: 'Garden Waste',
    mixed: 'Mixed Waste'
};

const frequencyLabels = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly'
};

const studentTransportLabels = {
    walking: 'Walk',
    bicycle: 'Bicycle',
    bus: 'School Bus',
    carpool: 'Carpool',
    public: 'Public Transport',
    car: 'Car (Personal)'
};

const recyclingLabels = {
    none: 'Never',
    sometimes: 'Sometimes',
    often: 'Often',
    always: 'Always'
};

// Function to format calculation inputs for display
function formatCalculationInputs(inputs, type) {
    if (!inputs) return 'No inputs available';
    
    let formatted = '';
    
    for (const [key, value] of Object.entries(inputs)) {
        let displayValue = value;
        
        // Format special string values based on calculation type
        if (type === 'personal') {
            if (key === 'mealType') {
                displayValue = mealTypeLabels[value] || value;
            } else if (key === 'commuteType') {
                const commuteTypes = {
                    'walking': 'Walk',
                    'bicycle': 'Bicycle',
                    'motorbike': 'Motorbike',
                    'carSmall': 'Small vehicle',
                    'carMedium': 'Medium vehicle',
                    'carLarge': 'Large vehicle',
                    'carElectric': 'Electrical Vehicle'
                };
                displayValue = commuteTypes[value] || value;
            } else if (key === 'electricityTypePersonal') {
                displayValue = `Electricity Source: ${electricityTypeLabels[value] || value}`;
            }
        } else if (type === 'construction') {
            if (key === 'electricityTypeConstruction') {
                displayValue = `Electricity Source: ${electricityTypeLabels[value] || value}`;
            }
        } else if (type === 'manufacturing') {
            if (key === 'electricityTypeManufacturing') {
                displayValue = `Electricity Source: ${electricityTypeLabels[value] || value}`;
            }
        } else if (type === 'openair') {
            if (key === 'wasteType') {
                displayValue = wasteTypeLabels[value] || value;
            } else if (key === 'frequency') {
                displayValue = frequencyLabels[value] || value;
            }
        } else if (type === 'agriculture' && key === 'methaneCapture') {
            displayValue = value ? 'Yes' : 'No';
        } else if (type === 'student') {
                if (key === 'transportType') {
                    displayValue = studentTransportLabels[value] || value;
                } else if (key === 'recycling') {
                    displayValue = recyclingLabels[value] || value;
                } else if (key === 'electricityType') {
                    displayValue = `Electricity Source: ${electricityTypeLabels[value] || value}`;
                }
            }
        
        // Format numeric values
        if (typeof value === 'number') {
            displayValue = value.toFixed(2);
        }
        
        // Handle waste object for personal calculations
        if (key === 'waste' && typeof value === 'object') {
            formatted += 'WASTE GENERATED (kg/week):\n';
            for (const [wasteType, wasteAmount] of Object.entries(value)) {
                const formattedType = wasteType.charAt(0).toUpperCase() + wasteType.slice(1);
                formatted += `  ${formattedType}: ${wasteAmount.toFixed(2)} kg\n`;
            }
            continue; // Skip the regular display for waste object
        }
    
        // Skip electricity type keys as we've already handled them above
        if (key === 'electricityTypePersonal' || key === 'electricityTypeConstruction' || key === 'electricityTypeManufacturing') {
            formatted += `${displayValue}\n`;
        } else {
            formatted += `${key.replace(/([A-Z])/g, ' $1').toUpperCase()}: ${displayValue}\n`;
        }
    }
    
    return formatted;
}


// Function to format calculation results for display
function formatCalculationResults(results) {
    if (!results) return 'No results available';
    
    let formatted = '';
    
    for (const [key, value] of Object.entries(results)) {
        if (key === 'total') continue; // Skip total as it's handled separately
        
        if (typeof value === 'number') {
            formatted += `${key.replace(/([A-Z])/g, ' $1').toUpperCase()}: ${value.toFixed(2)} kg CO₂e/month\n`;
        }
    }
    
    if (results.total) {
        formatted += `\nTOTAL: ${results.total.toFixed(2)} kg CO₂e/month`;
        formatted += `\nANNUAL: ${(results.total * 12).toFixed(2)} kg CO₂e/year`;
    }
    
    return formatted;
}

let currentLocationFilter = 'all';
async function loadAdminData() {
    try {
        let usersQuery = db.collection('users');
        
        // Apply location filter if not 'all'
        if (currentLocationFilter !== 'all') {
            usersQuery = usersQuery.where('province', '==', currentLocationFilter);
        }
        
        const usersSnapshot = await db.collection('users').get();
        const usersTableBody = document.getElementById('usersTableBody');
        usersTableBody.innerHTML = '';
        

        let totalCalculations = 0;
        let totalEmissions = 0;

        for (const doc of usersSnapshot.docs) {
            const userData = doc.data();

            // Fetch the calculations subcollection
            const calcSnapshot = await db.collection('users')
                .doc(doc.id)
                .collection('calculations')
                .get();

            const calculationsCount = calcSnapshot.size;
            totalCalculations += calculationsCount;

            let userEmissions = 0;
            calcSnapshot.forEach(calcDoc => {
                const calc = calcDoc.data();
                userEmissions += calc.results?.total || 0;
            });
            totalEmissions += userEmissions;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${userData.username || 'N/A'}</td>
                <td>${userData.email}</td>
                <td>${userData.province || 'Not specified'}</td>
                <td>${userData.createdAt ? userData.createdAt.toDate().toLocaleDateString() : 'N/A'}</td>
                <td>${calculationsCount}</td>
                <td>
                    <button class="view-user-btn" data-uid="${doc.id}">View Details</button>
                </td>
            `;
            usersTableBody.appendChild(row);
        }

        document.getElementById('totalUsers').textContent = usersSnapshot.size;
        document.getElementById('totalCalculations').textContent = totalCalculations;
        document.getElementById('avgEmissions').textContent = usersSnapshot.size > 0
            ? (totalEmissions / usersSnapshot.size).toFixed(1) + ' kg'
            : '0 kg';

        document.querySelectorAll('.view-user-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const userId = btn.getAttribute('data-uid');
                viewUserDetails(userId);
            });
        });

    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}


// --- VIEW USER DETAILS ---
async function viewUserDetails(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            alert('User not found.');
            return;
        }
        const userData = userDoc.data();

        // Fetch calculations subcollection
        const calcSnapshot = await db.collection('users')
            .doc(userId)
            .collection('calculations')
            .orderBy('timestamp', 'desc')
            .get();

        let detailsHtml = `
            <div class="user-detail-card">
                <h3>${userData.username || userData.email}</h3>
                <p><strong>Email:</strong> ${userData.email}</p>
                <p><strong>Province:</strong> ${userData.province || 'Not specified'}</p>
                <p><strong>Signup Date:</strong> ${userData.createdAt ? userData.createdAt.toDate().toLocaleDateString() : 'N/A'}</p>
                <h4>Calculations (${calcSnapshot.size}):</h4>
            </div>
        `;

        if (!calcSnapshot.empty) {
            detailsHtml += '<div class="calculations-list">';
            calcSnapshot.forEach(calcDoc => {
                const calc = calcDoc.data();
                
                // Create a brief summary based on calculation type
                let summary = '';
                if (calc.type === 'personal' && calc.inputs) {
                    const mealType = mealTypeLabels[calc.inputs.mealType] || calc.inputs.mealType;
                    summary = `Meals: ${calc.inputs.meals || 0}/day (${mealType})`;
                } else if (calc.type === 'openair' && calc.inputs) {
                    const wasteType = wasteTypeLabels[calc.inputs.wasteType] || calc.inputs.wasteType;
                    const frequency = frequencyLabels[calc.inputs.frequency] || calc.inputs.frequency;
                    summary = `${wasteType} - ${frequency} - ${calc.inputs.amount || 0}kg/session`;
                }
                
                detailsHtml += `
                    <div class="calculation-item">
                        <div class="calc-header">
                            <span><strong>${calc.type || 'Unknown type'}</strong></span>
                            <span>${calc.timestamp ? calc.timestamp.toDate().toLocaleDateString() : 'Unknown date'}</span>
                        </div>
                        <div class="calc-summary">
                            <span>Total: ${calc.results?.total?.toFixed(1) || 0} kg CO₂e</span>
                            ${summary ? `<span class="calc-details">${summary}</span>` : ''}
                        </div>
                        <button class="view-calc-btn" data-uid="${userId}" data-id="${calcDoc.id}">View Details</button>
                    </div>
                `;
            });
            detailsHtml += '</div>';
        } else {
            detailsHtml += '<p>No calculations yet.</p>';
        }

        document.getElementById('userDetailsContent').innerHTML = detailsHtml;

        // Add event listeners for calculation detail buttons
        document.querySelectorAll('.view-calc-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const userId = btn.getAttribute('data-uid');
                const calcId = btn.getAttribute('data-id');
                viewCalculationDetails(userId, calcId);
            });
        });
    } catch (error) {
        console.error('Error fetching user details:', error);
    }
}

// --- VIEW CALCULATION DETAILS ---
async function viewCalculationDetails(userId, calcId) {
    try {
        const [userDoc, calcDoc] = await Promise.all([
            db.collection('users').doc(userId).get(),
            db.collection('users').doc(userId).collection('calculations').doc(calcId).get()
        ]);

        if (!userDoc.exists || !calcDoc.exists) {
            alert('Calculation or user not found.');
            return;
        }

        const userData = userDoc.data();
        const calculation = calcDoc.data();

        const inputsFormatted = formatCalculationInputs(calculation.inputs, calculation.type);
        const resultsFormatted = formatCalculationResults(calculation.results);

        // Create a more detailed view for personal calculations with waste data
        let detailedHtml = '';
        if (calculation.type === 'personal' && calculation.inputs && calculation.inputs.waste) {
            detailedHtml = `
                <div class="waste-details">
                    <h4>Waste Generation Details:</h4>
                    <table class="waste-table">
                        <thead>
                            <tr>
                                <th>Waste Type</th>
                                <th>Amount (kg/week)</th>
                                <th>Monthly Emissions (kg CO₂e)</th>
                            </tr>
                        </thead>
                        <tbody>`;
            
            // Calculate emissions for each waste type
            const wasteData = calculation.inputs.waste;
            const wasteEmissions = {
                food: (wasteData.food || 0) * wasteEmissionFactors.foodWaste * 4,
                paper: (wasteData.paper || 0) * wasteEmissionFactors.paperWaste * 4,
                plastic: (wasteData.plastic || 0) * wasteEmissionFactors.plasticWaste * 4,
                metal: (wasteData.metal || 0) * wasteEmissionFactors.metalWaste * 4
            };
            
            for (const [wasteType, amount] of Object.entries(wasteData)) {
                const formattedType = wasteType.charAt(0).toUpperCase() + wasteType.slice(1);
                detailedHtml += `
                    <tr>
                        <td>${formattedType}</td>
                        <td>${amount.toFixed(2)}</td>
                        <td>${wasteEmissions[wasteType].toFixed(2)}</td>
                    </tr>`;
            }
            
            detailedHtml += `
                        </tbody>
                    </table>
                </div>`;
        }
        // Add electricity type information to details
    let electricityInfo = '';
    if (calculation.inputs) {
        const electricityType = calculation.inputs.electricityTypePersonal || 
                              calculation.inputs.electricityTypeConstruction || 
                              calculation.inputs.electricityTypeManufacturing;
        if (electricityType) {
            electricityInfo = `<p><strong>Electricity Source:</strong> ${electricityTypeLabels[electricityType] || electricityType}</p>`;
        }
    }


        const detailsHtml = `
            <div class="calculation-detail-card">
                <h3>Calculation Details</h3>
                <p><strong>User:</strong> ${userData.username || userData.email}</p>
                <p><strong>Type:</strong> ${calculation.type || 'Unknown type'}</p>
                <p><strong>Date:</strong> ${calculation.timestamp ? calculation.timestamp.toDate().toLocaleString() : 'Unknown'}</p>
                
                <div class="detail-section">
                    <h4>Inputs:</h4>
                    <pre class="formatted-data">${inputsFormatted}</pre>
                </div>
                
                ${detailedHtml}
                
                <div class="detail-section">
                    <h4>Results:</h4>
                    <pre class="formatted-data">${resultsFormatted}</pre>
                </div>
            </div>
        `;

        document.getElementById('calculationDetailsContent').innerHTML = detailsHtml;
    } catch (error) {
        console.error('Error fetching calculation details:', error);
    }
}

const wasteEmissionFactors = {
    foodWaste: 2.0,
    paperWaste: 2.8,
    plasticWaste: -0.2,
    metalWaste: 9.0
};

// Function to load appointments
async function loadAppointments() {
  try {
    const appointmentsSnapshot = await db.collection('appointments')
      .orderBy('createdAt', 'desc')
      .get();
    
    const appointmentsTableBody = document.getElementById('appointmentsTableBody');
    appointmentsTableBody.innerHTML = '';
    
    appointmentsSnapshot.forEach(doc => {
      const appointment = doc.data();
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>${appointment.fullName}</td>
        <td>${appointment.email}</td>
        <td>${appointment.phone}</td>
        <td>${appointment.province}</td>
        <td>${appointment.createdAt ? appointment.createdAt.toDate().toLocaleDateString() : 'N/A'}</td>
        <td>
          <select class="status-select" data-id="${doc.id}">
            <option value="Pending" ${appointment.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Completed" ${appointment.status === 'Completed' ? 'selected' : ''}>Completed</option>
          </select>
        </td>
        <td>
          <button class="view-appointment-btn" data-id="${doc.id}">View Details</button>
        </td>
      `;
      
      appointmentsTableBody.appendChild(row);
    });
    
    // Add event listeners for status changes
    document.querySelectorAll('.status-select').forEach(select => {
      select.addEventListener('change', function() {
        const appointmentId = this.getAttribute('data-id');
        const newStatus = this.value;
        updateAppointmentStatus(appointmentId, newStatus);
      });
    });
    
    // Add event listeners for view buttons
    document.querySelectorAll('.view-appointment-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const appointmentId = this.getAttribute('data-id');
        viewAppointmentDetails(appointmentId);
      });
    });
    
  } catch (error) {
    console.error('Error loading appointments:', error);
  }
}

// Function to update appointment status
async function updateAppointmentStatus(appointmentId, newStatus) {
  try {
    await db.collection('appointments').doc(appointmentId).update({
      status: newStatus
    });
    
    // Optional: Show a confirmation message
    console.log('Appointment status updated successfully');
  } catch (error) {
    console.error('Error updating appointment status:', error);
    alert('Error updating status. Please try again.');
  }
}

// Function to view appointment details
async function viewAppointmentDetails(appointmentId) {
  try {
    const appointmentDoc = await db.collection('appointments').doc(appointmentId).get();
    
    if (!appointmentDoc.exists) {
      alert('Appointment not found.');
      return;
    }
    
    const appointment = appointmentDoc.data();
    
    // Replace the detailsHtml in viewAppointmentDetails function with:
const detailsHtml = `
  <div class="appointment-detail-card">
    <dl class="appointment-details-list">
      <dt>Name</dt>
      <dd>${appointment.fullName}</dd>
      
      <dt>Email</dt>
      <dd>${appointment.email}</dd>
      
      <dt>Phone</dt>
      <dd>${appointment.phone}</dd>
      
      <dt>Province</dt>
      <dd>${appointment.province}</dd>
      
      <dt>Status</dt>
      <dd>${appointment.status}</dd>
      
      <dt>Request Date</dt>
      <dd>${appointment.createdAt ? appointment.createdAt.toDate().toLocaleString() : 'N/A'}</dd>
    </dl>
  </div>
`;
    
    document.getElementById('appointmentDetailsContent').innerHTML = detailsHtml;
    appointmentsModal.style.display = 'block';
  } catch (error) {
    console.error('Error fetching appointment details:', error);
  }
}
