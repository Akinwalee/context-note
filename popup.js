function renderNotes(notes, url) {
	const notesContainer = document.getElementById("notes");
	notesContainer.innerHTML = "";

	if (!notes || notes.lenght == 0) {
		notesContainer.innerHTML = "<p> You have no notes for this page.</p>";
		return;
	}

	notes.forEach((note,index) => {
		conts fiv = document.createElement("div");
		div.className = "note";
		div.innerHTML = `
			<strong>${note.text}</strong><br/>
			<em>${note.note}</em><br/>
			<button data-index="${index}">Delete</button>
		`;
		notesContainer.appendChild(div);
	});

	document.querySelectorAll("button[data-index]").forEach(button => {
		button.addEventListener("click", () => {
			const i = button.dataset.index;
			notes.splice(i, 1);
			chrome.storage.local.set({ [url]: notes }, () renderNotes(notes, url));
		});
	});
}

chrome.tabs.query({ active: true, currentWindow: true}, ([tab]) => {
	const url = tab.url;
	chrome.storage.local.get([url], (result) => {
		const notes = result(url) || [];
		renderNotes(notes, url);
	})
})