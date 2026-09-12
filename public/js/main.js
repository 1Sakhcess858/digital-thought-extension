document.addEventListener('DOMContentLoaded', () => {
    const statusMessage = document.getElementById('statusMessage');
    const captureInput = document.getElementById('captureInput');
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

            fetch('/api/thoughts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, content })
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
                    }
                })
                .catch(() => {
                    captureFeedback.textContent = 'Server not responding.';
                    captureFeedback.style.color = '#b33';
                });
        });
    }
});