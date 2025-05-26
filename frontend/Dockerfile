FROM node:18-alpine

# Répertoire de travail
WORKDIR /usr/src/app

# Copier les fichiers de configuration
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste des fichiers
COPY . .

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=80
ENV BACKEND_URL=http://backend:3000

# Exposer le port
EXPOSE 80

# Commande de démarrage
CMD ["node", "server.js"]
