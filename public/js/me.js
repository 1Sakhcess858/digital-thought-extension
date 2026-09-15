document.addEventListener('DOMContentLoaded', () => {
    const echoInput = document.getElementById('echoInput');
    const echoSaveButton = document.getElementById('echoSaveButton');
    const echoFeedback = document.getElementById('echoFeedback');
    const echoesList = document.getElementById('echoesList');

    const promptsHistory = document.getElementById('promptsHistory');
    const promptsEditorList = document.getElementById('promptsEditorList');
    const promptsEditor = document.getElementById('promptsEditor');
    const togglePromptEditor = document.getElementById('togglePromptEditor');
    const filterButtons = document.querySelectorAll('.filter-btn');

    let currentBucket = '';

    // ---------- echoes ----------

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

    // ---------- prompts history ----------

    function loadPromptHistory() {
        const url = currentBucket
            ? '/api/prompts/responses?bucket=' + currentBucket
            : '/api/prompts/responses';

        fetch(url)
            .then(r => r.json())
            .then(responses => {
                if (!Array.isArray(responses) || responses.length === 0) {
                    promptsHistory.innerHTML = '<p>No prompt responses yet. Answer a prompt on Home.</p>';
                    return;
                }

                promptsHistory.innerHTML = responses.map(renderResponse).join('');
            })
            .catch(() => {
                promptsHistory.innerHTML = '<p>Server not responding.</p>';
            });
    }

    function renderResponse(r) {
        const answer = r.skipped
            ? '<em>Skipped</em>'
            : escapeHtml(r.response || '');
        return `
            <div class="thought-card">
                <span class="thought-type">${escapeHtml(r.time_of_day)}</span>
                <p class="prompt-question">${escapeHtml(r.prompt_text)}</p>
                <p class="thought-content">${answer}</p>
                <span class="thought-date">${escapeHtml(r.created_at)}</span>
            </div>
        `;
    }

    // ---------- filter buttons ----------

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentBucket = btn.dataset.bucket || '';
            loadPromptHistory();
        });
    });

    // ---------- prompts editor ----------

    if (togglePromptEditor) {
        togglePromptEditor.addEventListener('click', () => {
            const isHidden = promptsEditor.style.display === 'none';
            promptsEditor.style.display = isHidden ? 'block' : 'none';
            togglePromptEditor.textContent = isHidden ? 'Close Editor' : 'Edit Prompts';
            if (isHidden) loadPromptsEditor();
        });
    }

    function loadPromptsEditor() {
        fetch('/api/prompts/all')
            .then(r => r.json())
            .then(prompts => {
                if (!Array.isArray(prompts) || prompts.length === 0) {
                    promptsEditorList.innerHTML = '<p>No prompts defined.</p>';
                    return;
                }
                promptsEditorList.innerHTML = prompts.map(renderPromptEditorRow).join('');
                attachPromptEditorHandlers();
            })
            .catch(() => {
                promptsEditorList.innerHTML = '<p>Server not responding.</p>';
            });
    }

    function renderPromptEditorRow(p) {
        const inactiveClass = p.active ? '' : ' inactive';
        const activeLabel = p.active ? '' : ' <small>(inactive)</small>';
        return `
            <div class="prompt-edit-row${inactiveClass}" data-id="${p.id}">
                <span class="prompt-edit-bucket">${escapeHtml(p.time_of_day)}</span>${activeLabel}
                <input type="text" class="prompt-edit-input" value="${escapeHtml(p.text)}" />
                <div class="prompt-edit-actions">
                    <button class="btn-save">Save</button>
                    <button class="btn-cancel">${p.active ? 'Disable' : 'Enable'}</button>
                </div>
            </div>
        `;
    }

    function attachPromptEditorHandlers() {
        promptsEditorList.querySelectorAll('.prompt-edit-row').forEach(row => {
            const id = parseInt(row.dataset.id, 10);
            const input = row.querySelector('.prompt-edit-input');

            row.querySelector('.btn-save').addEventListener('click', () => {
                const text = input.value.trim();
                if (!text) {
                    alert('Prompt text cannot be empty.');
                    return;
                }
                fetch('/api/prompts/' + id, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                })
                    .then(r => r.json())
                    .then(data => {
                        if (data.error) {
                            alert('Error: ' + data.error);
                            return;
                        }
                        input.blur();
                    })
                    .catch(() => alert('Server not responding.'));
            });

            row.querySelector('.btn-cancel').addEventListener('click', () => {
                const isInactive = row.classList.contains('inactive');
                fetch('/api/prompts/' + id, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ active: isInactive })
                })
                    .then(r => r.json())
                    .then(data => {
                        if (data.error) {
                            alert('Error: ' + data.error);
                            return;
                        }
                        loadPromptsEditor();
                    })
                    .catch(() => alert('Server not responding.'));
            });
        });
    }

    // ---------- helpers ----------

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }

    // ---------- boot ----------

    loadEchoes();
    loadPromptHistory();
});