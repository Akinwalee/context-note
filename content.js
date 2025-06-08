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
    
    // Color selection
    let selectedColor = "#FFEB3B";
    colorPalette.querySelectorAll('.color-option').forEach(option => {
        option.style.backgroundColor = option.dataset.color;
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
			const note = prompt("Enter your note");
			if (note) {
				const tagsInput = prompt("Add tags (comma-separated, optional)");
				const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];
				
				const url = window.location.href;
				const xpath = getXPath(range.startContainer);
				const startOffset = range.startOffset;
				const endOffset = range.endOffset;


				const noteData = {
					text: selectedText,
					note,
					xpath,
					startOffset,
					endOffset,
					color: selectedColor,
					tags: tags,
					createdAt: new Date().toISOString()
				};

				chrome.storage.local.get([url], (result) => {
					const notes = result[url] || [];
					notes.push(noteData);
					chrome.storage.local.set({ [url]: notes });
					alert("Note saved");						


					chrome.storage.local.get((url), (result) => {
						const updatedNotes = result[url] || [];
						updatedNotes.forEach((nodeData) => {
							highlightText(nodeData);
						});
					});
				});
			}
		}
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
style.textContent =  `
  .contextnote-highlight {
    cursor: pointer;
    border-radius: 2px;
    padding: 0 2px;
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


