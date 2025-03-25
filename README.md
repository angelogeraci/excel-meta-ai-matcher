# Excel Meta AI Matcher

Application web moderne permettant de traiter des fichiers Excel, de consulter l'API Meta Marketing pour obtenir des suggestions relatives à des critères, et d'utiliser l'IA pour déterminer les meilleures correspondances.

## Fonctionnalités

- Upload de fichiers Excel
- Sélection de la colonne à traiter
- Connexion à l'API Meta Marketing pour obtenir des suggestions
- Évaluation par IA des meilleures correspondances avec score de 1 à 100
- Affichage des résultats dans un tableau interactif
- Possibilité de modifier manuellement les suggestions
- Recherche et filtrage des résultats
- Sélection multiple pour suppression
- Export des résultats en Excel

## Technologies utilisées

- **Frontend** : React.js, TypeScript, TailwindCSS
- **Backend** : Node.js, Express
- **Base de données** : MongoDB
- **API** : Meta Marketing API
- **IA** : OpenAI API pour l'évaluation des correspondances

## Installation

```bash
# Cloner le dépôt
git clone https://github.com/angelogeraci/excel-meta-ai-matcher.git
cd excel-meta-ai-matcher

# Installation des dépendances pour le backend
cd server
npm install

# Installation des dépendances pour le frontend
cd ../client
npm install
```

## Configuration

1. Créer un fichier `.env` dans le dossier `server` en suivant le modèle `.env.example`
2. Configurer les clés API nécessaires (Meta Marketing, OpenAI)

## Démarrage

```bash
# Démarrer le serveur backend (depuis la racine du projet)
cd server
npm run dev

# Démarrer le frontend (dans un autre terminal, depuis la racine du projet)
cd client
npm run dev
```

## Structure du projet

```
excel-meta-ai-matcher/
├── client/                # Frontend React
│   ├── public/
│   └── src/
│       ├── assets/        # Images, styles globaux
│       ├── components/    # Composants React
│       ├── hooks/         # Hooks personnalisés
│       ├── pages/         # Pages de l'application
│       ├── services/      # Services API
│       ├── types/         # Types TypeScript
│       ├── utils/         # Fonctions utilitaires
│       ├── App.tsx
│       └── main.tsx
├── server/                # Backend Node.js/Express
│   ├── config/           # Configuration
│   ├── controllers/      # Contrôleurs
│   ├── middleware/       # Middleware
│   ├── models/           # Modèles de données
│   ├── routes/           # Routes API
│   ├── services/         # Services
│   ├── utils/            # Utilitaires
│   └── index.js          # Point d'entrée
└── .gitignore            # Fichiers ignorés par Git
```

## Licence

MIT
