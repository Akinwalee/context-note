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

	noteButton = document.createElement("button");
	noteButton.id = "noteButton"
	noteButton.textContent = "Add Note";
	noteButton.style.position = "absolute";
	noteButton.style.top = `${y}px`;
	noteButton.style.left = `${x}px`;
	noteButton.style.zIndex = 9999;
	noteButton.style.padding = `5px 10px`;
	noteButton.style.background = "#ffd700";
	noteButton.style.border = "1px solid #333";
	noteButton.style.borderRadius = "5px";
	noteButton.style.cursor = "pointer";

	document.body.appendChild(noteButton);

	noteButton.addEventListener("click", () => {
		const selectedText = selection.toString().trim();
		if (selectedText) {
			const note = prompt("Enter your note");
			if (note) {
				const url = window.location.href;
				const range = selection.getRangeAt(0);
				const xpath = getXPath(range.startContainer);
				const startOffset = range.startOffset;
				const endOffset = range.endOffset;

				const noteData = {
					text: selectedText,
					note,
					xpath,
					startOffset,
					endOffset
				};

				chrome.storage.local.get([url], (result) => {
					const notes = result[url] || [];
					notes.push(noteData);
					chrome.storage.local.set({ [url]: notes });
					alert("Note saved");

					noteButton.remove();
					noteButton = null;
				});
			}
		}
	})
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


function highlightText({ xpath, startOffset, endOffset, note}) {
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
	span.title = note;

	range.surroundContents(span);
}

const style = document.createElement("style");
style.textContent =  `
  .contextnote-highlight {
    background-color: yellow;
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