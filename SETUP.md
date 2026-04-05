# Visit & Smile — Deadpool IA — Guide de mise en production

## 1. Supabase (Base de données + Auth)

### Créer le projet
1. Aller sur https://supabase.com → New Project
2. Nom : `visit-and-smile`
3. Région : **West EU (Ireland)** pour le RGPD
4. Mot de passe BDD : noter et garder au chaud

### Récupérer les clés
- Settings → API → **Project URL** → copier dans `js/config.js` (SUPABASE_URL)
- Settings → API → **anon public key** → copier dans `js/config.js` (SUPABASE_ANON_KEY)
- Settings → API → **service_role key** → pour n8n uniquement (NE PAS mettre dans le frontend)

### Exécuter le schéma
1. SQL Editor → New Query
2. Copier/coller le contenu de `sql/schema.sql`
3. Exécuter (Run)

### Créer le compte Alison
1. Authentication → Users → Add User
2. Email : `alison@visitandsmile.fr`
3. Password : choisir un mot de passe sécurisé
4. Copier l'UUID du user créé

### Sécuriser les CORS
1. Settings → API → **Allowed Origins**
2. Supprimer `*` (wildcard)
3. Ajouter uniquement : `https://app.visitandsmile.fr` (votre domaine de production)
4. Cela empêche tout autre site web d'appeler votre API Supabase

### Injecter les données de démo
1. SQL Editor → New Query
2. Copier/coller le contenu de `sql/seed.sql`
3. Exécuter
4. Puis exécuter : `SELECT seed_alison_data('UUID_COPIÉ_CI_DESSUS');`

---

## 2. n8n (Automatisations)

### Option A : n8n Cloud (recommandé pour démarrer)
1. https://n8n.io → Starter plan (20€/mois)
2. Pas de maintenance serveur

### Option B : Self-hosted (économique)
1. VPS Hetzner CX22 (4.50€/mois)
2. Installer Docker + n8n :
```bash
docker run -d --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=motdepasse \
  n8nio/n8n
```

### Variables d'environnement n8n
Aller dans Settings → Variables et ajouter :
- `SUPABASE_URL` = URL du projet Supabase
- `SUPABASE_SERVICE_KEY` = service_role key (pas l'anon key !)
- `ALISON_USER_ID` = UUID du user Alison
- `TWILIO_PHONE` = numéro Twilio français
- `FB_PAGE_ID` = ID de la page Facebook
- `FB_PAGE_TOKEN` = token d'accès Facebook
- `IG_BUSINESS_ID` = ID business Instagram

### Importer les workflows
1. Aller dans Workflows → Import
2. Importer les 4 fichiers JSON du dossier `n8n/` :
   - `agent-comptable.json` → Résumé hebdo + rappels URSSAF + log ventes
   - `agent-planning.json` → Google Calendar + rappels RDV + anniversaires + relances
   - `agent-social.json` → Génération contenu IA + publication + stats
   - `chatbot-deadpool.json` → Chatbot avec contexte temps réel

### Configurer les credentials dans n8n
- **Anthropic API** : Settings → Credentials → Add → Anthropic → coller la clé API
- **SendGrid** : Settings → Credentials → Add → SendGrid → coller la clé API
- **Twilio** : Settings → Credentials → Add → Twilio → Account SID + Auth Token
- **Google Calendar** : Settings → Credentials → Add → Google Calendar OAuth2

### Activer les workflows
- Cliquer sur chaque workflow → Toggle "Active" en haut à droite

---

## 3. APIs externes

### SendGrid (Emails gratuit)
1. https://sendgrid.com → Free (100 emails/jour)
2. Settings → API Keys → Create → copier
3. Vérifier le domaine expéditeur : visitandsmile.fr

### Twilio (SMS)
1. https://twilio.com → créer un compte
2. Acheter un numéro français (~1€/mois)
3. Copier Account SID + Auth Token
4. Coût SMS : ~0.07€/SMS

### Google Calendar API
1. https://console.cloud.google.com
2. Créer un projet → Activer Google Calendar API
3. Credentials → OAuth 2.0 → configurer
4. Connecter le compte Google d'Alison dans n8n

### Meta (Facebook + Instagram)
1. https://developers.facebook.com → Create App
2. Type : Business
3. Ajouter : Pages API + Instagram Graph API
4. Générer un Page Access Token (long-lived)
5. Récupérer l'ID de la page Facebook + IG Business ID

### Claude API (Anthropic)
1. https://console.anthropic.com → API Keys → Create
2. Modèle recommandé : `claude-3-5-haiku-latest` (le moins cher)
3. Budget estimé : 5-10€/mois

---

## 4. Hébergement frontend

### Option recommandée : Vercel (gratuit)
1. Pousser le code sur GitHub
2. https://vercel.com → Import → sélectionner le repo
3. Framework : Other (static)
4. Deploy

### Alternative : Cloudflare Pages (gratuit)
1. https://dash.cloudflare.com → Pages → Create
2. Connecter le repo GitHub
3. Build command : (laisser vide)
4. Output directory : `/`

### Domaine personnalisé
- Acheter `visitandsmile.fr` chez OVH (~10€/an)
- Configurer le DNS vers Vercel/Cloudflare

---

## 5. Mettre à jour la config

### Option A : Meta tags dans index.html (simple)
Ajouter dans le `<head>` de `index.html` :
```html
<meta name="supabase-url" content="https://xxxxx.supabase.co">
<meta name="supabase-anon-key" content="eyJhbGciOi...">
<meta name="n8n-url" content="https://n8n.votredomaine.com">
```

### Option B : Vercel Edge Middleware (plus securise)
Les credentials ne sont jamais dans le code source :
1. Vercel Dashboard → Settings → Environment Variables
2. Ajouter : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `N8N_BASE_URL`
3. Creer un fichier `middleware.js` qui injecte les meta tags cote serveur

### IMPORTANT — Securite CORS Supabase
1. Supabase Dashboard → Settings → API → Allowed Origins
2. Remplacer `*` par le domaine de production : `https://app.visitandsmile.fr`
3. Cela empeche tout autre site d'utiliser votre anon key

---

## 6. Coûts mensuels récapitulatif

| Service | Coût |
|---------|------|
| Supabase Free | 0€ |
| n8n Cloud Starter | 20€ |
| SendGrid Free | 0€ |
| Twilio (~50 SMS) | 3.50€ |
| Claude API Haiku | 5-10€ |
| Vercel/Cloudflare | 0€ |
| Domaine | ~1€ |
| **TOTAL** | **~25-35€/mois** |

---

## 7. Test de bout en bout

1. Ouvrir l'app → Se connecter avec le compte Alison
2. Vérifier que le dashboard affiche les données Supabase
3. Ajouter une vente → vérifier qu'elle apparaît dans Supabase
4. Envoyer un message au chatbot → vérifier la réponse Claude
5. Vérifier qu'un RDV crée un événement Google Calendar
6. Vérifier que les posts sont générés et programmés
7. Tester sur mobile
