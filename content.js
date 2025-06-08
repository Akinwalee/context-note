let noteButton = null;


//Helper function to get xpath recursively
function getXPath(node) {
	if (node.nodeType === Node.TEXT_NODE) {
		return getXPath(node.parentNode) + "/text()";
	}

	if (node === document.body) return "/html/body";

	const siblings= Array.from(node.parentNode.children).filter(n => n.tagName === node.tagName);
	const index = siblings.indexOf(node) + 1;
	return getXPath(node.parentNode) + "/" + node.tagName.toLowerCase() + `[${index}]`; 
}

function createNoteButton(x, y, selection) {
	if (noteButton) noteButton.remove();

	const range = selection.getRangeAt(0);
	const rect = range.getBoundingClientRect();
	const offsetX = 0;
    const offsetY = -42;

	noteButton = document.createElement("button");
	noteButton.id = "noteButton";
	noteButton.textContent = "Add Note";
	noteButton.style.position = "absolute";
	noteButton.style.left = `${window.scrollX + rect.left + offsetX}px`;
    noteButton.style.top = `${window.scrollY + rect.top + offsetY}px`;
	noteButton.style.zIndex = 9999;
	noteButton.style.padding = `5px 10px`;
	noteButton.style.background = "#ffd700";
	noteButton.style.border = "1px solid #333";
	noteButton.style.borderRadius = "5px";
	noteButton.style.cursor = "pointer";
	noteButton.style.boxShadow = "0 2px 6px rgba(0,0,0,0.15";
	noteButton.style.fontSize = "12px";
	noteButton.style.transition = "opacity 0,3s ease";
	noteButton.style.opacity = "0";

	document.body.appendChild(noteButton);

	requestAnimationFrame(() => {
		noteButton.style.opacity = "1";
	})

	const colorPalette = document.createElement("div");
    colorPalette.className = "contextnote-color-palette";
    colorPalette.innerHTML = `
        <span class="color-option" data-color="#FFEB3B"></span>
        <span class="color-option" data-color="#4CAF50"></span>
        <span class="color-option" data-color="#2196F3"></span>
        <span class="color-option" data-color="#F44336"></span>
        <span class="color-option" data-color="#9C27B0"></span>
    `;
    noteButton.appendChild(colorPalette);
    
    // Get default color from settings before selecting
    chrome.storage.sync.get({defaultColor: '#FFEB3B'}, (settings) => {
        let selectedColor = settings.defaultColor;
        
        colorPalette.querySelectorAll('.color-option').forEach(option => {
            option.style.backgroundColor = option.dataset.color;
            if (option.dataset.color === selectedColor) {
                option.classList.add('selected');
            }
            
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedColor = option.dataset.color;
                colorPalette.querySelectorAll('.color-option').forEach(op => 
                    op.classList.remove('selected'));
                option.classList.add('selected');
            });
        });
        
        noteButton.addEventListener("click", () => {
            const selectedText = selection.toString().trim();
            if (selectedText) {
                createNoteEditor(selection, (noteContent, tagsInput) => {
                    if (noteContent) {
                        const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];
                        
                        const url = window.location.href;
                        const xpath = getXPath(range.startContainer);
                        const startOffset = range.startOffset;
                        const endOffset = range.endOffset;
                        
                        const noteData = {
                            text: selectedText,
                            note: noteContent,
                            xpath,
                            startOffset,
                            endOffset,
                            color: selectedColor,
                            tags: tags,
							url: url,
                            createdAt: new Date().toISOString()
                        };
                        
                        chrome.storage.local.get([url], (result) => {
                            const notes = result[url] || [];
                            notes.push(noteData);
                            chrome.storage.local.set({ [url]: notes });
                            
                            showToast("Note saved");
                            
                            highlightText(noteData);
                        });
                    }
                });
            }
        });
    });
    
    if(noteButton) {
		const thisButton = noteButton;
		setTimeout(() => {
			if (thisButton && thisButton.parentNode) {
						noteButton.remove();
						if (noteButton === thisButton) {
					noteButton = null;
				}
			}
		}, 10000);
	}
}

document.addEventListener("mouseup", (e) => {
	setTimeout(() => {
		const selection = window.getSelection();
		if (selection.toString().trim().length > 0) {
			const {x, y} = e;
			createNoteButton(x, y, selection);
		} else if (noteButton) {
			noteButton.remove();
			noteButton = null;
		}
	}, 10);
});

const noteViewer = document.createElement("div");
noteViewer.style.position = "absolute";
noteViewer.style.zIndex = "9999";
noteViewer.style.padding = "6px 10px";
noteViewer.style.background = "#333";
noteViewer.style.color = "#fff";
noteViewer.style.fontSize = "12px";
noteViewer.style.borderRadius = "4px";
noteViewer.style.pointerEvents = "none";
noteViewer.style.opacity = "0";
noteViewer.style.transition = "opacity 0.2s ease";
document.body.appendChild(noteViewer);


