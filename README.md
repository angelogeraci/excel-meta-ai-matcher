# Excel Meta AI Matcher

## Description

Excel Meta AI Matcher est une application web permettant de traiter des fichiers Excel et de générer des suggestions de ciblage marketing à l'aide de l'API Meta et de l'intelligence artificielle OpenAI.

## Fonctionnalités

- Upload de fichiers Excel
- Analyse automatique des colonnes
- Génération de suggestions de mots-clés Meta
- Évaluation par IA des correspondances
- Export des résultats

## Prérequis

- Node.js (v18+)
- MongoDB
- Compte Meta Marketing API
- Compte OpenAI

## Installation

1. Cloner le dépôt
```bash
git clone https://github.com/angelogeraci/excel-meta-ai-matcher.git
cd excel-meta-ai-matcher
```

2. Installer les dépendances
```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

3. Configuration
- Créer un fichier `.env` dans les dossiers `server` et `client`
- Copier les fichiers `.env.example` comme modèle
- Renseigner vos clés API

## Démarrage

1. Démarrer le backend
```bash
cd server
npm run dev
```

2. Démarrer le frontend
```bash
cd client
npm run dev
```

## Technologies

- Frontend: React, TypeScript, TailwindCSS
- Backend: Node.js, Express
- Base de données: MongoDB
- APIs: Meta Marketing, OpenAI
- Librairies: XLSX, Axios

## Licence

MIT

## Contribution

Les contributions sont les bienvenues. Merci de créer une issue avant de proposer des modifications importantes.