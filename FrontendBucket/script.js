// API Configuration done by deploy.sh (assumed to be injected via deploy.sh)
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');

    const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    // Initialize contacts array in memory
    let contactsData = [];
    
    // Initialize chart objects
    window.companyDistributionChart = null;
    window.industryInsightsChart = null;
    
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded properly. Loading from CDN...');
        // Try to load Chart.js dynamically
        const chartScript = document.createElement('script');
        chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
        chartScript.onload = () => console.log('Chart.js loaded dynamically');
        chartScript.onerror = (e) => console.error('Failed to load Chart.js dynamically', e);
        document.head.appendChild(chartScript);
    } else {
        console.log('Chart.js is available');
    }

    // DOM elements
    const resetBtn = document.getElementById('resetBtn');
    const previewImage = document.getElementById('previewImage');
    const processingStatus = document.getElementById('processingStatus');
    const fileUpload = document.getElementById('fileUpload');
    const contactsList = document.getElementById('contactsList');
    const noContacts = document.getElementById('noContacts');
    const searchContacts = document.getElementById('searchContacts');
    const filterByTag = document.getElementById('filterByTag');
    const filterByIndustry = document.getElementById('filterByIndustry');
    const sortContacts = document.getElementById('sortContacts');
    const scanTab = document.getElementById('scanTab');
    const contactsTab = document.getElementById('contactsTab');
    const networkTab = document.getElementById('networkTab');
    const scanContent = document.getElementById('scanContent');
    const contactsContent = document.getElementById('contactsContent');
    const networkContent = document.getElementById('networkContent');
    const signInModal = document.getElementById('signInModal');
    const signInForm = document.getElementById('signInForm');
    const signInError = document.getElementById('signInError');
    const signOutBtn = document.getElementById('signOutBtn');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const networkGraph = document.getElementById('networkGraph');
    const clusterStats = document.getElementById('clusterStats');
    const topCompanies = document.getElementById('topCompanies');
    const uploadProgress = document.getElementById('uploadProgress');
    const thumbnailGallery = document.getElementById('thumbnailGallery');
    const scanCompleteMessage = document.getElementById('scanCompleteMessage');
    const goToContacts = document.getElementById('goToContacts');
    const editContactModal = document.getElementById('editContactModal');
    const editContactForm = document.getElementById('editContactForm');
    const editCardId = document.getElementById('editCardId');
    const editName = document.getElementById('editName');
    const editCompany = document.getElementById('editCompany');
    const editDepartment = document.getElementById('editDepartment');
    const editTitle = document.getElementById('editTitle');
    const editEmail = document.getElementById('editEmail');
    const editPhone = document.getElementById('editPhone');
    const editAddress = document.getElementById('editAddress');
    const editWebsite = document.getElementById('editWebsite');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const deleteAllModal = document.getElementById('deleteAllModal');
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    const cancelDeleteAllBtn = document.getElementById('cancelDeleteAllBtn');
    const confirmDeleteAllBtn = document.getElementById('confirmDeleteAllBtn');
    // Chat elements
    const chatButton = document.getElementById('chatButton');
    const chatWindow = document.getElementById('chatWindow');
    const closeChat = document.getElementById('closeChat');
    const chatMessages = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');

    // Chat state
    let chatHistory = [];

    // Chat functions
    function addMessage(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `flex ${isUser ? 'justify-end' : 'justify-start'}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = `max-w-[80%] rounded-lg p-3 ${
            isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
        }`;
        
        // Convert \n to <br> for AI responses
        if (!isUser) {
            messageContent.innerHTML = message.replace(/\n/g, '<br>');
        } else {
            messageContent.textContent = message;
        }
        messageDiv.appendChild(messageContent);
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Add to history
        chatHistory.push({ message, isUser });
    }

    function showChat() {
        chatWindow.classList.remove('hidden');
        chatButton.classList.add('hidden');
        chatInput.focus();
        
        // Add welcome message if chat is empty
        if (chatHistory.length === 0) {
            addMessage("Hello! I'm your Contact Database Assistant. I can help you analyze your contacts, find specific information, and provide insights about your network. What would you like to know?");
        }
    }

    function hideChat() {
        chatWindow.classList.add('hidden');
        chatButton.classList.remove('hidden');
    }

    async function handleChatMessage(message) {
        try {
            // Show typing indicator
            const typingDiv = document.createElement('div');
            typingDiv.id = 'aiTypingIndicator';
            typingDiv.className = 'flex justify-start';
            typingDiv.innerHTML = `
                <div class="bg-gray-100 rounded-lg p-3">
                    <div class="flex space-x-2">
                        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
                    </div>
                </div>
            `;
            chatMessages.appendChild(typingDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // Process the message with DeepSeek
            const response = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message,
                    userId,
                    contacts: contactsData
                })
            });

            if (!response.ok) {
                // Remove typing indicator before throwing error
                const typingIndicator = document.getElementById('aiTypingIndicator');
                if (typingIndicator) typingIndicator.remove();
                throw new Error('Failed to get response from chat service');
            }

            const data = await response.json();

            // Remove typing indicator after receiving response
            const typingIndicator = document.getElementById('aiTypingIndicator');
            if (typingIndicator) typingIndicator.remove();

            addMessage(data.response);
        } catch (error) {
            // Remove typing indicator if error occurs
            const typingIndicator = document.getElementById('aiTypingIndicator');
            if (typingIndicator) typingIndicator.remove();
            console.error('Error handling chat message:', error);
            addMessage('I apologize, but I encountered an error processing your request. Please try again.');
        }
    }

    // Chat event listeners
    chatButton.addEventListener('click', showChat);
    closeChat.addEventListener('click', hideChat);
    
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (!message) return;

        // Add user message
        addMessage(message, true);
        chatInput.value = '';

        // Handle the message
        await handleChatMessage(message);
    });

    // Close chat on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !chatWindow.classList.contains('hidden')) {
            hideChat();
        }
    });

    // Debug: Log all critical elements
    console.log('DOM Elements:', {
        uploadProgress: uploadProgress,
        thumbnailGallery: thumbnailGallery,
        processingStatus: processingStatus
    });

    // Warn if processingStatus is missing but proceed
    if (!processingStatus) {
        console.warn('processingStatus element is missing; scan progress updates will be skipped.');
    }

    // Early return if uploadProgress or thumbnailGallery are missing (fatal)
    if (!uploadProgress || !thumbnailGallery) {
        console.error('Critical DOM elements are missing:', {
            uploadProgress: !!uploadProgress,
            thumbnailGallery: !!thumbnailGallery,
            processingStatus: !!processingStatus
        });
        return;
    }

    // Global variables
    let userId = null; // Store the Cognito userId (sub)

    // Toast notification function
    function showToast(message, type = 'error') {
        // Create toast element if it doesn't exist
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg transform transition-transform duration-300 ease-in-out z-50 hidden';
            document.body.appendChild(toast);
        }
        
        // Set toast style based on type
        if (type === 'error') {
            toast.className = toast.className.replace(/bg-\w+-\d+/g, '') + ' bg-red-500 text-white';
        } else if (type === 'success') {
            toast.className = toast.className.replace(/bg-\w+-\d+/g, '') + ' bg-green-500 text-white';
        } else {
            toast.className = toast.className.replace(/bg-\w+-\d+/g, '') + ' bg-blue-500 text-white';
        }
        
        // Set message and show toast
        toast.textContent = message;
        toast.classList.remove('hidden');
        toast.classList.add('transform', 'translate-y-0');
        
        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.classList.add('hidden');
            toast.classList.remove('transform', 'translate-y-0');
        }, 3000);
    }

    // Authentication Functions
    async function isAuthenticated() {
        return new Promise((resolve) => {
            const cognitoUser = userPool.getCurrentUser();
            if (cognitoUser) {
                cognitoUser.getSession((err, session) => {
                    if (err || !session.isValid()) {
                        resolve(false);
                    } else {
                        userId = session.getIdToken().payload.sub; // Store userId (sub)
                        resolve(true);
                    }
                });
            } else {
                resolve(false);
            }
        });
    }

    function showSignInModal() {
        signInModal.classList.remove('hidden');
        signInError.classList.add('hidden');
    }

    function hideSignInModal() {
        signInModal.classList.add('hidden');
    }

    // Tab Switching with Authentication
    async function switchToTab(tab) {
        if (await isAuthenticated()) {
            // First, update UI immediately to show the selected tab content
            [scanTab, contactsTab, networkTab].forEach(t => t.classList.remove('tab-active'));
            [scanContent, contactsContent, networkContent].forEach(c => c.classList.add('hidden'));
            
            // Show the selected tab content immediately
            if (tab === 'scan') {
                scanTab.classList.add('tab-active');
                scanContent.classList.remove('hidden');
                
                // Show a loading placeholder if needed
                if (thumbnailGallery && thumbnailGallery.children.length === 0) {
                    thumbnailGallery.innerHTML = '<div class="text-center py-4">Ready to scan business cards</div>';
                }
            } else if (tab === 'contacts') {
                contactsTab.classList.add('tab-active');
                contactsContent.classList.remove('hidden');
                
                // Show loading state if no contacts are loaded yet
                if (contactsList && contactsData.length === 0) {
                    contactsList.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div><p>Loading contacts...</p></div>';
                    noContacts.classList.add('hidden');
                } else {
                    // Apply current filters to existing data
                    filterAndSortContacts();
                }
            } else if (tab === 'network') {
                networkTab.classList.add('tab-active');
                networkContent.classList.remove('hidden');
                
                // Always refresh network visualizations when switching to the network tab
                if (contactsData.length > 0) {
                    updateNetworkVisualization();
                    updateNetworkAnalytics();
                } else {
                    // Show loading state in network visualization area if needed
                    networkGraph.innerHTML = '<div class="flex items-center justify-center h-full"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4 mr-2"></div><p>Loading network data...</p></div>';
                }
            }
            
            // Then, load data asynchronously if needed
            if (contactsData.length === 0) {
                // Start loading contacts in the background
                loadContacts().then(() => {
                    // After contacts are loaded, update the current tab's content
                    if (tab === 'contacts') {
                        filterAndSortContacts();
                    } else if (tab === 'network') {
                        updateNetworkVisualization();
                        updateNetworkAnalytics();
                    }
                }).catch(error => {
                    console.error('Error loading contacts:', error);
                    // Show error state in the current tab
                    if (tab === 'contacts' && contactsList) {
                        contactsList.innerHTML = '<div class="text-center py-8 text-red-600"><p>Failed to load contacts. Please try again.</p></div>';
                    } else if (tab === 'network' && networkGraph) {
                        networkGraph.innerHTML = '<div class="text-center py-8 text-red-600"><p>Failed to load network data. Please try again.</p></div>';
                    }
                });
            }
        } else {
            showSignInModal();
        }
    }

    // Event Listeners for Tabs
    scanTab.addEventListener('click', () => switchToTab('scan'));
    contactsTab.addEventListener('click', () => switchToTab('contacts'));
    networkTab.addEventListener('click', () => switchToTab('network'));
    goToContacts.addEventListener('click', (e) => {
        e.preventDefault();
        switchToTab('contacts');
    });

    // Search and Sort Functionality
    searchContacts.addEventListener('input', () => {
        filterAndSortContacts();
    });

    filterByIndustry.addEventListener('change', () => {
        filterAndSortContacts();
    });

    sortContacts.addEventListener('change', () => {
        filterAndSortContacts();
    });

    function filterAndSortContacts() {
        if (!contactsData || !Array.isArray(contactsData)) {
            console.error('No valid contacts data available for filtering/sorting');
                return;
            }

        const searchTerm = searchContacts.value.toLowerCase();
        const sortValue = sortContacts.value;
        const selectedIndustry = filterByIndustry.value;
        
        // Filter contacts based on search term and industry using the locally stored contactsData
        let filteredContacts = contactsData.filter(contact => {
            // Check if contact has all required fields
            if (!contact) return false;
            
            // Check industry filter
            if (selectedIndustry && contact.industry !== selectedIndustry) {
                return false;
            }
            
            // Search across all text fields
            return (
                (contact.name && contact.name.toLowerCase().includes(searchTerm)) ||
                (contact.company && contact.company.toLowerCase().includes(searchTerm)) ||
                (contact.title && contact.title.toLowerCase().includes(searchTerm)) ||
                (contact.email && contact.email.toLowerCase().includes(searchTerm)) ||
                (contact.phone && contact.phone.toLowerCase().includes(searchTerm)) ||
                (contact.address && contact.address.toLowerCase().includes(searchTerm)) ||
                (contact.website && contact.website.toLowerCase().includes(searchTerm))
            );
        });
        
        // Sort filtered contacts
        filteredContacts.sort((a, b) => {
            switch (sortValue) {
                case 'nameAsc':
                    return (a.name || '').localeCompare(b.name || '');
                case 'nameDesc':
                    return (b.name || '').localeCompare(a.name || '');
                case 'companyAsc':
                    return (a.company || '').localeCompare(b.company || '');
                case 'companyDesc':
                    return (b.company || '').localeCompare(a.company || '');
                case 'dateDesc':
                    return new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0);
                case 'dateAsc':
                    return new Date(a.dateAdded || 0) - new Date(b.dateAdded || 0);
                default:
                    return 0;
            }
        });
        
        // Update the UI with filtered and sorted contacts
        updateContactsList(filteredContacts);
    }

    // Helper function to escape HTML special characters
    function escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Function to update contact card with compressed image
    function updateContactsList(contacts) {
        if (!contactsList) return;
        
        if (contacts.length === 0) {
            contactsList.innerHTML = '';
            noContacts.classList.remove('hidden');
            return;
        }
        
        noContacts.classList.add('hidden');
        contactsList.innerHTML = `
        <div class="grid gap-6"
             style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); width: 100%;">
            ${contacts.map(contact => `
                <div class="contact-card bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
                    <div class="p-4 flex-1 flex flex-col">
                        <div class="flex items-start mb-2">
                            ${contact.cachedImageUrl ? 
                                `<div class="mr-4 w-16 h-16 flex-shrink-0">
                                    <img src="${contact.cachedImageUrl}" 
                                         alt="${contact.name || 'Contact'}" 
                                         class="w-full h-full object-cover rounded cursor-pointer thumbnail-image"
                                         data-card-id="${contact.cardId}"
                                         loading="lazy">
                                </div>` 
                                : ''
                            }
                            <div class="flex-1 min-w-0">
                                <h3 class="text-lg font-semibold text-gray-900 truncate">${contact.name || 'Unnamed Contact'}</h3>
                                <p class="text-sm text-gray-600">${contact.title || ''}</p>
                                <p class="text-sm font-medium text-gray-800">${contact.company || ''}</p>
                            </div>
                        </div>
                        <div class="space-y-2 mb-4">
                            ${contact.email ? `<p class="text-sm"><span class="font-medium">Email:</span> ${contact.email}</p>` : ''}
                            ${contact.phone ? `<p class="text-sm"><span class="font-medium">Phone:</span> ${contact.phone}</p>` : ''}
                            ${contact.website ? `<p class="text-sm"><span class="font-medium">Website:</span> ${contact.website}</p>` : ''}
                            ${contact.address ? `<p class="text-sm"><span class="font-medium">Address:</span> ${contact.address}</p>` : ''}
                        </div>
                        <div class="mt-auto flex justify-end space-x-2">
                            <button 
                                class="download-vcard-btn px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm flex items-center"
                                type="button"
                                data-card-id="${contact.cardId}"
                                title="Download vCard"
                                aria-label="Download vCard">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v12m0 0l-4-4m4 4l4-4m-4 4V4" />
                                </svg>
                            </button>
                            <button 
                                class="edit-contact-btn px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm" 
                                type="button"
                                data-card-id="${contact.cardId}">
                                Edit
                            </button>
                            <button 
                                class="delete-contact-btn px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm" 
                                type="button"
                                data-card-id="${contact.cardId}">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

        // Attach event listeners safely (no inline JS)
        document.querySelectorAll('.edit-contact-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const cardId = btn.dataset.cardId;
                const contact = contactsData.find(c => c.cardId === cardId);
                if (contact) {
                    showEditContactModal(contact);
                }
            });
        });

        document.querySelectorAll('.delete-contact-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const cardId = btn.dataset.cardId;
                if (confirm('Are you sure you want to delete this contact?')) {
                    deleteContact(cardId);
                }
            });
        });

        // Add click event to thumbnail images to show original image
        document.querySelectorAll('.thumbnail-image').forEach(img => {
            img.addEventListener('click', () => {
                const cardId = img.dataset.cardId;
                const contact = contactsData.find(c => c.cardId === cardId);
                if (contact && contact.originalImageUrl) {
                    showOriginalImage(contact.originalImageUrl);
                }
            });
        });

        // Attach event listeners for vCard download buttons
        document.querySelectorAll('.download-vcard-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const cardId = btn.dataset.cardId;
                if (!cardId || !userId) {
                    showToast('Unable to download vCard', 'error');
                    return;
                }
                try {
                    const response = await fetch(`${API_URL}/vcard/${cardId}?userId=${encodeURIComponent(userId)}`);
                    if (!response.ok) throw new Error('Failed to download vCard');
                    const vcardContent = await response.text();
                    const filename = `contact_${cardId}.vcf`;
                    const blob = new Blob([vcardContent], { type: 'text/vcard' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    showToast('vCard downloaded', 'success');
                } catch (err) {
                    showToast('Failed to download vCard', 'error');
                }
            });
        });
    }

    // Reset Uploads
    resetBtn.addEventListener('click', () => {
        resetBtn.classList.add('hidden');
        if (processingStatus) processingStatus.textContent = '';
        uploadProgress.textContent = '';
        thumbnailGallery.innerHTML = '';
        scanCompleteMessage.classList.add('hidden');
    });

    // Update createThumbnail function
    function createThumbnail(imageDataUrl, maxWidth = 150, maxHeight = 150, quality = 0.6) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = function() {
                // Calculate new dimensions while maintaining aspect ratio
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round(height * (maxWidth / width));
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round(width * (maxHeight / height));
                        height = maxHeight;
                    }
                }
                
                // Create canvas and draw resized image
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to compressed data URL
                const thumbnailDataUrl = canvas.toDataURL('image/jpeg', quality);
                
                // Clean up
                resolve(thumbnailDataUrl);
            };
            img.src = imageDataUrl;
        });
    }

    // Process Single Business Card File
    async function processBusinessCardFile(file) {
        // Add file validation
        if (!file || !file.type.startsWith('image/')) {
            throw new Error('Invalid file type. Please upload an image.');
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            throw new Error('File too large. Maximum size is 5MB.');
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const imageDataUrl = e.target.result;
                    const imageBase64 = imageDataUrl.split(',')[1];

                    console.log('Sending API request for file');
                    const response = await fetch(`${API_URL}/scan`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ 
                            images: [imageBase64], // Single image per request
                            userId: userId
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to process business card: ${response.status} ${response.statusText}`);
                    }

                    const result = await response.json();
                    console.log('API Response received:', result);
                    
                    // Successfully processed
                    resolve(result);
                } catch (error) {
                    console.error('Error in processBusinessCardFile:', error);
                    if (processingStatus) processingStatus.textContent = 'Error processing image';
                    showToast('Failed to process business card', 'error');
                    reject(error);
                }
            };
            reader.onerror = (error) => {
                console.error('FileReader error:', error);
                reject(new Error('Error reading file'));
            };
            reader.readAsDataURL(file);
        });
    }
    
    // Function to show original image in a modal
    function showOriginalImage(originalImageDataUrl) {
        // Create modal if it doesn't exist
        let imageModal = document.getElementById('originalImageModal');
        if (!imageModal) {
            const modalHtml = `
                <div id="originalImageModal" class="fixed inset-0 bg-black bg-opacity-75 hidden flex items-center justify-center z-50">
                    <div class="relative max-w-4xl w-full mx-4">
                        <button id="closeImageModal" class="absolute top-2 right-2 bg-white rounded-full p-1 shadow-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <img id="originalImage" src="" alt="Original business card" class="max-h-[90vh] max-w-full object-contain rounded shadow-lg">
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            imageModal = document.getElementById('originalImageModal');
            
            // Add event listener to close button
            document.getElementById('closeImageModal').addEventListener('click', () => {
                imageModal.classList.add('hidden');
            });
            
            // Close on click outside the image
            imageModal.addEventListener('click', (e) => {
                if (e.target === imageModal) {
                    imageModal.classList.add('hidden');
                }
            });
        }
        
        // Set image source and show modal
        document.getElementById('originalImage').src = originalImageDataUrl;
        imageModal.classList.remove('hidden');
    }

    // Track if contacts are currently being loaded
    let isLoadingContacts = false;

    async function loadContacts() {
                    if (!userId) {
            console.error('No userId available');
            return;
        }

        // Prevent duplicate API calls if already loading
        if (isLoadingContacts) {
            console.log('Already loading contacts, skipping duplicate call');
            return;
        }

        isLoadingContacts = true;

        try {
            const response = await fetch(`${API_URL}/contacts?userId=${encodeURIComponent(userId)}`);
            if (!response.ok) {
                throw new Error('Failed to load contacts');
            }

            const data = await response.json();
            console.log('Loaded contacts data:', data);
            
            // Handle both formats: direct array or {contacts: [...]} object
            if (Array.isArray(data)) {
                contactsData = data;
            } else if (data.contacts && Array.isArray(data.contacts)) {
                contactsData = data.contacts;
            } else {
                console.error('Invalid contacts data format:', data);
                showToast('Error loading contacts: Invalid data format', 'error');
                return;
            }
            
            // Cache image URLs and create thumbnails for all contacts
            for (const contact of contactsData) {
                if (contact.imageUrl) {
                    try {
                        // Store the API URL for fetching the original image
                        contact.originalImageUrl = `${API_URL}/images/${contact.cardId}?userId=${encodeURIComponent(userId)}`;
                        
                        // Check if we already have a cached thumbnail in localStorage
                        const cachedThumbnail = localStorage.getItem(`thumbnail_${contact.cardId}`);
                        
                        if (cachedThumbnail) {
                            // Use cached thumbnail if available
                            contact.cachedImageUrl = cachedThumbnail;
            } else {
                            // Fetch the image and create a thumbnail
                            const imgResponse = await fetch(contact.originalImageUrl);
                            if (imgResponse.ok) {
                                const blob = await imgResponse.blob();
                                const reader = new FileReader();
                                
                                // Convert blob to data URL
                                const imageDataUrl = await new Promise((resolve, reject) => {
                                    reader.onloadend = () => resolve(reader.result);
                                    reader.onerror = reject;
                                    reader.readAsDataURL(blob);
                                });
                                
                                // Create thumbnail
                                const thumbnailDataUrl = await createThumbnail(imageDataUrl, 100, 100, 0.5);
                                
                                // Cache the thumbnail in localStorage
                                try {
                                    localStorage.setItem(`thumbnail_${contact.cardId}`, thumbnailDataUrl);
                                } catch (e) {
                                    // Handle localStorage quota exceeded
                                    console.warn('Could not cache thumbnail in localStorage:', e);
                                }
                                
                                contact.cachedImageUrl = thumbnailDataUrl;
                            } else {
                                // Fallback to original URL if fetch fails
                                contact.cachedImageUrl = contact.originalImageUrl;
                            }
                        }
                    } catch (error) {
                        console.warn(`Error creating thumbnail for contact ${contact.cardId}:`, error);
                        // Fallback to original URL
                        contact.cachedImageUrl = contact.originalImageUrl;
                    }
                }
            }
            
            // Apply current search and sort filters to the locally stored data
            filterAndSortContacts();
            
            // Update network visualization with new data
            updateNetworkVisualization();
            
            // Update analytics with new data
            updateNetworkAnalytics();
        } catch (error) {
            console.error('Error loading contacts:', error);
            showToast('Failed to load contacts', 'error');
        } finally {
            isLoadingContacts = false;
        }
    }

    // Global functions for contact management
    async function deleteContact(cardId) {
        if (!userId) {
            console.error('No userId available');
            showToast('Please sign in to delete contacts', 'error');
            return;
        }

        // Store the cardId in the modal's dataset
        deleteContactModal.dataset.cardId = cardId;
        // Show the modal
        deleteContactModal.classList.remove('hidden');
    }

    function showEditContactModal(contact) {
        // If we received a cardId instead of a contact object, find the contact
        if (typeof contact === 'string') {
            const cardId = contact;
            contact = contactsData.find(c => c.cardId === cardId);
            if (!contact) {
                console.error('Contact not found for cardId:', cardId);
                showToast('Error: Contact not found');
                return;
            }
        }

        // Debug: Log contact object to check for problematic characters
        console.debug('showEditContactModal: contact object:', contact);

        const modal = document.getElementById('editContactModal');
        const form = document.getElementById('editContactForm');

        // Store the original contact data
        form.dataset.originalContact = JSON.stringify(contact);

        // Defensive: Ensure all fields exist and are strings
        try {
            document.getElementById('editName').value = contact.name || '';
            document.getElementById('editTitle').value = contact.title || '';
            document.getElementById('editCompany').value = contact.company || '';
            document.getElementById('editEmail').value = contact.email || '';
            document.getElementById('editPhone').value = contact.phone || '';
            document.getElementById('editWebsite').value = contact.website || '';
            document.getElementById('editAddress').value = contact.address || '';
        } catch (err) {
            console.error('showEditContactModal: Error setting input values', err, contact);
            showToast('Error populating edit modal fields');
        }

        // Debug: Log the address value being set
        console.debug('showEditContactModal: address value:', contact.address);

        // Show the modal
        modal.classList.remove('hidden');
        
        // Focus the first input field
        document.getElementById('editName').focus();
        
        // Prevent body scrolling when modal is open
        document.body.style.overflow = 'hidden';
    }

    function hideEditContactModal() {
        const modal = document.getElementById('editContactModal');
        modal.classList.add('hidden');
        // Restore body scrolling
        document.body.style.overflow = '';
    }

    // Update event listeners for modal closing
    document.getElementById('closeEditModal').addEventListener('click', hideEditContactModal);
    document.getElementById('cancelEditBtn').addEventListener('click', hideEditContactModal);

    // Close modal when clicking outside
    document.getElementById('editContactModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            hideEditContactModal();
        }
    });

    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !document.getElementById('editContactModal').classList.contains('hidden')) {
            hideEditContactModal();
        }
    });

    // Update form submission to use the new hide function
    editContactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const originalContact = JSON.parse(form.dataset.originalContact);
        
        // Create updated contact object, preserving all original fields
        const updatedContact = {
            ...originalContact,  // Preserve all original fields including imageUrl
            name: document.getElementById('editName').value,
            title: document.getElementById('editTitle').value,
            company: document.getElementById('editCompany').value,
            department: document.getElementById('editDepartment').value,
            industry: document.getElementById('editIndustry').value,
            email: document.getElementById('editEmail').value,
            phone: document.getElementById('editPhone').value,
            website: document.getElementById('editWebsite').value,
            address: document.getElementById('editAddress').value,
            dateAdded: document.getElementById('editDateAdded').value
        };
        
        console.log('Updating contact:', updatedContact);
        
        try {
            const response = await fetch(`${API_URL}/contacts/${originalContact.cardId}?userId=${encodeURIComponent(userId)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedContact)
            });

            if (!response.ok) {
                throw new Error('Failed to update contact');
            }

            // Update local data
            const index = contactsData.findIndex(c => c.cardId === originalContact.cardId);
            if (index !== -1) {
                contactsData[index] = updatedContact;
            }
            
            // Close modal and update UI and visualizations
            hideEditContactModal();
            refreshAllVisualizations();
            
            showToast('Contact updated successfully', 'success');
        } catch (error) {
            console.error('Error updating contact:', error);
            showToast('Failed to update contact', 'error');
        }
    });

    // Function to update network visualization
    function updateNetworkVisualization() {
        const networkContainer = document.getElementById('networkGraph');
        const emptyNetworkMsg = document.getElementById('minContactsMessage');
        
        try {
            if (!networkContainer) {
                console.error('Network container element not found');
                return;
            }

            // Clear previous content
            networkContainer.innerHTML = '';
            
            // If there are fewer than 2 contacts, show the message and don't render the visualization
            if (!contactsData || contactsData.length < 2) {
                // Create or show the message element
                networkContainer.innerHTML = `
                    <div id="minContactsMessage" class="flex items-center justify-center h-64 text-gray-500">
                        Add at least 2 contacts to see a network visualization
                    </div>
                `;
                
                // Update charts too for consistency
                updateCompanyDistributionChart();
                updateIndustryInsightsChart();
                
                return;
            }
            
            // Stop any existing simulation
            if (window.currentSimulation) {
                try {
                    window.currentSimulation.stop();
                } catch (e) {
                    console.log('Error stopping previous simulation:', e);
                }
                window.currentSimulation = null;
            }
            
            // D3 Network Visualization Implementation
            
            // Get the view type (company, industry, location)
            const viewType = document.getElementById('networkViewType')?.value || 'company';
            
            // Set up the SVG container with responsive dimensions
            const width = networkContainer.clientWidth;
            const height = networkContainer.clientHeight || 400;
            
            const svg = d3.select("#networkGraph")
                .append("svg")
                .attr("width", width)
                .attr("height", height)
                .attr("viewBox", [0, 0, width, height])
                .attr("style", "max-width: 100%; height: auto;");
            
            // Add zoom behavior
            const zoom = d3.zoom()
                .scaleExtent([0.5, 5])
                .on("zoom", (event) => {
                    g.attr("transform", event.transform);
                });
            
            svg.call(zoom);
            
            // Create a group for all elements to enable zooming
            const g = svg.append("g");
            
            // Create the graph data structure
            const nodes = [];
            const links = [];
            
            // Add user as central node
            nodes.push({
                id: "user",
                name: "You",
                group: "center",
                radius: 20
            });
            
            // Process contacts based on view type
            const groupedContacts = {};
            
            contactsData.forEach(contact => {
                let groupKey;
                
                switch(viewType) {
                    case 'industry':
                        // Use the industry field directly from the contact
                        groupKey = contact.industry || "Unknown";
                        break;
                    case 'location':
                        // Extract location from address if available
                        groupKey = extractLocation(contact.address) || "Unknown";
                        break;
                    case 'company':
                    default:
                        groupKey = contact.company || "Unknown";
                }
                
                if (!groupedContacts[groupKey]) {
                    groupedContacts[groupKey] = [];
                    
                    // Add a group node
                    nodes.push({
                        id: `group-${groupKey}`,
                        name: groupKey,
                        group: groupKey,
                        radius: 15,
                        isGroupNode: true
                    });
                    
                    // Link group to center
                    links.push({
                        source: "user",
                        target: `group-${groupKey}`,
                        value: 1
                    });
                }
                
                // Add contact to group
                groupedContacts[groupKey].push(contact);
                
                // Add contact node
                nodes.push({
                    id: contact.cardId,
                    name: contact.name || "Unknown",
                    title: contact.title || "",
                    company: contact.company || "",
                    email: contact.email || "",
                    phone: contact.phone || "",
                    group: groupKey,
                    radius: 8,
                    imageUrl: contact.cachedImageUrl
                });
                
                // Link contact to its group
                links.push({
                    source: `group-${groupKey}`,
                    target: contact.cardId,
                    value: 1
                });
            });
            
            // Create a color scale for groups
            const groups = [...new Set(nodes.map(d => d.group))];
            const color = d3.scaleOrdinal()
                .domain(groups)
                .range(d3.schemeCategory10);
            
            // Create the force simulation with improved forces
            const simulation = d3.forceSimulation(nodes)
                .force("link", d3.forceLink(links).id(d => d.id).distance(d => {
                    // Different distances based on node types
                    if (d.source.id === "user" || d.target.id === "user") return 80;
                    return 40;
                }))
                .force("charge", d3.forceManyBody().strength(d => {
                    // Different strengths based on node types
                    if (d.id === "user") return -300;
                    if (d.isGroupNode) return -150;
                    return -50;
                }))
                .force("center", d3.forceCenter(width / 2, height / 2))
                .force("collision", d3.forceCollide().radius(d => d.radius * 1.5))
                .force("x", d3.forceX(width / 2).strength(0.05))
                .force("y", d3.forceY(height / 2).strength(0.05));
            
            // Create links
            const link = g.append("g")
                .selectAll("line")
                .data(links)
                .join("line")
                .attr("stroke", "#999")
                .attr("stroke-opacity", 0.6)
                .attr("stroke-width", d => Math.sqrt(d.value));
            
            // Create node groups
            const node = g.append("g")
                .selectAll("g")
                .data(nodes)
                .join("g")
                .call(drag(simulation));
            
            // Add circles to nodes
            node.append("circle")
                .attr("r", d => d.radius)
                .attr("fill", d => {
                    if (d.id === "user") return "#4f46e5"; // Indigo for user
                    if (d.isGroupNode) return color(d.group);
                    return d3.color(color(d.group)).brighter(0.5);
                })
                .attr("stroke", d => d3.color(color(d.group)).darker(0.5))
                .attr("stroke-width", 1.5);
            
            // Add labels to nodes
            node.append("text")
                .attr("dx", d => d.radius + 5)
                .attr("dy", ".35em")
                .text(d => d.name)
                .attr("font-size", d => {
                    if (d.id === "user" || d.isGroupNode) return "12px";
                    return "10px";
                })
                .attr("fill", "#333");
            
            // Add tooltips
            node.append("title")
                .text(d => {
                    if (d.id === "user") return "You";
                    if (d.isGroupNode) return `Group: ${d.name}`;
                    return `${d.name}\n${d.title}\n${d.company}\n${d.email}\n${d.phone}`;
                });
            
            // Update positions on tick
            simulation.on("tick", () => {
                link
                    .attr("x1", d => d.source.x)
                    .attr("y1", d => d.source.y)
                    .attr("x2", d => d.target.x)
                    .attr("y2", d => d.target.y);
                    
                node.attr("transform", d => `translate(${d.x},${d.y})`);
            });
            
            // Add legend
            const legend = svg.append("g")
                .attr("class", "legend")
                .attr("transform", `translate(10, 10)`);
            
            legend.append("circle")
                .attr("r", 6)
                .attr("cx", 6)
                .attr("cy", 6)
                .attr("fill", "#4f46e5");
            
            legend.append("text")
                .attr("x", 18)
                .attr("y", 10)
                .text("You")
                .attr("font-size", "12px");
            
            legend.append("circle")
                .attr("r", 6)
                .attr("cx", 6)
                .attr("cy", 26)
                .attr("fill", color(groups[0] || "Unknown"));
            
            legend.append("text")
                .attr("x", 18)
                .attr("y", 30)
                .text("Group")
                .attr("font-size", "12px");
            
            legend.append("circle")
                .attr("r", 6)
                .attr("cx", 6)
                .attr("cy", 46)
                .attr("fill", d3.color(color(groups[0] || "Unknown")).brighter(0.5));
            
            legend.append("text")
                .attr("x", 18)
                .attr("y", 50)
                .text("Contact")
                .attr("font-size", "12px");
            
            // Run simulation for a bit to stabilize the layout
            simulation.alpha(1).restart();
            for (let i = 0; i < 100; ++i) simulation.tick();
            
            // Update network analytics
            updateNetworkAnalytics(groupedContacts);
            
            // Add event listener for view type change
            document.getElementById('networkViewType')?.addEventListener('change', updateNetworkVisualization);
            
            // Add event listener for fullscreen button
            document.getElementById('fullscreenNetworkBtn')?.addEventListener('click', toggleFullscreenNetwork);
            
            // Add reset zoom button
            const resetZoomBtn = document.createElement('button');
            resetZoomBtn.className = 'bg-gray-200 hover:bg-gray-300 p-1 rounded absolute top-4 right-4';
            resetZoomBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            `;
            resetZoomBtn.addEventListener('click', () => {
                svg.transition().duration(750).call(
                    zoom.transform,
                    d3.zoomIdentity
                );
            });
            networkContainer.appendChild(resetZoomBtn);
            
            // Store references for cleanup
            window.currentNetworkSvg = svg;
            window.currentSimulation = simulation;

        } catch (error) {
            console.error('Error updating network visualization:', error);
            networkContainer.innerHTML = '<div class="text-center py-4 text-red-500">Error creating network visualization</div>';
        }
    }

    // Drag function for nodes
    function drag(simulation) {
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            // Keep fixed position for user and group nodes
            if (d.id === "user" || d.isGroupNode) {
                return;
            }
            d.fx = null;
            d.fy = null;
        }
        
        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }

    // Helper function to extract industry from company or title
    function extractIndustry(company, title) {
        if (!company && !title) return "Unknown";
        
        const industries = [
            "Technology", "Finance", "Healthcare", "Education", 
            "Manufacturing", "Retail", "Media", "Legal", "Consulting",
            "Real Estate", "Construction", "Transportation", "Energy"
        ];
        
        const text = `${company || ""} ${title || ""}`.toLowerCase();
        
        // Check for industry keywords
        for (const industry of industries) {
            if (text.includes(industry.toLowerCase())) {
                return industry;
            }
        }
        
        // Default categorization based on common terms
        if (text.match(/tech|software|it|computer|data|digital|web|app|cloud/)) return "Technology";
        if (text.match(/bank|financ|invest|capital|asset|wealth|fund|insurance/)) return "Finance";
        if (text.match(/health|medical|hospital|clinic|pharma|doctor|care/)) return "Healthcare";
        if (text.match(/school|university|college|education|academic|teach/)) return "Education";
        if (text.match(/manufactur|product|factory|industrial/)) return "Manufacturing";
        if (text.match(/retail|shop|store|market|ecommerce|commerce/)) return "Retail";
        if (text.match(/media|news|publish|content|creative|design|market/)) return "Media";
        if (text.match(/law|legal|attorney|advocate|counsel/)) return "Legal";
        if (text.match(/consult|advisor|strategy/)) return "Consulting";
        
        return "Other";
    }

    // Helper function to extract location from address
    function extractLocation(address) {
        if (!address) return "Unknown";
        
        // Simple extraction of last part of address which is often city/state/country
        const parts = address.split(',');
        if (parts.length > 1) {
            return parts[parts.length - 1].trim();
        }
        
        return "Unknown";
    }

    // Function to toggle fullscreen network view
    function toggleFullscreenNetwork() {
        const container = document.getElementById('networkGraph').closest('.bg-white');
        
        function handleResize() {
            if (container.classList.contains('fullscreen')) {
                updateNetworkVisualization();
            }
        }
        
        if (container.classList.contains('fullscreen')) {
            // Exit fullscreen
            container.classList.remove('fullscreen');
            container.style.position = '';
            container.style.top = '';
            container.style.left = '';
            container.style.width = '';
            container.style.height = '';
            container.style.zIndex = '';
            
            // Remove event listener
            window.removeEventListener('resize', handleResize);
            
            // Resize visualization
            updateNetworkVisualization();
        } else {
            // Enter fullscreen
            container.classList.add('fullscreen');
            container.style.position = 'fixed';
            container.style.top = '0';
            container.style.left = '0';
            container.style.width = '100vw';
            container.style.height = '100vh';
            container.style.zIndex = '9999';
            
            // Add event listener
            window.addEventListener('resize', handleResize);
            
            // Resize visualization
            updateNetworkVisualization();
        }
    }

    // Function to update network analytics
    let isUpdatingAnalytics = false;
    function updateNetworkAnalytics(groupedContacts) {
        if (!contactsData || contactsData.length === 0) return;
        
        if (isUpdatingAnalytics) return;
        isUpdatingAnalytics = true;
        
        try {
            // Update dashboard metrics
            updateDashboardMetrics();
            
            // Update key insights
            updateKeyInsights(groupedContacts);
            
            // Update charts
            updateCompanyDistributionChart(groupedContacts);
            updateIndustryInsightsChart();
            
            // Update action items
            updateActionItems(groupedContacts);
        } finally {
            isUpdatingAnalytics = false;
        }
    }

    // Function to update dashboard metrics
    function updateDashboardMetrics() {
        // Total contacts
        const totalContacts = contactsData.length;
        document.getElementById('totalContactsCount').textContent = totalContacts;
        
        // Calculate growth based on dateAdded
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const newContactsThisMonth = contactsData.filter(contact => {
            const dateAdded = new Date(contact.dateAdded || 0);
            return dateAdded >= lastMonth;
        }).length;
        
        // Calculate growth percentage
        const previousMonthContacts = totalContacts - newContactsThisMonth;
        const growthPercentage = previousMonthContacts > 0 
            ? Math.round((newContactsThisMonth / previousMonthContacts) * 100)
            : newContactsThisMonth > 0 ? 100 : 0;
        
        // Update growth metric
        const growthText = newContactsThisMonth > 0 
            ? `+${newContactsThisMonth} (${growthPercentage}%)`
            : '0%';
        document.getElementById('contactsGrowth').textContent = growthText + ' from last month';
        
        // Update industry filter options
        const uniqueIndustries = new Set(contactsData.map(c => c.industry).filter(Boolean));
        const industryFilter = document.getElementById('filterByIndustry');
        const currentValue = industryFilter.value;
        
        // Clear existing options except the first one
        while (industryFilter.options.length > 1) {
            industryFilter.remove(1);
        }
        
        // Add new options
        Array.from(uniqueIndustries).sort().forEach(industry => {
            const option = document.createElement('option');
            option.value = industry;
            option.textContent = industry;
            industryFilter.appendChild(option);
        });
        
        // Restore selected value if it still exists
        if (currentValue && uniqueIndustries.has(currentValue)) {
            industryFilter.value = currentValue;
        }
        
        // Unique companies
        const uniqueCompanies = new Set(contactsData.filter(c => c.company).map(c => c.company)).size || 0;
        document.getElementById('uniqueCompaniesCount').textContent = uniqueCompanies;
        
        // Most common industry
        const industries = contactsData.map(c => c.industry || 'Other');
        const industryCounts = {};
        industries.forEach(i => {
            industryCounts[i] = (industryCounts[i] || 0) + 1;
        });
        
        let topIndustry = 'None';
        let topCount = 0;
        
        Object.entries(industryCounts).forEach(([industry, count]) => {
            if (count > topCount) {
                topIndustry = industry;
                topCount = count;
            }
        });
        
        document.getElementById('topIndustry').textContent = 'Most common: ' + topIndustry;
        
        // Connection strength (based on company diversity)
        let connectionStrength = 0;
        if (totalContacts > 0) {
            // Calculate as ratio of unique companies to contacts, scaled to 100
            connectionStrength = Math.min(Math.round((uniqueCompanies / totalContacts) * 100), 100);
        }
        document.getElementById('connectionStrength').textContent = connectionStrength + '%';
        
        // Add tooltip for connection strength
        const connectionStrengthElement = document.getElementById('connectionStrength').parentElement.parentElement;
        connectionStrengthElement.setAttribute('data-tooltip', 'Connection Strength measures how diverse your network is across companies. It\'s calculated as the percentage of unique companies relative to your total contacts. Higher scores indicate a more diverse network.');
        
        // Connection tip
        let connectionTip = 'Add more contacts to improve';
        if (connectionStrength < 30) {
            connectionTip = 'Try adding contacts from different companies';
        } else if (connectionStrength < 70) {
            connectionTip = 'Good diversity, keep expanding';
        } else {
            connectionTip = 'Excellent company diversity!';
        }
        document.getElementById('connectionTip').textContent = connectionTip;
        
        // Network reach (potential second-degree connections)
        // Simple estimate: each contact could introduce you to ~5 people
        const networkReach = totalContacts > 0 ? totalContacts * 5 : 0;
        document.getElementById('networkReach').textContent = networkReach;
        
        // Add tooltip for network reach
        const networkReachElement = document.getElementById('networkReach').parentElement.parentElement;
        networkReachElement.setAttribute('data-tooltip', 'Network Reach estimates your potential second-degree connections. It assumes each contact could introduce you to approximately 5 new people. This gives you an idea of how far your network could potentially extend.');
        
        document.getElementById('reachMetric').textContent = 'Potential connections';
    }

    // Function to update key insights
    function updateKeyInsights(groupedContacts) {
        const diversityScoreElement = document.getElementById('diversityScore');
        const connectionOpportunitiesElement = document.getElementById('connectionOpportunities');
        const networkingRecommendationElement = document.getElementById('networkingRecommendation');
        
        if (!contactsData || contactsData.length < 2) {
            diversityScoreElement.textContent = 'Add more contacts to see diversity score';
            connectionOpportunitiesElement.textContent = 'Add more contacts to see opportunities';
            networkingRecommendationElement.textContent = 'Add more contacts to get personalized recommendations';
            return;
        }

        // Calculate network diversity
        const companies = contactsData.filter(c => c.company).map(c => c.company);
        const uniqueCompanies = new Set(companies);
        const companyDiversity = companies.length > 0 ? uniqueCompanies.size / companies.length : 0;
        
        const industries = contactsData.map(c => c.industry || 'Other');
        const uniqueIndustries = new Set(industries);
        const industryDiversity = industries.length > 0 ? uniqueIndustries.size / industries.length : 0;
        
        // Calculate overall diversity score (weighted average)
        const diversityScore = Math.round(((companyDiversity * 0.6) + (industryDiversity * 0.4)) * 100);
        
        // Update diversity score insight
        let diversityText = '';
        if (diversityScore < 30) {
            diversityText = `Low diversity score (${diversityScore}%). Your network is concentrated in few companies/industries.`;
        } else if (diversityScore < 70) {
            diversityText = `Moderate diversity score (${diversityScore}%). You have a good balance of connections.`;
        } else {
            diversityText = `High diversity score (${diversityScore}%)! Your network spans many companies and industries.`;
        }
        diversityScoreElement.textContent = diversityText;
        
        // Add tooltip for diversity score
        const diversityScoreContainer = document.getElementById('diversityScore').parentElement;
        diversityScoreContainer.setAttribute('data-tooltip', 'Diversity Score is a comprehensive measure that considers both company and industry diversity. It\'s calculated as a weighted average: 60% based on company diversity and 40% based on industry diversity. A higher score indicates a well-rounded network.');
        
        // Connection opportunities
        let opportunitiesText = '';
        if (uniqueCompanies.size > 1) {
            // Find companies with multiple contacts
            const companyCounts = {};
            companies.forEach(company => {
                companyCounts[company] = (companyCounts[company] || 0) + 1;
            });
            
            const strongCompanies = Object.entries(companyCounts)
                .filter(([_, count]) => count > 1)
                .sort((a, b) => b[1] - a[1]);
            
            if (strongCompanies.length > 0) {
                const [topCompany, count] = strongCompanies[0];
                opportunitiesText = `You have ${count} contacts at ${topCompany}. This could be a strong connection point for new opportunities.`;
            } else {
                opportunitiesText = `You have contacts across ${uniqueCompanies.size} different companies. Consider deepening relationships at key organizations.`;
            }
        } else if (uniqueCompanies.size === 1) {
            opportunitiesText = `All your contacts are at ${Array.from(uniqueCompanies)[0]}. Consider expanding to other companies.`;
        } else {
            opportunitiesText = `Add company information to your contacts to see connection opportunities.`;
        }
        connectionOpportunitiesElement.textContent = opportunitiesText;
        
        // Networking recommendation
        let recommendationText = '';
        if (contactsData.length >= 5) {
            // Find most common industry
            const industryCounts = {};
            industries.forEach(industry => {
                industryCounts[industry] = (industryCounts[industry] || 0) + 1;
            });
            
            const sortedIndustries = Object.entries(industryCounts)
                .sort((a, b) => b[1] - a[1]);
            
            if (sortedIndustries.length > 0) {
                const [topIndustry, _] = sortedIndustries[0];
                
                if (industryDiversity < 0.3) {
                    recommendationText = `Your network is concentrated in ${topIndustry}. Consider expanding to related industries for more diverse opportunities.`;
                } else if (uniqueCompanies.size < 3) {
                    recommendationText = `Try connecting with more companies in the ${topIndustry} industry to strengthen your position.`;
                } else {
                    recommendationText = `You have a well-balanced network. Consider deepening relationships with key contacts.`;
                }
            } else {
                recommendationText = `Add industry information to your contacts to get personalized recommendations.`;
            }
        } else {
            recommendationText = `Add more contacts to get personalized recommendations.`;
        }
        networkingRecommendationElement.textContent = recommendationText;
    }

    // Function to update action items
    function updateActionItems(groupedContacts) {
        const actionItemsContainer = document.getElementById('actionItems');
        const customActionItem = document.getElementById('customActionItem');
        
        if (!contactsData || contactsData.length < 3) {
            // Keep default action items for small networks
            return;
        }
        
        // Get company and industry data
        const companies = contactsData.filter(c => c.company).map(c => c.company);
        const companyCounts = {};
        companies.forEach(company => {
            companyCounts[company] = (companyCounts[company] || 0) + 1;
        });
        
        // Sort companies by count
        const sortedCompanies = Object.entries(companyCounts)
            .sort((a, b) => b[1] - a[1]);
        
        // Update custom action item based on network analysis
        if (customActionItem) {
            const actionTitle = document.createElement('h4');
            actionTitle.className = 'font-medium';
            
            const actionDescription = document.createElement('p');
            actionDescription.className = 'text-sm text-gray-600 mt-1';
            
            if (sortedCompanies.length > 0) {
                const [topCompany, count] = sortedCompanies[0];
                
                if (count > 2) {
                    // If user has multiple contacts at the same company
                    actionTitle.textContent = `Leverage Your ${topCompany} Network`;
                    actionDescription.textContent = `You have ${count} contacts at ${topCompany}. Consider organizing a group meeting to strengthen these connections.`;
                } else if (sortedCompanies.length > 3) {
                    // If user has contacts across many companies
                    actionTitle.textContent = 'Cross-Company Introductions';
                    actionDescription.textContent = `You have contacts across ${sortedCompanies.length} companies. Consider making strategic introductions between them.`;
                } else {
                    // Default action
                    actionTitle.textContent = 'Organize Your Contacts';
                    actionDescription.textContent = 'Group your contacts by company or industry for better organization and follow-up.';
                }
            } else {
                // Default action
                actionTitle.textContent = 'Add Company Information';
                actionDescription.textContent = 'Update your contacts with company information to get more personalized action items.';
            }
            
            // Clear previous content and add new content
            const actionContent = customActionItem.querySelector('div:last-child');
            if (actionContent) {
                actionContent.innerHTML = '';
                actionContent.appendChild(actionTitle);
                actionContent.appendChild(actionDescription);
            }
        }
    }

    // Function to update company distribution chart
    function updateCompanyDistributionChart(groupedContacts) {
        // Get the container element
        const companyChartContainer = document.getElementById('companyDistributionChart');
        const topCompaniesContainer = document.getElementById('topCompanies');
        
        if (!companyChartContainer) {
            console.error('Company chart container not found');
            return;
        }

        try {
            // Safely destroy existing chart if it exists
            if (window.companyDistributionChart) {
                try {
                    window.companyDistributionChart.destroy();
                } catch (e) {
                    console.log('Error destroying company chart:', e);
                }
                window.companyDistributionChart = null;
            }
            
            // If we don't have enough data, show a message instead (consistent with network visualization)
            if (contactsData.length < 2) {
                companyChartContainer.innerHTML = `
                    <div class="flex items-center justify-center h-64 text-gray-500">
                        Add at least 2 contacts to see company distribution
                    </div>
                `;
                
                // Also update the companies list
                if (topCompaniesContainer) {
                    topCompaniesContainer.innerHTML = 
                        '<div class="text-center py-4 text-gray-500">Add at least 2 contacts to see company information</div>';
                }
                
                return;
            }

            // Clear the container and create a new canvas element
            companyChartContainer.innerHTML = '';
            const canvas = document.createElement('canvas');
            canvas.id = 'companyDistChart';
            canvas.width = companyChartContainer.clientWidth || 300;
            canvas.height = companyChartContainer.clientHeight || 200;
            companyChartContainer.appendChild(canvas);
            
            // Get the 2D context from the new canvas
            const ctx = canvas.getContext('2d');
            
            // Get company counts
            const companies = contactsData
                .filter(c => c.company)
                .map(c => c.company.trim());
            
            if (companies.length < 2) {
                // Show message in HTML instead of canvas
                companyChartContainer.innerHTML = `
                    <div class="flex items-center justify-center h-64 text-gray-500">
                        Add more contacts with company information
                    </div>
                `;
                
                // Also update the companies list
                if (topCompaniesContainer) {
                    topCompaniesContainer.innerHTML = 
                        '<div class="text-center py-4 text-gray-500">Add more contacts with company information</div>';
                }
                
                return;
            }

            const companyCounts = {};
            companies.forEach(company => {
                companyCounts[company] = (companyCounts[company] || 0) + 1;
            });
            
            // Sort companies by count
            const sortedCompanies = Object.entries(companyCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5); // Top 5 companies
            
            // Prepare chart data
            const chartData = {
                labels: sortedCompanies.map(([company]) => company),
                datasets: [{
                    label: 'Contacts',
                    data: sortedCompanies.map(([_, count]) => count),
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)'
                    ],
                    borderColor: [
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)'
                    ],
                    borderWidth: 1
                }]
            };
            
            // Check that Chart constructor exists
            if (typeof Chart === 'undefined') {
                console.error('Chart.js is not loaded');
                companyChartContainer.innerHTML = `
                    <div class="flex items-center justify-center h-64 text-red-500">
                        Chart library not available
                    </div>
                `;
                return;
            }
            
            // Create new chart instance
            window.companyDistributionChart = new Chart(ctx, {
                type: 'bar',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                title: function(tooltipItems) {
                                    return tooltipItems[0].label;
                                },
                                label: function(context) {
                                    return `${context.parsed.y} contact${context.parsed.y !== 1 ? 's' : ''}`;
                                }
                            }
                        }
                    }
                }
            });
            
            // Update top companies list if the container exists
            if (topCompaniesContainer) {
                topCompaniesContainer.innerHTML = '';
                
                if (sortedCompanies.length === 0) {
                    topCompaniesContainer.innerHTML = '<div class="text-center py-4 text-gray-500">No company data available</div>';
                    return;
                }
                
                // Add a header for the list
                const header = document.createElement('div');
                header.className = 'font-medium text-gray-700 mb-2';
                header.textContent = 'Top Companies';
                topCompaniesContainer.appendChild(header);
                
                // Create a container for the company list
                const listContainer = document.createElement('div');
                listContainer.className = 'space-y-2 max-h-40 overflow-y-auto pr-2';
                topCompaniesContainer.appendChild(listContainer);
                
                sortedCompanies.forEach(([company, count], index) => {
                    const percentage = Math.round((count / companies.length) * 100);
                    const item = document.createElement('div');
                    item.className = 'flex items-center justify-between p-2 bg-gray-50 rounded-md';
                    item.innerHTML = `
                        <div class="flex items-center">
                            <div class="w-3 h-3 rounded-full mr-2" style="background-color: ${chartData.datasets[0].backgroundColor[index]}"></div>
                            <span class="font-medium">${company}</span>
                        </div>
                        <div class="flex items-center">
                            <span class="mr-2">${count} contact${count !== 1 ? 's' : ''}</span>
                            <span class="text-gray-500 text-sm">(${percentage}%)</span>
                        </div>
                    `;
                    listContainer.appendChild(item);
                });
                
                // Add a note about what this means
                const note = document.createElement('div');
                note.className = 'text-sm text-gray-600 mt-3';
                note.innerHTML = `<span class="font-medium">Insight:</span> ${sortedCompanies[0][0]} represents ${Math.round((sortedCompanies[0][1] / companies.length) * 100)}% of your network.`;
                topCompaniesContainer.appendChild(note);
            }
        } catch (error) {
            console.error('Error updating company distribution chart:', error);
            // Show error message on the container element
            companyChartContainer.innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-red-500">Error updating chart</p></div>';
        }
    }

    // Function to update industry insights chart
    function updateIndustryInsightsChart() {
        // Get the container element
        const industryChartContainer = document.getElementById('industryInsightsChart');
        const clusterStatsContainer = document.getElementById('clusterStats');
        
        if (!industryChartContainer) {
            console.error('Industry chart container not found');
            return;
        }

        try {
            // Safely destroy existing chart if it exists
            if (window.industryInsightsChart) {
                try {
                    window.industryInsightsChart.destroy();
                } catch (e) {
                    console.log('Error destroying industry chart:', e);
                }
                window.industryInsightsChart = null;
            }
            
            // If we don't have enough data, show a message instead (consistent with network visualization)
            if (contactsData.length < 2) {
                industryChartContainer.innerHTML = `
                    <div class="flex items-center justify-center h-64 text-gray-500">
                        Add at least 2 contacts to see industry insights
                    </div>
                `;
                
                // Also update the industry stats
                if (clusterStatsContainer) {
                    clusterStatsContainer.innerHTML = 
                        '<div class="text-center py-4 text-gray-500">Add at least 2 contacts to see industry information</div>';
                               }
                
                return;
            }

            // Clear the container and create a new canvas element
            industryChartContainer.innerHTML = '';
            const canvas = document.createElement('canvas');
            canvas.id = 'industryDistChart';
            canvas.width = industryChartContainer.clientWidth || 300;
            canvas.height = industryChartContainer.clientHeight || 200;
            industryChartContainer.appendChild(canvas);
            
            // Get the 2D context from the new canvas
            const ctx = canvas.getContext('2d');
            
            // Extract industries from contacts
            const industries = contactsData.map(contact => 
                contact.industry || "Unknown"
            );
            
            // Count industries
            const industryCounts = {};
            industries.forEach(industry => {
                industryCounts[industry] = (industryCounts[industry] || 0) + 1;
            });
            
            // Sort industries by count
            const sortedIndustries = Object.entries(industryCounts)
                .sort((a, b) => b[1] - a[1]);
            
            // Prepare chart data
            const chartData = {
                               labels: sortedIndustries.map(([industry]) => industry),
                datasets: [{
                    label: 'Contacts',
                    data: sortedIndustries.map(([_, count]) => count),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)',
                        'rgba(255, 159, 64, 0.6)',
                        'rgba(199, 199, 199, 0.6)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(199, 199, 199, 1)'
                    ],
                    borderWidth: 1
                }]
            };
            
            // Check that Chart constructor exists
            if (typeof Chart === 'undefined') {
                console.error('Chart.js is not loaded');
                industryChartContainer.innerHTML = `
                    <div class="flex items-center justify-center h-64 text-red-500">
                        Chart library not available

                    </div>
                `;
                return;
            }
            
            // Create new chart instance
            window.industryInsightsChart = new Chart(ctx, {
                type: 'pie',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,

                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                boxWidth: 12,
                                font: {
                                    size: 10
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${label}: ${value} contacts (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
            
            // Update industry stats
            if (clusterStatsContainer) {
                clusterStatsContainer.innerHTML = '';
                
                // Add a header
                const header = document.createElement('div');
                header.className = 'font-medium text-gray-700 mb-2';
                header.textContent = 'Industry Distribution';
                clusterStatsContainer.appendChild(header);
                
                // Create a table for the industry stats
                const table = document.createElement('table');
                table.className = 'min-w-full divide-y divide-gray-200';
                
                // Create table header
                const thead = document.createElement('thead');
                thead.className = 'bg-gray-50';
                thead.innerHTML = `
                    <tr>
                        <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</th>
                        <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacts</th>
                        <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">%</th>
                    </tr>
                `;
                table.appendChild(thead);
                
                // Create table body
                const tbody = document.createElement('tbody');
                tbody.className = 'bg-white divide-y divide-gray-200';
                
                const total = industries.length;
                sortedIndustries.forEach(([industry, count], index) => {
                    const percentage = Math.round((count / total) * 100);
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">${industry}</td>
                        <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500">${count}</td>
                        <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500">${percentage}%</td>
                    `;
                    tbody.appendChild(row);
                });
                
                table.appendChild(tbody);
                clusterStatsContainer.appendChild(table);
                
                // Add insight
                const insight = document.createElement('div');
                insight.className = 'text-sm text-gray-600 mt-3';
                
                if (sortedIndustries.length > 1) {
                    const primaryIndustry = sortedIndustries[0][0];
                    const primaryPercentage = Math.round((sortedIndustries[0][1] / total) * 100);
                    const secondaryIndustry = sortedIndustries[1][0];
                    
                    insight.innerHTML = `<span class="font-medium">Insight:</span> Your network is primarily in ${primaryIndustry} (${primaryPercentage}%), with ${secondaryIndustry} as a secondary focus.`;
                } else if (sortedIndustries.length === 1) {
                    insight.innerHTML = `<span class="font-medium">Insight:</span> Your network is entirely focused on the ${sortedIndustries[0][0]} industry.`;
                }
                
                clusterStatsContainer.appendChild(insight);
            }
        } catch (error) {
            console.error('Error updating industry insights chart:', error);
            // Show error message on the container element
            industryChartContainer.innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-red-500">Error updating chart</p></div>';
        }
    }

    // Helper function to update all visualizations and data displays
    function refreshAllVisualizations() {
        try {
            // Update contact list UI
            filterAndSortContacts();
            
            // Force immediate chart refreshs
            if (window.companyDistributionChart) {
                try {
                    window.companyDistributionChart.destroy();
                } catch (e) {
                    console.log('Error destroying company chart:', e);
                }
                window.companyDistributionChart = null;
            }
            
            if (window.industryInsightsChart) {
                try {
                    window.industryInsightsChart.destroy();
                } catch (e) {
                    console.log('Error destroying industry chart:', e);
                }
                window.industryInsightsChart = null;
            }
            
            // Update network components if we're on the network tab
            if (!networkContent.classList.contains('hidden')) {
                // Force stop any existing simulations
                if (window.currentSimulation) {
                    try {
                        window.currentSimulation.stop();
                    } catch (e) {
                        console.log('Error stopping simulation:', e);
                    }
                }
                
                try {
                    // Update the network visualization with fresh data
                    updateNetworkVisualization();
                } catch (error) {
                    console.error('Error updating network visualizations:', error);
                }
            }
            
            // Update dashboard metrics regardless of current tab
            try {
                updateDashboardMetrics();
            } catch (error) {
                console.error('Error updating dashboard metrics:', error);
            }
            
            // Explicitly update charts after a short delay
            setTimeout(() => {
                try {
                    updateCompanyDistributionChart();
                    updateIndustryInsightsChart();
                } catch (chartError) {
                    console.error('Error updating charts:', chartError);
                }
            }, 100);
        } catch (error) {
            console.error('Error refreshing visualizations:', error);
        }
    }

    // Initialize the application
    async function initializeApp() {
        try {
            // Check if user is authenticated
            const authenticated = await isAuthenticated();
            
            if (authenticated) {
                // User is authenticated, show sign out button
            signOutBtn.classList.remove('hidden');
                
                // Show the default tab content immediately
                scanTab.classList.add('tab-active');
                scanContent.classList.remove('hidden');
                
                // Start loading contacts in the background
                loadContacts().catch(error => {
                    console.error('Error loading contacts during initialization:', error);
                });
        } else {
                // User is not authenticated, show sign in modal
            showSignInModal();
        }
        } catch (error) {
            console.error('Error during initialization:', error);
            // Show sign in modal as fallback
            showSignInModal();
        }
    }
    
    // Initialize the app when DOM is loaded
    initializeApp();

    // Delete All Modal Event Listeners
    deleteAllBtn.addEventListener('click', () => {
        deleteAllModal.classList.remove('hidden');
    });

    cancelDeleteAllBtn.addEventListener('click', () => {
        deleteAllModal.classList.add('hidden');
    });

    // Update confirmDeleteAllBtn click handler
    confirmDeleteAllBtn.addEventListener('click', async () => {
        if (!userId) {
            console.error('No userId available');
            showToast('Please sign in to delete contacts', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/contacts`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: userId })
            });
                    
            if (!response.ok) {
                throw new Error('Failed to delete all contacts');
            }

            const result = await response.json();
            console.log('Delete All Response:', result);

            // Clear local contacts data
            contactsData = [];
            
            // Update UI and visualizations
            refreshAllVisualizations();
            
            // Force update network charts
            if (!networkContent.classList.contains('hidden')) {
                // Force recreation of charts
                updateCompanyDistributionChart();
                updateIndustryInsightsChart();
            }
            
            // Hide modal
            deleteAllModal.classList.add('hidden');

            showToast('All contacts deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting all contacts:', error);
            showToast('Failed to delete all contacts', 'error');
        }
    });

    // Initialize the app when DOM is loaded
    initializeApp();

    // Add delete confirmation modal HTML after the deleteAllModal
    const deleteContactModal = document.createElement('div');
    deleteContactModal.id = 'deleteContactModal';
    deleteContactModal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full hidden z-50';
    deleteContactModal.innerHTML = `
        <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div class="mt-3 text-center">
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </div>
                <h3 class="text-lg leading-6 font-medium text-gray-900 mt-4">Delete Contact</h3>
                <div class="mt-2 px-7 py-3">
                    <p class="text-sm text-gray-500">Are you sure you want to delete this contact? This action cannot be undone.</p>
                </div>
                <div class="items-center px-4 py-3">
                    <button id="confirmDeleteContact" class="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">
                        Delete
                    </button>
                    <button id="cancelDeleteContact" class="mt-3 px-4 py-2 bg-gray-100 text-gray-700 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(deleteContactModal);

    // Add event listeners for delete contact modal
    document.getElementById('confirmDeleteContact').addEventListener('click', async () => {
        const cardId = deleteContactModal.dataset.cardId;
        if (!cardId) return;

        try {
            const response = await fetch(`${API_URL}/contacts/${cardId}?userId=${encodeURIComponent(userId)}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete contact');
            }

            // Update local data immediately
            contactsData = contactsData.filter(contact => contact.cardId !== cardId);
            
            // Hide modal first for better responsiveness
            deleteContactModal.classList.add('hidden');
            
            // Show toast to provide feedback
            showToast('Contact deleted successfully', 'success');
            
            // Force immediate refresh of all visualizations
            // First destroy existing charts
            if (window.companyDistributionChart) {
                try {
                    window.companyDistributionChart.destroy();
                } catch (e) {
                    console.log('Error destroying company chart during deletion:', e);
                }
                window.companyDistributionChart = null;
            }
            
            if (window.industryInsightsChart) {
                try {
                    window.industryInsightsChart.destroy();
                } catch (e) {
                    console.log('Error destroying industry chart during deletion:', e);
                }
                window.industryInsightsChart = null;
            }
            
            // Now update the UI
            filterAndSortContacts();
            updateDashboardMetrics();
            
            // Update network visualization and all charts
            updateNetworkVisualization();
            
            // Explicitly recreate charts after DOM updates
            setTimeout(() => {
                try {
                    updateCompanyDistributionChart();
                    updateIndustryInsightsChart();
                } catch (chartError) {
                    console.error('Error updating charts after deletion:', chartError);
                }
            }, 100);
            
        } catch (error) {
            console.error('Error deleting contact:', error);
            showToast('Failed to delete contact', 'error');
            deleteContactModal.classList.add('hidden');
        }
    });

    document.getElementById('cancelDeleteContact').addEventListener('click', () => {
        deleteContactModal.classList.add('hidden');
    });

    // Download All Button Event Listener
    document.getElementById('downloadAllBtn').addEventListener('click', async () => {
        if (!userId) {
            showToast('Please sign in to download contacts', 'error');
            return;
        }

        try {
            // Create a zip file containing all vCards
            const zip = new JSZip();
            
            // Add each contact's vCard to the zip
            for (const contact of contactsData) {
                const response = await fetch(`${API_URL}/vcard/${contact.cardId}?userId=${encodeURIComponent(userId)}`);
                if (!response.ok) throw new Error(`Failed to download vCard for ${contact.name}`);
                
                const vcardContent = await response.text();
                const filename = `${contact.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.vcf`;
                zip.file(filename, vcardContent);
            }
            
            // Generate and download the zip file
            const content = await zip.generateAsync({type: 'blob'});
            const url = window.URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'contacts.zip';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showToast('Successfully downloaded all contacts', 'success');
        } catch (error) {
            console.error('Error downloading contacts:', error);
            showToast('Failed to download contacts', 'error');
        }
    });

    // Make necessary variables and functions available globally
    window.userId = userId;
    window.contactsData = contactsData;
    window.API_URL = API_URL;
    window.filterAndSortContacts = filterAndSortContacts;
    window.showToast = showToast;
    window.deleteContact = deleteContact;
    window.showEditContactModal = showEditContactModal;

    // Update sign-in form submission
    signInForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        // Input validation
        if (!username || !password) {
            signInError.textContent = 'Please enter both username and password';
            signInError.classList.remove('hidden');
            return;
        }
        
        const authenticationData = {
            Username: username,
            Password: password
        };
        
        const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
        
        const userData = {
            Username: username,
            Pool: userPool
        };

        const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
        
        try {
            await new Promise((resolve, reject) => {
                cognitoUser.authenticateUser(authenticationDetails, {
                    onSuccess: (result) => {
                        userId = result.getIdToken().payload.sub;
                                resolve(result);
                    },
                    onFailure: (err) => {
                        reject(err);
                    }
                });
            });
            
            // Hide sign in modal and show sign out button
            hideSignInModal();
            signOutBtn.classList.remove('hidden');
            
            // Immediately show the default tab content (scan tab)
            switchToTab('scan');
            
            // Start loading contacts in the background
            loadContacts().catch(error => {
                console.error('Error loading contacts in background:', error);
                showToast('Error loading contacts after sign in', 'error');
            });
            
            showToast('Signed in successfully', 'success');
        } catch (error) {
            console.error('Authentication error:', error);
            signInError.textContent = error.message || 'Failed to sign in. Please check your credentials.';
            signInError.classList.remove('hidden');
        }
    });

    // Update sign-out functionality
    signOutBtn.addEventListener('click', () => {
        const cognitoUser = userPool.getCurrentUser();
        if (cognitoUser) {
            cognitoUser.signOut();
        }
        userId = null; // Clear the userId
        contactsData = []; // Clear contacts data
        signOutBtn.classList.add('hidden');
            showSignInModal();
        switchToTab('scan');
        
        // Clear any cached data
        localStorage.clear();
    });

    // Process files in batches with concurrency control
    async function processBatch(files, startIndex, batchSize, concurrencyLimit, progressCallback) {
        const batch = Array.from(files).slice(startIndex, startIndex + batchSize);
        const results = [];
        const inProgress = new Set();

        async function processFile(file, index) {
            try {
                // Update status to "Processing..."
                updateThumbnailStatus(startIndex + index, null, "Processing...");
                
                // Process the file
                console.log(`Starting to process file ${startIndex + index}`);
                const result = await processBusinessCardFile(file);
                results[index] = { success: true, result };
                
                // Update UI immediately after API response
                console.log(`API success for file ${startIndex + index}`);
                updateThumbnailStatus(startIndex + index, true);
                
                // Call progress callback for individual file completion
                if (progressCallback) progressCallback(true);
            } catch (error) {
                console.error(`Error processing file ${startIndex + index}:`, error);
                results[index] = { success: false, error };
                
                // Update UI immediately on failure
                updateThumbnailStatus(startIndex + index, false);
                
                // Call progress callback for individual file completion (failure)
                if (progressCallback) progressCallback(false);
            } finally {
                inProgress.delete(index);
            }
        }

        const processNext = async () => {
            for (let i = 0; i < batch.length; i++) {
                if (!inProgress.has(i) && !results[i]) {
                    inProgress.add(i);
                    processFile(batch[i], i);

                    // Wait if we've hit the concurrency limit
                    if (inProgress.size >= concurrencyLimit) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }
            }
        };

        // Start initial batch of concurrent operations
        await processNext();

        // Wait for all operations to complete
        while (inProgress.size > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return results;
    }

    // Create upload confirmation modal
    const uploadConfirmModal = document.createElement('div');
    uploadConfirmModal.id = 'uploadConfirmModal';
    uploadConfirmModal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full hidden z-50';
    uploadConfirmModal.innerHTML = `
        <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div class="mt-3 text-center">
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                    <svg class="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </div>
                <h3 class="text-lg leading-6 font-medium text-gray-900 mt-4">Large Upload Warning</h3>
                <div class="mt-2 px-7 py-3">
                    <p class="text-sm text-gray-500" id="uploadConfirmMessage"></p>
                </div>
                <div class="items-center px-4 py-3">
                    <button id="confirmUpload" class="px-4 py-2 bg-yellow-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500">
                        Continue Upload
                    </button>
                    <button id="cancelUpload" class="mt-3 px-4 py-2 bg-gray-100 text-gray-700 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(uploadConfirmModal);

    // Update file upload handler
    fileUpload.addEventListener('change', async (event) => {
        if (!await isAuthenticated()) {
            showToast('Please sign in to upload files', 'error');
            return;
        }

        const files = event.target.files;
        if (!files || files.length === 0) {
            showToast('Please select at least one image file');
            return;
        }

        // Maximum number of files allowed to upload at once
        const MAX_FILES_ALLOWED = 10;
        
        // Enforce maximum file limit
        if (files.length > MAX_FILES_ALLOWED) {
            showToast(`You can only upload up to ${MAX_FILES_ALLOWED} files at once. Please reduce the number of files.`, 'error');
            // Reset the file input to clear the selection
            fileUpload.value = '';
            return;
        }

        // Show warning for large uploads
        if (files.length > 30) {
            // Update modal message
            const uploadConfirmMessage = document.getElementById('uploadConfirmMessage');
            uploadConfirmMessage.textContent = `You are about to upload ${files.length} files. This may take some time. Would you like to continue?`;
            
            // Show the modal
            const uploadConfirmModal = document.getElementById('uploadConfirmModal');
            uploadConfirmModal.classList.remove('hidden');

            // Return a promise that resolves when the user makes a choice
            const userChoice = await new Promise((resolve) => {
                const confirmUpload = document.getElementById('confirmUpload');
                const cancelUpload = document.getElementById('cancelUpload');

                const handleConfirm = () => {
                    cleanup();
                    resolve(true);
                };

                const handleCancel = () => {
                    cleanup();
                    resolve(false);
                };

                const cleanup = () => {
                    confirmUpload.removeEventListener('click', handleConfirm);
                    cancelUpload.removeEventListener('click', handleCancel);
                    uploadConfirmModal.classList.add('hidden');
                };

                confirmUpload.addEventListener('click', handleConfirm);
                cancelUpload.addEventListener('click', handleCancel);
            });

            if (!userChoice) {
                // User cancelled the upload
                fileUpload.value = '';
                return;
            }
        }

        // Initialize UI
        if (processingStatus) processingStatus.textContent = 'Preparing to process images...';
        resetBtn.classList.remove('hidden');
        uploadProgress.textContent = `Preparing to process ${files.length} images`;
        thumbnailGallery.innerHTML = ''; // Clear existing thumbnails

        // Create progress tracking elements
        const progressContainer = document.createElement('div');
        progressContainer.className = 'mt-4 p-4 bg-gray-50 rounded-lg';
        progressContainer.innerHTML = `
            <div class="flex justify-between mb-2">
                <span class="text-sm font-medium">Overall Progress</span>
                <span class="text-sm text-gray-500" id="progressText">0/${files.length}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2.5">
                <div class="bg-blue-600 h-2.5 rounded-full" id="progressBar" style="width: 0%"></div>
            </div>
            <div class="mt-2 flex justify-between text-sm">
                <span id="successCount" class="text-green-600">Successful: 0</span>
                <span id="failureCount" class="text-red-600">Failed: 0</span>
            </div>
        `;
        uploadProgress.parentNode.insertBefore(progressContainer, uploadProgress.nextSibling);

        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const successCount = document.getElementById('successCount');
        const failureCount = document.getElementById('failureCount');

        try {
            // Configuration
            const BATCH_SIZE = 10; // Process 10 files at a time
            const CONCURRENCY_LIMIT = 5; // Process 3 files concurrently
            let totalProcessed = 0;
            let totalSuccess = 0;
            let totalFailed = 0;

            // Create a callback function to update progress for each individual file
            const updateFileProgress = (isSuccess) => {
                totalProcessed++;
                if (isSuccess) {
                    totalSuccess++;
                } else {
                    totalFailed++;
                }

                // Update UI for each file completion
                const progress = (totalProcessed / files.length) * 100;
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `${totalProcessed}/${files.length}`;
                successCount.textContent = `Successful: ${totalSuccess}`;
                failureCount.textContent = `Failed: ${totalFailed}`;
            };

            // Create thumbnails for all files before processing starts
            Array.from(files).forEach((file, index) => {
                createThumbnailElement(file, index, null); // null means "pending"
            });

            // Process all files in batches
            for (let startIndex = 0; startIndex < files.length; startIndex += BATCH_SIZE) {
                const batchResults = await processBatch(
                    files, 
                    startIndex, 
                    BATCH_SIZE, 
                    CONCURRENCY_LIMIT,
                    updateFileProgress
                );
                
                // Allow UI to update
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            // Final status update
            if (processingStatus) {
                processingStatus.textContent = `Completed: ${totalSuccess} successful, ${totalFailed} failed`;
                processingStatus.className = totalFailed === 0 ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium';
            }

            // Show completion message
            showToast(`Processing complete: ${totalSuccess} successful, ${totalFailed} failed`, 
                     totalFailed === 0 ? 'success' : 'warning');
            
            if (totalSuccess > 0) {
                scanCompleteMessage.classList.remove('hidden');
                scanCompleteMessage.className = 'bg-green-50 text-green-700 p-4 rounded-lg mt-6 flex items-center justify-between shadow-sm';
                
                // Reload contacts and refresh visualizations after successful upload
                await loadContacts();
                refreshAllVisualizations();
            }

        } catch (error) {
            console.error('Error processing files:', error);
            showToast('Failed to process files. Please try again.', 'error');
            // Reset UI state
            resetBtn.classList.add('hidden');
            if (processingStatus) processingStatus.textContent = '';
            uploadProgress.textContent = '';
        } finally {
            // Reset the file input to allow selecting the same files again if needed
            fileUpload.value = '';
        }
    });

    // Helper function to create thumbnail elements
    function createThumbnailElement(file, index, status) {
        const thumbnailContainer = document.createElement('div');
        thumbnailContainer.className = 'relative inline-block m-2';
        thumbnailContainer.id = `thumbnail-container-${index}`;
        
        const thumbnail = document.createElement('img');
        thumbnail.src = URL.createObjectURL(file);
        thumbnail.className = 'thumbnail w-32 h-32 object-cover rounded';
        thumbnail.id = `thumbnail-${index}`;
        
        const statusOverlay = document.createElement('div');
        let statusClass, statusText;
        
        if (status === true) {
            statusClass = 'bg-green-500';
            statusText = 'Processed';
        } else if (status === false) {
            statusClass = 'bg-red-500';
            statusText = 'Failed';
        } else {
            statusClass = 'bg-black bg-opacity-50';
            statusText = 'Pending...';
        }
        
        statusOverlay.className = `absolute bottom-0 left-0 right-0 ${statusClass} text-white text-xs p-1 text-center`;
        statusOverlay.textContent = statusText;
        statusOverlay.id = `status-${index}`;
        
        // Only add checkmark if status is known
        if (status !== null) {
            const checkmark = document.createElement('div');
            checkmark.className = `absolute top-2 right-2 ${
                status ? 'bg-green-500' : 'bg-red-500'
            } text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md`;
            checkmark.innerHTML = status ? '✓' : '✕';
            checkmark.id = `checkmark-${index}`;
            thumbnailContainer.appendChild(checkmark);
        }
        
        thumbnailContainer.appendChild(thumbnail);
        thumbnailContainer.appendChild(statusOverlay);
        thumbnailGallery.appendChild(thumbnailContainer);

        // Clean up object URL when thumbnail is loaded
        thumbnail.onload = () => URL.revokeObjectURL(thumbnail.src);
    }

    // Helper function to update thumbnail status
    function updateThumbnailStatus(index, success, customStatus = null) {
        console.log(`updateThumbnailStatus called for index ${index}, success: ${success}, message: ${customStatus || (success ? 'Processed' : 'Failed')}`);
        
        // Get DOM elements
        const statusElement = document.getElementById(`status-${index}`);
        const container = document.getElementById(`thumbnail-container-${index}`);
        
        if (!statusElement) {
            console.error(`Status element not found for index ${index}`);
            return;
        }
        
        // Determine the status text and class
        let statusText, statusClass;
        
        if (customStatus !== null) {
            // Use custom status message (for "Processing..." etc.)
            statusText = customStatus;
            statusClass = 'bg-black bg-opacity-50';
        } else if (success === true) {
            // Success state
            statusText = 'Processed';
            statusClass = 'bg-green-500';
        } else if (success === false) {
            // Error state
            statusText = 'Failed';
            statusClass = 'bg-red-500';
        } else {
            // Pending state (success is null)
            statusText = 'Pending...';
            statusClass = 'bg-black bg-opacity-50';
        }
        
        // Update status text and class
        statusElement.textContent = statusText;
        statusElement.className = `absolute bottom-0 left-0 right-0 ${statusClass} text-white text-xs p-1 text-center`;
        
        // Only add/update checkmark for success or failure (not for pending/processing)
        if (success === true || success === false) {
            // Add or update checkmark
            let checkmark = document.getElementById(`checkmark-${index}`);
            
            if (!checkmark && container) {
                checkmark = document.createElement('div');
                checkmark.className = `absolute top-2 right-2 ${
                    success ? 'bg-green-500' : 'bg-red-500'
                } text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md`;
                checkmark.innerHTML = success ? '✓' : '✕';
                checkmark.id = `checkmark-${index}`;
                container.appendChild(checkmark);
            } else if (checkmark) {
                checkmark.className = `absolute top-2 right-2 ${
                    success ? 'bg-green-500' : 'bg-red-500'
                } text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md`;
                checkmark.innerHTML = success ? '✓' : '✕';
            }
            
            // Add a brief animation for completed items
            if (checkmark) {
                checkmark.classList.add('animate-bounce');
                setTimeout(() => {
                    if (checkmark && checkmark.classList.contains('animate-bounce')) {
                        checkmark.classList.remove('animate-bounce');
                    }
                }, 1000);
            }
        }
    }
});