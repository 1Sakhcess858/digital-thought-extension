document.addEventListener('DOMContentLoaded', () => {
    const threadsList = document.getElementById('threadsList');
    const threadTitle = document.getElementById('threadTitle');
    const threadDescription = document.getElementById('threadDescription');
    const createThreadButton = document.getElementById('createThreadButton');
    const threadFeedback = document.getElementById('threadFeedback');

    function loadThreads() {
        fetch('/api/threads')
            .then(response => response.json())
            .then(threads => {
                if (threads.length === 0) {
                    threadsList.innerHTML = '<p>No threads yet. Create one above.</p>';
                    return;
                }

                threadsList.innerHTML = threads.map(thread => `
                    <div class="thought-card">
                        <h3>${escapeHtml(thread.title)}</h3>
                        <p>${escapeHtml(thread.description || '')}</p>
                        <span class="thought-date">${thread.thought_count} thoughts</span>
                    </div>
                `).join('');
            })
            .catch(() => {
                threadsList.innerHTML = '<p>Server not responding.</p>';
            });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    if (createThreadButton) {
        createThreadButton.addEventListener('click', () => {
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
                .then(response => response.json())
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
        });
    }

    loadThreads();
});