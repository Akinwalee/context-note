function renderNotes(notes, url) {
	const notesContainer = document.getElementById("notes");
	notesContainer.innerHTML = "";

	if (!notes || notes.length == 0) {
		notesContainer.innerHTML = "<p> You have no notes for this page.</p>";
		return;
	}

	notes.forEach((note,index) => {
		const div = document.createElement("div");
		div.className = "note";
		div.innerHTML = `
			<div style="background: #fff8dc; border: 1px solid #ccc; border-radius: 8px; padding: 12px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
				<p style="margin: 0 0 8px;"><strong>Highlighted Text:</strong> <span>${note.text}</span></p>
				<p style="margin: 0 0 8px;"><strong>Note:</strong> <em>${note.note}</em></p>
				<button data-index="${index}" style="background: #e74c3c; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;">Delete</button>
			</div>
		`;
		notesContainer.appendChild(div);
	});

	document.querySelectorAll("button[data-index]").forEach(button => {
		button.addEventListener("click", () => {
			const i = button.dataset.index;
			notes.splice(i, 1);
			chrome.storage.local.set({ [url]: notes }, () => renderNotes(notes, url));
		});
	});
}

function addStatisticsView(allNotes) {
    const statsTab = document.getElementById('stats-tab');
    statsTab.innerHTML = '';
    
    const statsContainer = document.createElement('div');
    statsContainer.className = 'stats-container';
    
    const totalNotes = Object.values(allNotes).reduce((sum, pageNotes) => 
        sum + pageNotes.length, 0);
    
    const tagCounts = {};
    Object.values(allNotes).forEach(pageNotes => {
        pageNotes.forEach(note => {
            if (note.tags) {
                note.tags.forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
            }
        });
    });
    
    statsContainer.innerHTML = `
        <div class="stats-summary">
            <div class="stat-box">
                <span class="stat-number">${totalNotes}</span>
                <span class="stat-label">Total Notes</span>
            </div>
            <div class="stat-box">
                <span class="stat-number">${Object.keys(allNotes).length}</span>
                <span class="stat-label">Pages with Notes</span>
            </div>
        </div>
        <div class="tags-summary">
            <h4>Top Tags</h4>
            <div class="tag-list">
                ${Object.entries(tagCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([tag, count]) => 
                        `<span class="tag-pill">${tag} (${count})</span>`
                    ).join('')}
            </div>
        </div>
    `;
    
    statsTab.appendChild(statsContainer);
}


function switchTab() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            button.classList.add('active');
            
            tabContents.forEach(content => content.classList.add('hidden'));
            
            document.getElementById(`${tabId}-tab`).classList.remove('hidden');
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    switchTab();
    
    document.querySelector('[data-tab="all"]').addEventListener('click', loadAllNotes);
    
    chrome.tabs.query({ active: true, currentWindow: true}, ([tab]) => {
        const url = tab.url;
        chrome.storage.local.get([url], (result) => {
            const notes = result[url] || [];
            renderNotes(notes, url);
        });
    });

	document.getElementById('settings-button').addEventListener('click', () => {
        openSettingsModal();
    });
    document.getElementById('export-button').addEventListener('click', () => {
        exportNotes();
    });
});

function loadAllNotes() {
    const allNotesContainer = document.getElementById('all-tab');
    allNotesContainer.innerHTML = '<div class="search-bar"><input type="text" id="all-search" placeholder="Search all notes..."></div><div id="all-notes-list"></div>';
    
    chrome.storage.local.get(null, (data) => {
        const allNotesData = Object.entries(data)
            .filter(([key, value]) => Array.isArray(value) && value.length > 0);
        
        if (allNotesData.length === 0) {
            document.getElementById('all-notes-list').innerHTML = '<p>No notes found.</p>';
            return;
        }
        
        const notesListContainer = document.getElementById('all-notes-list');
        allNotesData.forEach(([url, notes]) => {
            const urlDiv = document.createElement('div');
            urlDiv.className = 'url-group';
            
            // const domain = new URL(url).hostname;
			const domain = new URL(url);
            urlDiv.innerHTML = `<h4 class="site-name">${domain}</h4>`;
            
            notes.forEach(note => {
                const noteDiv = document.createElement('div');
                noteDiv.className = 'note';
                noteDiv.style.borderLeft = `3px solid ${note.color || '#FFEB3B'}`;
                
                let tagsHtml = '';
                if (note.tags && note.tags.length) {
                    tagsHtml = `
                        <div class="note-tags">
                            ${note.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    `;
                }
                
                noteDiv.innerHTML = `
                    <div class="note-content">
                        <div class="highlighted-text">"${note.text}"</div>
                        <div class="note-text">${note.note}</div>
                        ${tagsHtml}
                        <div class="note-meta">
                            <span>${note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'Unknown date'}</span>
                        </div>
                    </div>
                `;
                urlDiv.appendChild(noteDiv);
            });
            
            notesListContainer.appendChild(urlDiv);
        });
    });
}

