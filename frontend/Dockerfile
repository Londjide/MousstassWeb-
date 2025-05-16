FROM node:18-alpine

WORKDIR /usr/src/app

# Installer les dépendances
COPY package*.json ./
RUN npm install

# Copier le code source
COPY . .

# Variables d'environnement
ENV NODE_ENV=development
ENV PORT=80
ENV BACKEND_URL=http://backend:3000

# Exposition du port
EXPOSE 80

# Démarrage de l'application
CMD ["npm", "start"]
