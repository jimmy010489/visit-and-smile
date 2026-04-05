// ===== VISIT & SMILE — DEADPOOL IA — App Logic (Production) =====

// Splash screen — hide after load
window.addEventListener('load', () => {
    const splash = document.getElementById('splashScreen');
    if (splash) {
        setTimeout(() => {
            splash.classList.add('hidden');
            setTimeout(() => splash.remove(), 600);
        }, 1200);
    }
});

document.addEventListener('DOMContentLoaded', () => {

    // ===== ONBOARDING TOUR =====
    const onboardingSteps = [
        {
            target: '.stats-grid',
            title: 'Tableau de bord',
            text: 'Ici tu retrouves tes chiffres clés en un coup d\'oeil : CA, ventes, engagement social et RDV.',
            position: 'bottom'
        },
        {
            target: '[data-page="agent-compta"]',
            title: 'Agent Comptable',
            text: 'Ton agent comptable suit automatiquement ton chiffre d\'affaires, commissions, URSSAF et tes déclarations.',
            position: 'right'
        },
        {
            target: '[data-page="agent-social"]',
            title: 'Agent Réseaux Sociaux',
            text: 'Il crée et publie du contenu adapté pour Instagram, Facebook, LinkedIn et TikTok.',
            position: 'right'
        },
        {
            target: '[data-page="agent-planning"]',
            title: 'Agent Planning & RDV',
            text: 'Gestion automatique de tes rendez-vous, relances clients et rappels d\'anniversaires.',
            position: 'right'
        },
        {
            target: '.topbar-search',
            title: 'Recherche rapide',
            text: 'Recherche un client, un bien ou un RDV en tapant ici. Raccourci : Ctrl+K.',
            position: 'bottom'
        },
        {
            target: '#chatbotToggle',
            title: 'Deadpool IA',
            text: 'Ton assistant personnel ! Pose-lui des questions sur tes stats, clients, RDV... Il est disponible 24/7.',
            position: 'left'
        }
    ];

    let currentOnboardingStep = 0;
    const onboardingOverlay = document.getElementById('onboardingOverlay');
    const onboardingSpotlight = document.getElementById('onboardingSpotlight');
    const onboardingTooltip = document.getElementById('onboardingTooltip');

    function showOnboardingStep(index) {
        const step = onboardingSteps[index];
        if (!step) { endOnboarding(); return; }

        const target = document.querySelector(step.target);
        if (!target) { currentOnboardingStep++; showOnboardingStep(currentOnboardingStep); return; }

        const rect = target.getBoundingClientRect();
        const pad = 8;

        // Spotlight
        onboardingSpotlight.style.top = (rect.top - pad) + 'px';
        onboardingSpotlight.style.left = (rect.left - pad) + 'px';
        onboardingSpotlight.style.width = (rect.width + pad * 2) + 'px';
        onboardingSpotlight.style.height = (rect.height + pad * 2) + 'px';

        // Tooltip position
        const tooltip = onboardingTooltip;
        tooltip.style.top = '';
        tooltip.style.left = '';
        tooltip.style.right = '';
        tooltip.style.bottom = '';

        if (step.position === 'bottom') {
            tooltip.style.top = (rect.bottom + 16) + 'px';
            tooltip.style.left = Math.max(16, rect.left) + 'px';
        } else if (step.position === 'right') {
            tooltip.style.top = rect.top + 'px';
            tooltip.style.left = (rect.right + 16) + 'px';
        } else if (step.position === 'left') {
            tooltip.style.top = (rect.top - 80) + 'px';
            tooltip.style.right = (window.innerWidth - rect.left + 16) + 'px';
        }

        // Content
        document.getElementById('onboardingCounter').textContent = `${index + 1}/${onboardingSteps.length}`;
        document.getElementById('onboardingTitle').textContent = step.title;
        document.getElementById('onboardingText').textContent = step.text;

        const nextBtn = document.getElementById('onboardingNext');
        if (index === onboardingSteps.length - 1) {
            nextBtn.innerHTML = '<i class="fas fa-check"></i> Commencer !';
        } else {
            nextBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Suivant';
        }
    }

    function startOnboarding() {
        currentOnboardingStep = 0;
        onboardingOverlay.classList.add('active');
        showOnboardingStep(0);
    }

    function endOnboarding() {
        onboardingOverlay.classList.remove('active');
        localStorage.setItem('visitandsmile_onboarded', 'true');
        if (typeof showToast === 'function') {
            showToast('Bienvenue !', 'Ton assistant Deadpool IA est prêt. Bonne journée Alison !', 'success', 5000);
        }
    }

    document.getElementById('onboardingNext')?.addEventListener('click', () => {
        currentOnboardingStep++;
        showOnboardingStep(currentOnboardingStep);
    });

    document.getElementById('onboardingSkip')?.addEventListener('click', endOnboarding);

    // ===== STATE =====
    let currentUser = null;
    let userProfile = null;
    const isSupabaseConfigured = CONFIG.SUPABASE_URL !== 'https://VOTRE_PROJET.supabase.co';

    // ===== LOGIN =====
    const loginOverlay = document.getElementById('loginOverlay');
    const loginForm = document.getElementById('loginForm');

    async function handleLogin(e) {
        e.preventDefault();
        const btn = loginForm.querySelector('.login-btn');
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorEl = loginForm.querySelector('.login-error');

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';
        if (errorEl) errorEl.style.display = 'none';

        try {
            if (isSupabaseConfigured) {
                const { user } = await Auth.signIn(email, password);
                currentUser = user;
                userProfile = await Profile.get();
            } else {
                // Mode démo — fallback local
                await new Promise(r => setTimeout(r, 800));
                currentUser = { id: 'demo', email };
                userProfile = { full_name: 'Alison Mendes', business_name: 'Visit & Smile' };
            }

            loginOverlay.classList.add('hidden');
            setTimeout(() => loginOverlay.style.display = 'none', 600);

            // Charger les données du dashboard
            await loadDashboardData();

            // Onboarding au premier lancement
            if (!localStorage.getItem('visitandsmile_onboarded')) {
                setTimeout(startOnboarding, 1000);
            }

        } catch (err) {
            console.error('Login error:', err);
            btn.innerHTML = '<span>Se connecter</span><i class="fas fa-arrow-right"></i>';
            if (errorEl) {
                errorEl.textContent = 'Email ou mot de passe incorrect';
                errorEl.style.display = 'block';
            }
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Vérifier la session existante
    async function checkSession() {
        if (!isSupabaseConfigured) return;
        try {
            const session = await Auth.getSession();
            if (session) {
                currentUser = session.user;
                userProfile = await Profile.get();
                loginOverlay.classList.add('hidden');
                loginOverlay.style.display = 'none';
                await loadDashboardData();
            }
        } catch (e) {
            console.log('No existing session');
        }
    }
    checkSession();

    // ===== DÉCONNEXION =====
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (isSupabaseConfigured) await Auth.signOut();
            loginOverlay.style.display = '';
            loginOverlay.classList.remove('hidden');
            currentUser = null;
            userProfile = null;
        });
    }

    // ===== NAVIGATION =====
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');

    function navigateTo(pageId) {
        navItems.forEach(item => item.classList.remove('active'));
        const activeNav = document.querySelector(`[data-page="${pageId}"]`);
        if (activeNav) activeNav.classList.add('active');

        pages.forEach(page => page.classList.remove('active'));
        const targetPage = document.getElementById(`page-${pageId}`);
        if (targetPage) {
            targetPage.classList.add('active');
            targetPage.style.animation = 'none';
            targetPage.offsetHeight;
            targetPage.style.animation = '';
        }

        document.getElementById('sidebar').classList.remove('open');

        // Charger les données de la page
        loadPageData(pageId);
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = item.dataset.page;
            if (pageId) navigateTo(pageId);
        });
    });

    document.querySelectorAll('[data-navigate]').forEach(card => {
        card.addEventListener('click', () => {
            navigateTo(card.dataset.navigate);
        });
    });

    // ===== DATA LOADING =====
    async function loadPageData(pageId) {
        if (!isSupabaseConfigured) return; // En mode démo, données en dur

        try {
            switch (pageId) {
                case 'dashboard':
                    await loadDashboardData();
                    break;
                case 'agent-compta':
                    await loadComptaData();
                    break;
                case 'agent-social':
                    await loadSocialData();
                    break;
                case 'agent-planning':
                    await loadPlanningData();
                    break;
                case 'clients':
                    await loadClientsData();
                    break;
                case 'settings':
                    await loadSettingsData();
                    break;
            }
        } catch (err) {
            console.error(`Error loading ${pageId}:`, err);
        }
    }

    // ===== DASHBOARD DATA =====
    async function loadDashboardData() {
        if (!isSupabaseConfigured) {
            animateCounters();
            return;
        }

        try {
            const [stats, caByMonth, rdvCount] = await Promise.all([
                Dashboard.getStats(),
                Dashboard.getCAByMonth(),
                Dashboard.getUpcomingAppointmentsCount()
            ]);

            // Mettre à jour les stats
            const caEl = document.querySelector('.stats-grid .stat-card:nth-child(1) .stat-value');
            const ventesEl = document.querySelector('.stats-grid .stat-card:nth-child(2) .stat-value');
            const rdvEl = document.querySelector('.stats-grid .stat-card:nth-child(4) .stat-value');

            if (caEl) caEl.textContent = Utils.formatCompact(stats.ca_month) + '€';
            if (ventesEl) ventesEl.textContent = stats.sales_month;
            if (rdvEl) rdvEl.textContent = rdvCount;

            // Mettre à jour les tendances
            const caTrend = document.querySelector('.stats-grid .stat-card:nth-child(1) .stat-trend');
            if (caTrend && stats.ca_prev_month > 0) {
                const pct = Math.round((stats.ca_month - stats.ca_prev_month) / stats.ca_prev_month * 100);
                caTrend.className = `stat-trend ${pct >= 0 ? 'up' : 'down'}`;
                caTrend.innerHTML = `<i class="fas fa-arrow-${pct >= 0 ? 'up' : 'down'}"></i> ${pct >= 0 ? '+' : ''}${pct}% vs mois dernier`;
            }

            // Mettre à jour les graphiques CA
            if (caByMonth && caByMonth.length) {
                const chartCA = document.getElementById('chartCA');
                if (chartCA) {
                    const maxCA = Math.max(...caByMonth.map(m => m.ca));
                    chartCA.innerHTML = caByMonth.map(m => `
                        <div class="chart-bar-col">
                            <span class="chart-bar-value">${Utils.formatCompact(m.ca)}</span>
                            <div class="chart-bar gold" style="height: ${maxCA > 0 ? (m.ca / maxCA * 85) : 0}%"></div>
                            <span class="chart-bar-label">${m.label}</span>
                        </div>
                    `).join('');

                    // Animation
                    setTimeout(() => {
                        chartCA.querySelectorAll('.chart-bar').forEach(bar => {
                            const h = bar.style.height;
                            bar.style.height = '0%';
                            requestAnimationFrame(() => { bar.style.height = h; });
                        });
                    }, 100);
                }
            }

            // Charger l'activité récente
            const activities = await ActivityFeed.list(5);
            const feed = document.querySelector('#page-dashboard .activity-feed');
            if (feed && activities.length) {
                feed.innerHTML = activities.map(a => `
                    <div class="activity-item">
                        <div class="activity-icon ${a.agent === 'compta' ? 'leads' : a.agent === 'social' ? 'social' : 'followup'}">
                            <i class="fas ${a.icon || 'fa-robot'}"></i>
                        </div>
                        <div class="activity-content">
                            <p>${a.message}</p>
                            <span class="activity-time">${Utils.timeAgo(a.created_at)}</span>
                        </div>
                    </div>
                `).join('');
            }

        } catch (err) {
            console.error('Dashboard load error:', err);
            animateCounters(); // Fallback
        }
    }

    // ===== COMPTA DATA =====
    async function loadComptaData() {
        try {
            const [sales, stats, declarations] = await Promise.all([
                Sales.list({ limit: 10 }),
                Dashboard.getStats(),
                Declarations.list()
            ]);

            // Tableau financier
            const caEl = document.querySelector('#page-agent-compta .source-item:nth-child(1) .source-status');
            const chargesEl = document.querySelector('#page-agent-compta .source-item:nth-child(2) .source-status');
            const beneficeEl = document.querySelector('#page-agent-compta .source-item:nth-child(3) .source-status');
            const margeEl = document.querySelector('#page-agent-compta .source-item:nth-child(4) .source-status');

            if (caEl) caEl.textContent = Utils.formatCurrency(stats.ca_month);
            if (chargesEl) chargesEl.textContent = Utils.formatCurrency(stats.total_urssaf);
            if (beneficeEl) beneficeEl.textContent = Utils.formatCurrency(stats.total_net);
            if (margeEl) margeEl.textContent = stats.margin_rate + '%';

            // Tableau des ventes
            const tbody = document.querySelector('#page-agent-compta .contacts-table tbody');
            if (tbody && sales.length) {
                tbody.innerHTML = sales.map(s => `
                    <tr>
                        <td>${Utils.formatDate(s.sale_date)}</td>
                        <td>${s.property_name}</td>
                        <td>${Utils.formatCurrency(s.sale_price)}</td>
                        <td>${Utils.formatCurrency(s.commission_amount)}</td>
                        <td><span class="status-badge ${Utils.statusBadgeClass(s.status)}">${s.status === 'paid' ? 'Encaissée' : s.status === 'pending' ? 'En attente' : 'Annulée'}</span></td>
                    </tr>
                `).join('');
            }

            // Checklist déclarations
            const checklistEl = document.querySelector('#page-agent-compta .checkbox-list');
            if (checklistEl && declarations.length) {
                checklistEl.innerHTML = declarations.map(d => `
                    <label class="checkbox-item">
                        <input type="checkbox" ${d.status !== 'pending' ? 'checked' : ''} data-decl-id="${d.id}">
                        ${d.label}
                    </label>
                `).join('');

                // Toggle déclaration status
                checklistEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.addEventListener('change', async () => {
                        const id = cb.dataset.declId;
                        await Declarations.update(id, { status: cb.checked ? 'submitted' : 'pending' });
                    });
                });
            }

        } catch (err) {
            console.error('Compta load error:', err);
        }
    }

    // ===== SOCIAL DATA =====
    async function loadSocialData() {
        try {
            const [posts, configs] = await Promise.all([
                SocialPosts.list({ upcoming: true, limit: 6 }),
                SocialConfig.list()
            ]);

            // Posts à venir
            const postsGrid = document.querySelector('#page-agent-social .posts-grid');
            if (postsGrid && posts.length) {
                postsGrid.innerHTML = posts.map(p => `
                    <div class="post-card" data-post-id="${p.id}">
                        <div class="post-preview">
                            <div class="post-placeholder"><i class="fas ${p.platform === 'instagram' && p.content_text.includes('visite') ? 'fa-video' : 'fa-image'}"></i></div>
                        </div>
                        <div class="post-info">
                            <span class="post-platform"><i class="${Utils.platformIcon(p.platform)}" style="color:${Utils.platformColor(p.platform)}"></i> ${p.platform.charAt(0).toUpperCase() + p.platform.slice(1)}</span>
                            <span class="post-schedule"><i class="fas fa-clock"></i> ${Utils.formatDateTime(p.scheduled_at)}</span>
                        </div>
                        <p class="post-caption">${p.content_text.substring(0, 120)}${p.content_text.length > 120 ? '...' : ''}</p>
                        <div class="post-actions">
                            <button class="btn-sm btn-outline" onclick="editPost('${p.id}')">Modifier</button>
                            <button class="btn-sm btn-gold" onclick="approvePost('${p.id}')">Approuver</button>
                        </div>
                    </div>
                `).join('');
            }

        } catch (err) {
            console.error('Social load error:', err);
        }
    }

    // Global post actions
    window.approvePost = async function(id) {
        if (!isSupabaseConfigured) return;
        try {
            await SocialPosts.approve(id);
            await loadSocialData();
        } catch (e) { console.error(e); }
    };

    window.editPost = function(id) {
        console.log('Edit post:', id);
        // TODO: ouvrir modal d'édition
    };

    // ===== PLANNING DATA =====
    async function loadPlanningData() {
        try {
            const [appointments, sequences, birthdays] = await Promise.all([
                Appointments.list({ upcoming: true, limit: 5 }),
                Sequences.list(),
                Clients.getUpcomingBirthdays(30)
            ]);

            // RDV à venir
            const rdvList = document.querySelector('#page-agent-planning .conversations-list');
            if (rdvList && appointments.length) {
                rdvList.innerHTML = appointments.map(a => {
                    const client = a.clients;
                    const initials = client ? Utils.getInitials(client.first_name, client.last_name) : '?';
                    const name = client ? `${client.first_name} ${client.last_name}` : 'Client';
                    return `
                        <div class="conversation-item">
                            <div class="conv-avatar">${initials}</div>
                            <div class="conv-info">
                                <div class="conv-header">
                                    <span class="conv-name">${name}</span>
                                    <span class="conv-source">${a.source === 'google_calendar' ? 'Google Calendar' : a.source === 'gmail' ? 'Gmail' : 'Manuel'}</span>
                                    <span class="conv-time">${Utils.formatDateTime(a.start_time)}</span>
                                </div>
                                <p class="conv-preview">${a.title}${a.description ? ' — ' + a.description : ''}</p>
                                <div class="conv-tags">
                                    <span class="tag ${Utils.statusBadgeClass(a.status)}">${a.status === 'confirmed' ? 'Confirmé' : a.status === 'scheduled' ? 'Programmé' : a.status}</span>
                                    <span class="tag">${a.type === 'visit' ? 'Visite' : a.type === 'signing' ? 'Signature' : a.type === 'estimation' ? 'Estimation' : a.type}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }

        } catch (err) {
            console.error('Planning load error:', err);
        }
    }

    // ===== CLIENTS DATA =====
    async function loadClientsData() {
        try {
            const clients = await Clients.list();

            const tbody = document.querySelector('#page-clients .contacts-table tbody');
            if (tbody && clients.length) {
                tbody.innerHTML = clients.map(c => {
                    const typeLabels = { buyer: 'Acheteur', seller: 'Vendeur', both: 'Acheteur/Vendeur' };
                    if (c.client_type === 'buyer' && c.first_name === 'Marie') {
                        // Fix gendered label
                    }
                    return `
                        <tr data-client-id="${c.id}">
                            <td><strong>${c.first_name} ${c.last_name}</strong></td>
                            <td>${typeLabels[c.client_type] || c.client_type}</td>
                            <td>${c.property_interest || '—'}</td>
                            <td>${c.budget ? Utils.formatCurrency(c.budget) : '—'}</td>
                            <td><span class="status-badge ${Utils.statusBadgeClass(c.status)}">${c.status === 'active' ? 'Actif' : c.status === 'prospect' ? 'Prospect' : 'Clôturé'}</span></td>
                            <td>${Utils.timeAgo(c.created_at)}</td>
                            <td><button class="btn-sm btn-outline btn-client-view" onclick="viewClientDetail('${c.id}')"><i class="fas fa-eye"></i></button></td>
                        </tr>
                    `;
                }).join('');
            }

        } catch (err) {
            console.error('Clients load error:', err);
        }
    }

    // ===== SETTINGS DATA =====
    async function loadSettingsData() {
        try {
            let profile;
            if (isSupabaseConfigured) {
                profile = await Profile.get();
            } else {
                // Données démo
                profile = {
                    full_name: 'Alison Mendes',
                    business_name: 'Visit & Smile',
                    city: 'Orléans',
                    phone: '',
                    email: 'alison@visitandsmile.fr',
                    fiscal_regime: 'micro-entrepreneur',
                    urssaf_rate: 0.22,
                    default_commission_rate: 3,
                    weekly_report_day: 'monday',
                    n8n_url: '',
                    notifications: {
                        client: true, rdv: true, post: true,
                        declaration: true, motivation: true,
                        relance: true, birthday: true
                    }
                };
            }

            // Informations personnelles
            const nameEl = document.getElementById('settingName');
            const businessEl = document.getElementById('settingBusiness');
            const cityEl = document.getElementById('settingCity');
            const phoneEl = document.getElementById('settingPhone');
            const emailEl = document.getElementById('settingEmail');

            if (nameEl) nameEl.value = profile.full_name || '';
            if (businessEl) businessEl.value = profile.business_name || '';
            if (cityEl) cityEl.value = profile.city || '';
            if (phoneEl) phoneEl.value = profile.phone || '';
            if (emailEl) emailEl.value = profile.email || '';

            // Comptabilité
            const fiscalEl = document.getElementById('settingFiscal');
            const urssafEl = document.getElementById('settingUrssaf');
            const commissionEl = document.getElementById('settingCommission');
            const weeklyEl = document.getElementById('settingWeeklyDay');

            if (fiscalEl) fiscalEl.value = profile.fiscal_regime || 'micro-entrepreneur';
            if (urssafEl) urssafEl.value = profile.urssaf_rate ? (profile.urssaf_rate * 100) : 22;
            if (commissionEl) commissionEl.value = profile.default_commission_rate || 3;
            if (weeklyEl) weeklyEl.value = profile.weekly_report_day || 'monday';

            // Connexion n8n
            const n8nEl = document.getElementById('settingN8n');
            const n8nStatus = document.getElementById('n8nStatus');
            if (n8nEl) n8nEl.value = profile.n8n_url || '';
            if (n8nStatus) {
                const isConnected = !!profile.n8n_url;
                n8nStatus.className = `source-status ${isConnected ? 'connected' : 'disconnected'}`;
                n8nStatus.innerHTML = `<i class="fas fa-circle"></i> ${isConnected ? 'Connecté' : 'Non configuré'}`;
            }

            // Notifications
            const notifs = profile.notifications || {};
            const notifMap = {
                notifClient: 'client',
                notifRDV: 'rdv',
                notifPost: 'post',
                notifDeclaration: 'declaration',
                notifMotivation: 'motivation',
                notifRelance: 'relance',
                notifBirthday: 'birthday'
            };

            Object.entries(notifMap).forEach(([elId, key]) => {
                const el = document.getElementById(elId);
                if (el) el.checked = notifs[key] !== false; // default true
            });

        } catch (err) {
            console.error('Settings load error:', err);
        }
    }

    // ===== SAVE SETTINGS =====
    const btnSaveSettings = document.getElementById('btnSaveSettings');
    if (btnSaveSettings) {
        btnSaveSettings.addEventListener('click', async () => {
            btnSaveSettings.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sauvegarde...';
            btnSaveSettings.disabled = true;

            try {
                // Collecter les données
                const updates = {
                    full_name: document.getElementById('settingName')?.value || '',
                    business_name: document.getElementById('settingBusiness')?.value || '',
                    city: document.getElementById('settingCity')?.value || '',
                    phone: document.getElementById('settingPhone')?.value || '',
                    fiscal_regime: document.getElementById('settingFiscal')?.value || 'micro-entrepreneur',
                    urssaf_rate: parseFloat(document.getElementById('settingUrssaf')?.value || 22) / 100,
                    default_commission_rate: parseFloat(document.getElementById('settingCommission')?.value || 3),
                    weekly_report_day: document.getElementById('settingWeeklyDay')?.value || 'monday',
                    n8n_url: document.getElementById('settingN8n')?.value || null,
                    notifications: {
                        client: document.getElementById('notifClient')?.checked ?? true,
                        rdv: document.getElementById('notifRDV')?.checked ?? true,
                        post: document.getElementById('notifPost')?.checked ?? true,
                        declaration: document.getElementById('notifDeclaration')?.checked ?? true,
                        motivation: document.getElementById('notifMotivation')?.checked ?? true,
                        relance: document.getElementById('notifRelance')?.checked ?? true,
                        birthday: document.getElementById('notifBirthday')?.checked ?? true
                    }
                };

                if (isSupabaseConfigured) {
                    await Profile.update(updates);
                    // Mettre à jour le profil local
                    userProfile = { ...userProfile, ...updates };
                } else {
                    // Mode démo — simulation
                    await new Promise(r => setTimeout(r, 600));
                }

                // Mettre à jour le taux URSSAF global dans CONFIG
                CONFIG.URSSAF_RATE = updates.urssaf_rate;

                // Mettre à jour le statut n8n
                const n8nStatus = document.getElementById('n8nStatus');
                if (n8nStatus) {
                    const isConnected = !!updates.n8n_url;
                    n8nStatus.className = `source-status ${isConnected ? 'connected' : 'disconnected'}`;
                    n8nStatus.innerHTML = `<i class="fas fa-circle"></i> ${isConnected ? 'Connecté' : 'Non configuré'}`;
                }

                // Feedback succès
                if (typeof showToast === 'function') showToast('Paramètres sauvegardés', 'Vos préférences ont été mises à jour', 'success');
                btnSaveSettings.innerHTML = '<i class="fas fa-check"></i> Sauvegardé !';
                btnSaveSettings.style.background = 'var(--green)';

                setTimeout(() => {
                    btnSaveSettings.innerHTML = '<i class="fas fa-save"></i> Sauvegarder';
                    btnSaveSettings.style.background = '';
                    btnSaveSettings.disabled = false;
                }, 1500);

            } catch (err) {
                console.error('Settings save error:', err);
                btnSaveSettings.innerHTML = '<i class="fas fa-times"></i> Erreur !';
                btnSaveSettings.style.background = 'var(--red)';

                setTimeout(() => {
                    btnSaveSettings.innerHTML = '<i class="fas fa-save"></i> Sauvegarder';
                    btnSaveSettings.style.background = '';
                    btnSaveSettings.disabled = false;
                }, 2000);
            }
        });
    }

    // ===== MOBILE MENU =====
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 &&
            !sidebar.contains(e.target) &&
            !menuToggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });

    // ===== NOTIFICATION PANEL =====
    const notifBtn = document.getElementById('notifBtn');
    const notifPanel = document.getElementById('notifPanel');

    notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifPanel.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!notifPanel.contains(e.target) && !notifBtn.contains(e.target)) {
            notifPanel.classList.remove('open');
        }
    });

    // ===== FILTER BUTTONS =====
    document.querySelectorAll('.filter-bar').forEach(bar => {
        const buttons = bar.querySelectorAll('.filter-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', async () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Charger les données filtrées
                if (isSupabaseConfigured) {
                    const filterText = btn.textContent.trim();
                    let filters = {};
                    if (filterText.includes('mois')) {
                        const now = new Date();
                        filters.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                    } else if (filterText.includes('trimestre')) {
                        const now = new Date();
                        const q = Math.ceil((now.getMonth() + 1) / 3);
                        filters.quarter = `Q${q}_${now.getFullYear()}`;
                    } else if (filterText.includes('année')) {
                        filters.year = new Date().getFullYear();
                    }

                    try {
                        const sales = await Sales.list(filters);
                        const tbody = document.querySelector('#page-agent-compta .contacts-table tbody');
                        if (tbody) {
                            tbody.innerHTML = sales.map(s => `
                                <tr>
                                    <td>${Utils.formatDate(s.sale_date)}</td>
                                    <td>${s.property_name}</td>
                                    <td>${Utils.formatCurrency(s.sale_price)}</td>
                                    <td>${Utils.formatCurrency(s.commission_amount)}</td>
                                    <td><span class="status-badge ${Utils.statusBadgeClass(s.status)}">${s.status === 'paid' ? 'Encaissée' : s.status === 'pending' ? 'En attente' : 'Annulée'}</span></td>
                                </tr>
                            `).join('');
                        }
                    } catch (e) { console.error(e); }
                }
            });
        });
    });

    // ===== TIME SLOTS TOGGLE =====
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.addEventListener('click', () => {
            slot.classList.toggle('active');
        });
    });

    // ===== TOGGLE SWITCH LABELS =====
    document.querySelectorAll('.toggle-switch input').forEach(toggle => {
        const label = toggle.closest('.page-header-right')?.querySelector('.toggle-label');
        if (label) {
            toggle.addEventListener('change', async () => {
                label.textContent = toggle.checked ? 'Actif' : 'Inactif';
                label.style.color = toggle.checked ? '#2ecc71' : '#e74c3c';

                // Sauvegarder l'état de l'agent dans Supabase
                if (isSupabaseConfigured) {
                    const agentMap = {
                        'toggle-compta': 'compta',
                        'toggle-social': 'social',
                        'toggle-planning': 'planning'
                    };
                    const agentName = agentMap[toggle.id];
                    if (agentName) {
                        try {
                            await AgentSettings.toggleAgent(agentName, toggle.checked);
                        } catch (e) { console.error(e); }
                    }
                }
            });
        }
    });

    // ===== CONFIG TAG REMOVAL =====
    document.querySelectorAll('.config-tag i').forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            const tag = icon.parentElement;
            tag.style.opacity = '0';
            tag.style.transform = 'scale(0.8)';
            setTimeout(() => tag.remove(), 200);
        });
    });

    // ===== LIVE COUNTER ANIMATION (fallback) =====
    function animateCounters() {
        const counters = {
            'stat-ca': { end: 12.4, duration: 1500, suffix: 'k', decimal: true },
            'stat-ventes': { end: 8, duration: 1200 },
            'stat-rdv': { end: 14, duration: 1000 },
        };

        Object.entries(counters).forEach(([id, config]) => {
            const el = document.getElementById(id);
            if (!el) return;

            let start = 0;
            const step = config.end / (config.duration / 16);
            const timer = setInterval(() => {
                start += step;
                if (start >= config.end) {
                    el.textContent = config.decimal ? config.end.toFixed(1) + (config.suffix || '') : config.end;
                    clearInterval(timer);
                } else {
                    el.textContent = config.decimal ? start.toFixed(1) + (config.suffix || '') : Math.floor(start);
                }
            }, 16);
        });
    }

    // ===== SIMULATED LIVE ACTIVITY (fallback quand pas de Supabase Realtime) =====
    const staticActivities = [
        { type: 'leads', icon: 'fa-calculator', text: '<strong>Rappel URSSAF</strong> — Pensez à envoyer votre déclaration trimestrielle avant le 15 avril' },
        { type: 'social', icon: 'fa-instagram', text: '<strong>Post programmé</strong> — Story visite virtuelle du T3 rue de Bourgogne prête' },
        { type: 'followup', icon: 'fa-calendar-check', text: '<strong>RDV confirmé</strong> — Sophie Laurent confirme la visite de samedi 11h' },
        { type: 'leads', icon: 'fa-chart-line', text: '<strong>Vente enregistrée</strong> — Studio La Source vendu 95 000€, commission 2 850€' },
        { type: 'social', icon: 'fa-facebook', text: '<strong>Performance</strong> — Le post "Maison Olivet" atteint 500 vues en 2h' },
        { type: 'followup', icon: 'fa-envelope', text: '<strong>Email reçu</strong> — Paul Leblanc demande un RDV pour signer le compromis' },
    ];

    let activityIndex = 0;

    function addLiveActivity() {
        const feed = document.querySelector('#page-dashboard .activity-feed');
        if (!feed) return;

        // Si Supabase est configuré, les activités viennent du realtime
        if (isSupabaseConfigured) return;

        const activity = staticActivities[activityIndex % staticActivities.length];
        activityIndex++;

        const item = document.createElement('div');
        item.className = 'activity-item';
        item.style.opacity = '0';
        item.style.transform = 'translateX(-20px)';
        item.innerHTML = `
            <div class="activity-icon ${activity.type}"><i class="fas ${activity.icon}"></i></div>
            <div class="activity-content">
                <p>${activity.text}</p>
                <span class="activity-time">À l'instant</span>
            </div>
        `;

        feed.insertBefore(item, feed.firstChild);

        requestAnimationFrame(() => {
            item.style.transition = 'all 0.4s ease';
            item.style.opacity = '1';
            item.style.transform = 'translateX(0)';
        });

        const items = feed.querySelectorAll('.activity-item');
        if (items.length > 8) {
            const last = items[items.length - 1];
            last.style.opacity = '0';
            setTimeout(() => last.remove(), 300);
        }
    }

    setInterval(addLiveActivity, 15000);

    // Supabase Realtime pour les activités
    if (isSupabaseConfigured) {
        ActivityFeed.subscribeRealtime((newActivity) => {
            const feed = document.querySelector('#page-dashboard .activity-feed');
            if (!feed) return;

            const item = document.createElement('div');
            item.className = 'activity-item';
            item.style.opacity = '0';
            item.style.transform = 'translateX(-20px)';
            item.innerHTML = `
                <div class="activity-icon ${newActivity.agent === 'compta' ? 'leads' : newActivity.agent === 'social' ? 'social' : 'followup'}">
                    <i class="fas ${newActivity.icon || 'fa-robot'}"></i>
                </div>
                <div class="activity-content">
                    <p>${newActivity.message}</p>
                    <span class="activity-time">À l'instant</span>
                </div>
            `;

            feed.insertBefore(item, feed.firstChild);
            requestAnimationFrame(() => {
                item.style.transition = 'all 0.4s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
            });
        });
    }

    // ===== MOTIVATION MESSAGES =====
    const motivations = [
        "Alison, tu as déjà réalisé 8 ventes ce mois ! Continue comme ça, tu es sur la bonne voie 💪",
        "12 400€ de CA ce mois, bravo Alison ! Tu dépasses tes objectifs 🚀",
        "3 rendez-vous confirmés aujourd'hui, ta journée va être productive ! ✨",
        "Ta marge nette est à 68%, c'est excellent ! Continue sur cette lancée 📈",
        "Tes réseaux sociaux cartonnent : +34% d'engagement cette semaine ! 🔥",
        "Alison, n'oublie pas de prendre une pause, tu le mérites bien après cette matinée ! ☕",
    ];

    let motivationIndex = 0;

    function updateMotivation() {
        const banner = document.getElementById('motivationBanner');
        if (!banner || banner.style.display === 'none') return;

        const textEl = banner.querySelector('.motivation-text');
        if (textEl) {
            motivationIndex = (motivationIndex + 1) % motivations.length;
            textEl.style.opacity = '0';
            setTimeout(() => {
                textEl.textContent = motivations[motivationIndex];
                textEl.style.opacity = '1';
            }, 300);
        }
    }

    setInterval(updateMotivation, 30000);

    // ===== MODAL NOUVELLE VENTE =====
    const modalVente = document.getElementById('modalVente');
    const btnNouvelleVente = document.getElementById('btnNouvelleVente');
    const modalVenteClose = document.getElementById('modalVenteClose');
    const modalVenteCancel = document.getElementById('modalVenteCancel');
    const formVente = document.getElementById('formVente');
    const inputPrix = document.getElementById('inputPrixVente');
    const inputTaux = document.getElementById('inputTauxComm');
    const commissionResult = document.getElementById('commissionResult');
    const urssafResult = document.getElementById('urssafResult');

    function openModal() {
        if (modalVente) {
            modalVente.style.display = 'flex';
            requestAnimationFrame(() => modalVente.classList.add('open'));
        }
    }

    function closeModal() {
        if (modalVente) {
            modalVente.classList.remove('open');
            setTimeout(() => modalVente.style.display = 'none', 300);
        }
    }

    if (btnNouvelleVente) btnNouvelleVente.addEventListener('click', openModal);
    if (modalVenteClose) modalVenteClose.addEventListener('click', closeModal);
    if (modalVenteCancel) modalVenteCancel.addEventListener('click', closeModal);

    if (modalVente) {
        modalVente.addEventListener('click', (e) => {
            if (e.target === modalVente) closeModal();
        });
    }

    function calcCommission() {
        if (!inputPrix || !inputTaux) return;
        const prix = parseFloat(inputPrix.value.replace(/[^0-9]/g, ''));
        const taux = parseFloat(inputTaux.value);
        if (isNaN(prix) || isNaN(taux)) {
            commissionResult.textContent = '—';
            urssafResult.textContent = '—';
            return;
        }
        const commission = prix * taux / 100;
        const urssaf = commission * CONFIG.URSSAF_RATE;
        commissionResult.textContent = commission.toLocaleString('fr-FR') + ' €';
        urssafResult.textContent = urssaf.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';
    }

    if (inputPrix) inputPrix.addEventListener('input', calcCommission);
    if (inputTaux) inputTaux.addEventListener('change', calcCommission);

    if (formVente) {
        formVente.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = formVente.querySelector('.btn-gold');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';

            try {
                if (isSupabaseConfigured) {
                    // Enregistrer dans Supabase
                    const saleData = {
                        sale_date: formVente.querySelector('input[type="date"]').value,
                        client_name: formVente.querySelectorAll('.form-input')[1].value,
                        property_name: formVente.querySelectorAll('.form-input')[2].value,
                        sale_price: parseFloat(inputPrix.value.replace(/[^0-9]/g, '')),
                        commission_rate: parseFloat(inputTaux.value),
                        status: 'pending',
                        notes: formVente.querySelectorAll('.form-input')[5]?.value || ''
                    };

                    await Sales.create(saleData);
                } else {
                    await new Promise(r => setTimeout(r, 800));
                }

                btn.innerHTML = '<i class="fas fa-check"></i> Vente enregistrée !';
                btn.style.background = 'var(--green)';
                if (typeof showToast === 'function') showToast('Vente enregistrée', 'La vente a été ajoutée avec succès', 'success');

                setTimeout(() => {
                    closeModal();
                    btn.innerHTML = '<i class="fas fa-check"></i> Enregistrer la vente';
                    btn.style.background = '';
                    formVente.reset();
                    commissionResult.textContent = '—';
                    urssafResult.textContent = '—';

                    // Recharger les données
                    if (isSupabaseConfigured) {
                        loadComptaData();
                        loadDashboardData();
                    }
                }, 1200);

            } catch (err) {
                console.error('Sale creation error:', err);
                btn.innerHTML = '<i class="fas fa-times"></i> Erreur !';
                btn.style.background = 'var(--red)';
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-check"></i> Enregistrer la vente';
                    btn.style.background = '';
                }, 2000);
            }
        });
    }

    // ===== MODAL NOUVEAU POST =====
    const modalPost = document.getElementById('modalPost');
    const btnNouveauPost = document.getElementById('btnNouveauPost');
    const formPost = document.getElementById('formPost');

    function openModalPost() {
        if (modalPost) {
            modalPost.style.display = 'flex';
            requestAnimationFrame(() => modalPost.classList.add('open'));
        }
    }
    function closeModalPost() {
        if (modalPost) {
            modalPost.classList.remove('open');
            setTimeout(() => modalPost.style.display = 'none', 300);
        }
    }

    if (btnNouveauPost) btnNouveauPost.addEventListener('click', openModalPost);
    document.getElementById('modalPostClose')?.addEventListener('click', closeModalPost);
    document.getElementById('modalPostCancel')?.addEventListener('click', closeModalPost);
    modalPost?.addEventListener('click', (e) => { if (e.target === modalPost) closeModalPost(); });

    // Génération IA du post
    const btnGenerateAI = document.getElementById('btnGenerateAI');
    if (btnGenerateAI) {
        btnGenerateAI.addEventListener('click', async () => {
            const platform = document.getElementById('postPlatform').value;
            const contentEl = document.getElementById('postContent');
            const hashtagsEl = document.getElementById('postHashtags');

            btnGenerateAI.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deadpool IA réfléchit...';
            btnGenerateAI.disabled = true;

            try {
                if (isSupabaseConfigured) {
                    const response = await fetch(CONFIG.N8N_BASE_URL + CONFIG.WEBHOOKS.GENERATE_CONTENT, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ platform, user_id: currentUser?.id })
                    });
                    const data = await response.json();
                    contentEl.value = data.content_text || data.text || '';
                    hashtagsEl.value = (data.hashtags || []).join(' ');
                } else {
                    // Fallback démo
                    await new Promise(r => setTimeout(r, 1500));
                    const demoContent = {
                        instagram: "✨ Coup de coeur du jour !\n\nDécouvrez ce magnifique T3 de 65m² avec balcon plein sud à Saint-Marceau. Lumineux, rénové, dans une résidence calme.\n\n📍 Orléans — Saint-Marceau\n💰 185 000€\n\nContactez-moi pour organiser une visite ! 🏠",
                        facebook: "🏠 Le marché immobilier à Orléans — Tendances avril 2026\n\nLes prix se stabilisent dans l'hyper-centre avec une légère baisse de 2% sur le trimestre. Le secteur La Source reste attractif pour les primo-accédants avec des opportunités sous les 150k€.\n\nVous cherchez votre futur chez-vous ? Parlons-en !\n\nAlison Mendes — Visit & Smile 🤝",
                        linkedin: "📊 Bilan Q1 2026 — Marché immobilier orléanais\n\nAprès une année 2025 de transition, le marché immobilier à Orléans montre des signes positifs :\n\n• Volume de transactions en hausse de 12%\n• Délai de vente moyen : 45 jours (-8 jours vs 2025)\n• Les biens rénovés se vendent 15% plus vite\n\nLe secteur reste porteur pour les investisseurs avisés.\n\n#immobilier #orleans #investissement"
                    };
                    contentEl.value = demoContent[platform] || demoContent.instagram;
                    hashtagsEl.value = '#immobilier #orleans #visitandsmile';
                }
            } catch (e) {
                console.error('AI generation error:', e);
                contentEl.value = "Erreur de génération. Réessayez ou écrivez votre post manuellement.";
            }

            btnGenerateAI.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Générer avec Deadpool IA';
            btnGenerateAI.disabled = false;
        });
    }

    if (formPost) {
        formPost.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = formPost.querySelector('.btn-gold');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Programmation...';

            try {
                const postData = {
                    platform: document.getElementById('postPlatform').value,
                    content_text: document.getElementById('postContent').value,
                    hashtags: document.getElementById('postHashtags').value.split(/\s+/).filter(h => h.startsWith('#')),
                    scheduled_at: document.getElementById('postSchedule').value ? new Date(document.getElementById('postSchedule').value).toISOString() : new Date(Date.now() + 3600000).toISOString(),
                    status: 'scheduled'
                };

                if (isSupabaseConfigured) {
                    await SocialPosts.create(postData);
                } else {
                    await new Promise(r => setTimeout(r, 800));
                }

                btn.innerHTML = '<i class="fas fa-check"></i> Post programmé !';
                btn.style.background = 'var(--green)';
                if (typeof showToast === 'function') showToast('Post programmé', 'Le post sera publié automatiquement', 'success');
                setTimeout(() => {
                    closeModalPost();
                    btn.innerHTML = '<i class="fas fa-calendar-plus"></i> Programmer le post';
                    btn.style.background = '';
                    formPost.reset();
                    if (isSupabaseConfigured) loadSocialData();
                }, 1200);
            } catch (err) {
                console.error('Post creation error:', err);
                btn.innerHTML = '<i class="fas fa-times"></i> Erreur';
                btn.style.background = 'var(--red)';
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-calendar-plus"></i> Programmer le post';
                    btn.style.background = '';
                }, 2000);
            }
        });
    }

    // ===== MODAL NOUVEAU CLIENT =====
    const modalClient = document.getElementById('modalClient');
    const btnNouveauClient = document.getElementById('btnNouveauClient');
    const formClient = document.getElementById('formClient');

    function openModalClient() {
        if (modalClient) {
            modalClient.style.display = 'flex';
            requestAnimationFrame(() => modalClient.classList.add('open'));
        }
    }
    function closeModalClient() {
        if (modalClient) {
            modalClient.classList.remove('open');
            setTimeout(() => modalClient.style.display = 'none', 300);
        }
    }

    if (btnNouveauClient) btnNouveauClient.addEventListener('click', openModalClient);
    document.getElementById('modalClientClose')?.addEventListener('click', closeModalClient);
    document.getElementById('modalClientCancel')?.addEventListener('click', closeModalClient);
    modalClient?.addEventListener('click', (e) => { if (e.target === modalClient) closeModalClient(); });

    if (formClient) {
        formClient.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = formClient.querySelector('.btn-gold');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ajout...';

            try {
                const clientData = {
                    first_name: document.getElementById('clientFirstName').value,
                    last_name: document.getElementById('clientLastName').value,
                    email: document.getElementById('clientEmail').value || null,
                    phone: document.getElementById('clientPhone').value || null,
                    client_type: document.getElementById('clientType').value,
                    budget: parseFloat(document.getElementById('clientBudget').value.replace(/[^0-9]/g, '')) || null,
                    property_interest: document.getElementById('clientProperty').value || null,
                    birthday: document.getElementById('clientBirthday').value || null,
                    notes: document.getElementById('clientNotes').value || null,
                    status: 'active'
                };

                if (isSupabaseConfigured) {
                    await Clients.create(clientData);
                } else {
                    await new Promise(r => setTimeout(r, 800));
                }

                btn.innerHTML = '<i class="fas fa-check"></i> Client ajouté !';
                btn.style.background = 'var(--green)';
                if (typeof showToast === 'function') showToast('Client ajouté', `${clientData.first_name} ${clientData.last_name} ajouté`, 'success');
                setTimeout(() => {
                    closeModalClient();
                    btn.innerHTML = '<i class="fas fa-check"></i> Ajouter le client';
                    btn.style.background = '';
                    formClient.reset();
                    if (isSupabaseConfigured) loadClientsData();
                }, 1200);
            } catch (err) {
                console.error('Client creation error:', err);
                btn.innerHTML = '<i class="fas fa-times"></i> Erreur';
                btn.style.background = 'var(--red)';
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-check"></i> Ajouter le client';
                    btn.style.background = '';
                }, 2000);
            }
        });
    }

    // ===== MODAL NOUVEAU RDV =====
    const modalRDV = document.getElementById('modalRDV');
    const btnNouveauRDV = document.getElementById('btnNouveauRDV');
    const formRDV = document.getElementById('formRDV');

    function openModalRDV() {
        if (modalRDV) {
            modalRDV.style.display = 'flex';
            requestAnimationFrame(() => modalRDV.classList.add('open'));
        }
    }
    function closeModalRDV() {
        if (modalRDV) {
            modalRDV.classList.remove('open');
            setTimeout(() => modalRDV.style.display = 'none', 300);
        }
    }

    if (btnNouveauRDV) btnNouveauRDV.addEventListener('click', openModalRDV);
    document.getElementById('modalRDVClose')?.addEventListener('click', closeModalRDV);
    document.getElementById('modalRDVCancel')?.addEventListener('click', closeModalRDV);
    modalRDV?.addEventListener('click', (e) => { if (e.target === modalRDV) closeModalRDV(); });

    if (formRDV) {
        formRDV.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = formRDV.querySelector('.btn-gold');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Planification...';

            try {
                const startTime = document.getElementById('rdvStart').value;
                const endTime = document.getElementById('rdvEnd').value;

                const rdvData = {
                    title: document.getElementById('rdvTitle').value,
                    start_time: new Date(startTime).toISOString(),
                    end_time: endTime ? new Date(endTime).toISOString() : new Date(new Date(startTime).getTime() + 3600000).toISOString(),
                    type: document.getElementById('rdvType').value,
                    location: document.getElementById('rdvLocation').value || null,
                    description: document.getElementById('rdvDescription').value || null,
                    status: 'scheduled',
                    source: 'manual'
                };

                if (isSupabaseConfigured) {
                    await Appointments.create(rdvData);
                } else {
                    await new Promise(r => setTimeout(r, 800));
                }

                btn.innerHTML = '<i class="fas fa-check"></i> RDV planifié !';
                btn.style.background = 'var(--green)';
                if (typeof showToast === 'function') showToast('RDV planifié', rdvData.title, 'success');
                setTimeout(() => {
                    closeModalRDV();
                    btn.innerHTML = '<i class="fas fa-calendar-check"></i> Planifier le RDV';
                    btn.style.background = '';
                    formRDV.reset();
                    if (isSupabaseConfigured) loadPlanningData();
                }, 1200);
            } catch (err) {
                console.error('RDV creation error:', err);
                btn.innerHTML = '<i class="fas fa-times"></i> Erreur';
                btn.style.background = 'var(--red)';
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-calendar-check"></i> Planifier le RDV';
                    btn.style.background = '';
                }, 2000);
            }
        });
    }

    // ===== SEARCH FUNCTIONALITY (GLOBAL) =====
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    let searchTimeout;

    // Données clients démo pour la recherche
    const demoClients = [
        { id: '1', first_name: 'Marie', last_name: 'Dupont', client_type: 'buyer', property_interest: 'T3 Saint-Marceau', budget: 180000, email: 'marie.dupont@email.fr', phone: '06 12 34 56 78', birthday: '1988-04-12', status: 'active', notes: 'Recherche T3 lumineux' },
        { id: '2', first_name: 'Jean', last_name: 'Petit', client_type: 'buyer', property_interest: 'T2 Centre-ville', budget: 155000, email: 'jean.petit@email.fr', phone: '06 23 45 67 89', birthday: '1975-09-20', status: 'active', notes: 'Premier achat' },
        { id: '3', first_name: 'Paul', last_name: 'Leblanc', client_type: 'buyer', property_interest: 'T4 Olivet', budget: 250000, email: 'paul.leblanc@email.fr', phone: '06 34 56 78 90', birthday: '1982-04-28', status: 'active', notes: 'Compromis en cours' },
        { id: '4', first_name: 'Sophie', last_name: 'Laurent', client_type: 'seller', property_interest: 'Maison La Source', budget: 320000, email: 'sophie.laurent@email.fr', phone: '06 45 67 89 01', birthday: '1990-07-15', status: 'active', notes: 'Estimation réalisée' },
        { id: '5', first_name: 'Anne', last_name: 'Richard', client_type: 'buyer', property_interest: 'Maison Olivet', budget: 295000, email: 'anne.richard@email.fr', phone: '06 56 78 90 12', birthday: '1985-11-30', status: 'active', notes: 'Offre acceptée' }
    ];

    // Données ventes démo
    const demoSales = [
        { id: 'v1', property_name: 'Appartement T3 Saint-Marceau', sale_price: 185000, commission_rate: 3, sale_date: '2026-03-15', status: 'paid', client_name: 'Marie Dupont' },
        { id: 'v2', property_name: 'Studio Centre-ville Orléans', sale_price: 98000, commission_rate: 3, sale_date: '2026-03-08', status: 'paid', client_name: 'Jean Petit' },
        { id: 'v3', property_name: 'Maison T5 Olivet', sale_price: 320000, commission_rate: 3, sale_date: '2026-02-20', status: 'paid', client_name: 'Paul Leblanc' },
        { id: 'v4', property_name: 'T2 Résidence du Parc', sale_price: 155000, commission_rate: 3, sale_date: '2026-02-10', status: 'pending', client_name: 'Sophie Laurent' },
        { id: 'v5', property_name: 'Maison La Source', sale_price: 295000, commission_rate: 3, sale_date: '2026-01-25', status: 'paid', client_name: 'Anne Richard' }
    ];

    // Données RDV démo
    const demoAppointments = [
        { id: 'r1', title: 'Visite T3 Saint-Marceau', type: 'visit', date_time: '2026-04-05T10:00', client_name: 'Marie Dupont', location: '12 rue Saint-Marceau, Orléans' },
        { id: 'r2', title: 'Signature compromis', type: 'signing', date_time: '2026-04-07T14:30', client_name: 'Paul Leblanc', location: 'Notaire Orléans Centre' },
        { id: 'r3', title: 'Estimation maison', type: 'estimation', date_time: '2026-04-08T09:00', client_name: 'Sophie Laurent', location: '45 avenue de la Source, Orléans' },
        { id: 'r4', title: 'Contre-visite T2', type: 'visit', date_time: '2026-04-10T16:00', client_name: 'Jean Petit', location: 'Résidence du Parc, Orléans' },
        { id: 'r5', title: 'Remise des clés', type: 'signing', date_time: '2026-04-12T11:00', client_name: 'Anne Richard', location: 'Maison Olivet' }
    ];

    function renderGlobalSearchResults(clients, sales, appointments) {
        const hasResults = (clients?.length || 0) + (sales?.length || 0) + (appointments?.length || 0) > 0;

        if (!hasResults) {
            searchResults.innerHTML = '<div class="search-no-result"><i class="fas fa-search"></i> Aucun résultat</div>';
            searchResults.classList.add('open');
            return;
        }

        let html = '';
        const typeLabels = { buyer: 'Acheteur', seller: 'Vendeur', both: 'Achet./Vend.' };
        const rdvIcons = { visit: 'fa-home', signing: 'fa-file-signature', estimation: 'fa-calculator' };
        const rdvLabels = { visit: 'Visite', signing: 'Signature', estimation: 'Estimation' };
        const statusLabels = { paid: 'Encaissée', pending: 'En attente', cancelled: 'Annulée' };

        // --- Clients ---
        if (clients && clients.length > 0) {
            html += '<div class="search-category-header"><i class="fas fa-users"></i> Clients</div>';
            html += clients.map(c => {
                const initials = (c.first_name?.[0] || '') + (c.last_name?.[0] || '');
                return `
                    <div class="search-result-item" onclick="viewClientDetail('${c.id}')">
                        <div class="search-result-avatar">${initials}</div>
                        <div class="search-result-info">
                            <div class="search-result-name">${c.first_name} ${c.last_name}</div>
                            <div class="search-result-detail">${c.property_interest || '—'} · ${c.budget ? c.budget.toLocaleString('fr-FR') + ' €' : '—'}</div>
                        </div>
                        <span class="search-result-type">${typeLabels[c.client_type] || c.client_type}</span>
                    </div>
                `;
            }).join('');
        }

        // --- Ventes ---
        if (sales && sales.length > 0) {
            html += '<div class="search-category-header"><i class="fas fa-euro-sign"></i> Ventes</div>';
            html += sales.map(s => `
                <div class="search-result-item" onclick="navigateTo('agent-compta')">
                    <div class="search-result-avatar sale"><i class="fas fa-coins"></i></div>
                    <div class="search-result-info">
                        <div class="search-result-name">${s.property_name}</div>
                        <div class="search-result-detail">${s.client_name || '—'} · ${Number(s.sale_price).toLocaleString('fr-FR')} €</div>
                    </div>
                    <span class="search-result-type ${s.status === 'paid' ? 'green' : s.status === 'pending' ? 'orange' : 'red'}">${statusLabels[s.status] || s.status}</span>
                </div>
            `).join('');
        }

        // --- RDV ---
        if (appointments && appointments.length > 0) {
            html += '<div class="search-category-header"><i class="fas fa-calendar-alt"></i> Rendez-vous</div>';
            html += appointments.map(a => {
                const dt = new Date(a.date_time);
                const dateStr = dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                const timeStr = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                return `
                    <div class="search-result-item" onclick="navigateTo('agent-planning')">
                        <div class="search-result-avatar rdv"><i class="fas ${rdvIcons[a.type] || 'fa-calendar'}"></i></div>
                        <div class="search-result-info">
                            <div class="search-result-name">${a.title}</div>
                            <div class="search-result-detail">${a.client_name || '—'} · ${dateStr} à ${timeStr}</div>
                        </div>
                        <span class="search-result-type">${rdvLabels[a.type] || a.type}</span>
                    </div>
                `;
            }).join('');
        }

        searchResults.innerHTML = html;
        searchResults.classList.add('open');
    }

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        clearTimeout(searchTimeout);

        if (query.length < 2) {
            searchResults.classList.remove('open');
            return;
        }

        searchTimeout = setTimeout(async () => {
            if (isSupabaseConfigured) {
                try {
                    const [clientsRes, salesRes, rdvRes] = await Promise.all([
                        db.from('clients')
                            .select('*')
                            .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,property_interest.ilike.%${query}%`)
                            .limit(4),
                        db.from('sales')
                            .select('*')
                            .or(`property_name.ilike.%${query}%`)
                            .limit(3),
                        db.from('appointments')
                            .select('*')
                            .or(`title.ilike.%${query}%`)
                            .limit(3)
                    ]);
                    renderGlobalSearchResults(clientsRes.data, salesRes.data, rdvRes.data);
                } catch (e) {
                    console.error('Search error:', e);
                }
            } else {
                // Recherche locale démo
                const clientResults = demoClients.filter(c =>
                    c.first_name.toLowerCase().includes(query) ||
                    c.last_name.toLowerCase().includes(query) ||
                    (c.property_interest && c.property_interest.toLowerCase().includes(query))
                );
                const saleResults = demoSales.filter(s =>
                    s.property_name.toLowerCase().includes(query) ||
                    (s.client_name && s.client_name.toLowerCase().includes(query))
                );
                const rdvResults = demoAppointments.filter(a =>
                    a.title.toLowerCase().includes(query) ||
                    (a.client_name && a.client_name.toLowerCase().includes(query)) ||
                    (a.location && a.location.toLowerCase().includes(query))
                );
                renderGlobalSearchResults(clientResults, saleResults, rdvResults);
            }
        }, 250);
    });

    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim().length >= 2) {
            searchResults.classList.add('open');
        }
    });

    document.addEventListener('click', (e) => {
        if (!searchResults.contains(e.target) && e.target !== searchInput) {
            searchResults.classList.remove('open');
        }
    });

    // ===== COMMAND PALETTE (Ctrl+K) =====
    const cmdPalette = document.getElementById('commandPalette');
    const cmdInput = document.getElementById('cmdInput');
    const cmdResults = document.getElementById('cmdResults');
    let cmdSelectedIndex = -1;

    const commandActions = [
        { id: 'nav-dashboard', icon: 'fa-th-large', label: 'Aller au Dashboard', category: 'Navigation', action: () => navigateTo('dashboard') },
        { id: 'nav-compta', icon: 'fa-calculator', label: 'Aller à la Comptabilité', category: 'Navigation', action: () => navigateTo('agent-compta') },
        { id: 'nav-social', icon: 'fa-share-alt', label: 'Aller aux Réseaux Sociaux', category: 'Navigation', action: () => navigateTo('agent-social') },
        { id: 'nav-planning', icon: 'fa-calendar-alt', label: 'Aller au Planning', category: 'Navigation', action: () => navigateTo('agent-planning') },
        { id: 'nav-clients', icon: 'fa-users', label: 'Aller aux Clients', category: 'Navigation', action: () => navigateTo('clients') },
        { id: 'nav-settings', icon: 'fa-cog', label: 'Aller aux Paramètres', category: 'Navigation', action: () => navigateTo('settings') },
        { id: 'new-sale', icon: 'fa-plus-circle', label: 'Nouvelle vente', category: 'Actions', action: () => { closeCmdPalette(); openModalVente?.(); } },
        { id: 'new-client', icon: 'fa-user-plus', label: 'Nouveau client', category: 'Actions', action: () => { closeCmdPalette(); openModalClient?.(); } },
        { id: 'new-rdv', icon: 'fa-calendar-plus', label: 'Nouveau rendez-vous', category: 'Actions', action: () => { closeCmdPalette(); openModalRDV?.(); } },
        { id: 'new-post', icon: 'fa-pen-fancy', label: 'Nouveau post social', category: 'Actions', action: () => { closeCmdPalette(); openModalPost?.(); } },
        { id: 'export-csv', icon: 'fa-file-csv', label: 'Exporter comptabilité CSV', category: 'Actions', action: () => { closeCmdPalette(); document.getElementById('btnExportCSV')?.click(); } },
        { id: 'export-clients', icon: 'fa-download', label: 'Exporter clients CSV', category: 'Actions', action: () => { closeCmdPalette(); document.getElementById('btnExportClients')?.click(); } },
        { id: 'open-chatbot', icon: 'fa-robot', label: 'Ouvrir Deadpool IA', category: 'Outils', action: () => { closeCmdPalette(); chatbotPanel.classList.add('open'); chatInput.focus(); } },
        { id: 'toggle-theme', icon: 'fa-moon', label: 'Basculer le thème sombre/clair', category: 'Outils', action: () => { closeCmdPalette(); showToast('Info', 'Le thème clair arrive bientôt !', 'info'); } },
        { id: 'logout', icon: 'fa-sign-out-alt', label: 'Se déconnecter', category: 'Compte', action: () => { closeCmdPalette(); document.getElementById('logoutBtn')?.click(); } }
    ];

    function openCmdPalette() {
        if (!cmdPalette) return;
        cmdPalette.style.display = 'flex';
        requestAnimationFrame(() => cmdPalette.classList.add('open'));
        cmdInput.value = '';
        cmdSelectedIndex = -1;
        renderCmdResults('');
        setTimeout(() => cmdInput.focus(), 50);
    }

    function closeCmdPalette() {
        if (!cmdPalette) return;
        cmdPalette.classList.remove('open');
        setTimeout(() => cmdPalette.style.display = 'none', 200);
    }

    function renderCmdResults(query) {
        const q = query.toLowerCase().trim();
        let filtered = q ? commandActions.filter(a =>
            a.label.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
        ) : commandActions;

        if (filtered.length === 0) {
            cmdResults.innerHTML = '<div class="cmd-no-result"><i class="fas fa-search"></i> Aucune commande trouvée</div>';
            return;
        }

        // Group by category
        const groups = {};
        filtered.forEach(a => {
            if (!groups[a.category]) groups[a.category] = [];
            groups[a.category].push(a);
        });

        let html = '';
        let idx = 0;
        for (const [cat, items] of Object.entries(groups)) {
            html += `<div class="cmd-category">${cat}</div>`;
            items.forEach(item => {
                html += `
                    <div class="cmd-item ${idx === cmdSelectedIndex ? 'selected' : ''}" data-cmd-index="${idx}" data-cmd-id="${item.id}">
                        <i class="fas ${item.icon}"></i>
                        <span>${item.label}</span>
                        <span class="cmd-shortcut"></span>
                    </div>
                `;
                idx++;
            });
        }
        cmdResults.innerHTML = html;

        // Click handlers
        cmdResults.querySelectorAll('.cmd-item').forEach(el => {
            el.addEventListener('click', () => {
                const cmdId = el.dataset.cmdId;
                const cmd = commandActions.find(a => a.id === cmdId);
                if (cmd) {
                    closeCmdPalette();
                    cmd.action();
                }
            });
        });
    }

    if (cmdInput) {
        cmdInput.addEventListener('input', (e) => {
            cmdSelectedIndex = -1;
            renderCmdResults(e.target.value);
        });

        cmdInput.addEventListener('keydown', (e) => {
            const items = cmdResults.querySelectorAll('.cmd-item');
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                cmdSelectedIndex = Math.min(cmdSelectedIndex + 1, items.length - 1);
                updateCmdSelection(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                cmdSelectedIndex = Math.max(cmdSelectedIndex - 1, 0);
                updateCmdSelection(items);
            } else if (e.key === 'Enter' && cmdSelectedIndex >= 0) {
                e.preventDefault();
                items[cmdSelectedIndex]?.click();
            }
        });
    }

    function updateCmdSelection(items) {
        items.forEach((el, i) => {
            el.classList.toggle('selected', i === cmdSelectedIndex);
            if (i === cmdSelectedIndex) el.scrollIntoView({ block: 'nearest' });
        });
    }

    // Close on backdrop click
    cmdPalette?.addEventListener('click', (e) => { if (e.target === cmdPalette) closeCmdPalette(); });

    // ===== KEYBOARD SHORTCUTS =====
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            if (cmdPalette && cmdPalette.classList.contains('open')) {
                closeCmdPalette();
            } else {
                openCmdPalette();
            }
        }
        if (e.key === 'Escape') {
            if (cmdPalette && cmdPalette.classList.contains('open')) {
                closeCmdPalette();
                return;
            }
            notifPanel.classList.remove('open');
            sidebar.classList.remove('open');
            searchInput.blur();
            searchResults.classList.remove('open');
            if (chatbotPanel.classList.contains('open')) {
                chatbotPanel.classList.remove('open');
            }
        }
    });

    // ===== ADS TOGGLE =====
    const toggleAds = document.getElementById('toggle-ads');
    const adsContent = document.getElementById('adsContent');
    const adsLabel = document.getElementById('adsLabel');

    if (toggleAds) {
        toggleAds.addEventListener('change', async () => {
            if (toggleAds.checked) {
                adsContent.classList.add('active');
                adsLabel.textContent = 'Actif';
                adsLabel.style.color = '#00e676';
            } else {
                adsContent.classList.remove('active');
                adsLabel.textContent = 'Inactif';
                adsLabel.style.color = '#ff4757';
            }

            // Sauvegarder dans Supabase
            if (isSupabaseConfigured) {
                try {
                    const settings = await AgentSettings.get('social');
                    const config = settings.config_json || {};
                    config.ads_enabled = toggleAds.checked;
                    await AgentSettings.update('social', { config_json: config });
                } catch (e) { console.error(e); }
            }
        });
    }

    // ===== CHATBOT DEADPOOL IA =====
    const chatbotToggle = document.getElementById('chatbotToggle');
    const chatbotPanel = document.getElementById('chatbotPanel');
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');
    const chatMessages = document.getElementById('chatMessages');

    chatbotToggle.addEventListener('click', () => {
        chatbotPanel.classList.toggle('open');
        if (chatbotPanel.classList.contains('open')) {
            chatInput.focus();
        }
    });

    function addChatMsg(text, type) {
        const msg = document.createElement('div');
        msg.className = `chat-msg ${type}`;
        msg.textContent = text;
        chatMessages.appendChild(msg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTyping() {
        const typing = document.createElement('div');
        typing.className = 'chat-typing';
        typing.id = 'chatTyping';
        typing.innerHTML = '<span></span><span></span><span></span>';
        chatMessages.appendChild(typing);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return typing;
    }

    async function sendChat() {
        const text = chatInput.value.trim();
        if (!text) return;

        addChatMsg(text, 'user');
        chatInput.value = '';

        const typing = showTyping();

        try {
            let response;
            if (isSupabaseConfigured) {
                response = await Chatbot.sendMessage(text);
            } else {
                // Fallback local
                await new Promise(r => setTimeout(r, 800 + Math.random() * 800));
                response = Chatbot.localFallback(text);
            }
            typing.remove();
            addChatMsg(response, 'bot');
        } catch (e) {
            typing.remove();
            addChatMsg("Désolé, je rencontre un problème technique. Réessaie dans un instant ! 🔧", 'bot');
        }
    }

    chatSend.addEventListener('click', sendChat);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChat();
    });

    // ===== CLIENT DETAIL MODAL =====
    const modalClientDetail = document.getElementById('modalClientDetail');

    function openClientDetail() {
        if (modalClientDetail) {
            modalClientDetail.style.display = 'flex';
            requestAnimationFrame(() => modalClientDetail.classList.add('open'));
        }
    }
    function closeClientDetail() {
        if (modalClientDetail) {
            modalClientDetail.classList.remove('open');
            setTimeout(() => modalClientDetail.style.display = 'none', 300);
        }
    }

    document.getElementById('modalClientDetailClose')?.addEventListener('click', closeClientDetail);
    modalClientDetail?.addEventListener('click', (e) => { if (e.target === modalClientDetail) closeClientDetail(); });

    window.viewClientDetail = async function(clientId) {
        searchResults?.classList.remove('open');

        let client;
        if (isSupabaseConfigured) {
            try {
                const { data } = await db.from('clients').select('*').eq('id', clientId).single();
                client = data;
            } catch (e) { console.error(e); return; }
        } else {
            client = demoClients.find(c => c.id === clientId);
        }
        if (!client) return;

        const typeLabels = { buyer: 'Acheteur', seller: 'Vendeur', both: 'Acheteur/Vendeur' };
        const initials = (client.first_name?.[0] || '') + (client.last_name?.[0] || '');

        document.getElementById('clientDetailName').textContent = `${client.first_name} ${client.last_name}`;
        document.getElementById('clientDetailAvatar').textContent = initials;
        document.getElementById('clientDetailAvatar').dataset.clientId = client.id;
        document.getElementById('clientDetailType').textContent = typeLabels[client.client_type] || client.client_type;
        document.getElementById('clientDetailEmail').innerHTML = client.email ? `<a href="mailto:${client.email}" style="color:var(--gold)">${client.email}</a>` : '—';
        document.getElementById('clientDetailPhone').innerHTML = client.phone ? `<a href="tel:${client.phone}" style="color:var(--gold)">${client.phone}</a>` : '—';
        document.getElementById('clientDetailBirthday').textContent = client.birthday ? new Date(client.birthday).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
        document.getElementById('clientDetailProperty').textContent = client.property_interest || '—';
        document.getElementById('clientDetailBudget').textContent = client.budget ? client.budget.toLocaleString('fr-FR') + ' €' : '—';
        document.getElementById('clientDetailStatus').innerHTML = `<span class="status-badge ${client.status === 'active' ? 'qualified' : 'in-progress'}">${client.status === 'active' ? 'Actif' : client.status === 'prospect' ? 'Prospect' : 'Clôturé'}</span>`;
        document.getElementById('clientDetailNotes').textContent = client.notes || '—';

        // Bouton email
        document.getElementById('btnClientEmail')?.addEventListener('click', () => {
            if (client.email) window.open(`mailto:${client.email}`, '_blank');
        });

        // Bouton RDV — ouvre le modal RDV pré-rempli
        document.getElementById('btnClientRDV')?.addEventListener('click', () => {
            closeClientDetail();
            const rdvTitle = document.getElementById('rdvTitle');
            if (rdvTitle) rdvTitle.value = `Visite — ${client.first_name} ${client.last_name}`;
            openModalRDV();
        });

        openClientDetail();
    };

    // Clic sur les boutons détail dans le tableau clients (mode démo)
    document.querySelectorAll('.btn-client-view').forEach((btn, index) => {
        btn.addEventListener('click', () => {
            const clientId = demoClients[index]?.id;
            if (clientId) viewClientDetail(clientId);
        });
    });

    // ===== DELETE CLIENT (avec confirmation) =====
    const modalConfirmDelete = document.getElementById('modalConfirmDelete');
    let deletingClientId = null;
    let deletingClientName = '';

    function openConfirmDelete() {
        if (modalConfirmDelete) {
            modalConfirmDelete.style.display = 'flex';
            requestAnimationFrame(() => modalConfirmDelete.classList.add('open'));
        }
    }
    function closeConfirmDelete() {
        if (modalConfirmDelete) {
            modalConfirmDelete.classList.remove('open');
            setTimeout(() => modalConfirmDelete.style.display = 'none', 300);
        }
    }

    document.getElementById('modalConfirmDeleteClose')?.addEventListener('click', closeConfirmDelete);
    document.getElementById('btnCancelDelete')?.addEventListener('click', closeConfirmDelete);
    modalConfirmDelete?.addEventListener('click', (e) => { if (e.target === modalConfirmDelete) closeConfirmDelete(); });

    // Bouton supprimer dans la fiche client
    document.getElementById('btnClientDelete')?.addEventListener('click', () => {
        const nameEl = document.getElementById('clientDetailName');
        deletingClientName = nameEl ? nameEl.textContent : '';
        // Récupérer l'ID du client actuellement affiché
        const avatarEl = document.getElementById('clientDetailAvatar');
        if (avatarEl && avatarEl.dataset.clientId) {
            deletingClientId = avatarEl.dataset.clientId;
        }
        document.getElementById('deleteClientName').textContent = deletingClientName;
        closeClientDetail();
        setTimeout(openConfirmDelete, 350);
    });

    // Confirmation de suppression
    document.getElementById('btnConfirmDelete')?.addEventListener('click', async () => {
        const btn = document.getElementById('btnConfirmDelete');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Suppression...';
        btn.disabled = true;

        try {
            if (isSupabaseConfigured && deletingClientId) {
                await db.from('clients').delete().eq('id', deletingClientId);
            } else {
                // Mode démo : supprimer du tableau local
                const idx = demoClients.findIndex(c => c.id === deletingClientId);
                if (idx !== -1) {
                    demoClients.splice(idx, 1);
                    // Supprimer la ligne du tableau HTML
                    const rows = document.querySelectorAll('#page-clients .contacts-table tbody tr');
                    if (rows[idx]) rows[idx].remove();
                }
                await new Promise(r => setTimeout(r, 400));
            }

            closeConfirmDelete();
            showToast('Client supprimé', `${deletingClientName} a été supprimé avec succès`, 'success');

            // Recharger les données si Supabase
            if (isSupabaseConfigured) {
                loadClientsData?.();
            }

        } catch (err) {
            console.error('Delete error:', err);
            showToast('Erreur', 'Impossible de supprimer le client', 'error');
        } finally {
            btn.innerHTML = '<i class="fas fa-trash-alt"></i> Supprimer définitivement';
            btn.disabled = false;
            deletingClientId = null;
        }
    });

    // ===== EXPORT CSV COMPTABILITÉ =====
    const btnExportCSV = document.getElementById('btnExportCSV');
    if (btnExportCSV) {
        btnExportCSV.addEventListener('click', async () => {
            btnExportCSV.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Export...';
            btnExportCSV.disabled = true;

            try {
                let sales;
                if (isSupabaseConfigured) {
                    sales = await Sales.list({ limit: 500 });
                } else {
                    // Données démo
                    sales = [
                        { sale_date: '2026-03-28', property_name: 'T2 Centre-ville', sale_price: 145000, commission_amount: 4350, status: 'paid' },
                        { sale_date: '2026-03-15', property_name: 'Maison Olivet', sale_price: 320000, commission_amount: 9600, status: 'paid' },
                        { sale_date: '2026-03-08', property_name: 'T3 Saint-Marceau', sale_price: 185000, commission_amount: 5550, status: 'pending' },
                        { sale_date: '2026-02-22', property_name: 'T4 rue Royale', sale_price: 275000, commission_amount: 8250, status: 'paid' },
                        { sale_date: '2026-02-10', property_name: 'Studio La Source', sale_price: 95000, commission_amount: 2850, status: 'paid' },
                        { sale_date: '2026-01-28', property_name: 'T3 rue de Bourgogne', sale_price: 210000, commission_amount: 6300, status: 'paid' },
                        { sale_date: '2026-01-15', property_name: 'T2 La Chapelle', sale_price: 128000, commission_amount: 3840, status: 'paid' },
                        { sale_date: '2026-01-05', property_name: 'Maison Saint-Jean', sale_price: 350000, commission_amount: 10500, status: 'paid' }
                    ];
                    await new Promise(r => setTimeout(r, 400));
                }

                // Générer CSV
                const headers = ['Date', 'Bien', 'Prix de vente', 'Commission', 'URSSAF (22%)', 'Bénéfice net', 'Statut'];
                const rows = sales.map(s => {
                    const urssaf = (s.commission_amount || 0) * 0.22;
                    const net = (s.commission_amount || 0) - urssaf;
                    const statusLabel = s.status === 'paid' ? 'Encaissée' : s.status === 'pending' ? 'En attente' : 'Annulée';
                    return [
                        s.sale_date,
                        `"${s.property_name}"`,
                        s.sale_price,
                        s.commission_amount || 0,
                        urssaf.toFixed(2),
                        net.toFixed(2),
                        statusLabel
                    ].join(';');
                });

                // Totaux
                const totalCA = sales.reduce((sum, s) => sum + (s.sale_price || 0), 0);
                const totalComm = sales.reduce((sum, s) => sum + (s.commission_amount || 0), 0);
                const totalUrssaf = totalComm * 0.22;
                const totalNet = totalComm - totalUrssaf;
                rows.push('');
                rows.push(['TOTAL', '', totalCA, totalComm, totalUrssaf.toFixed(2), totalNet.toFixed(2), ''].join(';'));

                const csv = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');

                // Télécharger
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const now = new Date();
                a.href = url;
                a.download = `visit-and-smile_ventes_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.csv`;
                a.click();
                URL.revokeObjectURL(url);

                if (typeof showToast === 'function') showToast('Export réussi', `${sales.length} ventes exportées en CSV`, 'success');
                btnExportCSV.innerHTML = '<i class="fas fa-check"></i> Exporté !';
                btnExportCSV.style.borderColor = 'var(--green)';
                btnExportCSV.style.color = 'var(--green)';

                setTimeout(() => {
                    btnExportCSV.innerHTML = '<i class="fas fa-download"></i> Export CSV';
                    btnExportCSV.style.borderColor = '';
                    btnExportCSV.style.color = '';
                    btnExportCSV.disabled = false;
                }, 2000);

            } catch (err) {
                console.error('Export error:', err);
                btnExportCSV.innerHTML = '<i class="fas fa-times"></i> Erreur';
                setTimeout(() => {
                    btnExportCSV.innerHTML = '<i class="fas fa-download"></i> Export CSV';
                    btnExportCSV.disabled = false;
                }, 2000);
            }
        });
    }

    // ===== EXPORT CLIENTS CSV =====
    const btnExportClients = document.getElementById('btnExportClients');
    if (btnExportClients) {
        btnExportClients.addEventListener('click', async () => {
            btnExportClients.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Export...';
            btnExportClients.disabled = true;

            try {
                let clients;
                if (isSupabaseConfigured) {
                    const { data } = await db.from('clients').select('*').order('last_name');
                    clients = data;
                } else {
                    clients = demoClients;
                    await new Promise(r => setTimeout(r, 400));
                }

                const typeLabels = { buyer: 'Acheteur', seller: 'Vendeur', both: 'Acheteur/Vendeur' };
                const headers = ['Prénom', 'Nom', 'Type', 'Email', 'Téléphone', 'Bien recherché', 'Budget', 'Anniversaire', 'Statut', 'Notes'];
                const rows = clients.map(c => [
                    `"${c.first_name || ''}"`,
                    `"${c.last_name || ''}"`,
                    typeLabels[c.client_type] || c.client_type || '',
                    c.email || '',
                    c.phone || '',
                    `"${c.property_interest || ''}"`,
                    c.budget || '',
                    c.birthday || '',
                    c.status === 'active' ? 'Actif' : c.status === 'prospect' ? 'Prospect' : 'Clôturé',
                    `"${(c.notes || '').replace(/"/g, '""')}"`
                ].join(';'));

                const csv = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const now = new Date();
                a.href = url;
                a.download = `visit-and-smile_clients_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.csv`;
                a.click();
                URL.revokeObjectURL(url);

                if (typeof showToast === 'function') showToast('Export réussi', `${clients.length} clients exportés en CSV`, 'success');
                btnExportClients.innerHTML = '<i class="fas fa-check"></i> Exporté !';
                btnExportClients.style.borderColor = 'var(--green)';
                btnExportClients.style.color = 'var(--green)';

                setTimeout(() => {
                    btnExportClients.innerHTML = '<i class="fas fa-download"></i> Export clients';
                    btnExportClients.style.borderColor = '';
                    btnExportClients.style.color = '';
                    btnExportClients.disabled = false;
                }, 2000);

            } catch (err) {
                console.error('Client export error:', err);
                btnExportClients.innerHTML = '<i class="fas fa-times"></i> Erreur';
                setTimeout(() => {
                    btnExportClients.innerHTML = '<i class="fas fa-download"></i> Export clients';
                    btnExportClients.disabled = false;
                }, 2000);
            }
        });
    }

    // ===== NOTIFICATIONS DYNAMIQUES =====
    const notifList = document.querySelector('.notif-list');
    const notifDot = document.querySelector('.notif-dot');

    async function loadNotifications() {
        if (isSupabaseConfigured) {
            try {
                const activities = await ActivityFeed.list(10);
                if (notifList && activities.length) {
                    notifList.innerHTML = activities.map((a, i) => `
                        <div class="notif-item ${i < 3 ? 'unread' : ''}">
                            <div class="notif-icon ${a.agent === 'compta' ? 'leads' : a.agent === 'social' ? 'social' : 'followup'}">
                                <i class="fas ${a.icon || 'fa-robot'}"></i>
                            </div>
                            <div class="notif-content">
                                <p>${a.message}</p>
                                <span class="notif-time">${Utils.timeAgo(a.created_at)}</span>
                            </div>
                        </div>
                    `).join('');
                }
            } catch (e) { console.error('Notif load error:', e); }
        }
        // En mode démo les notifications sont déjà en dur dans le HTML
    }

    // Charger les notifications au démarrage (après login)
    setTimeout(loadNotifications, 2000);

    // Marquer tout comme lu
    const markAllReadBtn = document.querySelector('.notif-header .btn-outline');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', () => {
            document.querySelectorAll('.notif-item.unread').forEach(item => {
                item.classList.remove('unread');
            });
            if (notifDot) notifDot.style.display = 'none';
        });
    }

    // ===== EDIT POST (complétion du TODO) =====
    window.editPost = async function(postId) {
        let post;
        if (isSupabaseConfigured) {
            try {
                const { data } = await db.from('social_posts').select('*').eq('id', postId).single();
                post = data;
            } catch (e) { console.error(e); return; }
        }
        if (!post) return;

        // Ouvrir le modal post et pré-remplir
        document.getElementById('postPlatform').value = post.platform || 'instagram';
        document.getElementById('postContent').value = post.content_text || '';
        document.getElementById('postHashtags').value = (post.hashtags || []).join(' ');
        if (post.scheduled_at) {
            const dt = new Date(post.scheduled_at);
            document.getElementById('postSchedule').value = dt.toISOString().slice(0, 16);
        }
        openModalPost();
    };

    // ===== TOAST NOTIFICATION SYSTEM =====
    const toastContainer = document.getElementById('toastContainer');

    window.showToast = function(title, message, type = 'info', duration = 4000) {
        const iconMap = {
            success: 'fa-check',
            error: 'fa-times',
            info: 'fa-info',
            warning: 'fa-exclamation'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon"><i class="fas ${iconMap[type] || 'fa-info'}"></i></div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
            <button class="toast-close" onclick="this.closest('.toast').remove()"><i class="fas fa-times"></i></button>
            <div class="toast-progress"></div>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    };

    // ===== EDIT CLIENT MODAL =====
    const modalEditClient = document.getElementById('modalEditClient');
    const formEditClient = document.getElementById('formEditClient');
    let editingClientId = null;

    function openEditClient() {
        if (modalEditClient) {
            modalEditClient.style.display = 'flex';
            requestAnimationFrame(() => modalEditClient.classList.add('open'));
        }
    }
    function closeEditClient() {
        if (modalEditClient) {
            modalEditClient.classList.remove('open');
            setTimeout(() => modalEditClient.style.display = 'none', 300);
        }
    }

    document.getElementById('modalEditClientClose')?.addEventListener('click', closeEditClient);
    document.getElementById('modalEditClientCancel')?.addEventListener('click', closeEditClient);
    modalEditClient?.addEventListener('click', (e) => { if (e.target === modalEditClient) closeEditClient(); });

    // Bouton "Modifier" depuis la fiche détail
    document.getElementById('btnClientEdit')?.addEventListener('click', () => {
        // Récupérer le client courant depuis le détail affiché
        const name = document.getElementById('clientDetailName')?.textContent || '';
        const parts = name.split(' ');
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';

        // Trouver le client dans les données démo
        const client = demoClients.find(c => c.first_name === firstName && c.last_name === lastName);
        if (!client && !isSupabaseConfigured) return;

        editingClientId = client?.id || null;

        // Pré-remplir le formulaire
        document.getElementById('editClientId').value = editingClientId || '';
        document.getElementById('editClientFirstName').value = client?.first_name || firstName;
        document.getElementById('editClientLastName').value = client?.last_name || lastName;
        document.getElementById('editClientEmail').value = client?.email || '';
        document.getElementById('editClientPhone').value = client?.phone || '';
        document.getElementById('editClientType').value = client?.client_type || 'buyer';
        document.getElementById('editClientStatus').value = client?.status || 'active';
        document.getElementById('editClientProperty').value = client?.property_interest || '';
        document.getElementById('editClientBudget').value = client?.budget || '';
        document.getElementById('editClientBirthday').value = client?.birthday || '';
        document.getElementById('editClientNotes').value = client?.notes || '';

        closeClientDetail();
        openEditClient();
    });

    if (formEditClient) {
        formEditClient.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = formEditClient.querySelector('.btn-gold');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';

            try {
                const updates = {
                    first_name: document.getElementById('editClientFirstName').value,
                    last_name: document.getElementById('editClientLastName').value,
                    email: document.getElementById('editClientEmail').value || null,
                    phone: document.getElementById('editClientPhone').value || null,
                    client_type: document.getElementById('editClientType').value,
                    status: document.getElementById('editClientStatus').value,
                    property_interest: document.getElementById('editClientProperty').value || null,
                    budget: parseFloat(document.getElementById('editClientBudget').value.replace(/[^0-9]/g, '')) || null,
                    birthday: document.getElementById('editClientBirthday').value || null,
                    notes: document.getElementById('editClientNotes').value || null
                };

                if (isSupabaseConfigured && editingClientId) {
                    await Clients.update(editingClientId, updates);
                } else {
                    // Mode démo — mettre à jour localement
                    await new Promise(r => setTimeout(r, 600));
                    const idx = demoClients.findIndex(c => c.id === editingClientId);
                    if (idx !== -1) {
                        Object.assign(demoClients[idx], updates);
                    }
                }

                btn.innerHTML = '<i class="fas fa-check"></i> Modifié !';
                btn.style.background = 'var(--green)';

                showToast('Client modifié', `${updates.first_name} ${updates.last_name} a été mis à jour`, 'success');

                setTimeout(() => {
                    closeEditClient();
                    btn.innerHTML = '<i class="fas fa-save"></i> Enregistrer';
                    btn.style.background = '';
                    if (isSupabaseConfigured) loadClientsData();
                }, 1000);

            } catch (err) {
                console.error('Edit client error:', err);
                btn.innerHTML = '<i class="fas fa-times"></i> Erreur';
                btn.style.background = 'var(--red)';
                showToast('Erreur', 'Impossible de modifier le client', 'error');
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-save"></i> Enregistrer';
                    btn.style.background = '';
                }, 2000);
            }
        });
    }

    // ===== AJOUTER CLIENTS.UPDATE AU SERVICE LAYER (si manquant) =====
    if (typeof Clients !== 'undefined' && !Clients.update) {
        Clients.update = async function(id, updates) {
            const { data, error } = await db.from('clients').update(updates).eq('id', id).select().single();
            if (error) throw error;
            return data;
        };
    }

    // ===== INTÉGRER LES TOASTS DANS LES ACTIONS EXISTANTES =====
    // Override les boutons pour ajouter des toasts

    // Toast après sauvegarde vente
    const origFormVente = formVente;
    if (origFormVente) {
        const origHandler = origFormVente.onsubmit;
        // Le toast est déclenché par les handlers existants via le feedback visuel
        // On ajoute un observer pour détecter le feedback "Vente enregistrée"
    }

    // ===== OFFLINE / ONLINE DETECTION =====
    const offlineBanner = document.getElementById('offlineBanner');

    function updateOnlineStatus() {
        if (!navigator.onLine) {
            offlineBanner?.classList.add('visible');
            showToast('Hors-ligne', 'Connexion internet perdue', 'warning');
        } else {
            offlineBanner?.classList.remove('visible');
        }
    }

    window.addEventListener('online', () => {
        offlineBanner?.classList.remove('visible');
        showToast('Reconnecté', 'Connexion internet rétablie', 'success');
    });

    window.addEventListener('offline', () => {
        offlineBanner?.classList.add('visible');
        showToast('Hors-ligne', 'Connexion internet perdue', 'warning');
    });

    // ===== DASHBOARD AGENT CARDS → NAVIGATION =====
    document.querySelectorAll('.agent-card').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            // Ne pas naviguer si on clique sur le toggle
            if (e.target.closest('.toggle-switch')) return;

            const title = card.querySelector('h4')?.textContent?.toLowerCase() || '';
            if (title.includes('comptable')) navigateTo('agent-compta');
            else if (title.includes('social') || title.includes('réseaux')) navigateTo('agent-social');
            else if (title.includes('planning')) navigateTo('agent-planning');
        });
    });

    // ===== MINI CALENDAR =====
    const calDays = document.getElementById('calDays');
    const calMonthLabel = document.getElementById('calMonthLabel');
    const calAgendaDate = document.getElementById('calAgendaDate');
    const calAgendaList = document.getElementById('calAgendaList');
    let calYear = new Date().getFullYear();
    let calMonth = new Date().getMonth();
    let calSelectedDate = null;

    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

    // RDV data for calendar dots (uses demoAppointments or Supabase)
    function getCalendarRDV() {
        return demoAppointments; // In production mode, this would come from Supabase
    }

    function renderCalendar() {
        if (!calDays) return;

        calMonthLabel.textContent = `${monthNames[calMonth]} ${calYear}`;

        const firstDay = new Date(calYear, calMonth, 1);
        const lastDay = new Date(calYear, calMonth + 1, 0);
        const startWeekday = (firstDay.getDay() + 6) % 7; // Monday = 0
        const daysInMonth = lastDay.getDate();
        const prevMonthLast = new Date(calYear, calMonth, 0).getDate();

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        // Get RDV dates for dots
        const rdvs = getCalendarRDV();
        const rdvDates = new Set(rdvs.map(r => r.date_time.split('T')[0]));

        let html = '';

        // Previous month trailing days
        for (let i = startWeekday - 1; i >= 0; i--) {
            html += `<div class="mini-cal-day other-month">${prevMonthLast - i}</div>`;
        }

        // Current month days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const isSelected = calSelectedDate === dateStr;
            const hasRDV = rdvDates.has(dateStr);

            const classes = ['mini-cal-day'];
            if (isToday) classes.push('today');
            if (isSelected) classes.push('selected');
            if (hasRDV) classes.push('has-rdv');

            html += `<div class="${classes.join(' ')}" data-date="${dateStr}">${d}</div>`;
        }

        // Next month leading days
        const totalCells = startWeekday + daysInMonth;
        const remaining = (7 - (totalCells % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            html += `<div class="mini-cal-day other-month">${i}</div>`;
        }

        calDays.innerHTML = html;

        // Click handlers
        calDays.querySelectorAll('.mini-cal-day:not(.other-month)').forEach(el => {
            el.addEventListener('click', () => {
                calSelectedDate = el.dataset.date;
                renderCalendar();
                showAgendaForDate(calSelectedDate);
            });
        });
    }

    function showAgendaForDate(dateStr) {
        if (!calAgendaList) return;

        const d = new Date(dateStr);
        calAgendaDate.textContent = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

        const rdvs = getCalendarRDV().filter(r => r.date_time.startsWith(dateStr));

        if (rdvs.length === 0) {
            calAgendaList.innerHTML = '<p class="mini-cal-empty">Aucun rendez-vous ce jour</p>';
            return;
        }

        calAgendaList.innerHTML = rdvs.map(r => {
            const time = new Date(r.date_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            return `
                <div class="mini-cal-rdv ${r.type || ''}">
                    <div class="mini-cal-rdv-time">${time}</div>
                    <div class="mini-cal-rdv-info">
                        <div class="mini-cal-rdv-title">${r.title}</div>
                        <div class="mini-cal-rdv-client">${r.client_name || '—'} ${r.location ? '· ' + r.location : ''}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Navigation
    document.getElementById('calPrev')?.addEventListener('click', () => {
        calMonth--;
        if (calMonth < 0) { calMonth = 11; calYear--; }
        renderCalendar();
    });

    document.getElementById('calNext')?.addEventListener('click', () => {
        calMonth++;
        if (calMonth > 11) { calMonth = 0; calYear++; }
        renderCalendar();
    });

    // Initial render
    renderCalendar();

    // ===== CHART ANIMATION ON LOAD =====
    setTimeout(() => {
        document.querySelectorAll('.chart-bar').forEach(bar => {
            const h = bar.style.height;
            bar.style.height = '0%';
            requestAnimationFrame(() => {
                bar.style.height = h;
            });
        });
        document.querySelectorAll('.progress-mini-fill').forEach(fill => {
            const w = fill.style.width;
            fill.style.width = '0%';
            requestAnimationFrame(() => {
                fill.style.width = w;
            });
        });
    }, 500);

    console.log('🤖 Deadpool IA initialized — Mode:', isSupabaseConfigured ? 'PRODUCTION' : 'DEMO');
});
