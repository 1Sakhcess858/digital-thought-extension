document.addEventListener('DOMContentLoaded', () => {
    const thoughtsList = document.getElementById('thoughtsList');

    function loadThoughts() {
        fetch('/api/thoughts')
            .then(response => response.json())
            .then(thoughts => {
                if (thoughts.length === 0) {
                    thoughtsList.innerHTML = '<p>No thoughts yet. Start capturing.</p>';
                    return;
                }

                thoughtsList.innerHTML = thoughts.map(thought => `
                                        <div class="thought-card">
                        <span class="thought-type">${thought.type}</span>
                        ${thought.thread_title ? `<span class="thought-thread">→ ${escapeHtml(thought.thread_title)}</span>` : ''}
                        <p class="thought-content">${escapeHtml(thought.content)}</p>
                        <span class="thought-date">${thought.created_at}</span>
                    </div>
                `).join('');
            })
            .catch(() => {
                thoughtsList.innerHTML = '<p>Server not responding.</p>';
            });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    loadThoughts();
});