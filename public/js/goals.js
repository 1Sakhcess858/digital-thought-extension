document.addEventListener('DOMContentLoaded', () => {
    const goalTitle = document.getElementById('goalTitle');
    const goalWhy = document.getElementById('goalWhy');
    const goalNextAction = document.getElementById('goalNextAction');
    const goalSaveButton = document.getElementById('goalSaveButton');
    const goalFeedback = document.getElementById('goalFeedback');
    const goalsList = document.getElementById('goalsList');

    function loadGoals() {
        fetch('/api/goals')
            .then(response => response.json())
            .then(goals => {
                if (goals.length === 0) {
                    goalsList.innerHTML = '<p>No goals yet. Create one above.</p>';
                    return;
                }

                goalsList.innerHTML = goals.map(goal => `
                    <div class="thought-card">
                        <h3>${escapeHtml(goal.title)}</h3>
                        <p><strong>Why:</strong> ${escapeHtml(goal.why || '')}</p>
                        <p><strong>Progress:</strong> ${goal.progress}%</p>
                        <p><strong>Next action:</strong> ${escapeHtml(goal.next_action || '')}</p>
                        <span class="thought-date">${goal.created_at}</span>
                    </div>
                `).join('');
            })
            .catch(() => {
                goalsList.innerHTML = '<p>Server not responding.</p>';
            });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    if (goalSaveButton) {
        goalSaveButton.addEventListener('click', () => {
            const title = goalTitle.value.trim();
            const why = goalWhy.value.trim();
            const next_action = goalNextAction.value.trim();

            if (!title) {
                goalFeedback.textContent = 'Please enter a title.';
                goalFeedback.style.color = '#b33';
                return;
            }

            fetch('/api/goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, why, next_action, progress: 0 })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        goalFeedback.textContent = 'Error: ' + data.error;
                        goalFeedback.style.color = '#b33';
                    } else {
                        goalFeedback.textContent = 'Goal saved.';
                        goalFeedback.style.color = '#2a7d2a';
                        goalTitle.value = '';
                        goalWhy.value = '';
                        goalNextAction.value = '';
                        loadGoals();
                    }
                })
                .catch(() => {
                    goalFeedback.textContent = 'Server not responding.';
                    goalFeedback.style.color = '#b33';
                });
        });
    }

    loadGoals();
});