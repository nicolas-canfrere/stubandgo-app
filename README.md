# stubandgo — front

Front React de la billetterie stubandgo : parcourir les événements à venir, commander des billets avec son email, payer (paiement simulé), puis contrôler les billets à l'entrée en scannant leur QR code.

Application monopage (Vite, React 19, TypeScript, TanStack Query, Tailwind) qui appelle directement l'API Symfony du dépôt `stubandgo`. L'API est la seule source de vérité : le front affiche, il ne recalcule aucune règle métier. La L1 a livré le parcours d'achat et le scan ; la L2 réserve le scan aux contrôleurs connectés par Keycloak (`oidc-client-ts`, code + PKCE).

## Prérequis

- Docker avec Docker Compose, `make` et `git`. Node n'est pas nécessaire sur la machine : tout passe par des conteneurs (Node pour le front, l'image officielle Playwright pour le parcours de bout en bout).
- Les deux dépôts côte à côte dans le même dossier : `stubandgo` (l'API) et `stubandgo-app` (ce dépôt). `make api-types` lit l'API dans `../stubandgo`.
- La stack de l'API (branche `main`) : elle démarre aussi Keycloak (http://localhost:8180, realm `stubandgo`), qui porte la connexion. Le front en a besoin pour la page de scan.
- Ports libres : 5173 (front), 8080 (API), 8180 (Keycloak), 8025 (Mailpit), 15672 (RabbitMQ).
- Pour `make e2e` : le conteneur Playwright utilise le réseau de l'hôte (`network_mode: host`) pour joindre le front, l'API et Mailpit sur `localhost`. C'est le fonctionnement natif de Docker Engine sous Linux ; avec Docker Desktop, il faut activer le réseau hôte (« Enable host networking » dans les réglages).

## Démarrage

L'API d'abord (voir aussi son README) :

```bash
git clone <url-du-dépôt-de-l-API> stubandgo
git clone <url-du-dépôt-du-front> stubandgo-app

cd stubandgo
make install                                                     # dépendances PHP
make up                                                          # nginx, php, PostgreSQL, RabbitMQ, Mailpit, worker
docker compose exec php bin/console doctrine:migrations:migrate -n
docker compose exec php bin/console app:demo:load                # 2 organisations, 3 événements
```

Puis le front :

```bash
cd ../stubandgo-app
make up                                                          # npm ci puis serveur Vite
```

| Service                | URL                                                          |
| ---------------------- | ------------------------------------------------------------ |
| Front                  | http://localhost:5173                                        |
| API                    | http://localhost:8080 (santé : http://localhost:8080/health) |
| Keycloak (connexion)   | http://localhost:8180                                        |
| Mailpit (emails reçus) | http://localhost:8025                                        |

Au premier `make up`, le conteneur installe les dépendances (`npm ci`) avant de servir l'application : compter quelques dizaines de secondes. L'URL de l'API vient de `VITE_API_URL` (fichier `.env`, `http://localhost:8080` par défaut).

## Parcours de démonstration

1. Ouvrez http://localhost:5173 : la liste des événements à venir s'affiche. Cliquez sur « Soirée Rock ».
2. Ajoutez un billet « Plein » et un billet « Réduit » avec les boutons `+`, saisissez votre email, puis « Réserver et payer ». Les places sont réservées 15 minutes (compte à rebours sur la page de paiement).
3. Payez avec la carte refusée `4000 0000 0000 0002` : le paiement est refusé et les places sont libérées. Cliquez sur « Recommencer » : le formulaire revient prérempli (email et quantités), et le nombre de places restantes est revenu à sa valeur de départ. Cliquez de nouveau sur « Réserver et payer », puis payez avec la carte acceptée `4242 4242 4242 4242`.
4. La page de confirmation renvoie vers Mailpit (http://localhost:8025). L'email « Vos billets — Soirée Rock » arrive après quelques secondes (il part de manière asynchrone, par le worker de l'API). Il contient un QR code par billet.
5. Enregistrez l'image du QR code depuis Mailpit — elle apparaît dans le corps de l'email, pas en pièce jointe (Mailpit n'affiche aucune pièce jointe, seulement le badge « Inline images (2) ») : clic droit sur le QR code, « Enregistrer l'image sous… ».
6. Ouvrez « Contrôle d'accès » (http://localhost:5173/scan) : le front vous envoie vers Keycloak. Connectez-vous avec `controleur.rock` / `stubandgo-demo` (voir les comptes ci-dessous) ; vous revenez sur la page de scan. Choisissez « Soirée Rock » dans « Événement contrôlé », puis déposez l'image dans la zone « Image du QR code » (ou « Choisir une image ») : « VALIDE — entrée autorisée ». Déposez la même image une seconde fois : « DÉJÀ UTILISÉ », avec l'heure du premier passage.

La page de scan sait aussi lire le QR code avec la webcam (« Démarrer la caméra ») : le navigateur n'autorise la caméra que sur une origine sûre, ce qui est le cas de `http://localhost`. On peut donc vérifier le scan à la main en présentant l'email ouvert sur un téléphone devant la webcam.

### Cartes de test

| Carte                 | Résultat                         |
| --------------------- | -------------------------------- |
| `4242 4242 4242 4242` | paiement accepté                 |
| `4000 0000 0000 0002` | paiement refusé, places libérées |

Le numéro se saisit avec ou sans espaces ; il est envoyé sans espaces. Aucune autre donnée de carte n'est demandée : le paiement est simulé par l'API.

### Comptes de démonstration

Mot de passe de tous les comptes : `stubandgo-demo`.

| Compte               | Rôle                              | Effet sur « Contrôle d'accès »                             |
| -------------------- | --------------------------------- | ---------------------------------------------------------- |
| `controleur.rock`    | contrôleur de Rock Asso           | liste les événements de Rock Asso et permet de les scanner |
| `controleur.theatre` | contrôleur de Théâtre de la Ville | ne voit aucun événement de Rock Asso                       |
| `admin.rock`         | administrateur de Rock Asso       | « Votre compte n'a pas le rôle de contrôleur. »            |

« Se déconnecter » (en haut à droite) ramène à l'accueil. Le compte `admin.plateforme` (realm `stubandgo-staff`) ne concerne pas ce front.

## Parcours de bout en bout (Playwright)

```bash
make e2e
```

`make e2e` rejoue le parcours de démonstration complet dans Chromium, contre les vraies stacks : un email unique par exécution, paiement refusé puis accepté, email retrouvé dans Mailpit par son API HTTP avec ses deux images `ticket-1.png` et `ticket-2.png`, puis connexion à Keycloak par le vrai formulaire (`controleur.rock`) et `ticket-1.png` déposée sur la page de scan (« VALIDE », puis « DÉJÀ UTILISÉ »). Le QR code est vraiment lu dans l'image, comme pour un humain. Un second test (`e2e/l2-isolation.spec.ts`) vérifie l'isolation : `controleur.theatre` voit « Le Malade imaginaire » mais pas « Soirée Rock », `admin.rock` est refusé, et la déconnexion ramène à l'accueil.

`make e2e` ne lance rien : il exige la stack de l'API démarrée avec `app:demo:load`, et le front démarré par `make up`. Il vérifie d'abord `http://localhost:8080/health`, la présence de « Soirée Rock » dans `GET /api/events`, Mailpit, la discovery de Keycloak (`http://localhost:8180/realms/stubandgo/.well-known/openid-configuration`) et le front, et s'arrête avec un message clair si l'un manque (« lancez la stack de l'API et `app:demo:load` », « lancez la stack de l'API : make up » pour Keycloak, ou « lancez-le avec make up »). Le test tourne dans l'image `mcr.microsoft.com/playwright`, dont la version (`PLAYWRIGHT_VERSION` dans le `Makefile`, `compose.yaml` et `.env`) doit rester celle de `@playwright/test` dans `package.json`.

Chaque exécution achète deux billets de « Soirée Rock » (200 places). Les données de démonstration expirent au bout d'un mois environ (les événements sont datés de 31 à 60 jours après `app:demo:load`) : pour repartir de données neuves, suivez la procédure de remise à zéro du README de l'API.

## Commandes `make`

| Cible                   | Rôle                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `make up` / `make down` | démarrer / arrêter le serveur Vite (http://localhost:5173)                                                                            |
| `make install`          | installer les dépendances (`npm ci`) ; à lancer front arrêté (`make down`), car `npm ci` remplace `node_modules` sous le serveur Vite |
| `make lint`             | ESLint et vérification du format (Prettier)                                                                                           |
| `make typecheck`        | TypeScript (`tsc`), application et parcours Playwright                                                                                |
| `make test`             | tests Vitest (jsdom, MSW : aucun appel réseau réel)                                                                                   |
| `make build`            | bundle de production (Vite)                                                                                                           |
| `make api-types`        | recopier `openapi.yaml` depuis `../stubandgo` et régénérer `src/api/schema.d.ts`                                                      |
| `make api-types-check`  | échouer si `src/api/schema.d.ts` ne correspond plus à `openapi/openapi.yaml`                                                          |
| `make ci`               | `lint`, `typecheck`, `api-types-check`, `test`, `build` ; autonome, sans les stacks                                                   |
| `make e2e`              | parcours Playwright, contre les stacks lancées (voir plus haut)                                                                       |

`make help` liste toutes les cibles.

### Après un changement de l'API

Les types de l'API ne s'écrivent jamais à la main : ils sont générés depuis la copie versionnée `openapi/openapi.yaml`. Quand le contrat de l'API change (dans `../stubandgo`, son `openapi.yaml` régénéré et commité) :

```bash
make api-types   # copie ../stubandgo/openapi.yaml et régénère src/api/schema.d.ts
make ci
```

Puis commitez `openapi/openapi.yaml` et `src/api/schema.d.ts` ensemble. Le dossier de l'API se change avec `make api-types API_DIR=<chemin>`.

## Limites

- Seul le scan est protégé (connexion Keycloak, rôle contrôleur) ; la commande de billets reste anonyme.
- Pas de compte acheteur ni de back-office : les organisations et les événements viennent de `app:demo:load`.
- Le paiement est simulé : seules les deux cartes de test ont un sens.
- La liste du scan propose les événements publiés à venir, sans filtre « aujourd'hui ».
- Le lien vers Mailpit de la page de confirmation n'existe que pour la démo.

Les règles de développement du dépôt (conventions, tests, workflow) sont dans `AGENTS.md`.
