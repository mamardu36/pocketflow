# PocketFlow

**Decide where your money goes before you spend it.**

PocketFlow est une application web (PWA) de budget mensuel pour étudiants et jeunes actifs. Le principe est volontairement simple :

> **Budget du mois → Répartition → Dépenses → Reste → Épargne → Historique**

« J'ai 1 000 € ce mois-ci. Je les répartis en catégories. Combien il me reste dans chacune ? »

- Pas de connexion bancaire, pas de publicité, pas d'IA.
- Utilisable **sans compte** (données locales, hors ligne) ou **avec un compte** (synchronisation Supabase multi-appareils).
- Interface en anglais, structure prête pour la traduction.

---

## Sommaire

1. [Fonctionnalités](#fonctionnalités)
2. [Stack technique](#stack-technique)
3. [Installation](#installation)
4. [Variables d'environnement](#variables-denvironnement)
5. [Configuration Supabase](#configuration-supabase)
6. [Lancer le projet](#lancer-le-projet)
7. [Tests](#tests)
8. [Build de production](#build-de-production)
9. [Déploiement sur Vercel](#déploiement-sur-vercel)
10. [Modes invité, démo et compte](#modes-invité-démo-et-compte)
11. [Modèle de données](#modèle-de-données)
12. [Structure du projet](#structure-du-projet)
13. [PWA et hors ligne](#pwa-et-hors-ligne)
14. [Personnalisation](#personnalisation)
15. [Sécurité](#sécurité)
16. [Dépannage](#dépannage)

---

## Fonctionnalités

**Budget mensuel.** Au premier lancement d'un mois, l'app demande : *How much money do you want to use this month?* Le montant reste modifiable. La carte principale affiche le budget, le montant réparti, le **Left to assign** (en grand) et une barre de répartition par catégorie.

**Catégories en 3 groupes.**
- *Fixed expenses* (loyer, téléphone…) : option « récurrent », l'allocation est recréée chaque mois sans être marquée payée.
- *Variable budget* (courses, transport, sorties…) : barre de progression, reste, dépensé.
- *Savings* : chaque catégorie d'épargne alimente un objectif d'épargne.

Répartir plus que le budget affiche un avertissement clair (« €50 over budget ») sans bloquer. Une catégorie dépassée affiche « €18 over budget » ; une dépense n'est jamais bloquée.

**Dépenses.** Ajout rapide depuis n'importe quel écran (bottom sheet sur mobile) : montant, catégorie, description, date. Page Expenses : regroupement Today / Yesterday / date, recherche, filtre par catégorie, tri, modification, suppression, total du mois, changement de mois.

**Épargne.** Objectifs multiples (nom, icône, montant cible optionnel, déjà épargné, date cible optionnelle). L'épargne **ne se remet jamais à zéro** : le solde est calculé à partir du montant initial, des allocations mensuelles, des dépôts/retraits manuels et de l'argent non utilisé transféré. Historique par mois (+€50 en septembre, +€30 en août…).

**Nouveau mois.** Nouveau budget, dépenses à 0, catégories conservées, montants récurrents conservés, montants variables réutilisables (option) et modifiables. Épargne et historique conservés.

**Fin de mois.** Résumé Budget / Spent / Saved / Unused, avec deux options jamais imposées : *Move unused money to savings* et *Start next month*.

**Historique.** Tous les mois classés par année, avec le détail complet de chaque mois (catégories, transactions). Les mois passés sont immuables : modifier octobre ne change jamais septembre.

**Indicateurs.** Discrets et peu nombreux : « €243 left for 18 days · About €13.50/day available », « €150 still needs to be assigned », comparaison avec le mois précédent.

**Réglages.** Compte, devise (EUR, USD, GBP, CHF, CAD), thème (système/clair/sombre), langue (préparée), export JSON, export CSV des dépenses, import JSON, réinitialisation, déconnexion, suppression du compte. En mode invité : créer un compte, transférer les données locales, effacer les données locales.

**Démo.** *Try the demo* charge un jeu de données réaliste (budget 1 000 €, loyer 550 €, 30 € restant à répartir, dépenses Carrefour, Bus, Restaurant, Cinéma). La démo est clairement identifiée, réinitialisable, et **séparée** des vraies données.

---

## Stack technique

| Domaine | Choix |
|---|---|
| Framework | Next.js 15 (App Router) |
| Langage | TypeScript (mode strict) |
| UI | React 19, Tailwind CSS 3, composants maison, icônes Lucide |
| Notifications | Sonner |
| Base de données et auth | Supabase (PostgreSQL + Auth email/mot de passe) |
| Stockage invité | localStorage (versionné et validé) |
| Tests | Vitest |
| Hébergement | Vercel |
| PWA | Manifest Next.js + service worker maison (`public/sw.js`) |

Les polices système sont utilisées : aucun appel réseau externe au build ni au runtime.

---

## Installation

Prérequis : **Node.js 18.18+** (20 LTS recommandé) et npm.

```bash
git clone https://github.com/<vous>/pocketflow.git
cd pocketflow
npm install
cp .env.example .env.local   # optionnel, voir ci-dessous
```

---

## Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Non* | URL du projet Supabase (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Non* | Clé **anon public** (ou clé **publishable** `sb_publishable_…`) |

\* Sans ces variables, l'app fonctionne entièrement en mode invité et démo ; les boutons de compte expliquent que les comptes ne sont pas configurés.

⚠️ Ne mettez **jamais** la clé `service_role` / `secret` dans ces variables : tout ce qui commence par `NEXT_PUBLIC_` est envoyé au navigateur. La clé anon est faite pour être publique ; la sécurité repose sur les règles RLS du schéma SQL.

---

## Configuration Supabase

1. Créez un projet sur [supabase.com](https://supabase.com).
2. **Base de données** : ouvrez *SQL Editor → New query*, collez le contenu de [`supabase/schema.sql`](supabase/schema.sql) et exécutez-le. Le script peut être relancé sans risque. Il crée :
   - les tables `profiles`, `user_preferences`, `budgets`, `budget_categories`, `transactions`, `savings_goals`, `savings_transactions` ;
   - les clés étrangères, cascades, contraintes (montants en centimes `bigint`), index ;
   - un trigger `updated_at` sur chaque table ;
   - un trigger qui crée le profil et les préférences à l'inscription ;
   - le **Row Level Security** avec des policies `auth.uid() = user_id` sur chaque table, ainsi que des clés étrangères composites `(id, user_id)` qui empêchent de rattacher une ligne aux données d'un autre utilisateur ;
   - la fonction `delete_user()` utilisée par *Delete account* (supprime uniquement l'utilisateur appelant).

   Le script nécessite PostgreSQL 15 ou plus, ce qui est le cas de tous les projets Supabase actuels.
3. **Clés** : *Project Settings → API* (ou *API Keys*), copiez l'URL du projet et la clé anon/publishable dans `.env.local`.
4. **Authentification** : *Authentication → Providers → Email* doit être activé.
   - Avec *Confirm email* activé (par défaut), l'utilisateur reçoit un e-mail puis se connecte. L'app affiche « Check your inbox… ».
   - Pour tester rapidement en local, vous pouvez le désactiver.
5. **URLs** : *Authentication → URL Configuration*
   - **Site URL** : `http://localhost:3000` en local, puis votre URL Vercel en production (ex. `https://pocketflow.vercel.app`).
   - **Redirect URLs** : ajoutez `http://localhost:3000/**` et `https://<votre-domaine>/**`.

---

## Lancer le projet

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000). Le service worker est désactivé en développement pour éviter les caches obsolètes.

| Script | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm start` | Serveur de production (après build) |
| `npm run typecheck` | Vérification TypeScript |
| `npm test` | Tests unitaires (Vitest) |
| `npm run test:watch` | Tests en mode watch |

---

## Tests

```bash
npm test
```

Les tests (`tests/`) couvrent la logique métier centrale :

- reste à répartir, budget dépassé ;
- reste par catégorie, catégorie dépassée ;
- dépenses du mois et résumé mensuel ;
- jours restants (février, années bissextiles, changement d'année) ;
- calcul journalier ;
- changement de mois (catégories conservées, dépenses à 0, historique immuable) ;
- épargne (solde, total, dépôts/retraits, transfert en fin de mois, historique par mois) ;
- parsing des montants (« 32,50 », « 1.000,50 »…), formatage ;
- diff de persistance, import/export ;
- données de démo conformes au cahier des charges.

---

## Build de production

```bash
npm run build
npm start
```

Toutes les pages sont générées statiquement : elles fonctionnent donc hors ligne une fois mises en cache.

---

## Déploiement sur Vercel

1. Poussez le dépôt sur GitHub.
2. Sur [vercel.com](https://vercel.com) : *Add New → Project*, importez le dépôt. Vercel détecte Next.js automatiquement (aucun réglage de build à changer).
3. Dans *Settings → Environment Variables*, ajoutez pour **Production**, **Preview** et **Development** :

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...   (ou sb_publishable_...)
   ```

4. Déployez. Si vous ajoutez ou modifiez les variables après un déploiement, relancez un déploiement (*Deployments → Redeploy*) : les variables `NEXT_PUBLIC_` sont intégrées au moment du build.
5. Dans Supabase, mettez à jour **Site URL** et **Redirect URLs** avec votre domaine Vercel.

---

## Modes invité, démo et compte

| Mode | Stockage | Clé localStorage |
|---|---|---|
| Invité (*Get started*) | localStorage, 100 % hors ligne | `pocketflow:guest-data` |
| Démo (*Try the demo*) | localStorage, séparé | `pocketflow:demo-data` |
| Compte (*Sign in / Create account*) | Supabase + cache local hors ligne | `pocketflow:cloud-cache:<userId>` |

Le mode actif est mémorisé dans `pocketflow:mode`.

**Passage d'invité à compte.** Après connexion, si des données invité existent sur l'appareil, une fenêtre propose de les transférer :
- compte vide → *Transfer to my account* ;
- compte déjà rempli → avertissement explicite, *Replace account data* ;
- *Not now* → rien n'est modifié.

Dans tous les cas, la copie locale **n'est jamais supprimée automatiquement**. L'utilisateur peut l'effacer plus tard via *Settings → Clear local data* (avec confirmation), ou relancer le transfert via *Import data from this device*.

**Architecture de persistance.**
- Toutes les modifications passent par des **actions pures** (`lib/domain/actions.ts`) qui renvoient un nouvel état en conservant les références des éléments inchangés.
- Le provider (`hooks/use-app.tsx`) applique l'état immédiatement (UI optimiste), puis transmet l'ancien et le nouvel état au **repository** via une file d'écriture sérialisée.
- `LocalRepository` écrit le JSON complet dans localStorage.
- `SupabaseRepository` calcule un diff et n'envoie que les lignes modifiées, en respectant l'ordre des dépendances (parents d'abord, suppressions enfants d'abord), avec pagination et envoi par lots.
- Les deux repositories implémentent la même interface (`lib/storage/repository.ts`) et manipulent les mêmes types.

---

## Modèle de données

Tous les montants sont des **entiers en centimes** (`32,50 €` → `3250`) : pas d'erreur d'arrondi en virgule flottante. Les mois sont identifiés par `year` + `month` (1–12), jamais par leur nom. Les dates sont des dates calendaires locales `YYYY-MM-DD`, ce qui évite les décalages de fuseau horaire.

```
MonthlyBudget      id, year, month, amount, reviewedAt
BudgetCategory     id, budgetId, name, emoji, type (fixed|variable|savings), color,
                   assigned, recurring, savingsGoalId, sortOrder
Transaction        id, budgetId, categoryId, amount, description, date
SavingsGoal        id, name, emoji, color, targetAmount?, initialAmount, targetDate?, sortOrder
SavingsTransaction id, goalId, amount (±), date, note, source (manual|unused), budgetId?
UserPreferences    currency, theme, language
```

**Les catégories appartiennent à un mois.** Créer un mois copie les catégories du mois précédent (récurrentes avec leur montant, variables selon l'option *Reuse last month's amounts*). L'historique reste donc exact pour toujours.

**Le solde d'épargne est dérivé :**
```
solde = initialAmount + Σ allocations des catégories Savings liées + Σ savings_transactions
```

**Formules** (`lib/calculations/`) :
- `leftToAssign = monthlyBudget − totalAssigned`
- `categoryRemaining = assigned − spent`
- `dailyAllowance = floor(remainingVariableMoney / remainingDaysInMonth)`, où les jours restants incluent aujourd'hui.

Fonctions disponibles : `calculateAssignedMoney`, `calculateUnassignedMoney`, `calculateCategorySpent`, `calculateCategoryRemaining`, `calculateMonthlySpent`, `calculateRemainingDays`, `calculateDailyAllowance`, `calculateSavingsTotal`, `calculateMonthSummary`, etc.

---

## Structure du projet

```
app/                      Routes (App Router)
  page.tsx                Dashboard (mois sélectionné)
  welcome/  onboarding/  auth/
  expenses/  savings/  history/  settings/
  category/               Détail catégorie (?id=)
  month/                  Détail d'un mois (?y=&m=)
  layout.tsx  manifest.ts  globals.css  icon.png
components/
  ui/                     Primitives (Button, Card, Sheet, Field, MoneyInput, ConfirmDialog…)
  budget/                 Carte budget, catégories, setup du mois, résumé de fin de mois
  expenses/               Formulaire, liste, sheet global « Add expense »
  savings/                Cartes et sheets d'objectifs
  navigation/             AppShell, barre du bas (mobile), sidebar (desktop), bannière démo
  onboarding/  auth/  pwa/
hooks/                    use-app (provider global), use-month-view
lib/
  calculations/           Calculs purs (budget, épargne)
  domain/                 Actions, sélecteurs, factories, démo, diff
  storage/                Repositories local / Supabase, validation du schéma, clés
  supabase/               Client + mappers ligne ↔ modèle
  i18n/                   Dictionnaire anglais + registre des langues
  money.ts  dates.ts  export.ts  utils.ts
constants/                Devises, catégories suggérées, couleurs, emojis
config/app.ts             Nom de l'app, couleurs du thème, devise par défaut
types/                    Types TypeScript partagés
supabase/schema.sql       Schéma, RLS, policies, triggers, fonction delete_user
public/sw.js              Service worker
public/icons/             Icônes PWA
tests/                    Tests Vitest
```

**Pourquoi `?id=` et `?y=&m=` plutôt que des segments dynamiques ?** Toutes les routes restent statiques, donc le service worker peut les mettre en cache et elles fonctionnent hors ligne.

---

## PWA et hors ligne

- Manifest généré par `app/manifest.ts` : nom, `display: standalone`, couleur de thème, icônes 192/512/maskable.
- `public/sw.js`, enregistré en production uniquement :
  - à l'installation, met en cache toutes les pages **et** les fichiers JS/CSS qu'elles référencent ;
  - pages : réseau d'abord, puis repli sur le cache ;
  - `/_next/static` et icônes : cache d'abord (noms de fichiers hachés) ;
  - requêtes vers d'autres domaines (Supabase) : jamais mises en cache.
- Installation sur l'écran d'accueil :
  - iOS : Safari → Partager → *Sur l'écran d'accueil* ;
  - Android et desktop : bouton *Installer* du navigateur.
- Pour forcer la suppression des anciens caches après un changement important, incrémentez `VERSION` dans `public/sw.js`.
- Les icônes de `public/icons/` sont des placeholders : remplacez-les par les vôtres (mêmes noms et tailles).

---

## Personnalisation

- **Nom de l'app** : `config/app.ts` (`APP_CONFIG.name`), également utilisé par le manifest et les exports.
- **Couleurs** : variables HSL dans `app/globals.css` (thèmes clair et sombre).
- **Catégories suggérées** : `constants/categories.ts`.
- **Ajouter une devise** :
  1. l'ajouter au type `CurrencyCode` dans `types/index.ts` ;
  2. ajouter une entrée dans `constants/currencies.ts` ;
  3. l'ajouter à la contrainte `check` de `user_preferences.currency` dans `schema.sql`.
- **Ajouter une langue** :
  1. créer `lib/i18n/fr.ts` typé `Messages` (même structure que `en.ts`) ;
  2. étendre `LanguageCode` ;
  3. l'enregistrer dans `lib/i18n/index.ts` et passer `available: true`.

---

## Sécurité

- Seule la clé **anon/publishable** est utilisée côté client ; la clé `service_role` n'est jamais nécessaire.
- RLS activé sur toutes les tables : chaque utilisateur ne peut lire et écrire que ses lignes (`auth.uid() = user_id`).
- Clés étrangères composites `(id, user_id)` : impossible de rattacher une dépense à la catégorie d'un autre utilisateur.
- `delete_user()` est `security definer`, avec un `search_path` vide, et ne supprime que l'appelant.
- Les imports JSON sont validés (`lib/storage/schema.ts`) avant de remplacer quoi que ce soit, et demandent une confirmation.
- Toutes les actions destructives demandent une confirmation.

---

## Dépannage

| Problème | Solution |
|---|---|
| « Accounts aren't available » | Variables Supabase absentes. Vérifiez `.env.local` ou Vercel, puis relancez / redéployez. |
| Inscription sans connexion | La confirmation e-mail est activée : cliquez le lien reçu, puis *Sign in*. |
| Lien de confirmation vers `localhost` en production | Mettez à jour *Site URL* dans Supabase. |
| Erreur « permission denied » / RLS | Le script `schema.sql` n'a pas été exécuté entièrement. Relancez-le. |
| *Delete account* échoue | La fonction `delete_user()` manque : relancez `schema.sql`. |
| Ancienne version affichée après déploiement | Rechargez deux fois, ou incrémentez `VERSION` dans `public/sw.js`. |

---

Licence : MIT (à adapter).