chrome.storage.local.get(null, (allData) => {
    const allNotes = Object.entries(allData)
        .filter(([key, value]) => Array.isArray(value))
        .reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
        }, {});
    
    addStatisticsView(allNotes);
});


function openSettingsModal() {
    const modal = document.createElement('div');
    modal.className = 'settings-modal';
    modal.innerHTML = `
        <div class="settings-content">
            <div class="settings-header">
                <h3>Settings</h3>
                <button class="close-button">&times;</button>
            </div>
            <div class="settings-body">
                <div class="setting-item">
                    <label>Default highlight color</label>
                    <div class="color-choices">
                        <span class="color-choice" data-color="#FFEB3B" style="background-color: #FFEB3B"></span>
                        <span class="color-choice" data-color="#4CAF50" style="background-color: #4CAF50"></span>
                        <span class="color-choice" data-color="#2196F3" style="background-color: #2196F3"></span>
                        <span class="color-choice" data-color="#F44336" style="background-color: #F44336"></span>
                        <span class="color-choice" data-color="#9C27B0" style="background-color: #9C27B0"></span>
                    </div>
                </div>
                <div class="setting-item">
                    <label>Auto-backup to Google Drive</label>
                    <label class="switch">
                        <input type="checkbox" id="backup-toggle">
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="setting-item">
                    <label>Theme</label>
                    <select id="theme-select">
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="system">System default</option>
                    </select>
                </div>
                <button class="save-settings">Save Settings</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    chrome.storage.sync.get({
        defaultColor: '#FFEB3B',
        autoBackup: false,
        theme: 'light'
    }, (settings) => {
        document.querySelectorAll('.color-choice').forEach(choice => {
            if (choice.dataset.color === settings.defaultColor) {
                choice.classList.add('selected');
            }
        });
        
        document.getElementById('backup-toggle').checked = settings.autoBackup;
        
        // Set theme
        document.getElementById('theme-select').value = settings.theme;
    });
    
    document.querySelectorAll('.color-choice').forEach(choice => {
        choice.addEventListener('click', () => {
            document.querySelectorAll('.color-choice').forEach(c => c.classList.remove('selected'));
            choice.classList.add('selected');
        });
    });
    
    document.querySelector('.close-button').addEventListener('click', () => {
        modal.remove();
    });
    
    document.querySelector('.save-settings').addEventListener('click', () => {
        const selectedColor = document.querySelector('.color-choice.selected').dataset.color;
        const autoBackup = document.getElementById('backup-toggle').checked;
        const theme = document.getElementById('theme-select').value;
        
        chrome.storage.sync.set({
            defaultColor: selectedColor,
            autoBackup: autoBackup,
            theme: theme
        }, () => {
            modal.remove();
            showToast('Settings saved successfully!');
        });
    });
}

function exportNotes() {
    const exportModal = document.createElement('div');
    exportModal.className = 'export-modal';
    exportModal.innerHTML = `
        <div class="export-content">
            <div class="export-header">
                <h3>Export Notes</h3>
                <button class="close-button">&times;</button>
            </div>
            <div class="export-body">
                <div class="export-option">
                    <input type="radio" id="export-current" name="export-scope" value="current" checked>
                    <label for="export-current">Current page notes</label>
                </div>
                <div class="export-option">
                    <input type="radio" id="export-all" name="export-scope" value="all">
                    <label for="export-all">All notes</label>
                </div>
                <div class="export-format">
                    <p>Format:</p>
                    <div class="format-choices">
                        <button class="format-choice selected" data-format="json">JSON</button>
                        <button class="format-choice" data-format="csv">CSV</button>
                    </div>
                </div>
                <button id="download-notes">Download</button>
            </div>
        </div>
    `;
    document.body.appendChild(exportModal);
    
    document.querySelector('.export-modal .close-button').addEventListener('click', () => {
        exportModal.remove();
    });
    
    document.querySelectorAll('.format-choice').forEach(choice => {
        choice.addEventListener('click', () => {
            document.querySelectorAll('.format-choice').forEach(c => c.classList.remove('selected'));
            choice.classList.add('selected');
        });
    });
    
    document.getElementById('download-notes').addEventListener('click', () => {
        const exportScope = document.querySelector('input[name="export-scope"]:checked').value;
        const exportFormat = document.querySelector('.format-choice.selected').dataset.format;
        
        if (exportScope === 'current') {
            chrome.tabs.query({ active: true, currentWindow: true}, ([tab]) => {
                const url = tab.url;
                chrome.storage.local.get([url], (result) => {
                    const notes = result[url] || [];
                    downloadNotes(notes, exportFormat, getFilenameFromUrl(url));
                });
            });
        } else {
            chrome.storage.local.get(null, (data) => {
                const allNotes = Object.entries(data)
                    .filter(([key, value]) => Array.isArray(value))
                    .reduce((obj, [key, value]) => {
                        obj[key] = value;
                        return obj;
                    }, {});
                
                downloadNotes(allNotes, exportFormat, 'contextnote-all');
            });
        }
        
        exportModal.remove();
    });
}

