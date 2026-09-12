document.addEventListener('DOMContentLoaded', () => {
    const futureMessage = document.getElementById('futureMessage');
    const futureUnlockDate = document.getElementById('futureUnlockDate');
    const futureSaveButton = document.getElementById('futureSaveButton');
    const futureFeedback = document.getElementById('futureFeedback');
    const futureList = document.getElementById('futureList');

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function isUnlocked(unlockDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const unlock = new Date(unlockDate);
        unlock.setHours(0, 0, 0, 0);
        return today >= unlock;
    }

    function loadMessages() {
        fetch('/api/future')
            .then(response => response.json())
            .then(messages => {
                if (messages.length === 0) {
                    futureList.innerHTML = '<p>No messages yet.</p>';
                    return;
                }

                futureList.innerHTML = messages.map(msg => {
                    const unlocked = isUnlocked(msg.unlock_date);

                    if (!unlocked) {
                        return `
                            <div class="thought-card">
                                <p>🔒 Locked until ${msg.unlock_date}</p>
                            </div>
                        `;
                    }

                    const responseText = msg.response
                        ? `<p><strong>You said:</strong> ${escapeHtml(msg.response)}</p>`
                        : `
                            <div class="future-response">
                                <button onclick="respondToMessage(${msg.id}, 'Still true')">Still true</button>
                                <button onclick="respondToMessage(${msg.id}, 'Changed')">Changed</button>
                                <button onclick="respondToMessage(${msg.id}, "I don't know")">I don't know</button>
                            </div>
                        `;

                    return `
                        <div class="thought-card">
                            <p>🔓 Your future self has something to read:</p>
                            <p class="thought-content">${escapeHtml(msg.message)}</p>
                            <span class="thought-date">Unlocked: ${msg.unlock_date}</span>
                            ${responseText}
                        </div>
                    `;
                }).join('');
            })
            .catch(() => {
                futureList.innerHTML = '<p>Server not responding.</p>';
            });
    }

    window.respondToMessage = function (id, response) {
        fetch('/api/future/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ response })
        }).then(() => loadMessages());
    };

    if (futureSaveButton) {
        futureSaveButton.addEventListener('click', () => {
            const message = futureMessage.value.trim();
            const unlock_date = futureUnlockDate.value;

            if (!message || !unlock_date) {
                futureFeedback.textContent = 'Please write a message and choose a date.';
                futureFeedback.style.color = '#b33';
                return;
            }

            fetch('/api/future', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, unlock_date })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        futureFeedback.textContent = 'Error: ' + data.error;
                        futureFeedback.style.color = '#b33';
                    } else {
                        futureFeedback.textContent = 'Message saved.';
                        futureFeedback.style.color = '#2a7d2a';
                        futureMessage.value = '';
                        futureUnlockDate.value = '';
                        loadMessages();
                    }
                })
                .catch(() => {
                    futureFeedback.textContent = 'Server not responding.';
                    futureFeedback.style.color = '#b33';
                });
        });
    }

    loadMessages();
});
