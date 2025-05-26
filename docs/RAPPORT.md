# Rapport du Projet MousstassWeb

## Équipe
- [Votre nom]
- [Coéquipier éventuel]

## Table des matières
1. [Introduction](#introduction)
2. [Architecture Technique](#architecture-technique)
3. [Dockerisation](#dockerisation)
4. [Sécurisation](#sécurisation)
5. [Optimisation](#optimisation)
6. [Analyse des Logs](#analyse-des-logs)
7. [Tests de Performance](#tests-de-performance)
8. [Conclusion](#conclusion)
9. [Références](#références)

## Introduction
MousstassWeb est une application web permettant l'enregistrement, le chiffrement et le partage de conversations audio. Ce projet est une reconversion d'une application Java existante vers une architecture web moderne, en utilisant des conteneurs Docker et des pratiques DevOps.

## Architecture Technique
### Diagramme d'architecture
[Insérer diagramme C4]

### Composants principaux
1. **Frontend**: Interface utilisateur développée avec JavaScript et EJS
   - Gestion des enregistrements audio
   - Interface de partage sécurisé
   - Authentification utilisateur

2. **Backend**: API REST avec Node.js/Express
   - Authentification et gestion des utilisateurs
   - Chiffrement AES-256 des enregistrements
   - Vérification d'intégrité avec SHA-256

3. **Base de données**: MySQL dans un conteneur Docker
   - Stockage des métadonnées utilisateurs
   - Gestion des droits d'accès aux enregistrements

4. **Apache**: Serveur web et reverse proxy
   - Redirection HTTP vers HTTPS
   - Terminaison SSL
   - Compression et optimisation des ressources

## Dockerisation
### Structure des conteneurs
- **Frontend**: Serveur Node.js exposant l'interface utilisateur
- **Backend**: API Node.js/Express
- **MySQL**: Base de données
- **Apache**: Serveur web/proxy

### Avantages de la conteneurisation
- Isolation des services
- Facilité de déploiement
- Cohérence entre environnements
- Gestion simplifiée des dépendances

## Sécurisation
### HTTPS
- Mise en place d'un certificat SSL auto-signé (ou Let's Encrypt simulé)
- Configuration des protocoles et chiffrements sécurisés
- Redirections HTTP vers HTTPS

### Sécurisation de l'API
- Authentification par token JWT
- Protection contre les attaques CSRF
- En-têtes de sécurité (HSTS, X-Content-Type-Options, etc.)

### Chiffrement des données
- Chiffrement des enregistrements avec AES-256
- Hachage des mots de passe avec méthode sécurisée
- Vérification d'intégrité avec SHA-256

## Optimisation
### Mesures d'optimisation mises en place
- Activation du KeepAlive dans Apache
- Configuration de la compression (mod_deflate)
- Mise en cache des ressources statiques (mod_expires)
- Optimisation des images et ressources frontend

### Résultats obtenus
[Insérer graphique/tableau des améliorations de performance]

## Analyse des Logs
### Outils mis en place
- GoAccess pour l'analyse en temps réel
- Personnalisation du format de logs Apache

### Métriques clés
- Taux d'erreur
- Pages les plus consultées
- Temps de réponse moyen
- Distribution géographique des accès

## Tests de Performance
### Méthodologie
- Tests avec Apache Benchmark (ab)
- Scénarios testés (liste des scénarios)
- Métriques mesurées

### Résultats
[Insérer tableau des résultats de performance]

### Analyse et recommandations
- Points forts identifiés
- Opportunités d'amélioration
- Recommandations pour optimisations futures

## Conclusion
### Objectifs atteints
- Reconversion réussie de l'application Java en application web
- Architecture moderne et sécurisée
- Bonnes pratiques DevOps mises en place

### Perspectives d'évolution
- Améliorations futures possibles
- Fonctionnalités additionnelles envisagées

## Références
- [Documentation Docker](https://docs.docker.com/)
- [Documentation Apache](https://httpd.apache.org/docs/)
- [Documentation Express.js](https://expressjs.com/)
- [Documentation GoAccess](https://goaccess.io/) 