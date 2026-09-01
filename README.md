# Scolarité Manager

Plateforme de gestion de la scolarité des étudiants — Next.js 15 + Supabase + Vercel.

## Fonctionnalités

- Authentification email / mot de passe (Supabase Auth), avec activation des comptes par un administrateur
- Deux rôles : **Administrateur** (valide les paiements, gère les utilisateurs) et **Gestionnaire** (crée des profils et initie des demandes)
- Fiches étudiants : matricule, nom complet, filière, niveau — recherche par nom ou matricule
- Demandes de paiement : montant, motif, statut (en attente / validée / rejetée), horodatage complet
- Onglet "Requêtes en cours" : toutes les demandes, triées de la plus récente à la plus ancienne
- Sécurité par Row Level Security (RLS) au niveau de la base de données (pas seulement côté interface)

## Stack

- **Next.js 15** (App Router, Server Actions, TypeScript, Tailwind CSS v4)
- **Supabase** (PostgreSQL, Auth, RLS)
- **Vercel** (hébergement)

---

## 1. Mise en place de Supabase

1. Va sur [supabase.com](https://supabase.com) → **New project**.
   - Choisis un nom (ex: `scolarite-manager`), un mot de passe fort pour la base, et une région proche (Europe de préférence).
2. Une fois le projet créé, ouvre **SQL Editor** (menu de gauche) → **New query**.
3. Copie tout le contenu du fichier [`supabase/schema.sql`](./supabase/schema.sql) de ce projet, colle-le dans l'éditeur, puis clique **Run**.
   - Ce script crée les tables `profiles`, `students`, `payment_requests`, les triggers, et toutes les policies RLS.
4. Va dans **Project Settings → API**. Note ces deux valeurs, tu en auras besoin :
   - `Project URL` → deviendra `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → deviendra `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. (Recommandé) Dans **Authentication → Providers → Email**, désactive "Confirm email" si tu veux que les comptes soient utilisables immédiatement après inscription (l'activation reste de toute façon contrôlée par le champ `is_active`, géré par l'admin).

### Créer le compte administrateur

- Le **premier compte** créé via la page `/signup` de l'application devient automatiquement **administrateur** et **actif** (voir la fonction `handle_new_user` dans le schéma SQL).
- Tous les comptes suivants sont créés avec le rôle `user` et **inactifs** par défaut : l'administrateur doit les activer depuis l'onglet **Utilisateurs** du tableau de bord.

---

## 2. Développement local

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer les variables d'environnement
cp .env.local.example .env.local
# puis remplis .env.local avec tes clés Supabase (étape 1.4 ci-dessus)

# 3. Lancer le serveur de développement
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000) — tu seras redirigé vers `/signup` pour créer ton premier compte administrateur.

---

## 3. Déploiement sur Vercel (pas à pas)

### Option A — via GitHub (recommandé)

1. **Créer le dépôt GitHub**
   ```bash
   cd scolarite-app
   git init
   git add .
   git commit -m "Initial commit — Scolarité Manager"
   git branch -M main
   git remote add origin https://github.com/TON_USERNAME/scolarite-manager.git
   git push -u origin main
   ```
   > Crée d'abord le dépôt vide sur [github.com/new](https://github.com/new) (sans README, il existe déjà ici).

2. **Importer le projet sur Vercel**
   - Va sur [vercel.com/new](https://vercel.com/new)
   - Connecte ton compte GitHub si ce n'est pas déjà fait
   - Sélectionne le dépôt `scolarite-manager`
   - Vercel détecte automatiquement Next.js — ne change rien au "Build Command" ni au "Output Directory"

3. **Ajouter les variables d'environnement**
   - Dans l'écran de configuration du projet (ou plus tard dans **Settings → Environment Variables**), ajoute :

     | Nom | Valeur |
     |---|---|
     | `NEXT_PUBLIC_SUPABASE_URL` | ton Project URL Supabase |
     | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ta clé anon public Supabase |

   - Coche les trois environnements (Production, Preview, Development)

4. Clique **Deploy**. Après 1-2 minutes, ton site est en ligne sur `https://ton-projet.vercel.app`.

5. **Chaque `git push` sur `main` redéploie automatiquement** la production. Les autres branches créent des déploiements de prévisualisation (Preview).

### Option B — via la CLI Vercel (sans GitHub)

```bash
npm install -g vercel
cd scolarite-app
vercel login
vercel          # premier déploiement (suit les invites)
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel --prod    # déploiement en production
```

### Après le déploiement

1. Ouvre l'URL Vercel → tu arrives sur `/signup`.
2. Crée ton compte : il devient automatiquement administrateur.
3. Connecte-toi, va dans **Utilisateurs** pour vérifier/activer les futurs comptes de ton équipe.
4. Commence à créer des profils étudiants depuis l'onglet **Étudiants**.

---

## 4. Structure du projet

```
scolarite-app/
├── supabase/
│   └── schema.sql              # Schéma complet + RLS (à exécuter une seule fois dans Supabase)
├── src/
│   ├── app/
│   │   ├── login/              # Connexion
│   │   ├── signup/             # Inscription
│   │   └── dashboard/
│   │       ├── page.tsx        # Vue d'ensemble
│   │       ├── students/       # Liste + fiche + recherche étudiants
│   │       ├── requests/       # Requêtes en cours (toutes)
│   │       └── admin/users/    # Gestion des utilisateurs (admin uniquement)
│   ├── components/             # Composants UI réutilisables
│   ├── lib/
│   │   ├── actions/            # Server Actions (auth, students, payments, admin)
│   │   └── supabase/           # Clients Supabase (browser / server / middleware)
│   └── middleware.ts           # Protection des routes + refresh de session
└── .env.local.example
```

## 5. Modèle de sécurité

- **Toute la logique d'autorisation est appliquée au niveau de la base de données** via Row Level Security : même si quelqu'un contournait l'interface, Postgres refuserait les opérations non autorisées.
- Seuls les comptes `is_active = true` peuvent lire/écrire les étudiants et les demandes.
- Seul le rôle `admin` peut : valider/rejeter une demande de paiement, modifier/supprimer un étudiant, activer un compte ou changer un rôle.
- Le mot de passe n'est jamais stocké par l'application : Supabase Auth gère le hachage et la vérification.

## 6. Prochaines évolutions possibles

- Export PDF/Excel des reçus de paiement validés
- Notifications par email lors de la validation d'une demande
- Journal d'audit détaillé (log de toutes les actions admin)
- Filtres avancés (par filière, niveau, période) sur la page Requêtes
