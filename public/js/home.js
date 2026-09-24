document.addEventListener('DOMContentLoaded', () => {
    const greetingText = document.getElementById('greetingText');
    const whyDisplay = document.getElementById('whyDisplay');
    const whyEditButton = document.getElementById('whyEditButton');
    const whyEditForm = document.getElementById('whyEditForm');
    const whyInput = document.getElementById('whyInput');
    const whySaveButton = document.getElementById('whySaveButton');
    const fiveYearSnippet = document.getElementById('fiveYearSnippet');
    const fiveYearText = document.getElementById('fiveYearText');
    const fiveYearAge = document.getElementById('fiveYearAge');
    const weeklyReviewSection = document.getElementById('weeklyReviewSection');
    const weeklyReviewAge = document.getElementById('weeklyReviewAge');
    const weeklyReviewSample = document.getElementById('weeklyReviewSample');
    const weeklyReviewInput = document.getElementById('weeklyReviewInput');
    const weeklyReviewSaveButton = document.getElementById('weeklyReviewSaveButton');
    const weeklyReviewDismissButton = document.getElementById('weeklyReviewDismissButton');
    const weeklyReviewFeedback = document.getElementById('weeklyReviewFeedback');
    const echoDisplay = document.getElementById('echoDisplay');
    const activeThreadDisplay = document.getElementById('activeThreadDisplay');
    const reflectionInput = document.getElementById('reflectionInput');
    const reflectionSaveButton = document.getElementById('reflectionSaveButton');
    const reflectionFeedback = document.getElementById('reflectionFeedback');
    const captureInput = document.getElementById('captureInput');
    const captureWhy = document.getElementById('captureWhy');
    const captureNextStep = document.getElementById('captureNextStep');
    const captureButton = document.getElementById('captureButton');
    const captureFeedback = document.getElementById('captureFeedback');

    const momentPrompt = document.getElementById('momentPrompt');
    const momentInput = document.getElementById('momentInput');
    const momentSaveButton = document.getElementById('momentSaveButton');
    const momentSkipButton = document.getElementById('momentSkipButton');
    const momentFeedback = document.getElementById('momentFeedback');
    let currentPrompt = null;

    const commitmentsList = document.getElementById('commitmentsList');
    const commitmentText = document.getElementById('commitmentText');
    const commitmentWhy = document.getElementById('commitmentWhy');
    const commitmentHorizonSelect = document.getElementById('commitmentHorizonSelect');
    const commitmentAddButton = document.getElementById('commitmentAddButton');
    const commitmentsFeedback = document.getElementById('commitmentsFeedback');
    const horizonButtons = document.querySelectorAll('.horizon-btn');
    let currentHorizon = 'today';

    function setGreeting() {
        const hour = new Date().getHours();
        let greeting = 'Hello.';
        if (hour < 12) greeting = 'Good morning.';
        else if (hour < 18) greeting = 'Good afternoon.';
        else greeting = 'Good evening.';
        if (greetingText) greetingText.textContent = greeting;
    }

    // ---------- moment ----------

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

    if (momentSaveButton) momentSaveButton.addEventListener('click', saveMoment);
    if (momentSkipButton) momentSkipButton.addEventListener('click', skipMoment);

    // ---------- commitments ----------

    function loadCommitments() {
        const url = '/api/commitments/' + currentHorizon;
        fetch(url)
            .then(r => r.json())
            .then(data => {
                const items = data.commitments || [];
                if (items.length === 0) {
                    commitmentsList.innerHTML = '<p>Nothing committed for this horizon.</p>';
                    return;
                }
                commitmentsList.innerHTML = items.map(renderCommitment).join('');
                attachCommitmentHandlers();
            })
            .catch(() => {
                commitmentsList.innerHTML = '<p>Server not responding.</p>';
            });
    }

    function renderCommitment(c) {
        const whyHtml = c.why ? '<p class="commitment-why">why: ' + escapeHtml(c.why) + '</p>' : '';
        return `
            <div class="commitment-row" data-id="${c.id}">
                <button class="commitment-done" title="Mark done">☐</button>
                <div class="commitment-body">
                    <p class="commitment-text">${escapeHtml(c.text)}</p>
                    ${whyHtml}
                </div>
            </div>
        `;
    }

    function attachCommitmentHandlers() {
        commitmentsList.querySelectorAll('.commitment-row').forEach(row => {
            const id = parseInt(row.dataset.id, 10);
            row.querySelector('.commitment-done').addEventListener('click', () => {
                fetch('/api/commitments/' + id + '/done', { method: 'POST' })
                    .then(r => r.json())
                    .then(data => {
                        if (data.error) {
                            commitmentsFeedback.textContent = 'Error: ' + data.error;
                            commitmentsFeedback.style.color = '#b33';
                            return;
                        }
                        row.remove();
                        if (!commitmentsList.querySelector('.commitment-row')) {
                            commitmentsList.innerHTML = '<p>Nothing committed for this horizon.</p>';
                        }
                    })
                    .catch(() => {
                        commitmentsFeedback.textContent = 'Server not responding.';
                        commitmentsFeedback.style.color = '#b33';
                    });
            });
        });
    }

    function addCommitment() {
        const text = commitmentText.value.trim();
        const why = commitmentWhy.value.trim();
        const horizon = commitmentHorizonSelect.value;

        if (!text) {
            commitmentsFeedback.textContent = 'Write something first.';
            commitmentsFeedback.style.color = '#b33';
            return;
        }

        fetch('/api/commitments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, horizon, why: why || null })
        })
            .then(r => r.json())
            .then(data => {
                if (data.error) {
                    commitmentsFeedback.textContent = 'Error: ' + data.error;
                    commitmentsFeedback.style.color = '#b33';
                    return;
                }
                commitmentsFeedback.textContent = 'Added.';
                commitmentsFeedback.style.color = '#2a7d2a';
                commitmentText.value = '';
                commitmentWhy.value = '';
                loadCommitments();
            })
            .catch(() => {
                commitmentsFeedback.textContent = 'Server not responding.';
                commitmentsFeedback.style.color = '#b33';
            });
    }

    if (commitmentAddButton) {
        commitmentAddButton.addEventListener('click', addCommitment);
    }

    horizonButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            horizonButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentHorizon = btn.dataset.horizon;
            loadCommitments();
        });
    });

    // ---------- why ----------

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

    // ---------- weekly review ----------

    let dismissedThisSession = false;

    function checkWeeklyReview() {
        if (dismissedThisSession) return;
        fetch('/api/weekly-reviews/status')
            .then(r => r.json())
            .then(data => {
                if (!data.due) {
                    if (weeklyReviewSection) weeklyReviewSection.style.display = 'none';
                    return;
                }
                if (weeklyReviewSection) weeklyReviewSection.style.display = 'block';
                if (weeklyReviewAge) {
                    if (data.daysSinceLast === null) {
                        weeklyReviewAge.textContent = 'No previous review. This is your first.';
                    } else {
                        weeklyReviewAge.textContent = 'It has been ' + data.daysSinceLast + ' days since your last review.';
                    }
                }
                loadWeeklySample();
            })
            .catch(() => {
                if (weeklyReviewSection) weeklyReviewSection.style.display = 'none';
            });
    }

    function loadWeeklySample() {
        fetch('/api/weekly-reviews/sample')
            .then(r => r.json())
            .then(sample => {
                if (!weeklyReviewSample) return;
                const parts = [];

                if (sample.thoughts && sample.thoughts.length > 0) {
                    parts.push('<h4>Recent thoughts</h4>');
                    sample.thoughts.forEach(t => {
                        parts.push('<p class="sample-line">· ' + escapeHtml(t.content) + '</p>');
                    });
                }
                if (sample.commitment) {
                    parts.push('<h4>An open commitment</h4>');
                    parts.push('<p class="sample-line">· ' + escapeHtml(sample.commitment.text) + '</p>');
                    if (sample.commitment.why) {
                        parts.push('<p class="sample-line sample-sub">why: ' + escapeHtml(sample.commitment.why) + '</p>');
                    }
                }
                if (sample.promptResponse) {
                    parts.push('<h4>A prompt answer</h4>');
                    parts.push('<p class="sample-line sample-sub">Q: ' + escapeHtml(sample.promptResponse.prompt_text) + '</p>');
                    parts.push('<p class="sample-line">A: ' + escapeHtml(sample.promptResponse.response) + '</p>');
                }
                if (sample.echo) {
                    parts.push('<h4>An Echo</h4>');
                    parts.push('<p class="sample-line">' + escapeHtml(sample.echo.content) + '</p>');
                }
                if (sample.why) {
                    parts.push('<h4>Your WHY</h4>');
                    parts.push('<p class="sample-line">' + escapeHtml(sample.why).replace(/\n/g, '<br>') + '</p>');
                }
                if (sample.fiveYear) {
                    parts.push('<h4>Your five-year answer</h4>');
                    parts.push('<p class="sample-line">' + escapeHtml(sample.fiveYear.text) + '</p>');
                }

                weeklyReviewSample.innerHTML = parts.join('') || '<p>No content to show yet.</p>';
            })
            .catch(() => {
                if (weeklyReviewSample) weeklyReviewSample.innerHTML = '<p>Could not load sample.</p>';
            });
    }

    if (weeklyReviewSaveButton) {
        weeklyReviewSaveButton.addEventListener('click', () => {
            const content = weeklyReviewInput.value.trim();
            if (!content) {
                weeklyReviewFeedback.textContent = 'Write something first, or press Not now.';
                weeklyReviewFeedback.style.color = '#b33';
                return;
            }
            fetch('/api/weekly-reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            })
                .then(r => r.json())
                .then(data => {
                    if (data.error) {
                        weeklyReviewFeedback.textContent = 'Error: ' + data.error;
                        weeklyReviewFeedback.style.color = '#b33';
                        return;
                    }
                    weeklyReviewFeedback.textContent = 'Review saved. See you next week.';
                    weeklyReviewFeedback.style.color = '#2a7d2a';
                    weeklyReviewInput.value = '';
                    setTimeout(() => {
                        if (weeklyReviewSection) weeklyReviewSection.style.display = 'none';
                    }, 1500);
                })
                .catch(() => {
                    weeklyReviewFeedback.textContent = 'Server not responding.';
                    weeklyReviewFeedback.style.color = '#b33';
                });
        });
    }

    if (weeklyReviewDismissButton) {
        weeklyReviewDismissButton.addEventListener('click', () => {
            dismissedThisSession = true;
            if (weeklyReviewSection) weeklyReviewSection.style.display = 'none';
        });
    }

    // ---------- five-year snippet ----------

    function loadFiveYearSnippet() {
        fetch('/api/future-answers/latest')
            .then(r => r.json())
            .then(data => {
                if (!data || !data.text) {
                    if (fiveYearSnippet) fiveYearSnippet.style.display = 'none';
                    return;
                }
                if (fiveYearSnippet) fiveYearSnippet.style.display = 'block';
                if (fiveYearText) fiveYearText.textContent = data.text;
                if (fiveYearAge) fiveYearAge.textContent = 'Written ' + timeAgo(data.created_at);
            })
            .catch(() => {
                if (fiveYearSnippet) fiveYearSnippet.style.display = 'none';
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

    // ---------- echo ----------

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

    // ---------- threads ----------

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

    // ---------- reflection ----------

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

    // ---------- capture ----------

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

            const why = captureWhy ? captureWhy.value.trim() : '';
            const next_step = captureNextStep ? captureNextStep.value.trim() : '';

            fetch('/api/thoughts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'Thought',
                    content,
                    thread_id: threadId,
                    why: why || null,
                    next_step: next_step || null
                })
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
                        if (captureWhy) captureWhy.value = '';
                        if (captureNextStep) captureNextStep.value = '';
                        if (threadSelect) threadSelect.value = '';
                    }
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

    setGreeting();
    loadMoment();
    checkWeeklyReview();
    loadCommitments();
    loadWhy();
    loadFiveYearSnippet();
    loadEcho();
    loadThreadOptions();
    loadActiveThread();
});