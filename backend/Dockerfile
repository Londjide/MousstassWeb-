FROM node:18

WORKDIR /usr/src/app

# Copier seulement les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le code source (node_modules est ignoré via .dockerignore)
COPY . .

# Variables d'environnement
ENV NODE_ENV=development
ENV PORT=3000
ENV JWT_SECRET=moustass_secret_key_dev

# Exposition du port
EXPOSE 3000
# Exposition du port de débogage Node.js
EXPOSE 9229

# Script de démarrage avec debugger activé
CMD ["npm", "run", "debug"]
