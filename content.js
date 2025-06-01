let noteButtonn = null;

function createNoteButton(x, y) {
	if (noteButtonn) noteButtonn.remove();

	noteButtonn = document.createElement("button");
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

	noteButton.onClick = () => {
		const selectedText = window.getSelection().toString().trim();
		if (selectedText) {
			const note = prompt("Enter your note");
			if (note) {
				const url = window.location.href;

				chrome.storage.local.get([url], (result) => {
					const notes = result[url] || [];
					notes.push({text: selectedText, note});
					chrome.storage.local.set({ [url]: notes });
					alert("Note saved");
				});
			}
		}

		noteButton.remove();
		noteButton = null;
	}
}


document.addEventListener("mouseup", (e) => {
	const selection = window.getSelection().toString().trim();
	if (selection.length > 0) {
		const {x, y} = e;
		createNoteButton(x + 10, y + 10);
	} else if (noteButton) {
		noteButton.remove();
		noteButton = null;
	}
});