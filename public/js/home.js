document.addEventListener('DOMContentLoaded', () => {
    const greetingText = document.getElementById('greetingText');
    const whyDisplay = document.getElementById('whyDisplay');
    const whyEditButton = document.getElementById('whyEditButton');
    const whyEditForm = document.getElementById('whyEditForm');
    const whyInput = document.getElementById('whyInput');
    const whySaveButton = document.getElementById('whySaveButton');
    const echoDisplay = document.getElementById('echoDisplay');
    const activeThreadDisplay = document.getElementById('activeThreadDisplay');
    const reflectionInput = document.getElementById('reflectionInput');
    const reflectionSaveButton = document.getElementById('reflectionSaveButton');
    const reflectionFeedback = document.getElementById('reflectionFeedback');
    const captureInput = document.getElementById('captureInput');
    const captureButton = document.getElementById('captureButton');
    const captureFeedback = document.getElementById('captureFeedback');
    const momentPrompt = document.getElementById('momentPrompt');
    const momentInput = document.getElementById('momentInput');
    const momentSaveButton = document.getElementById('momentSaveButton');
    const momentSkipButton = document.getElementById('momentSkipButton');
    const momentFeedback = document.getElementById('momentFeedback');

    let currentPrompt = null;

        function loadMoment() {
        fetch('/api/prompts/current')
            .then(r => r.json())
            .then(data => {
                if (!data.prompts || data.prompts.length === 0) {
                    momentPrompt.textContent = 'No prompt for this time of day.';
                    momentInput.style.display = 'none';
                    momentSaveButton.style.display = 'none';
                    momentSkipButton.style.display = 'none';
                    return;
                }
                currentPrompt = data.prompts[0];
                momentPrompt.textContent = currentPrompt.text;
            })
            .catch(() => {
                momentPrompt.textContent = 'Server not responding.';
                momentInput.style.display = 'none';
                momentSaveButton.style.display = 'none';
                momentSkipButton.style.display = 'none';
            });
    }

    function saveMoment() {
        if (!currentPrompt) return;
        const response = momentInput.value.trim();
        if (!response) {
            momentFeedback.textContent = 'Write something first, or press Skip.';
            momentFeedback.style.color = '#b33';
            return;
        }
        fetch('/api/prompts/responses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt_id: currentPrompt.id, response })
        })
            .then(r => r.json())
            .then(data => {
                if (data.error) {
                    momentFeedback.textContent = 'Error: ' + data.error;
                    momentFeedback.style.color = '#b33';
                    return;
                }
                momentFeedback.textContent = 'Saved.';
                momentFeedback.style.color = '#2a7d2a';
                momentInput.value = '';
            })
            .catch(() => {
                momentFeedback.textContent = 'Server not responding.';
                momentFeedback.style.color = '#b33';
            });
    }

    function skipMoment() {
        if (!currentPrompt) return;
        fetch('/api/prompts/responses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt_id: currentPrompt.id, skipped: true })
        })
            .then(r => r.json())
            .then(data => {
                if (data.error) {
                    momentFeedback.textContent = 'Error: ' + data.error;
                    momentFeedback.style.color = '#b33';
                    return;
                }
                momentFeedback.textContent = 'Skipped.';
                momentFeedback.style.color = '#777';
                momentInput.value = '';
            })
            .catch(() => {
                momentFeedback.textContent = 'Server not responding.';
                momentFeedback.style.color = '#b33';
            });
    }

    if (momentSaveButton) {
        momentSaveButton.addEventListener('click', saveMoment);
    }
    if (momentSkipButton) {
        momentSkipButton.addEventListener('click', skipMoment);
    }

    function setGreeting() {
        const hour = new Date().getHours();
        let greeting = 'Hello.';
        if (hour < 12) greeting = 'Good morning.';
        else if (hour < 18) greeting = 'Good afternoon.';
        else greeting = 'Good evening.';
        if (greetingText) greetingText.textContent = greeting;
    }

    function loadWhy() {
        fetch('/api/settings/why')
            .then(r => r.json())
            .then(data => {
                whyDisplay.textContent = data.value || "You haven't written your WHY yet.";
            })
            .catch(() => { whyDisplay.textContent = 'Server not responding.'; });
    }

    if (whyEditButton) {
        whyEditButton.addEventListener('click', () => {
            whyEditForm.style.display = 'block';
            whyEditButton.style.display = 'none';
        });
    }

    if (whySaveButton) {
        whySaveButton.addEventListener('click', () => {
            const value = whyInput.value.trim();
            if (!value) return;
            fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'why', value })
            }).then(() => {
                whyDisplay.textContent = value;
                whyEditForm.style.display = 'none';
                whyEditButton.style.display = 'inline-block';
                whyInput.value = '';
            });
        });
    }

    function loadEcho() {
        fetch('/api/echoes')
            .then(r => r.json())
            .then(echoes => {
                if (echoes.length === 0) {
                    echoDisplay.textContent = 'No Echoes yet. Create one in the Me tab.';
                } else {
                    const random = echoes[Math.floor(Math.random() * echoes.length)];
                    echoDisplay.textContent = random.content;
                }
            })
            .catch(() => { echoDisplay.textContent = 'Server not responding.'; });
    }

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

    function loadActiveThread() {
        fetch('/api/threads')
            .then(r => r.json())
            .then(threads => {
                if (!threads || threads.length === 0) {
                    activeThreadDisplay.textContent = 'No threads yet. Create one in the Threads tab.';
                } else {
                    const thread = threads[0];
                    activeThreadDisplay.textContent =
                        thread.title + ' (' + (thread.thought_count || 0) + ' thoughts)';
                }
            })
            .catch(() => { activeThreadDisplay.textContent = 'Server not responding.'; });
    }

    if (reflectionSaveButton) {
        reflectionSaveButton.addEventListener('click', () => {
            const content = reflectionInput.value.trim();
            if (!content) {
                reflectionFeedback.textContent = 'Please write something first.';
                reflectionFeedback.style.color = '#b33';
                return;
            }
            fetch('/api/reflections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            })
                .then(r => r.json())
                .then(data => {
                    if (data.error) {
                        reflectionFeedback.textContent = 'Error: ' + data.error;
                        reflectionFeedback.style.color = '#b33';
                    } else {
                        reflectionFeedback.textContent = 'Reflection saved.';
                        reflectionFeedback.style.color = '#2a7d2a';
                        reflectionInput.value = '';
                    }
                });
        });
    }

    if (captureButton) {
        captureButton.addEventListener('click', () => {
            const content = captureInput.value.trim();
            if (!content) {
                captureFeedback.textContent = 'Please type something first.';
                captureFeedback.style.color = '#b33';
                return;
            }

            const threadSelect = document.getElementById('captureThread');
            const threadId = threadSelect && threadSelect.value
                ? parseInt(threadSelect.value, 10)
                : null;

            fetch('/api/thoughts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'Thought', content, thread_id: threadId })
            })
                .then(r => r.json())
                .then(data => {
                    if (data.error) {
                        captureFeedback.textContent = 'Error: ' + data.error;
                        captureFeedback.style.color = '#b33';
                    } else {
                        captureFeedback.textContent = 'Captured.';
                        captureFeedback.style.color = '#2a7d2a';
                        captureInput.value = '';
                        if (threadSelect) threadSelect.value = '';
                    }
                });
        });
    }

       setGreeting();
    loadMoment();
    loadWhy();
    loadEcho();
    loadThreadOptions();
    loadActiveThread();
});