document.addEventListener('DOMContentLoaded', function() {
    // Initialize WebsimSocket for multiplayer functionality
    const room = new WebsimSocket();
    
    // Get form elements
    const appNameInput = document.getElementById('app-name');
    const appUrlInput = document.getElementById('app-url');
    const appIconInput = document.getElementById('app-icon');
    const appIconUpload = document.getElementById('app-icon-upload');
    const appImageInput = document.getElementById('app-image');
    const appImageUpload = document.getElementById('app-image-upload');
    const appDescriptionInput = document.getElementById('app-description');
    const generateBtn = document.getElementById('generate-app');
    const publishBtn = document.getElementById('publish-app');
    const publishedAppsContainer = document.getElementById('published-apps-container');
    
    // Get preview elements
    const previewName = document.getElementById('preview-name');
    const previewUrl = document.getElementById('preview-url');
    const previewIcon = document.getElementById('preview-icon');
    const previewImage = document.getElementById('preview-image');
    const previewDescription = document.getElementById('preview-description');
    
    // Get website embed elements
    const websiteEmbedOverlay = document.getElementById('website-embed-overlay');
    const websiteEmbedFrame = document.getElementById('website-embed-frame');
    const embedTitle = document.getElementById('embed-title');
    const closeEmbedBtn = document.getElementById('close-embed');
    
    // Get chat elements
    const chatContainer = document.getElementById('chat-container');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendMessageBtn = document.getElementById('send-message');
    const openChatBtn = document.getElementById('open-chat-btn');
    const closeChatBtn = document.getElementById('close-chat');
    
    // Initialize the WebsimSocket
    room.initialize().then(async () => {
        // Get creator username for admin permissions
        let creatorUsername = (await window.websim.getCreatedBy()).username;
        loadPublishedApps(creatorUsername);
        subscribeToChatMessages();
    });
    
    // Handle file uploads
    appIconUpload.addEventListener('change', handleFileUpload);
    appImageUpload.addEventListener('change', handleFileUpload);
    
    // Generate app preview when button is clicked
    generateBtn.addEventListener('click', generateAppPreview);
    
    // Publish app when publish button is clicked
    publishBtn.addEventListener('click', publishApp);
    
    // Also update preview on input changes (real-time preview)
    appNameInput.addEventListener('input', generateAppPreview);
    appUrlInput.addEventListener('input', generateAppPreview);
    appIconInput.addEventListener('input', generateAppPreview);
    appImageInput.addEventListener('input', generateAppPreview);
    appDescriptionInput.addEventListener('input', generateAppPreview);
    
    // Close embed when close button is clicked
    closeEmbedBtn.addEventListener('click', closeWebsiteEmbed);
    
    // Chat functionality
    openChatBtn.addEventListener('click', openChat);
    closeChatBtn.addEventListener('click', closeChat);
    sendMessageBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
    
    async function handleFileUpload(event) {
        const fileInput = event.target;
        const file = fileInput.files[0];
        
        if (!file) return;
        
        try {
            // Show loading state
            const uploadLabel = fileInput.closest('.upload-label');
            const originalText = uploadLabel.querySelector('span').textContent;
            uploadLabel.querySelector('span').textContent = 'Uploading...';
            uploadLabel.style.opacity = '0.7';
            uploadLabel.style.pointerEvents = 'none';
            
            // Upload to S3 (Returns the URL of the uploaded file)
            const url = await websim.upload(file);
            
            // Update the corresponding input field with the URL
            if (fileInput.id === 'app-icon-upload') {
                appIconInput.value = url;
            } else if (fileInput.id === 'app-image-upload') {
                appImageInput.value = url;
            }
            
            // Generate preview with the new image
            generateAppPreview();
            
            // Reset upload button
            uploadLabel.querySelector('span').textContent = originalText;
            uploadLabel.style.opacity = '1';
            uploadLabel.style.pointerEvents = '';
            
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error uploading file. Please try again.');
            
            // Reset upload button on error
            const uploadLabel = fileInput.closest('.upload-label');
            uploadLabel.querySelector('span').textContent = 'Upload';
            uploadLabel.style.opacity = '1';
            uploadLabel.style.pointerEvents = '';
        }
    }
    
    function generateAppPreview() {
        // Update app name
        if (appNameInput.value) {
            previewName.textContent = appNameInput.value;
        } else {
            previewName.textContent = 'App Name';
        }
        
        // Update app URL
        if (appUrlInput.value) {
            try {
                const url = new URL(appUrlInput.value);
                previewUrl.textContent = url.hostname;
            } catch {
                previewUrl.textContent = appUrlInput.value;
            }
        } else {
            previewUrl.textContent = 'example.com';
        }
        
        // Update app icon
        if (appIconInput.value) {
            previewIcon.src = appIconInput.value;
            previewIcon.onerror = function() {
                // Fallback if icon URL is invalid
                previewIcon.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' rx='15' fill='%23cccccc'/%3E%3Ctext x='30' y='35' font-family='Arial' font-size='20' text-anchor='middle' fill='%23ffffff'%3EApp%3C/text%3E%3C/svg%3E";
            };
        }
        
        // Update app image
        if (appImageInput.value) {
            previewImage.src = appImageInput.value;
            previewImage.onerror = function() {
                // Fallback if image URL is invalid
                previewImage.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23f0f0f0'/%3E%3Ctext x='150' y='100' font-family='Arial' font-size='20' text-anchor='middle' fill='%23999999'%3EApp Screenshot%3C/text%3E%3C/svg%3E";
            };
        }
        
        // Update app description
        if (appDescriptionInput.value) {
            previewDescription.textContent = appDescriptionInput.value;
        } else {
            previewDescription.textContent = 'Your app description will appear here. Write about what your app does and why people should download it.';
        }
        
        // Add a small animation to the preview to indicate updates
        const previewSection = document.querySelector('.preview-section');
        previewSection.classList.add('update-flash');
        setTimeout(() => {
            previewSection.classList.remove('update-flash');
        }, 300);
    }
    
    async function publishApp() {
        // Validate form
        if (!appNameInput.value) {
            alert('Please enter an app name');
            return;
        }
        
        if (!appDescriptionInput.value) {
            alert('Please enter an app description');
            return;
        }
        
        // Get formatted URL
        let formattedUrl = appUrlInput.value;
        try {
            const url = new URL(appUrlInput.value);
            formattedUrl = url.hostname;
        } catch {
            formattedUrl = appUrlInput.value;
        }
        
        // Create app data
        const appData = {
            name: appNameInput.value,
            url: appUrlInput.value,
            displayUrl: formattedUrl,
            icon: appIconInput.value || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' rx='15' fill='%23cccccc'/%3E%3Ctext x='30' y='35' font-family='Arial' font-size='20' text-anchor='middle' fill='%23ffffff'%3EApp%3C/text%3E%3C/svg%3E",
            image: appImageInput.value || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23f0f0f0'/%3E%3Ctext x='150' y='100' font-family='Arial' font-size='20' text-anchor='middle' fill='%23999999'%3EApp Screenshot%3C/text%3E%3C/svg%3E",
            description: appDescriptionInput.value,
            publishedAt: new Date().toISOString(),
            username: room.peers[room.clientId].username,
        };
        
        try {
            // Publish app to the database
            await room.collection('apps').create(appData);
            
            // Show success message
            alert('Your app has been published!');
            
            // Clear form
            resetForm();
            
            // Refresh published apps list
            loadPublishedApps(window.creatorUsername);
        } catch (error) {
            console.error('Error publishing app:', error);
            alert('Error publishing app. Please try again.');
        }
    }
    
    function resetForm() {
        appNameInput.value = '';
        appUrlInput.value = '';
        appIconInput.value = '';
        appImageInput.value = '';
        appDescriptionInput.value = '';
        generateAppPreview();
    }
    
    async function loadPublishedApps(creatorUsername) {
        try {
            // Store creator username globally for permission checks
            window.creatorUsername = creatorUsername;
            
            // Subscribe to changes in the apps collection
            room.collection('apps').subscribe(renderPublishedApps);
        } catch (error) {
            console.error('Error loading published apps:', error);
            publishedAppsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <p>Error loading published apps. Please refresh the page.</p>
                </div>
            `;
        }
    }
    
    function renderPublishedApps(apps) {
        if (!apps || apps.length === 0) {
            publishedAppsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📱</div>
                    <p>No apps have been published yet. Be the first!</p>
                </div>
            `;
            return;
        }
        
        // Sort apps by publish date (newest first)
        const sortedApps = [...apps].sort((a, b) => 
            new Date(b.publishedAt) - new Date(a.publishedAt)
        );
        
        // Get current user's username for permission checking
        const currentUsername = room.peers[room.clientId].username;
        const isCreator = currentUsername === window.creatorUsername;
        
        publishedAppsContainer.innerHTML = sortedApps.map(app => `
            <div class="published-app-card" data-id="${app.id}" data-url="${app.url}">
                <div class="published-app-header">
                    <img class="published-app-icon" src="${app.icon}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\'%3E%3Crect width=\\'60\\' height=\\'60\\' rx=\\'15\\' fill=\\'%23cccccc\\'/%3E%3Ctext x=\\'30\\' y=\\'35\\' font-family=\\'Arial\\' font-size=\\'20\\' text-anchor=\\'middle\\' fill=\\'%23ffffff\\'%3EApp%3C/text%3E%3C/svg%3E'">
                    <div>
                        <div class="published-app-name">${app.name}</div>
                        
                    </div>
                    ${(isCreator || currentUsername === app.username) ? 
                        `<button class="delete-app-btn" data-id="${app.id}">×</button>` : ''}
                </div>
                <img class="published-app-image" src="${app.image}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'300\\' height=\\'200\\' viewBox=\\'0 0 300 200\\'%3E%3Crect width=\\'300\\' height=\\'200\\' fill=\\'%23f0f0f0\\'/%3E%3Ctext x=\\'150\\' y=\\'100\\' font-family=\\'Arial\\' font-size=\\'20\\' text-anchor=\\'middle\\' fill=\\'%23999999\\'%3EApp Screenshot%3C/text%3E%3C/svg%3E'">
                <div class="published-app-description">${app.description}</div>
                <div class="published-app-footer">
                    <div class="published-by">
                        <img class="publisher-avatar" src="https://images.websim.ai/avatar/${app.username}" alt="${app.username}'s avatar">
                        ${app.username}
                    </div>
                    <div>${new Date(app.publishedAt).toLocaleDateString()}</div>
                </div>
            </div>
        `).join('');
        
        // Add click event listeners to app cards
        document.querySelectorAll('.published-app-card').forEach(card => {
            card.addEventListener('click', function(e) {
                // Ignore clicks on the delete button
                if (e.target.classList.contains('delete-app-btn')) {
                    return;
                }
                
                const url = this.dataset.url;
                const appName = this.querySelector('.published-app-name').textContent;
                showWebsiteEmbed(url, appName);
            });
        });
        
        // Add delete button event listeners
        document.querySelectorAll('.delete-app-btn').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.stopPropagation(); // Prevent card click
                if (confirm('Are you sure you want to delete this app?')) {
                    const appId = this.dataset.id;
                    await deleteApp(appId);
                }
            });
        });
    }
    
    async function deleteApp(appId) {
        try {
            await room.collection('apps').delete(appId);
            // App will be removed automatically from the UI due to the subscription
        } catch (error) {
            console.error('Error deleting app:', error);
            alert('Error deleting app. You may only delete your own apps unless you are the creator.');
        }
    }
    
    function showWebsiteEmbed(url, appName) {
        // Validate URL
        let validUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            validUrl = 'https://' + url;
        }
        
        // Set the iframe source
        websiteEmbedFrame.src = validUrl;
        embedTitle.textContent = appName || 'App Website';
        
        // Show the overlay
        websiteEmbedOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling of background
    }
    
    function closeWebsiteEmbed() {
        // Hide the overlay
        websiteEmbedOverlay.classList.remove('active');
        document.body.style.overflow = '';
        
        // Clear the iframe source after a short delay
        setTimeout(() => {
            websiteEmbedFrame.src = 'about:blank';
        }, 300);
    }
    
    function subscribeToChatMessages() {
        // Subscribe to chat messages
        room.collection('chat_messages').subscribe(renderChatMessages);
    }
    
    function renderChatMessages(messages) {
        if (!messages || messages.length === 0) {
            chatMessages.innerHTML = `
                <div class="empty-chat">
                    <p>No messages yet. Start the conversation!</p>
                </div>
            `;
            return;
        }
        
        // Sort messages by date (oldest first)
        const sortedMessages = [...messages].sort((a, b) => 
            new Date(a.created_at) - new Date(b.created_at)
        );
        
        chatMessages.innerHTML = sortedMessages.map(message => {
            const isOwnMessage = message.username === room.peers[room.clientId].username;
            return `
                <div class="chat-message ${isOwnMessage ? 'own' : 'other'}">
                    ${!isOwnMessage ? `
                    <div class="chat-message-sender">
                        <img src="https://images.websim.ai/avatar/${message.username}" alt="${message.username}'s avatar">
                        ${message.username}
                    </div>
                    ` : ''}
                    <div class="chat-message-content">${message.content}</div>
                </div>
            `;
        }).join('');
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    async function sendChatMessage() {
        const messageContent = chatInput.value.trim();
        if (!messageContent) return;
        
        try {
            // Create chat message
            await room.collection('chat_messages').create({
                content: messageContent
            });
            
            // Clear input
            chatInput.value = '';
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }
    
    function openChat() {
        chatContainer.classList.add('active');
        // Focus input
        setTimeout(() => {
            chatInput.focus();
        }, 300);
    }
    
    function closeChat() {
        chatContainer.classList.remove('active');
    }
});
