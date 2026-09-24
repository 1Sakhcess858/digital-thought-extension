document.addEventListener('DOMContentLoaded', () => {
    const bpMeta = document.getElementById('bpMeta');
    const bpAreaList = document.getElementById('bpAreaList');
    const bpSaveButton = document.getElementById('bpSaveButton');
    const bpFeedback = document.getElementById('bpFeedback');

    let areas = [];

    init();

    function init() {
        loadMeta();
        loadAreas();
    }

    function loadMeta() {
        fetch('/api/life-areas/meta')
            .then(r => r.json())
            .then(meta => {
                if (meta.start_year) {
                    const y = parseInt(meta.start_year, 10);
                    if (!isNaN(y)) {
                        const end = y + 5;
                        bpMeta.textContent = 'Your blueprint window: ' + y + ' – ' + end;
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