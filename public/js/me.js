document.addEventListener('DOMContentLoaded', () => {
    const echoInput = document.getElementById('echoInput');
    const echoSaveButton = document.getElementById('echoSaveButton');
    const echoFeedback = document.getElementById('echoFeedback');
    const echoesList = document.getElementById('echoesList');

    function loadEchoes() {
        fetch('/api/echoes')
            .then(response => response.json())
            .then(echoes => {
                if (echoes.length === 0) {
                    echoesList.innerHTML = '<p>No Echoes yet.</p>';
                    return;
                }

                echoesList.innerHTML = echoes.map(echo => `
                    <div class="thought-card">
                        <p class="thought-content">${escapeHtml(echo.content)}</p>
                        <span class="thought-date">${echo.created_at}</span>
                    </div>
                `).join('');
            })
            .catch(() => {
                echoesList.innerHTML = '<p>Server not responding.</p>';
            });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    if (echoSaveButton) {
        echoSaveButton.addEventListener('click', () => {
            const content = echoInput.value.trim();

            if (!content) {
                echoFeedback.textContent = 'Please write something first.';
                echoFeedback.style.color = '#b33';
                return;
            }

            fetch('/api/echoes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        echoFeedback.textContent = 'Error: ' + data.error;
                        echoFeedback.style.color = '#b33';
                    } else {
                        echoFeedback.textContent = 'Echo saved.';
                        echoFeedback.style.color = '#2a7d2a';
                        echoInput.value = '';
                        loadEchoes();
                    }
                })
                .catch(() => {
                    echoFeedback.textContent = 'Server not responding.';
                    echoFeedback.style.color = '#b33';
                });
        });
    }

    loadEchoes();
});