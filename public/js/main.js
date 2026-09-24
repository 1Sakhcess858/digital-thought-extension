document.addEventListener('DOMContentLoaded', () => {
    const statusMessage = document.getElementById('statusMessage');
    const captureInput = document.getElementById('captureInput');
    const captureWhy = document.getElementById('captureWhy');
    const captureNextStep = document.getElementById('captureNextStep');
    const captureButton = document.getElementById('captureButton');
    const captureType = document.getElementById('captureType');
    const captureFeedback = document.getElementById('captureFeedback');

    // Check server status
    if (statusMessage) {
        fetch('/api/status')
            .then(response => response.json())
            .then(data => {
                statusMessage.textContent = data.status;
            })
            .catch(() => {
                statusMessage.textContent = 'Server not responding.';
            });
    }

    // Load thread options into the dropdown
    function loadThreadOptions() {
        const select = document.getElementById('captureThread');
        if (!select) return;
        fetch('/api/threads')
            .then(r => r.json())
            .then(threads => {
                threads.forEach(t => {
                    const opt = document.createElement('option');
                    opt.value = t.id;
                    opt.textContent = t.title;
                    select.appendChild(opt);
                });
            })
            .catch(() => { });
    }

    // Capture thought
    if (captureButton) {
        captureButton.addEventListener('click', () => {
            const content = captureInput.value.trim();
            const type = captureType.value;

            if (!content) {
                captureFeedback.textContent = 'Please type something first.';
                captureFeedback.style.color = '#b33';
                return;
            }

            const threadSelect = document.getElementById('captureThread');
            const threadId = threadSelect && threadSelect.value
                ? parseInt(threadSelect.value, 10)
                : null;

            const why = captureWhy ? captureWhy.value.trim() : '';
            const next_step = captureNextStep ? captureNextStep.value.trim() : '';

            fetch('/api/thoughts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    content,
                    thread_id: threadId,
                    why: why || null,
                    next_step: next_step || null
                })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        captureFeedback.textContent = 'Error: ' + data.error;
                        captureFeedback.style.color = '#b33';
                    } else {
                        captureFeedback.textContent = 'Captured.';
                        captureFeedback.style.color = '#2a7d2a';
                        captureInput.value = '';
                        if (captureWhy) captureWhy.value = '';
                        if (captureNextStep) captureNextStep.value = '';
                        if (threadSelect) threadSelect.value = '';
                    }
                })
                .catch(() => {
                    captureFeedback.textContent = 'Server not responding.';
                    captureFeedback.style.color = '#b33';
                });
        });
    }

    loadThreadOptions();
});