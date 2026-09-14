document.addEventListener('DOMContentLoaded', () => {
    const thoughtsList = document.getElementById('thoughtsList');
    const ALLOWED_TYPES = ['Thought', 'Idea', 'Question', 'Lesson', 'Reflection', 'Goal'];

    let threads = [];          // cached thread list
    let editingId = null;      // id of the currently edited thought
    let originalData = null;   // original data of the currently edited thought

    init();

    function init() {
        loadThreads().then(loadThoughts);
    }

    // ---------- data ----------
    function loadThreads() {
        return fetch('/api/threads')
            .then(r => r.json())
            .then(data => {
                threads = Array.isArray(data) ? data : [];
            })
            .catch(() => { threads = []; });
    }

    function loadThoughts() {
        fetch('/api/thoughts')
            .then(r => r.json())
            .then(thoughts => {
                if (!Array.isArray(thoughts) || thoughts.length === 0) {
                    thoughtsList.innerHTML = '<p>No thoughts yet. Start capturing.</p>';
                    return;
                }
                thoughtsList.innerHTML = thoughts.map(cardFor).join('');
                attachHandlers();
            })
            .catch(() => {
                thoughtsList.innerHTML = '<p>Server not responding.</p>';
            });
    }

    // ---------- rendering ----------
    function cardFor(thought) {
        return `
            <div class="thought-card" data-id="${thought.id}">
                <span class="thought-type">${escapeHtml(thought.type)}</span>
                ${thought.thread_title ? `<span class="thought-thread">→ ${escapeHtml(thought.thread_title)}</span>` : ''}
                <p class="thought-content">${escapeHtml(thought.content)}</p>
                <span class="thought-date">${escapeHtml(thought.created_at)}</span>
            </div>
        `;
    }

    function editCardFor(thought) {
        const typeOptions = ALLOWED_TYPES.map(t =>
            `<option value="${t}"${t === thought.type ? ' selected' : ''}>${t}</option>`
        ).join('');

        const threadOptions = ['<option value="">No thread</option>']
            .concat(threads.map(t =>
                `<option value="${t.id}"${t.id === thought.thread_id ? ' selected' : ''}>${escapeHtml(t.title)}</option>`
            ))
            .join('');

        return `
            <div class="thought-card editing" data-id="${thought.id}">
                <select class="edit-type">${typeOptions}</select>
                <select class="edit-thread">${threadOptions}</select>
                <textarea class="edit-content">${escapeHtml(thought.content)}</textarea>
                <div class="edit-actions">
                    <button class="btn-save">Save</button>
                    <button class="btn-cancel">Cancel</button>
                    <button class="btn-delete">Delete</button>
                </div>
            </div>
        `;
    }

    // ---------- interaction ----------
    function attachHandlers() {
        thoughtsList.querySelectorAll('.thought-card').forEach(card => {
            if (card.classList.contains('editing')) return;
            card.addEventListener('click', () => onCardClick(card));
        });
    }

    function onCardClick(card) {
        const id = parseInt(card.dataset.id, 10);
        if (editingId === id) return;

        if (editingId !== null) {
            if (hasUnsavedChanges()) {
                if (!confirm('You have unsaved changes. Discard them?')) return;
            }
            exitEditMode();
        }

        enterEditMode(id);
    }

    function enterEditMode(id) {
        const card = thoughtsList.querySelector(`.thought-card[data-id="${id}"]`);
        if (!card) return;

        // Save original data for change detection and for restoring
        const typeEl = card.querySelector('.thought-type');
        const contentEl = card.querySelector('.thought-content');
        const dateEl = card.querySelector('.thought-date');
        const threadEl = card.querySelector('.thought-thread');

        originalData = {
            id,
            type: typeEl ? typeEl.textContent : 'Thought',
            content: contentEl ? contentEl.textContent : '',
            created_at: dateEl ? dateEl.textContent : '',
            thread_id: null,
            thread_title: threadEl ? threadEl.textContent.replace('→ ', '') : null
        };

        // Find original thread_id by matching title
        if (originalData.thread_title) {
            const match = threads.find(t => t.title === originalData.thread_title);
            if (match) originalData.thread_id = match.id;
        }

        card.outerHTML = editCardFor(originalData);
        editingId = id;
        attachEditHandlers();
    }

    function attachEditHandlers() {
        const card = thoughtsList.querySelector('.thought-card.editing');
        if (!card) return;

        card.querySelector('.btn-save').addEventListener('click', () => saveEdit(card));
        card.querySelector('.btn-cancel').addEventListener('click', () => {
            if (hasUnsavedChanges()) {
                if (!confirm('Discard changes?')) return;
            }
            exitEditMode();
        });
        card.querySelector('.btn-delete').addEventListener('click', () => deleteThought(card.dataset.id));
    }

    function hasUnsavedChanges() {
        const card = thoughtsList.querySelector('.thought-card.editing');
        if (!card || !originalData) return false;
        const newContent = card.querySelector('.edit-content').value;
        const newType = card.querySelector('.edit-type').value;
        const newThread = card.querySelector('.edit-thread').value;
        return (
            newContent !== originalData.content ||
            newType !== originalData.type ||
            (parseInt(newThread, 10) || null) !== originalData.thread_id
        );
    }

    function exitEditMode() {
        if (editingId === null) return;
        const card = thoughtsList.querySelector('.thought-card.editing');
        if (card && originalData) {
            card.outerHTML = cardFor(originalData);
            attachHandlers();
        }
        editingId = null;
        originalData = null;
    }

    function saveEdit(card) {
        const id = parseInt(card.dataset.id, 10);
        const content = card.querySelector('.edit-content').value.trim();
        const type = card.querySelector('.edit-type').value;
        const threadValue = card.querySelector('.edit-thread').value;
        const thread_id = threadValue ? parseInt(threadValue, 10) : null;

        if (!content) {
            alert('Content cannot be empty.');
            return;
        }

        fetch(`/api/thoughts/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, type, thread_id })
        })
            .then(r => r.json())
            .then(data => {
                if (data.error) {
                    alert('Error: ' + data.error);
                    return;
                }
                // Update originalData with new values and return to display mode
                originalData = {
                    id,
                    type,
                    content,
                    created_at: originalData.created_at,
                    thread_id,
                    thread_title: thread_id
                        ? (threads.find(t => t.id === thread_id) || {}).title || null
                        : null
                };
                card.outerHTML = cardFor(originalData);
                editingId = null;
                originalData = null;
                attachHandlers();
            })
            .catch(() => {
                alert('Server not responding.');
            });
    }

    function deleteThought(id) {
        if (!confirm('Delete this thought?')) return;
        id = parseInt(id, 10);

        fetch(`/api/thoughts/${id}`, { method: 'DELETE' })
            .then(r => r.json())
            .then(data => {
                if (data.error) {
                    alert('Error: ' + data.error);
                    return;
                }
                const card = thoughtsList.querySelector(`.thought-card[data-id="${id}"]`);
                if (card) card.remove();
                editingId = null;
                originalData = null;
                if (!thoughtsList.querySelector('.thought-card')) {
                    thoughtsList.innerHTML = '<p>No thoughts yet. Start capturing.</p>';
                }
            })
            .catch(() => {
                alert('Server not responding.');
            });
    }

    // ---------- helpers ----------
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }
});