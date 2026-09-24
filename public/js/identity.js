document.addEventListener('DOMContentLoaded', () => {
    const identityGenerated = document.getElementById('identityGenerated');
    const identityContent = document.getElementById('identityContent');

    loadIdentity();

    function loadIdentity() {
        fetch('/api/identity')
            .then(r => r.json())
            .then(data => {
                if (data.error) {
                    identityContent.innerHTML = '<p>Error: ' + escapeHtml(data.error) + '</p>';
                    return;
                }
                renderIdentity(data);
            })
            .catch(() => {
                identityContent.innerHTML = '<p>Server not responding.</p>';
            });
    }

    function renderIdentity(data) {
        const sections = [];

        if (identityGenerated && data.generatedAt) {
            identityGenerated.textContent = 'Snapshot generated ' + formatDate(data.generatedAt) + '.';
        }

        // WHY
        if (data.why) {
            sections.push(`
                <section class="identity-section">
                    <h2>Your Why</h2>
                    <p class="identity-why">${escapeHtml(data.why).replace(/\n/g, '<br>')}</p>
                </section>
            `);
        }

        // FIVE-YEAR ANSWER
        if (data.fiveYear) {
            sections.push(`
                <section class="identity-section">
                    <h2>Your Five-Year Answer</h2>
                    <p class="identity-five-year">${escapeHtml(data.fiveYear.text)}</p>
                    <span class="identity-age">Written ${timeAgo(data.fiveYear.created_at)}</span>
                </section>
            `);
        }

        // CURRENT COMMITMENTS
        const commitGroups = [];
        if (data.commitments.day.length > 0) commitGroups.push(renderCommitGroup('Today', data.commitments.day));
        if (data.commitments.week.length > 0) commitGroups.push(renderCommitGroup('This Week', data.commitments.week));
        if (data.commitments.month.length > 0) commitGroups.push(renderCommitGroup('This Month', data.commitments.month));
        if (data.commitments.year.length > 0) commitGroups.push(renderCommitGroup('This Year', data.commitments.year));

        if (commitGroups.length > 0) {
            sections.push(`
                <section class="identity-section">
                    <h2>Current Commitments</h2>
                    ${commitGroups.join('')}
                </section>
            `);
        }

        // RECENT REFLECTIONS
        if (data.reflections.length > 0) {
            sections.push(`
                <section class="identity-section">
                    <h2>Recent Reflections</h2>
                    ${data.reflections.map(r => `
                        <div class="identity-item">
                            <p class="identity-item-text">${escapeHtml(r.content)}</p>
                            <span class="identity-age">${timeAgo(r.created_at)}</span>
                        </div>
                    `).join('')}
                </section>
            `);
        }

        // ECHOES
        if (data.echoes.length > 0) {
            sections.push(`
                <section class="identity-section">
                    <h2>Your Echoes</h2>
                    <ul class="identity-echo-list">
                        ${data.echoes.map(e => `<li>${escapeHtml(e.content)}</li>`).join('')}
                    </ul>
                </section>
            `);
        }

        // RANDOM THOUGHTS
        if (data.randomThoughts.length > 0) {
            sections.push(`
                <section class="identity-section">
                    <h2>What You've Been Thinking About</h2>
                    ${data.randomThoughts.map(t => `
                        <div class="identity-item">
                            <span class="identity-item-type">${escapeHtml(t.type)}</span>
                            <p class="identity-item-text">${escapeHtml(t.content)}</p>
                        </div>
                    `).join('')}
                </section>
            `);
        }

        // WEEK IN NUMBERS
        const w = data.week;
        const hasWeekData =
            w.thoughtsCount > 0 ||
            w.promptResponsesCount > 0 ||
            w.commitmentsCompletedCount > 0 ||
            w.daysSinceLastCapture !== null;

        if (hasWeekData) {
            sections.push(`
                <section class="identity-section">
                    <h2>Your Week in Numbers</h2>
                    <ul class="identity-numbers">
                        <li><strong>${w.thoughtsCount}</strong> thought${w.thoughtsCount === 1 ? '' : 's'} this week</li>
                        <li><strong>${w.promptResponsesCount}</strong> prompt answer${w.promptResponsesCount === 1 ? '' : 's'} this week</li>
                        <li><strong>${w.commitmentsCompletedCount}</strong> commitment${w.commitmentsCompletedCount === 1 ? '' : 's'} completed this week</li>
                        ${w.daysSinceLastCapture !== null
                            ? `<li><strong>${w.daysSinceLastCapture}</strong> day${w.daysSinceLastCapture === 1 ? '' : 's'} since last thought captured</li>`
                            : ''}
                    </ul>
                </section>
            `);
        }

        if (sections.length === 0) {
            identityContent.innerHTML = '<p>Nothing to show yet. Start by writing your WHY on Home, or capturing a thought in Mind.</p>';
            return;
        }

        identityContent.innerHTML = sections.join('');
    }

    function renderCommitGroup(label, items) {
        return `
            <div class="identity-commit-group">
                <h3>${escapeHtml(label)}</h3>
                ${items.map(c => `
                    <div class="identity-item">
                        <p class="identity-item-text">· ${escapeHtml(c.text)}</p>
                        ${c.why ? `<span class="identity-item-why">why: ${escapeHtml(c.why)}</span>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
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

    function formatDate(isoString) {
        const d = new Date(isoString);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }
});