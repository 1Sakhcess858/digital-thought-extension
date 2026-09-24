document.addEventListener('DOMContentLoaded', () => {
    const bpMeta = document.getElementById('bpMeta');
    const bpAreaList = document.getElementById('bpAreaList');
    const bpSaveButton = document.getElementById('bpSaveButton');
    const bpFeedback = document.getElementById('bpFeedback');

    let areas = [];

    // Values library — a starter set. Users can also add their own.
    const VALUES_LIBRARY = [
        'Health', 'Career', 'Relationships', 'Finance', 'Growth', 'Fun',
        'Purpose', 'Home', 'Family', 'Freedom', 'Learning', 'Service',
        'Courage', 'Honesty', 'Discipline', 'Creativity', 'Contribution',
        'Peace', 'Faith', 'Simplicity', 'Adventure', 'Patience',
        'Kindness', 'Curiosity', 'Loyalty', 'Faithfulness'
    ];

    let selectedValues = [];
    let visionText = '';
    let antiVisionText = '';
    let milestones = [];
    let startYear = null;

    init();

           function init() {
        loadMeta();
        loadAreas();
        loadNorthStar();
        loadMilestones();
    }

      function loadMeta() {
        fetch('/api/life-areas/meta')
            .then(r => r.json())
            .then(meta => {
                if (meta.start_year) {
                    const y = parseInt(meta.start_year, 10);
                    if (!isNaN(y)) {
                        startYear = y;
                        const end = y + 5;
                        bpMeta.textContent = 'Your blueprint window: ' + y + ' – ' + end;
                        renderGrid();
                    }
                }
            })
            .catch(() => { });
    }

    function loadAreas() {
        fetch('/api/life-areas/ratings/latest')
            .then(r => r.json())
            .then(data => {
                areas = Array.isArray(data) ? data : [];
                renderAreas();
            })
            .catch(() => {
                bpAreaList.innerHTML = '<p>Server not responding.</p>';
            });
    }

    function renderAreas() {
        if (areas.length === 0) {
            bpAreaList.innerHTML = '<p>No life areas defined.</p>';
            return;
        }

        bpAreaList.innerHTML = areas.map(areaCard).join('');
    }

    function areaCard(area) {
        const color = area.color || '#7A7A7A';
        const rating = area.rating || 0;
        const note = area.note || '';
        const lastRecorded = area.recorded_at
            ? 'Last rated ' + timeAgo(area.recorded_at)
            : 'Never rated';

        return `
            <div class="bp-area" data-area-id="${area.area_id}" style="border-left-color: ${color};">
                <div class="bp-area-header">
                    <span class="bp-area-name" style="color: ${color};">${escapeHtml(area.name)}</span>
                    <span class="bp-area-last">${escapeHtml(lastRecorded)}</span>
                </div>
                <div class="bp-rating">
                    ${[1, 2, 3, 4, 5].map(n => `
                        <button class="bp-star ${n <= rating ? 'filled' : ''}" data-value="${n}" data-area-id="${area.area_id}">
                            ${n}
                        </button>
                    `).join('')}
                </div>
                <input type="text" class="bp-note" data-area-id="${area.area_id}"
                    placeholder="One line about this area…" value="${escapeHtml(note)}" />
            </div>
        `;
    }

    // Click a star to set the rating visually
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.bp-star');
        if (!btn) return;
        const areaId = parseInt(btn.dataset.areaId, 10);
        const value = parseInt(btn.dataset.value, 10);
        const card = btn.closest('.bp-area');
        card.querySelectorAll('.bp-star').forEach(s => {
            const n = parseInt(s.dataset.value, 10);
            if (n <= value) s.classList.add('filled');
            else s.classList.remove('filled');
        });
    });

    // ---------- milestones grid ----------

    function loadMilestones() {
        fetch('/api/life-areas/milestones/all')
            .then(r => r.json())
            .then(data => {
                milestones = Array.isArray(data) ? data : [];
                renderGrid();
            })
            .catch(() => {
                const grid = document.getElementById('bpGrid');
                if (grid) grid.innerHTML = '<p>Server not responding.</p>';
            });
    }

    function getStartYear() {
        if (startYear) return startYear;
        const metaEl = document.getElementById('bpMeta');
        // Fallback to current year if meta not loaded yet
        return new Date().getFullYear();
    }

    function renderGrid() {
        const grid = document.getElementById('bpGrid');
        if (!grid) return;

        if (areas.length === 0) {
            grid.innerHTML = '<p>No life areas defined.</p>';
            return;
        }

        const y = getStartYear();

        // Header row
        const years = [1, 2, 3, 4, 5];
        let html = '<div class="bp-grid-table">';
        html += '<div class="bp-grid-header">';
        html += '<div class="bp-grid-cell bp-grid-corner"></div>';
        years.forEach(i => {
            const yearLabel = (y + i - 1);
            html += `<div class="bp-grid-cell bp-grid-year">Y${i} · ${yearLabel}</div>`;
        });
        html += '</div>'; // end header

        // One row per area
        areas.forEach(area => {
            html += '<div class="bp-grid-row">';
            html += `<div class="bp-grid-cell bp-grid-area" style="border-left-color:${area.color || '#7A7A7A'};"><span style="color:${area.color || '#7A7A7A'};">${escapeHtml(area.name)}</span></div>`;
            years.forEach(i => {
                const cellMilestones = milestones.filter(m => m.area_id === area.area_id && m.year_index === i);
                html += `<div class="bp-grid-cell bp-grid-milestone-cell" data-area-id="${area.area_id}" data-year="${i}">`;
                cellMilestones.forEach(m => {
                    const statusClass = 'bp-milestone-' + m.status;
                    html += `
                        <div class="bp-milestone ${statusClass}" data-milestone-id="${m.id}">
                            <span class="bp-milestone-text">${escapeHtml(m.text)}</span>
                        </div>
                    `;
                });
                html += `<button class="bp-grid-add" data-area-id="${area.area_id}" data-year="${i}" title="Add milestone">+</button>`;
                html += '</div>';
            });
            html += '</div>'; // end row
        });

        html += '</div>'; // end table
        grid.innerHTML = html;
    }

    // Click handler: add or edit a milestone
    document.addEventListener('click', (e) => {
        const addBtn = e.target.closest('.bp-grid-add');
        if (addBtn) {
            const areaId = parseInt(addBtn.dataset.areaId, 10);
            const year = parseInt(addBtn.dataset.year, 10);
            openMilestoneEditor(areaId, year, null);
            return;
        }

        const milestoneEl = e.target.closest('.bp-milestone');
        if (milestoneEl) {
            const id = parseInt(milestoneEl.dataset.milestoneId, 10);
            const m = milestones.find(x => x.id === id);
            if (m) {
                openMilestoneEditor(m.area_id, m.year_index, m);
            }
        }
    });

    function openMilestoneEditor(areaId, year, existing) {
        const existingId = existing ? existing.id : null;
        const currentText = existing ? existing.text : '';
        const currentWhy = existing ? existing.why || '' : '';

        const promptText = prompt('Milestone text:', currentText);
        if (promptText === null) return; // cancelled
        const text = promptText.trim();
        if (!text) return;

        const promptWhy = prompt('Why does this matter? (optional)', currentWhy);
        if (promptWhy === null) return;
        const why = promptWhy.trim();

        if (existingId) {
            // Edit existing
            fetch('/api/life-areas/milestones/' + existingId, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, why })
            })
                .then(r => r.json())
                .then(() => loadMilestones())
                .catch(() => alert('Server not responding.'));
        } else {
            // Create new
            fetch('/api/life-areas/milestones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ area_id: areaId, year_index: year, text, why })
            })
                .then(r => r.json())
                .then(data => {
                    if (data.error) {
                        alert('Error: ' + data.error);
                        return;
                    }
                    loadMilestones();
                })
                .catch(() => alert('Server not responding.'));
        }
    }

    // Right-click a milestone to mark done or delete
    document.addEventListener('contextmenu', (e) => {
        const milestoneEl = e.target.closest('.bp-milestone');
        if (!milestoneEl) return;
        e.preventDefault();

        const id = parseInt(milestoneEl.dataset.milestoneId, 10);
        const m = milestones.find(x => x.id === id);
        if (!m) return;

        const action = prompt(
            'Milestone: "' + m.text + '"\n\n' +
            'Type: done | in_progress | dropped | delete',
            m.status === 'done' ? 'done' : 'in_progress'
        );
        if (!action) return;

        if (action === 'delete') {
            if (!confirm('Delete this milestone?')) return;
            fetch('/api/life-areas/milestones/' + id, { method: 'DELETE' })
                .then(r => r.json())
                .then(() => loadMilestones())
                .catch(() => alert('Server not responding.'));
        } else if (['done', 'in_progress', 'planned', 'dropped'].includes(action)) {
            fetch('/api/life-areas/milestones/' + id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: action })
            })
                .then(r => r.json())
                .then(() => loadMilestones())
                .catch(() => alert('Server not responding.'));
        }
    });


    // ---------- north star ----------

    function loadNorthStar() {
        fetch('/api/life-areas/meta')
            .then(r => r.json())
            .then(meta => {
                // Values
                if (meta.values_json) {
                    try {
                        selectedValues = JSON.parse(meta.values_json);
                    } catch {
                        selectedValues = [];
                    }
                } else {
                    selectedValues = [];
                }

                visionText = meta.vision_statement || '';
                antiVisionText = meta.anti_vision || '';

                renderValuesLibrary();
                renderSelectedValues();

                const visionEl = document.getElementById('bpVision');
                const antiEl = document.getElementById('bpAntiVision');
                if (visionEl) visionEl.value = visionText;
                if (antiEl) antiEl.value = antiVisionText;
            })
            .catch(() => { });
    }

    function renderValuesLibrary() {
        const container = document.getElementById('bpValuesLibrary');
        if (!container) return;

        container.innerHTML = VALUES_LIBRARY.map(v => {
            const isSelected = selectedValues.includes(v);
            return `<button class="bp-value-chip ${isSelected ? 'selected' : ''}" data-value="${escapeHtml(v)}">${escapeHtml(v)}</button>`;
        }).join('');
    }

    function renderSelectedValues() {
        const container = document.getElementById('bpSelectedValues');
        if (!container) return;

        if (selectedValues.length === 0) {
            container.innerHTML = '<p class="bp-empty">No values selected yet.</p>';
            return;
        }

        container.innerHTML = selectedValues.map(v => `
            <span class="bp-selected-chip" data-value="${escapeHtml(v)}">
                ${escapeHtml(v)}
                <button class="bp-remove-value" data-value="${escapeHtml(v)}" title="Remove">×</button>
            </span>
        `).join('');
    }

    // Click a value chip in the library to toggle it
    document.addEventListener('click', (e) => {
        const chip = e.target.closest('.bp-value-chip');
        if (chip) {
            const value = chip.dataset.value;
            if (selectedValues.includes(value)) {
                selectedValues = selectedValues.filter(v => v !== value);
            } else {
                if (selectedValues.length >= 5) {
                    alert('You can choose up to 5 values. Remove one first.');
                    return;
                }
                selectedValues.push(value);
            }
            renderValuesLibrary();
            renderSelectedValues();
            return;
        }

        const removeBtn = e.target.closest('.bp-remove-value');
        if (removeBtn) {
            e.preventDefault();
            const value = removeBtn.dataset.value;
            selectedValues = selectedValues.filter(v => v !== value);
            renderValuesLibrary();
            renderSelectedValues();
            return;
        }
    });

    // Add a custom value
    const bpAddValueButton = document.getElementById('bpAddValueButton');
    const bpCustomValue = document.getElementById('bpCustomValue');

    if (bpAddValueButton) {
        bpAddValueButton.addEventListener('click', () => {
            const value = bpCustomValue.value.trim();
            if (!value) return;
            if (selectedValues.includes(value)) {
                bpCustomValue.value = '';
                return;
            }
            if (selectedValues.length >= 5) {
                alert('You can choose up to 5 values. Remove one first.');
                return;
            }
            selectedValues.push(value);
            bpCustomValue.value = '';
            renderSelectedValues();
        });
    }

    if (bpCustomValue) {
        bpCustomValue.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (bpAddValueButton) bpAddValueButton.click();
            }
        });
    }

    // Save North Star
    const bpSaveNorthStar = document.getElementById('bpSaveNorthStar');
    const bpNorthStarFeedback = document.getElementById('bpNorthStarFeedback');

    if (bpSaveNorthStar) {
        bpSaveNorthStar.addEventListener('click', () => {
            const visionEl = document.getElementById('bpVision');
            const antiEl = document.getElementById('bpAntiVision');

            const vision = visionEl ? visionEl.value.trim() : '';
            const anti = antiEl ? antiEl.value.trim() : '';

            const saves = [];

            saves.push(saveMeta('values_json', JSON.stringify(selectedValues)));
            saves.push(saveMeta('vision_statement', vision));
            saves.push(saveMeta('anti_vision', anti));

            Promise.all(saves)
                .then(results => {
                    const errored = results.find(r => r && r.error);
                    if (errored) {
                        if (bpNorthStarFeedback) {
                            bpNorthStarFeedback.textContent = 'Error: ' + errored.error;
                            bpNorthStarFeedback.style.color = '#b33';
                        }
                        return;
                    }
                    if (bpNorthStarFeedback) {
                        bpNorthStarFeedback.textContent = 'North Star saved.';
                        bpNorthStarFeedback.style.color = '#2a7d2a';
                    }
                })
                .catch(() => {
                    if (bpNorthStarFeedback) {
                        bpNorthStarFeedback.textContent = 'Server not responding.';
                        bpNorthStarFeedback.style.color = '#b33';
                    }
                });
        });
    }

    function saveMeta(key, value) {
        return fetch('/api/life-areas/meta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value })
        }).then(r => r.json());
    }

    if (bpSaveButton) {
        bpSaveButton.addEventListener('click', saveSurvey);
    }

    function saveSurvey() {
        const cards = bpAreaList.querySelectorAll('.bp-area');
        if (cards.length === 0) return;

        const saves = [];
        cards.forEach(card => {
            const areaId = parseInt(card.dataset.areaId, 10);
            const selected = card.querySelectorAll('.bp-star.filled').length;
            const note = card.querySelector('.bp-note').value.trim();

            if (selected === 0 && !note) return; // nothing to save for this area

            if (selected === 0) {
                // Note only, no rating yet — skip. Ratings require a value.
                // If we want note-only, we would need a separate endpoint.
                return;
            }

            saves.push(
                fetch('/api/life-areas/' + areaId + '/ratings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rating: selected, note })
                }).then(r => r.json())
            );
        });

        if (saves.length === 0) {
            bpFeedback.textContent = 'Nothing to save — rate at least one area.';
            bpFeedback.style.color = '#b33';
            return;
        }

        Promise.all(saves)
            .then(results => {
                const errored = results.find(r => r && r.error);
                if (errored) {
                    bpFeedback.textContent = 'Error: ' + errored.error;
                    bpFeedback.style.color = '#b33';
                    return;
                }
                bpFeedback.textContent = 'Saved. ' + results.length + ' area(s) updated.';
                bpFeedback.style.color = '#2a7d2a';
                loadAreas();
            })
            .catch(() => {
                bpFeedback.textContent = 'Server not responding.';
                bpFeedback.style.color = '#b33';
            });
    }

    function timeAgo(dateString) {
        const now = new Date();
        const then = new Date(dateString.replace(' ', 'T'));
        const diffMs = now - then;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHr / 24);

        if (diffMin < 1) return 'just now';
        if (diffMin < 60) return diffMin + ' min ago';
        if (diffHr < 24) return diffHr + ' hour' + (diffHr === 1 ? '' : 's') + ' ago';
        if (diffDay < 30) return diffDay + ' day' + (diffDay === 1 ? '' : 's') + ' ago';
        if (diffDay < 365) {
            const months = Math.floor(diffDay / 30);
            return months + ' month' + (months === 1 ? '' : 's') + ' ago';
        }
        const years = Math.floor(diffDay / 365);
        return years + ' year' + (years === 1 ? '' : 's') + ' ago';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }
});