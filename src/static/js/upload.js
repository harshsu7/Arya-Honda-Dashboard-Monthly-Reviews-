// CSV Upload functionality

class CSVUploader {
    constructor() {
        this.selectedFile = null;
        this.selectedLocation = null;
        this.isUploading = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUploadHistory();
        console.log('CSV Uploader initialized');
    }

    setupEventListeners() {
        // Form submission
        const uploadForm = document.getElementById('upload-form');
        if (uploadForm) {
            uploadForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleUpload();
            });
        }

        // Location selection
        const locationSelect = document.getElementById('upload-location');
        if (locationSelect) {
            locationSelect.addEventListener('change', (e) => {
                this.selectedLocation = e.target.value;
                this.validateForm();
            });
        }

        // File input
        const fileInput = document.getElementById('csv-file');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files[0]);
            });
        }

        // Drag and drop
        const dropArea = document.getElementById('file-drop-area');
        if (dropArea) {
            dropArea.addEventListener('click', () => {
                fileInput?.click();
            });

            dropArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropArea.classList.add('dragover');
            });

            dropArea.addEventListener('dragleave', () => {
                dropArea.classList.remove('dragover');
            });

            dropArea.addEventListener('drop', (e) => {
                e.preventDefault();
                dropArea.classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFileSelect(files[0]);
                }
            });
        }

        // Remove file button
        const removeFileBtn = document.getElementById('remove-file');
        if (removeFileBtn) {
            removeFileBtn.addEventListener('click', () => {
                this.clearFileSelection();
            });
        }

        console.log('Upload event listeners set up');
    }

    handleFileSelect(file) {
        if (!file) return;

        // Validate file type
        if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
            showToast('Please select a CSV file', 'error');
            return;
        }

        // Validate file size (16MB max)
        if (file.size > 16 * 1024 * 1024) {
            showToast('File size must be less than 16MB', 'error');
            return;
        }

        this.selectedFile = file;
        this.displayFileInfo(file);
        this.validateForm();
    }

    displayFileInfo(file) {
        const dropContent = document.querySelector('.file-drop-content');
        const fileInfo = document.getElementById('file-info');
        const fileName = document.getElementById('file-name');
        const fileSize = document.getElementById('file-size');

        if (dropContent) dropContent.style.display = 'none';
        if (fileInfo) fileInfo.classList.remove('hidden');
        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = this.formatFileSize(file.size);
    }

    clearFileSelection() {
        this.selectedFile = null;
        
        const fileInput = document.getElementById('csv-file');
        const dropContent = document.querySelector('.file-drop-content');
        const fileInfo = document.getElementById('file-info');

        if (fileInput) fileInput.value = '';
        if (dropContent) dropContent.style.display = 'block';
        if (fileInfo) fileInfo.classList.add('hidden');

        this.validateForm();
    }

    validateForm() {
        const uploadBtn = document.getElementById('upload-btn');
        if (uploadBtn) {
            const isValid = this.selectedFile && this.selectedLocation;
            uploadBtn.disabled = !isValid || this.isUploading;
        }
    }

    async handleUpload() {
        if (!this.selectedFile || !this.selectedLocation || this.isUploading) {
            return;
        }

        this.isUploading = true;
        this.showUploadProgress();
        
        try {
            // Create FormData
            const formData = new FormData();
            formData.append('file', this.selectedFile);
            formData.append('location', this.selectedLocation);

            // Show progress
            this.updateProgress(10, 'Preparing upload...');

            // Upload file
            const response = await this.uploadWithProgress('/api/upload-csv', formData);

            if (response.success) {
                this.updateProgress(100, 'Upload completed successfully!');
                showToast(`Successfully uploaded ${response.records_count} records for ${this.selectedLocation}`, 'success');
                
                // Clear form
                this.clearForm();
                
                // Refresh dashboard data
                if (window.dashboard) {
                    await window.dashboard.refreshData();
                }
                
                // Reload upload history
                this.loadUploadHistory();
                
            } else {
                throw new Error(response.error || 'Upload failed');
            }

        } catch (error) {
            console.error('Upload error:', error);
            showToast(error.message || 'Upload failed', 'error');
            this.updateProgress(0, 'Upload failed');
        } finally {
            this.isUploading = false;
            this.validateForm();
            
            // Hide progress after 3 seconds
            setTimeout(() => {
                this.hideUploadProgress();
            }, 3000);
        }
    }

    async uploadWithProgress(url, formData) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 90; // Reserve 10% for processing
                    this.updateProgress(percentComplete, 'Uploading...');
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        this.updateProgress(95, 'Processing data...');
                        resolve(response);
                    } catch (error) {
                        reject(new Error('Invalid response format'));
                    }
                } else {
                    try {
                        const errorResponse = JSON.parse(xhr.responseText);
                        reject(new Error(errorResponse.error || `HTTP ${xhr.status}`));
                    } catch {
                        reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                    }
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Network error occurred'));
            });

            xhr.open('POST', url);
            xhr.send(formData);
        });
    }

    showUploadProgress() {
        const progress = document.getElementById('upload-progress');
        if (progress) {
            progress.classList.remove('hidden');
        }
    }

    hideUploadProgress() {
        const progress = document.getElementById('upload-progress');
        if (progress) {
            progress.classList.add('hidden');
        }
    }

    updateProgress(percentage, text) {
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');

        if (progressBar) {
            progressBar.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
        }
        if (progressText) {
            progressText.textContent = text;
        }
    }

    clearForm() {
        this.clearFileSelection();
        
        const locationSelect = document.getElementById('upload-location');
        if (locationSelect) {
            locationSelect.value = '';
        }
        
        this.selectedLocation = null;
        this.validateForm();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async loadUploadHistory() {
        // For now, show a placeholder. In a real implementation, you'd fetch from an API
        const historyContainer = document.getElementById('upload-history');
        if (!historyContainer) return;

        // Show recent uploads based on current data
        const recentUploads = this.getRecentUploads();
        
        if (recentUploads.length === 0) {
            historyContainer.innerHTML = `
                <div class="text-center py-4 text-gray-500">
                    <i data-lucide="clock" class="h-8 w-8 mx-auto mb-2"></i>
                    <p>No recent uploads</p>
                </div>
            `;
        } else {
            historyContainer.innerHTML = recentUploads.map(upload => `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div class="flex items-center space-x-3">
                        <i data-lucide="file-text" class="h-5 w-5 text-blue-600"></i>
                        <div>
                            <p class="font-medium text-gray-900">${upload.fileName}</p>
                            <p class="text-sm text-gray-500">${upload.location} • ${upload.recordsCount} records</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="badge badge-success text-xs">Success</div>
                        <p class="text-xs text-gray-500 mt-1">${upload.uploadedAt}</p>
                    </div>
                </div>
            `).join('');
        }
        
        // Initialize icons
        setTimeout(() => {
            lucide.createIcons();
        }, 10);
    }

    getRecentUploads() {
        // Get recent uploads from dashboard data
        if (!window.dashboard || !window.dashboard.locationData) {
            return [];
        }

        const uploads = [];
        Object.keys(window.dashboard.locationData).forEach(location => {
            const data = window.dashboard.locationData[location];
            if (data && data.length > 0) {
                // Get the most recent upload for this location
                const sortedData = data.sort((a, b) => 
                    new Date(b.created_at || b.uploaded_at || 0) - new Date(a.created_at || a.uploaded_at || 0)
                );
                
                const mostRecent = sortedData[0];
                if (mostRecent) {
                    uploads.push({
                        fileName: mostRecent.file_name || 'data.csv',
                        location: location,
                        recordsCount: data.length,
                        uploadedAt: this.formatDate(mostRecent.created_at || mostRecent.uploaded_at),
                        status: 'success'
                    });
                }
            }
        });

        // Sort by upload date (most recent first)
        return uploads.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'Unknown';
        }
    }
}

// Initialize uploader when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.csvUploader = new CSVUploader();
});