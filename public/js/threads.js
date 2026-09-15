document.addEventListener('DOMContentLoaded', () => {
    const threadsList = document.getElementById('threadsList');
    const threadTitle = document.getElementById('threadTitle');
    const threadDescription = document.getElementById('threadDescription');
    const createThreadButton = document.getElementById('createThreadButton');
    const threadFeedback = document.getElementById('threadFeedback');

    let allThreads = [];
    let editingId = null;
    let originalData = null;

    init();

    function init() {
        loadThreads();
        if (createThreadButton) {
            createThreadButton.addEventListener('click', onCreate);
        }
    }

    // ---------- data ----------
    function loadThreads() {
        fetch('/api/threads')
            .then(r => r.json())
            .then(threads => {
                allThreads = Array.isArray(threads) ? threads : [];
                renderList();
            })
            .catch(() => {
                threadsList.innerHTML = '<p>Server not responding.</p>';
            });
    }

    // ---------- rendering ----------
    function renderList() {
        if (allThreads.length === 0) {
            threadsList.innerHTML = '<p>No threads yet. Create one above.</p>';
            return;
        }
        threadsList.innerHTML = allThreads.map(cardFor).join('');
        attachHandlers();
    }

    function cardFor(thread) {
        const count = thread.thought_count || 0;
        const countLabel = count + ' thought' + (count === 1 ? '' : 's');
        return `
            <div class="thought-card" data-id="${thread.id}">
                <h3>${escapeHtml(thread.title)}</h3>
                <p>${escapeHtml(thread.description || '')}</p>
                <span class="thought-date">${countLabel}</span>
            </div>
        `;
    }

    function editCardFor(thread) {
        return `
            <div class="thought-card editing" data-id="${thread.id}">
                <input type="text" class="edit-title" value="${escapeHtml(thread.title)}" placeholder="Thread title..." />
                <textarea class="edit-content" placeholder="Description (optional)">${escapeHtml(thread.description || '')}</textarea>
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
        threadsList.querySelectorAll('.thought-card').forEach(card => {
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
        const card = threadsList.querySelector(`.thought-card[data-id="${id}"]`);
        if (!card) return;

        const titleEl = card.querySelector('h3');
        const descEl = card.querySelector('p');

        originalData = {
            id,
            title: titleEl ? titleEl.textContent : '',
            description: descEl ? descEl.textContent : ''
        };

        card.outerHTML = editCardFor(originalData);
        editingId = id;
        attachEditHandlers();
    }

    function attachEditHandlers() {
        const card = threadsList.querySelector('.thought-card.editing');
        if (!card) return;

        card.querySelector('.btn-save').addEventListener('click', () => saveEdit(card));
        card.querySelector('.btn-cancel').addEventListener('click', () => {
            if (hasUnsavedChanges()) {
                if (!confirm('Discard changes?')) return;
            }
            exitEditMode();
        });
        card.querySelector('.btn-delete').addEventListener('click', () => deleteThread(card.dataset.id));
    }

    function hasUnsavedChanges() {
        const card = threadsList.querySelector('.thought-card.editing');
        if (!card || !originalData) return false;
        const newTitle = card.querySelector('.edit-title').value.trim();
        const newDesc = card.querySelector('.edit-content').value.trim();
        return (
            newTitle !== originalData.title ||
            newDesc !== (originalData.description || '')
        );
    }

    function exitEditMode() {
        if (editingId === null) return;
        const card = threadsList.querySelector('.thought-card.editing');
        if (card && originalData) {
            const updated = allThreads.find(t => t.id === originalData.id);
            card.outerHTML = cardFor(updated || originalData);
            attachHandlers();
        }
        editingId = null;
        originalData = null;
    }

    function saveEdit(card) {
        const id = parseInt(card.dataset.id, 10);
        const title = card.querySelector('.edit-title').value.trim();
        const description = card.querySelector('.edit-content').value.trim();

        if (!title) {
            alert('Title cannot be empty.');
            return;
        }

        fetch(`/api/threads/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description })
        })
            .then(r => r.json())
            .then(data => {
                if (data.error) {
                    alert('Error: ' + data.error);
                    return;
                }
                const idx = allThreads.findIndex(t => t.id === id);
                if (idx !== -1) {
                    allThreads[idx] = { ...allThreads[idx], title, description };
                }
                const updated = allThreads.find(t => t.id === id);
                card.outerHTML = cardFor(updated);
                editingId = null;
                originalData = null;
                attachHandlers();
            })
            .catch(() => {
                alert('Server not responding.');
            });
    }

    function deleteThread(id) {
        id = parseInt(id, 10);
        const thread = allThreads.find(t => t.id === id);
        const count = thread ? (thread.thought_count || 0) : 0;

        let message = 'Delete this thread?';
        if (count > 0) {
            message = `This thread has ${count} thought${count === 1 ? '' : 's'}. They will become unthreaded. Continue?`;
        }
        if (!confirm(message)) return;

        fetch(`/api/threads/${id}`, { method: 'DELETE' })
            .then(r => r.json())
            .then(data => {
                if (data.error) {
                    alert('Error: ' + data.error);
                    return;
                }
                const card = threadsList.querySelector(`.thought-card[data-id="${id}"]`);
                if (card) card.remove();
                editingId = null;
                originalData = null;
                allThreads = allThreads.filter(t => t.id !== id);
                if (!threadsList.querySelector('.thought-card')) {
                    threadsList.innerHTML = '<p>No threads yet. Create one above.</p>';
                }
            })
            .catch(() => {
                alert('Server not responding.');
            });
    }

    // ---------- create ----------
    function onCreate() {
        const title = threadTitle.value.trim();
        const description = threadDescription.value.trim();

        if (!title) {
            threadFeedback.textContent = 'Please enter a title.';
            threadFeedback.style.color = '#b33';
            return;
        }

        fetch('/api/threads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description })
        })
            .then(r => r.json())
            .then(data => {
                if (data.error) {
                    threadFeedback.textContent = 'Error: ' + data.error;
                    threadFeedback.style.color = '#b33';
                } else {
                    threadFeedback.textContent = 'Thread created.';
                    threadFeedback.style.color = '#2a7d2a';
                    threadTitle.value = '';
                    threadDescription.value = '';
                    loadThreads();
                }
            })
            .catch(() => {
                threadFeedback.textContent = 'Server not responding.';
                threadFeedback.style.color = '#b33';
            });
    }

    // ---------- helpers ----------
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }
});