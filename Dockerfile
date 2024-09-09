# Utilisez une image Docker officielle Node.js comme image parente
FROM node:20.17.0

# Installer Firefox et les dépendances nécessaires pour Puppeteer
RUN apt-get update && apt-get install -y \
    firefox-esr \
    xvfb \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxfixes3 \
    libxi6 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    libnss3 \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgtk-3-0 \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libgbm1 \
    libnotify-dev \
    libxkbcommon-x11-0

# Définir le répertoire de travail dans le conteneur
WORKDIR /usr/src/app

# Copier package.json et package-lock.json (si disponible)
COPY package*.json ./

# Installer les dépendances de l'application
RUN npm install

RUN npx puppeteer browsers install firefox

# Copier le reste des fichiers de l'application dans le conteneur
COPY . .

# Exposer le port sur lequel l'application s'exécute
# EXPOSE 7700

# Définir la commande pour exécuter l'application
CMD [ "npm", "start" ]


# Commandes :
# docker build -t iutbot .
# docker run -d -p 7700:7700 iutbot


# 2. Lister tous les conteneurs (y compris ceux arrêtés)
# Cela inclut les conteneurs arrêtés.
# docker ps -a

# 3. Arrêter un conteneur
# Utilise l'ID ou le nom du conteneur (trouvé avec docker ps).
# docker stop iutbot

# 4. Redémarrer un conteneur
# Pour redémarrer un conteneur arrêté :
# docker start iutbot

# 5. Afficher les logs d'un conteneur
# Pour voir les logs d'un conteneur en cours d'exécution ou arrêté :

# docker logs iutbot

# Pour suivre les logs en temps réel, utilise l'option -f (comme tail -f) :
# docker logs -f iutbot

# 6. Inspecter un conteneur
# Pour obtenir des détails complets sur un conteneur (y compris ses configurations, IP, etc.) :
# docker inspect iutbot

# 7. Supprimer un conteneur
# Pour supprimer un conteneur arrêté (tu dois l'arrêter avant de le supprimer) :
# docker rm iutbot

# 8. Supprimer une image Docker
# Si tu veux supprimer une image Docker que tu as construite :
# docker rmi <image_id_or_name>

# 9. Accéder à un conteneur en cours d'exécution
# Pour accéder à un conteneur en ligne de commande (bash/sh), utilise :
# docker exec -it iutbot /bin/bash

# 10. Afficher les statistiques d'un conteneur
# Pour voir l'utilisation des ressources (CPU, mémoire, etc.) d'un conteneur :
# docker stats iutbot

# 11. Arrêter tous les conteneurs en cours d'exécution
# Si tu veux arrêter tous les conteneurs en une seule commande :
# docker stop $(docker ps -q)

# 12. Supprimer tous les conteneurs arrêtés
# Pour nettoyer les conteneurs qui ne sont plus actifs : 
# docker rm $(docker ps -a -q)