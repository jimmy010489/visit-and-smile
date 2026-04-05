// ===== VISIT & SMILE — CONFIGURATION SÉCURISÉE =====
// En production : les credentials sont injectés via des <meta> tags côté serveur
// ou via les variables d'environnement Vercel (voir SETUP.md)
// En développement : utiliser les valeurs par défaut (mode démo)

const CONFIG = (() => {
    // Lire depuis les meta tags si disponibles (injection serveur)
    const getMeta = (name) => {
        const el = document.querySelector(`meta[name="${name}"]`);
        return el ? el.content : null;
    };

    return {
        // Supabase — lire depuis meta tags ou fallback placeholder
        SUPABASE_URL: getMeta('supabase-url') || 'https://VOTRE_PROJET.supabase.co',
        SUPABASE_ANON_KEY: getMeta('supabase-anon-key') || 'VOTRE_ANON_KEY',

        // n8n Webhooks
        N8N_BASE_URL: getMeta('n8n-url') || 'https://n8n.votredomaine.com',
        WEBHOOKS: {
            CHATBOT: '/webhook/chatbot',
            NEW_SALE: '/webhook/new-sale',
            NEW_APPOINTMENT: '/webhook/new-appointment',
            PUBLISH_POST: '/webhook/publish-post',
            GENERATE_CONTENT: '/webhook/generate-content',
        },

        // App
        APP_NAME: 'Visit & Smile',
        AI_NAME: 'Deadpool IA',
        DEFAULT_CITY: 'Orléans',
        URSSAF_RATE: 0.22,
    };
})();
