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




chrome.tabs.query({ active: true, currentWindow: true},([tab]) => {
	const url = tab.url;
	chrome.storage.local.get([url], (result) => {
		const notes = result[url] || [];
		renderNotes(notes, url);
	})
})
