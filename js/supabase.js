// ===== VISIT & SMILE — SUPABASE SERVICE LAYER =====

// Initialisation Supabase avec options sécurisées
const db = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false  // Désactiver la détection d'URL pour éviter les attaques par token dans l'URL
    }
});

// ===== AUTH =====
const Auth = {
    async signIn(email, password) {
        const { data, error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    },

    async signOut() {
        const { error } = await db.auth.signOut();
        if (error) throw error;
    },

    async getSession() {
        const { data: { session } } = await db.auth.getSession();
        return session;
    },

    async getUser() {
        const { data: { user } } = await db.auth.getUser();
        return user;
    },

    onAuthStateChange(callback) {
        return db.auth.onAuthStateChange(callback);
    }
};

// ===== PROFILE =====
const Profile = {
    async get() {
        const { data, error } = await db
            .from('profiles')
            .select('*')
            .single();
        if (error) throw error;
        return data;
    },

    async update(updates) {
        const user = await Auth.getUser();
        const { data, error } = await db
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }
};

// ===== SALES (VENTES) =====
const Sales = {
    async list(filters = {}) {
        let query = db.from('sales').select('*').order('sale_date', { ascending: false });

        if (filters.month) {
            const start = new Date(filters.month);
            const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
            query = query.gte('sale_date', start.toISOString().split('T')[0])
                         .lte('sale_date', end.toISOString().split('T')[0]);
        }
        if (filters.quarter) {
            const year = parseInt(filters.quarter.split('Q')[1] ? filters.quarter.split('_')[0] : new Date().getFullYear());
            const q = parseInt(filters.quarter.replace(/\D/g, ''));
            const startMonth = (q - 1) * 3;
            const start = `${year}-${String(startMonth + 1).padStart(2, '0')}-01`;
            const end = `${year}-${String(startMonth + 3).padStart(2, '0')}-${startMonth + 3 === 12 ? 31 : 30}`;
            query = query.gte('sale_date', start).lte('sale_date', end);
        }
        if (filters.year) {
            query = query.gte('sale_date', `${filters.year}-01-01`).lte('sale_date', `${filters.year}-12-31`);
        }
        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.limit) {
            query = query.limit(filters.limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async create(sale) {
        const user = await Auth.getUser();
        const { data, error } = await db
            .from('sales')
            .insert({ ...sale, user_id: user.id })
            .select()
            .single();
        if (error) throw error;

        // Notifier n8n
        try {
            await fetch(CONFIG.N8N_BASE_URL + CONFIG.WEBHOOKS.NEW_SALE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (e) {
            console.warn('n8n webhook failed:', e);
        }

        return data;
    },

    async update(id, updates) {
        const { data, error } = await db
            .from('sales')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async delete(id) {
        const { error } = await db.from('sales').delete().eq('id', id);
        if (error) throw error;
    }
};

// ===== DASHBOARD STATS =====
const Dashboard = {
    async getStats() {
        const user = await Auth.getUser();
        const { data, error } = await db.rpc('get_dashboard_stats', { p_user_id: user.id });
        if (error) throw error;
        return data;
    },

    async getCAByMonth() {
        const user = await Auth.getUser();
        const { data, error } = await db.rpc('get_ca_by_month', { p_user_id: user.id });
        if (error) throw error;
        return data;
    },

    async getSocialStats() {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const { data, error } = await db
            .from('social_posts')
            .select('engagement_likes, engagement_comments, engagement_shares, engagement_views')
            .gte('published_at', monthStart)
            .eq('status', 'published');
        if (error) throw error;

        const totals = (data || []).reduce((acc, p) => ({
            views: acc.views + (p.engagement_views || 0),
            likes: acc.likes + (p.engagement_likes || 0),
            comments: acc.comments + (p.engagement_comments || 0),
            shares: acc.shares + (p.engagement_shares || 0),
        }), { views: 0, likes: 0, comments: 0, shares: 0 });

        totals.engagement = totals.likes + totals.comments + totals.shares;
        return totals;
    },

    async getUpcomingAppointmentsCount() {
        const { count, error } = await db
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .gte('start_time', new Date().toISOString())
            .neq('status', 'cancelled');
        if (error) throw error;
        return count;
    }
};

// ===== CLIENTS =====
const Clients = {
    async list(filters = {}) {
        let query = db.from('clients').select('*').order('created_at', { ascending: false });
        if (filters.status) query = query.eq('status', filters.status);
        if (filters.type) query = query.eq('client_type', filters.type);
        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async create(client) {
        const user = await Auth.getUser();
        const { data, error } = await db
            .from('clients')
            .insert({ ...client, user_id: user.id })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async update(id, updates) {
        const { data, error } = await db
            .from('clients')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async delete(id) {
        const { error } = await db.from('clients').delete().eq('id', id);
        if (error) throw error;
    },

    async getUpcomingBirthdays(days = 30) {
        const { data, error } = await db.from('clients').select('*').not('birthday', 'is', null);
        if (error) throw error;

        const now = new Date();
        return (data || []).filter(c => {
            const bday = new Date(c.birthday);
            const next = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
            if (next < now) next.setFullYear(next.getFullYear() + 1);
            const diff = (next - now) / (1000 * 60 * 60 * 24);
            return diff <= days;
        }).sort((a, b) => {
            const da = new Date(a.birthday), db2 = new Date(b.birthday);
            const na = new Date(now.getFullYear(), da.getMonth(), da.getDate());
            const nb = new Date(now.getFullYear(), db2.getMonth(), db2.getDate());
            if (na < now) na.setFullYear(na.getFullYear() + 1);
            if (nb < now) nb.setFullYear(nb.getFullYear() + 1);
            return na - nb;
        });
    }
};

// ===== APPOINTMENTS =====
const Appointments = {
    async list(filters = {}) {
        let query = db.from('appointments').select('*, clients(first_name, last_name)').order('start_time', { ascending: true });
        if (filters.upcoming) {
            query = query.gte('start_time', new Date().toISOString()).neq('status', 'cancelled');
        }
        if (filters.limit) query = query.limit(filters.limit);
        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async create(appointment) {
        const user = await Auth.getUser();
        const { data, error } = await db
            .from('appointments')
            .insert({ ...appointment, user_id: user.id })
            .select()
            .single();
        if (error) throw error;

        try {
            await fetch(CONFIG.N8N_BASE_URL + CONFIG.WEBHOOKS.NEW_APPOINTMENT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (e) {
            console.warn('n8n webhook failed:', e);
        }

        return data;
    },

    async update(id, updates) {
        const { data, error } = await db
            .from('appointments')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async delete(id) {
        const { error } = await db.from('appointments').delete().eq('id', id);
        if (error) throw error;
    }
};

// ===== SOCIAL POSTS =====
const SocialPosts = {
    async list(filters = {}) {
        let query = db.from('social_posts').select('*').order('scheduled_at', { ascending: true });
        if (filters.status) query = query.eq('status', filters.status);
        if (filters.platform) query = query.eq('platform', filters.platform);
        if (filters.upcoming) {
            query = query.in('status', ['draft', 'scheduled', 'approved']).gte('scheduled_at', new Date().toISOString());
        }
        if (filters.limit) query = query.limit(filters.limit);
        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async create(post) {
        const user = await Auth.getUser();
        const { data, error } = await db
            .from('social_posts')
            .insert({ ...post, user_id: user.id })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async update(id, updates) {
        const { data, error } = await db
            .from('social_posts')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async approve(id) {
        return this.update(id, { status: 'approved' });
    },

    async publish(id) {
        const post = await this.update(id, { status: 'published', published_at: new Date().toISOString() });
        try {
            await fetch(CONFIG.N8N_BASE_URL + CONFIG.WEBHOOKS.PUBLISH_POST, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(post)
            });
        } catch (e) {
            console.warn('n8n webhook failed:', e);
        }
        return post;
    }
};

// ===== SOCIAL CONFIG =====
const SocialConfig = {
    async list() {
        const { data, error } = await db.from('social_config').select('*').order('platform');
        if (error) throw error;
        return data;
    },

    async update(platform, updates) {
        const user = await Auth.getUser();
        const { data, error } = await db
            .from('social_config')
            .update(updates)
            .eq('user_id', user.id)
            .eq('platform', platform)
            .select()
            .single();
        if (error) throw error;
        return data;
    }
};

// ===== DECLARATIONS =====
const Declarations = {
    async list() {
        const { data, error } = await db.from('declarations').select('*').order('due_date', { ascending: true });
        if (error) throw error;
        return data;
    },

    async update(id, updates) {
        const { data, error } = await db
            .from('declarations')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }
};

// ===== ACTIVITY FEED =====
const ActivityFeed = {
    async list(limit = 10) {
        const { data, error } = await db
            .from('activity_feed')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data;
    },

    subscribeRealtime(callback) {
        return db
            .channel('activity_feed_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_feed' }, (payload) => {
                callback(payload.new);
            })
            .subscribe();
    }
};

// ===== AGENT SETTINGS =====
const AgentSettings = {
    async get(agentName) {
        const { data, error } = await db
            .from('agent_settings')
            .select('*')
            .eq('agent_name', agentName)
            .single();
        if (error) throw error;
        return data;
    },

    async update(agentName, updates) {
        const user = await Auth.getUser();
        const { data, error } = await db
            .from('agent_settings')
            .update(updates)
            .eq('user_id', user.id)
            .eq('agent_name', agentName)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async toggleAgent(agentName, enabled) {
        return this.update(agentName, { enabled, updated_at: new Date().toISOString() });
    }
};

// ===== RELANCE SEQUENCES =====
const Sequences = {
    async list() {
        const { data, error } = await db.from('relance_sequences').select('*').order('created_at');
        if (error) throw error;
        return data;
    },

    async update(id, updates) {
        const { data, error } = await db
            .from('relance_sequences')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }
};

// ===== SPECIAL OCCASIONS =====
const Occasions = {
    async list() {
        const { data, error } = await db.from('special_occasions').select('*').order('occasion_type');
        if (error) throw error;
        return data;
    },

    async toggle(id, enabled) {
        const { data, error } = await db
            .from('special_occasions')
            .update({ enabled })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }
};

// ===== CHATBOT =====
const Chatbot = {
    async sendMessage(message) {
        try {
            const response = await fetch(CONFIG.N8N_BASE_URL + CONFIG.WEBHOOKS.CHATBOT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    user_id: (await Auth.getUser())?.id,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) throw new Error('Chatbot request failed');
            const data = await response.json();
            return data.response || data.message || data.text || "Je n'ai pas compris, peux-tu reformuler ?";
        } catch (e) {
            console.warn('Chatbot fallback to local:', e);
            return this.localFallback(message);
        }
    },

    // Fallback local si n8n n'est pas encore configuré
    localFallback(msg) {
        const lower = msg.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const responses = [
            // Salutations
            { keys: ['bonjour', 'salut', 'hello', 'coucou', 'hey'], response: "Salut Alison ! Prête à conquérir le marché orléanais aujourd'hui ? Comment je peux t'aider ? 😊" },
            { keys: ['bonsoir'], response: "Bonsoir Alison ! Encore au boulot ? Tu es vraiment la meilleure agent de la ville ! 🌙" },
            { keys: ['ca va', 'comment ca va', 'comment vas'], response: "Au top ! J'ai vérifié tes stats et tout roule : 8 ventes ce mois, 12.4k de CA ! Et toi, ça va ? 💪" },

            // RDV & Planning
            { keys: ['rdv', 'rendez-vous', 'planning', 'visite'], response: "Tes prochains RDV sont sur la page Planning & RDV. Tu as 3 visites confirmées cette semaine ! Tu veux que je t'en programme un nouveau ? 📅" },
            { keys: ['aujourd\'hui', 'programme', 'journee'], response: "Aujourd'hui tu as 3 RDV confirmés. Marie Dupont à 14h30, Jean Petit demain matin. Ta journée va être productive ! ✨" },
            { keys: ['demain'], response: "Demain tu as une visite avec Jean Petit pour le T2 Centre-ville, et un RDV signature avec Paul Leblanc ! 📋" },

            // Ventes & Compta
            { keys: ['vente', 'vendre'], response: "Tu veux enregistrer une nouvelle vente ? Va sur Comptabilité → 'Nouvelle vente'. Ton CA ce mois est déjà à 12.4k, impressionnant ! 💰" },
            { keys: ['urssaf', 'declaration', 'impot'], response: "Ta prochaine déclaration URSSAF Q2 est avant le 15 avril. Tu as 3 déclarations à jour et 1 en attente. Va sur Comptabilité pour le détail. 📋" },
            { keys: ['commission', 'combien', 'gagn'], response: "Ce mois : 12 400€ de CA, 8 700€ net après URSSAF (22%). Ta marge nette est à 68%, c'est excellent ! 📊" },
            { keys: ['chiffre', 'ca', 'bilan'], response: "Ton bilan est top : 12.4k€ de CA ce mois (+18% vs mois dernier), 8 ventes réalisées, marge nette 68%. Continue comme ça ! 🚀" },
            { keys: ['export', 'csv', 'excel'], response: "Pour exporter tes données, va sur Comptabilité et clique sur 'Export CSV'. Tu auras toutes tes ventes avec commissions et URSSAF ! 📥" },

            // Réseaux sociaux
            { keys: ['post', 'instagram', 'facebook', 'reseau', 'social', 'publier'], response: "Tes réseaux sociaux cartonnent : 18.7k impressions et 4.8% d'engagement ! Tu as 3 posts prêts à approuver sur la page Réseaux Sociaux. 📱" },
            { keys: ['tiktok'], response: "TikTok n'est pas encore connecté. Va dans Réseaux Sociaux et clique sur 'Connecter' sur la carte TikTok pour commencer ! 🎬" },
            { keys: ['linkedin'], response: "LinkedIn marche bien pour toi ! Tes posts expertise marché touchent les investisseurs et pros immo. 3 posts/semaine c'est le bon rythme. 💼" },
            { keys: ['hashtag'], response: "Tes hashtags par défaut : #immobilier #orleans #visitandsmile #appartement #maison. Tu peux les personnaliser dans Réseaux Sociaux. #️⃣" },

            // Clients
            { keys: ['client', 'acheteur', 'vendeur'], response: "Tu as 5 clients actifs en ce moment. Marie Dupont (T3 Saint-Marceau), Jean Petit (T2 Centre-ville), Paul Leblanc (T4 Olivet)... Va sur Clients pour la liste complète. 👥" },
            { keys: ['marie', 'dupont'], response: "Marie Dupont cherche un T3 à Saint-Marceau, budget 180k. Elle a un RDV visite demain à 14h30 ! 🏠" },
            { keys: ['paul', 'leblanc'], response: "Paul Leblanc est en phase de signature pour le T4 à Olivet (250k). Le compromis est prévu vendredi ! ✍️" },
            { keys: ['sophie', 'laurent'], response: "Sophie Laurent est vendeuse — sa Maison La Source (320k) est en cours d'estimation. Dernière activité il y a 2h. 🏡" },
            { keys: ['anniversaire', 'birthday'], response: "Paul Leblanc fête son anniversaire le 28 avril ! Un petit message personnalisé pourrait faire la différence. 🎂" },

            // Paramètres
            { keys: ['parametre', 'config', 'reglage'], response: "Tes paramètres sont dans la page Paramètres : infos perso, comptabilité, connexions API et notifications. 🔧" },
            { keys: ['notification'], response: "Tes notifications sont toutes activées : clients, RDV, posts, URSSAF, motivation, relances et anniversaires. Tu peux les gérer dans Paramètres. 🔔" },

            // Motivation
            { keys: ['motivation', 'encourage'], response: "Alison, tu es en train de construire quelque chose d'incroyable ! 8 ventes ce mois, des clients satisfaits, et tes réseaux qui explosent. Tu es au top ! 🌟" },
            { keys: ['fatigue', 'stress', 'dur'], response: "Hé, prends une pause ! Un bon café, 10 minutes de respiration. Tu as déjà accompli tellement ce mois. Rome ne s'est pas construite en un jour ! ☕" },
            { keys: ['objectif', 'goal'], response: "À ce rythme, tu vas atteindre 15k€ de CA ce mois ! Tu es à 82% de ton objectif. Encore 2-3 ventes et c'est dans la poche ! 🎯" },

            // Aide
            { keys: ['aide', 'help', 'quoi faire'], response: "Je peux t'aider avec : 📊 Tes stats & CA, 📅 Tes RDV, 📱 Tes réseaux sociaux, 💰 Tes ventes & commissions, 👥 Tes clients, 📋 Tes déclarations URSSAF. Que veux-tu savoir ?" },
            { keys: ['merci', 'super', 'genial', 'top'], response: "Avec plaisir Alison ! C'est toi la star, moi je suis juste ton sidekick robotique ! 🤖✨" },
            { keys: ['au revoir', 'bye', 'a demain', 'bonne nuit'], response: "À bientôt Alison ! Passe une bonne soirée. Demain on repart à la conquête ! 🌙💫" },
        ];

        for (const { keys, response } of responses) {
            if (keys.some(k => lower.includes(k))) return response;
        }

        const defaultResponses = [
            "Hmm, je ne suis pas sûr de comprendre. Tu peux me demander des infos sur tes ventes, RDV, clients ou réseaux sociaux ! 🤔",
            "Je suis encore en mode local. Tape 'aide' pour voir ce que je peux faire pour toi ! 🤖",
            "Bonne question ! Pour l'instant je gère les stats, RDV, ventes et réseaux sociaux. Dis-moi ce qui t'intéresse ! 💡",
        ];
        return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    }
};

// ===== UTILS =====
const Utils = {
    formatCurrency(amount) {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
    },

    formatDate(dateStr) {
        return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(new Date(dateStr));
    },

    formatDateTime(dateStr) {
        return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr));
    },

    formatCompact(amount) {
        if (amount >= 1000) return (amount / 1000).toFixed(1).replace('.0', '') + 'k';
        return amount.toString();
    },

    timeAgo(dateStr) {
        const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
        if (diff < 60) return "À l'instant";
        if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
        return `Il y a ${Math.floor(diff / 86400)}j`;
    },

    getInitials(firstName, lastName) {
        return (firstName?.[0] || '') + (lastName?.[0] || '');
    },

    platformIcon(platform) {
        const icons = {
            instagram: 'fab fa-instagram',
            facebook: 'fab fa-facebook',
            linkedin: 'fab fa-linkedin',
            tiktok: 'fab fa-tiktok',
        };
        return icons[platform] || 'fas fa-globe';
    },

    platformColor(platform) {
        const colors = {
            instagram: '#E1306C',
            facebook: '#1877F2',
            linkedin: '#0A66C2',
            tiktok: '#ffffff',
        };
        return colors[platform] || '#d4a931';
    },

    statusBadgeClass(status) {
        const classes = {
            paid: 'qualified',
            pending: 'in-progress',
            cancelled: '',
            confirmed: 'qualified',
            scheduled: 'rdv',
            completed: 'qualified',
            active: 'qualified',
            prospect: 'in-progress',
            closed: '',
            draft: '',
            published: 'qualified',
            approved: 'visit',
            failed: 'hot',
        };
        return classes[status] || '';
    }
};

console.log('🔌 Supabase service layer loaded');