function highlightText({ xpath, startOffset, endOffset, note, color = "#FFEB3B" }) {
	const result = document.evaluate(
		xpath,
		document,
		null,
		XPathResult.FIRST_ORDERED_NODE_TYPE,
		null
	);

	const node = result.singleNodeValue;
	if (!node || node.nodeType !== Node.TEXT_NODE) return;

	const range = document.createRange();
	range.setStart(node, startOffset);
	range.setEnd(node, endOffset);

	const span = document.createElement("span");
	span.className = "contextnote-highlight";
	span.style.backgroundColor = color;
	span.addEventListener("mouseenter", (e) => {
		noteViewer.textContent = note;
		const rect = span.getBoundingClientRect();
		noteViewer.style.left = `${window.scrollX + rect.left}px`;
		noteViewer.style.top = `${window.scrollY + rect.top - 30}px`;
		noteViewer.style.opacity = "1";
	});

	span.addEventListener("mouseleave", () => {
		noteViewer.style.opacity = "0";
	})
	range.surroundContents(span);
}

const style = document.createElement("style");
style.textContent = `
  .contextnote-highlight {
    cursor: pointer;
    border-radius: 2px;
    padding: 0 2px;
  }
  
  .contextnote-color-palette {
    display: flex;
    gap: 5px;
    margin-top: 5px;
    padding: 3px;
    background: #fff;
    border-radius: 3px;
    border: 1px solid #ddd;
  }
  
  .color-option {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid transparent;
    transition: transform 0.2s;
  }
  
  .color-option.selected {
    border-color: #333;
  }
  
  .color-option:hover {
    transform: scale(1.2);
  }
  
  .contextnote-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  }
  
  .contextnote-modal-content {
    background: white;
    padding: 20px;
    border-radius: 8px;
    width: 500px;
    max-width: 90vw;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  }
  
  .editor-toolbar {
    display: flex;
    gap: 5px;
    margin-bottom: 10px;
    padding: 5px 0;
    border-bottom: 1px solid #eee;
  }
  
  .editor-toolbar button {
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 5px 10px;
    cursor: pointer;
  }
  
  .editor-toolbar button:hover {
    background: #e5e5e5;
  }
  
  #rich-editor {
    border: 1px solid #ddd;
    min-height: 100px;
    padding: 10px;
    margin-bottom: 15px;
    border-radius: 4px;
    overflow-y: auto;
  }
  
  .tags-input {
    margin-bottom: 15px;
  }
  
  .tags-input label {
    display: block;
    margin-bottom: 5px;
    font-size: 14px;
  }
  
  .tags-input input {
    width: 100%;
    padding: 8px;
    box-sizing: border-box;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
  
  .modal-actions button {
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
  }
  
  #save-note {
    background: #4a6cf7;
    color: white;
    border: none;
  }
  
  #cancel-note {
    background: white;
    border: 1px solid #ddd;
  }
`;
document.head.appendChild(style);


window.addEventListener("load", () => {
	const url = window.location.href;
	chrome.storage.local.get((url), (result) => {
		const notes = result[url] || [];
		notes.forEach((nodeData) => {
			highlightText(nodeData);
		});
	});
});

function createNoteEditor(selection, callback) {
    const selectedText = selection.toString().trim();
    
    const modal = document.createElement('div');
    modal.className = 'contextnote-modal';
    modal.innerHTML = `
        <div class="contextnote-modal-content">
            <h3>Add Note for: "${selectedText.substring(0, 50)}${selectedText.length > 50 ? '...' : ''}"</h3>
            <div class="editor-toolbar">
                <button data-command="bold"><b>B</b></button>
                <button data-command="italic"><i>I</i></button>
                <button data-command="underline"><u>U</u></button>
                <button data-command="insertOrderedList">1.</button>
                <button data-command="insertUnorderedList">•</button>
            </div>
            <div id="rich-editor" contenteditable="true"></div>
            <div class="tags-input">
                <label>Tags (comma-separated)</label>
                <input type="text" id="tags-field" placeholder="research, important, review...">
            </div>
            <div class="modal-actions">
                <button id="save-note">Save</button>
                <button id="cancel-note">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Focus the editor
    setTimeout(() => {
        document.getElementById('rich-editor').focus();
    }, 100);
    
    document.querySelectorAll('.editor-toolbar button').forEach(button => {
        button.addEventListener('click', () => {
            document.execCommand(button.dataset.command, false, null);
            document.getElementById('rich-editor').focus();
        });
    });
    
    document.getElementById('save-note').addEventListener('click', () => {
        const noteContent = document.getElementById('rich-editor').innerHTML;
        const tags = document.getElementById('tags-field').value;
        modal.remove();
        callback(noteContent, tags);
    });
    
    document.getElementById('cancel-note').addEventListener('click', () => {
        modal.remove();
        callback(null);
    });
    
    window.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            modal.remove();
            callback(null);
            window.removeEventListener('keydown', escHandler);
        }
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "contextMenuNote") {
        const selection = window.getSelection();
        if (selection.toString().trim().length > 0) {
            createNoteButton(0, 0, selection);
        }
    }
});

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'contextnote-toast';
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = '#333';
    toast.style.color = '#fff';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '20px';
    toast.style.zIndex = '10000';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '1';
    }, 10);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}


