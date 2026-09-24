document.addEventListener('DOMContentLoaded', () => {
    const thoughtsList = document.getElementById('thoughtsList');
    const ALLOWED_TYPES = ['Thought', 'Idea', 'Question', 'Lesson', 'Reflection', 'Goal'];

    let threads = [];
    let allThoughts = [];
    let currentFilter = '';
    let editingId = null;
    let originalData = null;
    let linksByThoughtId = {};

    init();
    setupSearch();

    function setupSearch() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;
        searchInput.addEventListener('input', () => {
            currentFilter = searchInput.value;
            if (editingId !== null) {
                exitEditMode();
            }
            renderFiltered();
        });
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                currentFilter = '';
                renderFiltered();
            }
        });
    }

    function init() {
        loadThreads().then(loadThoughts);
    }

    function loadThreads() {
        return fetch('/api/threads')
            .then(r => r.json())
            .then(data => {
                threads = Array.isArray(data) ? data : [];
            })
            .catch(() => { threads = []; });
    }

    function loadThoughts() {
        return fetch('/api/thoughts')
            .then(r => r.json())
            .then(thoughts => {
                allThoughts = Array.isArray(thoughts) ? thoughts : [];
                return loadAllLinks();
            })
            .then(() => {
                renderFiltered();
            })
            .catch(() => {
                thoughtsList.innerHTML = '<p>Server not responding.</p>';
            });
    }

    function loadAllLinks() {
        // For each thought, fetch its outgoing links. Small scale: ~20 thoughts.
        linksByThoughtId = {};
        const promises = allThoughts.map(t =>
            fetch('/api/thoughts/' + t.id + '/links')
                .then(r => r.json())
                .then(links => {
                    linksByThoughtId[t.id] = Array.isArray(links) ? links : [];
                })
                .catch(() => { linksByThoughtId[t.id] = []; })
        );
        return Promise.all(promises);
    }

    function renderFiltered() {
        if (allThoughts.length === 0) {
            thoughtsList.innerHTML = '<p>No thoughts yet. Start capturing.</p>';
            return;
        }

        const query = currentFilter.trim().toLowerCase();
        const visible = query
            ? allThoughts.filter(t => t.content.toLowerCase().includes(query))
            : allThoughts;

        if (visible.length === 0) {
            thoughtsList.innerHTML = '<p>No thoughts match your search.</p>';
            return;
        }

        thoughtsList.innerHTML = visible.map(cardFor).join('');
        attachHandlers();
    }

    function cardFor(thought) {
        const whyHtml = thought.why
            ? `<p class="thought-why"><span class="layer-label">why:</span> ${escapeHtml(thought.why)}</p>`
            : '';
        const stepHtml = thought.next_step
            ? `<p class="thought-next-step"><span class="layer-label">next:</span> ${escapeHtml(thought.next_step)}</p>`
            : '';

        const links = linksByThoughtId[thought.id] || [];
        const linksHtml = links.length > 0
            ? `
                <div class="thought-links">
                    <span class="links-label">Linked:</span>
                    ${links.map(l => `
                        <span class="link-chip" data-link-id="${l.id}" title="Click to open">
                            #${l.id} ${escapeHtml(l.content).slice(0, 40)}${l.content.length > 40 ? '…' : ''}
                        </span>
                    `).join('')}
                </div>
            `
            : '';

        return `
            <div class="thought-card" data-id="${thought.id}">
                <span class="thought-type">${escapeHtml(thought.type)}</span>
                ${thought.thread_title ? `<span class="thought-thread">→ ${escapeHtml(thought.thread_title)}</span>` : ''}
                <p class="thought-content">${escapeHtml(thought.content)}</p>
                ${whyHtml}
                ${stepHtml}
                ${linksHtml}
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

        const currentLinks = linksByThoughtId[thought.id] || [];
        const linkIdsString = currentLinks.map(l => l.id).join(', ');

        return `
            <div class="thought-card editing" data-id="${thought.id}">
                <select class="edit-type">${typeOptions}</select>
                <select class="edit-thread">${threadOptions}</select>
                <textarea class="edit-content">${escapeHtml(thought.content)}</textarea>
                <textarea class="edit-why" placeholder="Why does this matter? (optional)">${escapeHtml(thought.why || '')}</textarea>
                <textarea class="edit-next-step" placeholder="What will you do about it? (optional)">${escapeHtml(thought.next_step || '')}</textarea>
                <input type="text" class="edit-links" placeholder="Link to thought IDs (comma-separated, e.g. 7, 12)" value="${escapeHtml(linkIdsString)}" />
                <div class="edit-actions">
                    <button class="btn-save">Save</button>
                    <button class="btn-cancel">Cancel</button>
                    <button class="btn-delete">Delete</button>
                </div>
            </div>
        `;
    }

    function attachHandlers() {
        thoughtsList.querySelectorAll('.thought-card').forEach(card => {
            if (card.classList.contains('editing')) return;
            card.addEventListener('click', () => onCardClick(card));
        });

        // Click a link chip to jump to that thought's edit form
        thoughtsList.querySelectorAll('.link-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetId = parseInt(chip.dataset.linkId, 10);
                if (editingId !== null) {
                    if (hasUnsavedChanges()) {
                        if (!confirm('You have unsaved changes. Discard them?')) return;
                    }
                    exitEditMode();
                }
                enterEditMode(targetId);
                const target = thoughtsList.querySelector(`.thought-card[data-id="${targetId}"]`);
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
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

        const typeEl = card.querySelector('.thought-type');
        const contentEl = card.querySelector('.thought-content');
        const dateEl = card.querySelector('.thought-date');
        const threadEl = card.querySelector('.thought-thread');
        const whyEl = card.querySelector('.thought-why');
        const stepEl = card.querySelector('.thought-next-step');

        originalData = {
            id,
            type: typeEl ? typeEl.textContent : 'Thought',
            content: contentEl ? contentEl.textContent : '',
            created_at: dateEl ? dateEl.textContent : '',
            thread_id: null,
            thread_title: threadEl ? threadEl.textContent.replace('→ ', '') : null,
            why: whyEl ? whyEl.textContent.replace('why:', '').trim() : '',
            next_step: stepEl ? stepEl.textContent.replace('next:', '').trim() : ''
        };

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
        const newWhy = card.querySelector('.edit-why').value;
        const newStep = card.querySelector('.edit-next-step').value;
        const newLinks = card.querySelector('.edit-links').value;
        const originalLinks = (linksByThoughtId[originalData.id] || []).map(l => l.id).join(', ');
        return (
            newContent !== originalData.content ||
            newType !== originalData.type ||
            (parseInt(newThread, 10) || null) !== originalData.thread_id ||
            newWhy !== originalData.why ||
            newStep !== originalData.next_step ||
            newLinks !== originalLinks
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
        const why = card.querySelector('.edit-why').value.trim();
        const next_step = card.querySelector('.edit-next-step').value.trim();
        const linksRaw = card.querySelector('.edit-links').value.trim();

        if (!content) {
            alert('Content cannot be empty.');
            return;
        }

        // Parse the linked IDs
        const desiredIds = linksRaw
            ? linksRaw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => Number.isInteger(n))
            : [];
        if (desiredIds.includes(id)) {
            alert('A thought cannot link to itself.');
            return;
        }

        // First save the thought itself
        fetch(`/api/thoughts/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content,
                type,
                thread_id,
                why: why || null,
                next_step: next_step || null
            })
        })
            .then(r => r.json())
            .then(data => {
                if (data.error) {
                    alert('Error: ' + data.error);
                    return;
                }

                // Then sync links
                return syncLinks(id, desiredIds);
            })
            .then(() => {
                // Update originalData and return to display mode
                const updated = {
                    id,
                    type,
                    content,
                    created_at: originalData.created_at,
                    thread_id,
                    thread_title: thread_id
                        ? (threads.find(t => t.id === thread_id) || {}).title || null
                        : null,
                    why: why || null,
                    next_step: next_step || null
                };
                const idx = allThoughts.findIndex(t => t.id === id);
                if (idx !== -1) allThoughts[idx] = updated;

                return fetch('/api/thoughts/' + id + '/links')
                    .then(r => r.json())
                    .then(links => {
                        linksByThoughtId[id] = Array.isArray(links) ? links : [];
                    });
            })
            .then(() => {
                const card2 = thoughtsList.querySelector('.thought-card.editing');
                if (card2) {
                    card2.outerHTML = cardFor({
                        id,
                        type,
                        content,
                        created_at: originalData.created_at,
                        thread_id,
                        thread_title: thread_id
                            ? (threads.find(t => t.id === thread_id) || {}).title || null
                            : null,
                        why: why || null,
                        next_step: next_step || null
                    });
                }
                editingId = null;
                originalData = null;
                attachHandlers();
            })
            .catch(() => {
                alert('Server not responding.');
            });
    }

    function syncLinks(fromId, desiredToIds) {
        const current = (linksByThoughtId[fromId] || []).map(l => l.id);
        const toAdd = desiredToIds.filter(id => !current.includes(id));
        const toRemove = current.filter(id => !desiredToIds.includes(id));

        const adds = toAdd.map(toId =>
            fetch('/api/thoughts/' + fromId + '/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to_id: toId })
            }).then(r => r.json())
        );

        const removes = toRemove.map(toId =>
            fetch('/api/thoughts/' + fromId + '/links/' + toId, { method: 'DELETE' })
                .then(r => r.json())
        );

        return Promise.all(adds.concat(removes));
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
                allThoughts = allThoughts.filter(t => t.id !== id);
                delete linksByThoughtId[id];
                if (!thoughtsList.querySelector('.thought-card')) {
                    thoughtsList.innerHTML = '<p>No thoughts yet. Start capturing.</p>';
                }
            })
            .catch(() => {
                alert('Server not responding.');
            });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }
});