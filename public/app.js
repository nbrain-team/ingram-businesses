// API Base URL - will use relative paths in production
const API_BASE = window.location.origin;

// State
let credentials = [];
let currentCredentialId = null;
let selectedTimeSlot = null;

// DOM Elements
const credentialsContainer = document.getElementById('credentials-container');
const uploadModal = document.getElementById('uploadModal');
const calendarModal = document.getElementById('calendarModal');
const uploadBtn = document.getElementById('uploadBtn');
const bookBtn = document.getElementById('bookBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadCredentials();
    setupEventListeners();
    setupDatePicker();
});

// Load credentials from API
async function loadCredentials() {
    try {
        credentialsContainer.innerHTML = '<div class="loading">Loading credentials</div>';
        
        const response = await fetch(`${API_BASE}/api/credentials`);
        if (!response.ok) throw new Error('Failed to load credentials');
        
        credentials = await response.json();
        renderCredentials();
    } catch (error) {
        console.error('Error loading credentials:', error);
        credentialsContainer.innerHTML = `
            <div class="error-message">
                Failed to load credentials. Please refresh the page or contact support.
            </div>
        `;
    }
}

// Render credentials as cards
function renderCredentials() {
    if (credentials.length === 0) {
        credentialsContainer.innerHTML = '<div class="loading">No credentials found</div>';
        return;
    }
    
    credentialsContainer.innerHTML = credentials.map(cred => `
        <div class="credential-card" data-id="${cred.id}">
            <div class="credential-header" onclick="toggleCard(${cred.id})">
                <div class="credential-info">
                    <div class="credential-title">${cred.name}</div>
                    <div class="credential-description">${cred.description || ''}</div>
                </div>
                <div class="credential-status">
                    <span class="status-badge ${cred.status}">${cred.status.toUpperCase()}</span>
                    <span class="expand-icon">▼</span>
                </div>
            </div>
            <div class="credential-body">
                <div class="credential-content">
                    <div class="instructions">
                        <h3>📋 Setup Instructions</h3>
                        <pre>${cred.instructions || 'No instructions available.'}</pre>
                    </div>
                    
                    ${cred.status === 'completed' && cred.credential_data ? `
                        <div class="success-message">
                            ✓ Credential uploaded successfully!
                            ${cred.file_path ? `<br><small>File: ${cred.credential_data}</small>` : ''}
                        </div>
                    ` : ''}
                    
                    <div class="credential-actions">
                        <button class="btn btn-primary" onclick="openUploadModal(${cred.id}, '${cred.name}')">
                            📤 Upload Credential
                        </button>
                        <button class="btn btn-secondary" onclick="openCalendarModal(${cred.id}, '${cred.name}')">
                            📞 Having Trouble? Book a Call
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Toggle card expansion
function toggleCard(id) {
    const card = document.querySelector(`[data-id="${id}"]`);
    card.classList.toggle('expanded');
}

// Setup event listeners
function setupEventListeners() {
    // Close modals when clicking X
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.onclick = function() {
            closeModals();
        };
    });
    
    // Close modals when clicking outside
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            closeModals();
        }
    };
    
    // Upload button
    uploadBtn.onclick = handleUpload;
    
    // Book button
    bookBtn.onclick = handleBooking;
    
    // Date picker change
    document.getElementById('appointmentDate').onchange = loadTimeSlots;
}

// Setup date picker with minimum date (tomorrow)
function setupDatePicker() {
    const dateInput = document.getElementById('appointmentDate');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Set min date to tomorrow
    dateInput.min = tomorrow.toISOString().split('T')[0];
    
    // Set max date to 60 days from now
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 60);
    dateInput.max = maxDate.toISOString().split('T')[0];
}

// Open upload modal
function openUploadModal(id, name) {
    currentCredentialId = id;
    document.getElementById('modalCredentialName').textContent = name;
    document.getElementById('credentialText').value = '';
    document.getElementById('credentialFile').value = '';
    uploadModal.classList.add('show');
}

// Open calendar modal
function openCalendarModal(id, name) {
    currentCredentialId = id;
    document.getElementById('calendarCredentialName').textContent = name;
    document.getElementById('appointmentDate').value = '';
    document.getElementById('timeSlots').innerHTML = '<p style="text-align: center; color: #666;">Please select a date first</p>';
    selectedTimeSlot = null;
    bookBtn.disabled = true;
    calendarModal.classList.add('show');
}

// Close all modals
function closeModals() {
    uploadModal.classList.remove('show');
    calendarModal.classList.remove('show');
    currentCredentialId = null;
    selectedTimeSlot = null;
}

// Handle credential upload
async function handleUpload() {
    const textInput = document.getElementById('credentialText').value.trim();
    const fileInput = document.getElementById('credentialFile').files[0];
    
    if (!textInput && !fileInput) {
        alert('Please provide credential text or upload a file.');
        return;
    }
    
    try {
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';
        
        const formData = new FormData();
        
        if (fileInput) {
            formData.append('file', fileInput);
        } else {
            formData.append('credential_text', textInput);
        }
        
        const response = await fetch(`${API_BASE}/api/credentials/${currentCredentialId}/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }
        
        const result = await response.json();
        
        // Show success message
        alert('✓ Credential uploaded successfully!');
        
        // Reload credentials
        await loadCredentials();
        
        // Close modal
        closeModals();
    } catch (error) {
        console.error('Upload error:', error);
        alert(`Failed to upload credential: ${error.message}`);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload Credential';
    }
}

