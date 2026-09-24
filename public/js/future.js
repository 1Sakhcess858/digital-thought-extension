document.addEventListener('DOMContentLoaded', () => {
    // ---------- Mirror elements ----------
    const mirrorInput = document.getElementById('mirrorInput');
    const mirrorSaveButton = document.getElementById('mirrorSaveButton');
    const mirrorFeedback = document.getElementById('mirrorFeedback');
    const mirrorHistory = document.getElementById('mirrorHistory');

    // ---------- Future message elements ----------
    const futureMessageInput = document.getElementById('futureMessageInput');
    const futureUnlockDate = document.getElementById('futureUnlockDate');
    const futureSaveButton = document.getElementById('futureSaveButton');
    const futureFeedback = document.getElementById('futureFeedback');
    const futureMessagesList = document.getElementById('futureMessagesList');

    // ---------- Mirror logic ----------

    function loadMirrorAnswers() {
        fetch('/api/future-answers')
            .then(r => r.json())
            .then(answers => {
                if (!Array.isArray(answers) || answers.length === 0) {
                    mirrorHistory.innerHTML = '<p>No answers yet. Write your first one above.</p>';
                    return;
                }
                mirrorHistory.innerHTML = answers.map(renderMirrorAnswer).join('');
            })
            .catch(() => {
                mirrorHistory.innerHTML = '<p>Server not responding.</p>';
            });
    }

    function renderMirrorAnswer(a) {
        const age = timeAgo(a.created_at);
        return `
            <div class="mirror-card" data-id="${a.id}">
                <p class="mirror-text">${escapeHtml(a.text)}</p>
                <span class="mirror-date">${escapeHtml(a.created_at)} · ${age}</span>
                <button class="mirror-delete" data-id="${a.id}" title="Delete this answer">Delete</button>
            </div>
        `;
    }

    function attachMirrorHandlers() {
        mirrorHistory.querySelectorAll('.mirror-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id, 10);
                if (!confirm('Delete this answer?')) return;
                fetch('/api/future-answers/' + id, { method: 'DELETE' })
                    .then(r => r.json())
                    .then(data => {
                        if (data.error) {
                            mirrorFeedback.textContent = 'Error: ' + data.error;
                            mirrorFeedback.style.color = '#b33';
                            return;
                        }
                        loadMirrorAnswers();
                    })
                    .catch(() => {
                        mirrorFeedback.textContent = 'Server not responding.';
                        mirrorFeedback.style.color = '#b33';
                    });
            });
        });
    }

    if (mirrorSaveButton) {
        mirrorSaveButton.addEventListener('click', () => {
            const text = mirrorInput.value.trim();
            if (!text) {
                mirrorFeedback.textContent = 'Write something first.';
                mirrorFeedback.style.color = '#b33';
                return;
            }
            fetch('/api/future-answers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            })
                .then(r => r.json())
                .then(data => {
                    if (data.error) {
                        mirrorFeedback.textContent = 'Error: ' + data.error;
                        mirrorFeedback.style.color = '#b33';
                        return;
                    }
                    mirrorFeedback.textContent = 'Saved.';
                    mirrorFeedback.style.color = '#2a7d2a';
                    mirrorInput.value = '';
                    loadMirrorAnswers();
                })
                .catch(() => {
                    mirrorFeedback.textContent = 'Server not responding.';
                    mirrorFeedback.style.color = '#b33';
                });
        });
    }

    // ---------- Future message logic ----------

    function loadFutureMessages() {
        fetch('/api/future')
            .then(r => r.json())
            .then(messages => {
                if (!Array.isArray(messages) || messages.length === 0) {
                    futureMessagesList.innerHTML = '<p>No messages yet.</p>';
                    return;
                }
                futureMessagesList.innerHTML = messages.map(renderFutureMessage).join('');
                attachFutureMessageHandlers();
            })
            .catch(() => {
                futureMessagesList.innerHTML = '<p>Server not responding.</p>';
            });
    }

    function renderFutureMessage(m) {
        const unlockDate = new Date(m.unlock_date);
        const now = new Date();
        const isLocked = unlockDate > now;
        const status = isLocked
            ? '<span class="locked">🔒 Locked</span>'
            : '<span class="unlocked">🔓 Unlocked</span>';

        const body = isLocked
            ? '<p class="future-locked-text">This message unlocks on ' + escapeHtml(m.unlock_date) + '</p>'
            : '<p class="future-message-text">' + escapeHtml(m.message) + '</p>';

        const responseHtml = m.response
            ? '<p class="future-response"><strong>Your response:</strong> ' + escapeHtml(m.response) + '</p>'
            : '';

        const actions = (!isLocked && !m.response)
            ? `
                <div class="future-actions" data-id="${m.id}">
                    <button class="future-respond" data-response="Still true">Still true</button>
                    <button class="future-respond" data-response="Changed">Changed</button>
                    <button class="future-respond" data-response="I don't know">I don't know</button>
                </div>
            `
            : '';

        return `
            <div class="thought-card future-message-card">
                <div class="future-status">${status}</div>
                ${body}
                ${responseHtml}
                ${actions}
            </div>
        `;
    }

    function attachFutureMessageHandlers() {
        futureMessagesList.querySelectorAll('.future-actions').forEach(row => {
            const id = parseInt(row.dataset.id, 10);
            row.querySelectorAll('.future-respond').forEach(btn => {
                btn.addEventListener('click', () => {
                    const response = btn.dataset.response;
                    fetch('/api/future/' + id, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ response })
                    })
                        .then(r => r.json())
                        .then(() => loadFutureMessages())
                        .catch(() => alert('Server not responding.'));
                });
            });
        });
    }

    if (futureSaveButton) {
        futureSaveButton.addEventListener('click', () => {
            const message = futureMessageInput.value.trim();
            const unlock_date = futureUnlockDate.value;

            if (!message || !unlock_date) {
                futureFeedback.textContent = 'Message and unlock date are required.';
                futureFeedback.style.color = '#b33';
                return;
            }
            fetch('/api/future', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, unlock_date })
            })
                .then(r => r.json())
                .then(data => {
                    if (data.error) {
                        futureFeedback.textContent = 'Error: ' + data.error;
                        futureFeedback.style.color = '#b33';
                        return;
                    }
                    futureFeedback.textContent = 'Message saved.';
                    futureFeedback.style.color = '#2a7d2a';
                    futureMessageInput.value = '';
                    futureUnlockDate.value = '';
                    loadFutureMessages();
                })
                .catch(() => {
                    futureFeedback.textContent = 'Server not responding.';
                    futureFeedback.style.color = '#b33';
                });
        });
    }

    // ---------- helpers ----------

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

    // ---------- boot ----------

    loadMirrorAnswers();
    loadFutureMessages();
});