const search = document.querySelector("input[name='search']");
const results = document.querySelector("select[name='results']");
const note_entry = document.querySelector("textarea[name='note']"); 
note_entry.setAttribute("data-noteid", "-1");

let allow_blur = false;
let sel_idx = -1;
let num_results = 0;

search.focus();

// Load localStorage to all_notes[].
// If no localStorage notes, initialize with _data[]. 
let ls_notes_val = localStorage.getItem("notes");
if (ls_notes_val == null) {
    ls_notes_val = JSON.stringify(_data);
    localStorage.setItem("notes", ls_notes_val);
}
let all_notes = JSON.parse(ls_notes_val);
for (let i=0; i < all_notes.length; i++) {
    all_notes[i].id = i;
}

update_results(all_notes);

// Sync all_notes[] to localStorage.
function sync_to_local_storage() {
    const ls_notes_val = JSON.stringify(all_notes);
    localStorage.setItem("notes", ls_notes_val);
}

// Search for all notes containing q.
function search_all_notes(q) {
    q = q.toLowerCase();

    let found_notes = [];
    for (let i=0; i < all_notes.length; i++) {
        const note = all_notes[i];
        note.id = i;
        if (note.title.toLowerCase().includes(q) || note.body.toLowerCase().includes(q)) {
            found_notes.push(note);
        }
    }

    return found_notes;
}

document.addEventListener("keydown", function(e) {
    // ESC (or CTRL-`) clears everything: search box, selection, note edit box.
    if (e.code == "Escape" || (e.ctrlKey && e.code == "Backquote")) {
        e.preventDefault();

        save_current_note();

        search.value = "";
        const found_notes = search_all_notes("");
        update_results(found_notes);

        search.focus();
        return;
    }

    // CTRL-L selects and brings focus back to search text.
    if (e.ctrlKey && e.code == "KeyL") {
        e.preventDefault();

        save_current_note();

        const found_notes = search_all_notes(search.value);
        update_results(found_notes);

        search.focus();
        search.select();
        return;
    }

    // CTRL-X deletes the selected note.
    if (e.ctrlKey && e.code == "KeyX") {
        e.preventDefault();

        if (sel_idx == -1) {
            return;
        }
        const noteid = results.options[sel_idx].getAttribute("data-noteid")
        if (!noteid || noteid == "-1") {
            return;
        }
        all_notes.splice(noteid, 1);
        sync_to_local_storage();

        search.value = "";
        const found_notes = search_all_notes("");
        update_results(found_notes);

        search.focus();
        return;
    }
});

search.addEventListener("keydown", function(e) {
    if (e.code == "ArrowDown" || e.code == "ArrowUp") {
        e.preventDefault();

        // Remove selection highlight.
        if (sel_idx >= 0 && sel_idx <= num_results-1) {
            results.options[sel_idx].removeAttribute("selected");
        }

        // Prev/next selection and update highlight.
        if (e.code == "ArrowDown") sel_idx++;
        if (e.code == "ArrowUp") sel_idx--;

        if (sel_idx < 0 && num_results > 0) sel_idx = 0;
        if (sel_idx > num_results-1) sel_idx = num_results-1;

        if (sel_idx < 0) {
            sel_idx = -1;
            return;
        }

        results.options[sel_idx].setAttribute("selected", "selected");
        results.selectedIndex = sel_idx;

        // Show selected note title and body to controls.
        const noteid = results.options[sel_idx].getAttribute("data-noteid")

        if (!noteid || noteid == "-1") {
            return;
        }
        const note = all_notes[noteid];
        search.value = note.title;
        note_entry.value = note.body;
        note_entry.setAttribute("data-noteid", noteid);
        return;
    }

    if (e.code == "Enter") {
        e.preventDefault();

        // Need to specify a title when entering a new note.
        if (search.value.trim() == "") {
            return;
        }

        // New note:
        // 1. Add to all_notes[]
        // 2. Refresh select options
        if (sel_idx == -1) {
            const note = {"title": search.value, "body": note_entry.value};
            note.id = all_notes.length;
            all_notes.push(note);

            const found_notes = search_all_notes(search.value);
            update_results(found_notes);

            note_entry.setAttribute("data-noteid", note.id);
        }

        allow_blur = true;
        note_entry.focus();
        return;
    }
});

function update_results(notes) {
    // Clear results listbox
    results.innerHTML = "";

    for (let i=0; i < notes.length; i++) {
        const note = notes[i];
        const option = document.createElement("option");

        let option_text = "";
        if (note.body.trim() == "") {
            option_text = `${note.title}`;
        } else {
            option_text = `${note.title} - ${note.body}`;
        }
        option_text = option_text.substring(0, 160)
        option.innerText = option_text;
        option.setAttribute("data-noteid", note.id);
        results.add(option);
    }

    num_results = notes.length;

    // Add dummy option to the end. You shouldn't be able to scroll to or select it.
    // This is a workaround so that select options expand to container width even
    // when there are no options.
    let title = "";
    if (num_results == 0) {
        title = "No results";
    }
    const option = document.createElement("option");
    option.innerText = title;
    option.setAttribute("data-noteid", "-1");
    results.add(option);

    // Clear selection.
    sel_idx = -1;
    results.selectedIndex = sel_idx;

    // Clear selected note editbox.
    note_entry.value = "";
    note_entry.setAttribute("data-noteid", "-1");
}

let _timer_id = 0;
search.addEventListener("input", function(e) {
    clearTimeout(_timer_id);
    _timer_id = setTimeout(function() {
        // Search matching notes and update UI.
        const found_notes = search_all_notes(search.value);
        update_results(found_notes);
    }, 250);
});

// Keep focus on search textbox always.
search.addEventListener("blur", function(e) {
    if (allow_blur) {
        allow_blur = false;
        return;
    }

    e.preventDefault();
    search.focus();
});

// Tabbing away or clicking away from note is same as CTRL-L.
note_entry.addEventListener("blur", function(e) {
    e.preventDefault();

    search.focus();
    search.select();
});

// Save edited note body.
function save_current_note() {
    const noteid = note_entry.getAttribute("data-noteid")

    // No linked note to save. noteid is an index to all_notes[].
    if (!noteid || noteid == "-1") {
        return;
    }

    const note = all_notes[noteid];
    note.body = note_entry.value;
    sync_to_local_storage();

    if (results.selectedIndex >= 0) {
        const sel_option = results.options[results.selectedIndex]
        sel_option.innerText = `${note.title} - ${note.body}`;
    }
}