// Load available time slots for selected date
async function loadTimeSlots() {
    const dateInput = document.getElementById('appointmentDate');
    const date = dateInput.value;
    
    if (!date) return;
    
    // Check if date is a weekday
    const selectedDate = new Date(date + 'T00:00:00');
    const dayOfWeek = selectedDate.getDay();
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        document.getElementById('timeSlots').innerHTML = `
            <p style="text-align: center; color: #dc2626; grid-column: 1/-1;">
                Sorry, appointments are only available Monday-Friday.
            </p>
        `;
        return;
    }
    
    try {
        const timeSlotsContainer = document.getElementById('timeSlots');
        timeSlotsContainer.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1/-1;">Loading available times...</p>';
        
        const response = await fetch(`${API_BASE}/api/appointments/available?date=${date}`);
        if (!response.ok) throw new Error('Failed to load time slots');
        
        const data = await response.json();
        const availableSlots = data.available;
        
        if (availableSlots.length === 0) {
            timeSlotsContainer.innerHTML = `
                <p style="text-align: center; color: #666; grid-column: 1/-1;">
                    No available time slots for this date. Please select another date.
                </p>
            `;
            return;
        }
        
        timeSlotsContainer.innerHTML = availableSlots.map(time => {
            const displayTime = formatTime(time);
            return `
                <div class="time-slot" onclick="selectTimeSlot('${time}', this)">
                    ${displayTime}
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading time slots:', error);
        document.getElementById('timeSlots').innerHTML = `
            <p style="text-align: center; color: #dc2626; grid-column: 1/-1;">
                Failed to load time slots. Please try again.
            </p>
        `;
    }
}

// Format time from 24h to 12h format
function formatTime(time) {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

// Select time slot
function selectTimeSlot(time, element) {
    // Remove previous selection
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    
    // Add selection to clicked slot
    element.classList.add('selected');
    selectedTimeSlot = time;
    bookBtn.disabled = false;
}

// Handle appointment booking
async function handleBooking() {
    const date = document.getElementById('appointmentDate').value;
    
    if (!date || !selectedTimeSlot) {
        alert('Please select a date and time.');
        return;
    }
    
    try {
        bookBtn.disabled = true;
        bookBtn.textContent = 'Booking...';
        
        const response = await fetch(`${API_BASE}/api/appointments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                credential_id: currentCredentialId,
                appointment_date: date,
                appointment_time: selectedTimeSlot
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Booking failed');
        }
        
        const result = await response.json();
        
        // Show success message
        const displayTime = formatTime(selectedTimeSlot);
        const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        alert(`✓ Appointment booked successfully!\n\nDate: ${displayDate}\nTime: ${displayTime} PST\n\nYou will receive a confirmation email shortly.`);
        
        // Close modal
        closeModals();
    } catch (error) {
        console.error('Booking error:', error);
        alert(`Failed to book appointment: ${error.message}`);
        
        // Reload time slots in case the slot was taken
        loadTimeSlots();
    } finally {
        bookBtn.disabled = false;
        bookBtn.textContent = 'Book Appointment';
    }
}

// Make functions globally accessible
window.toggleCard = toggleCard;
window.openUploadModal = openUploadModal;
window.openCalendarModal = openCalendarModal;
window.selectTimeSlot = selectTimeSlot;

