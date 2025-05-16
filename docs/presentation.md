# Présentation du Projet MousstassWeb

## Introduction

MousstassWeb est une application web sécurisée permettant l'enregistrement, le chiffrement et le partage de conversations audio. L'application offre une expérience utilisateur complète et intuitive avec un focus particulier sur la sécurité des données.

## Objectifs du projet

- Créer une plateforme sécurisée pour enregistrer des conversations sensibles
- Assurer la confidentialité par un chiffrement de bout en bout
- Permettre un partage contrôlé des enregistrements
- Offrir une interface utilisateur intuitive et réactive

## Architecture technique

Le projet est basé sur une architecture moderne et modulaire :

### Frontend
- Interface utilisateur développée en JavaScript vanilla
- Communication avec l'API via des requêtes AJAX
- Interface responsive et intuitive

### Backend
- API REST avec Node.js et Express.js
- Authentification sécurisée par JWT (JSON Web Tokens)
- Chiffrement des données avec des clés asymétriques et AES
- Base de données MySQL pour le stockage des métadonnées

### Dockerisation
- Configuration multi-conteneurs avec Docker Compose
- Déploiement simplifié et cohérent
- Isolation des composants (frontend, backend, base de données)

## Fonctionnalités principales

1. **Gestion des utilisateurs**
   - Inscription et connexion sécurisées
   - Profils utilisateurs personnalisables
   - Gestion des préférences

2. **Enregistrement audio**
   - Capture audio depuis le navigateur
   - Stockage sécurisé et chiffré
   - Organisation et métadonnées des enregistrements

3. **Partage sécurisé**
   - Contrôle granulaire des permissions
   - Partage direct avec d'autres utilisateurs
   - Liens de partage à durée limitée

4. **Sécurité**
   - Chiffrement des enregistrements avec AES
   - Clés de chiffrement protégées par cryptographie asymétrique
   - Protection contre les attaques communes (CSRF, XSS, Injection)

## Méthodologie de développement

- Modélisation avec diagrammes C4
- Développement API-first
- Tests automatisés pour les fonctionnalités critiques
- Intégration continue avec GitHub Actions
- Analyse de qualité avec SonarCloud

## Démonstration

(Section à compléter lors de la présentation avec des captures d'écran et exemples concrets)

## Perspectives et améliorations

- Applications mobiles natives
- Intégration de la reconnaissance vocale
- Transcription automatique des enregistrements
- Intégration avec des services tiers (stockage cloud, agenda, etc.)

## Conclusion

MousstassWeb offre une solution complète et sécurisée pour la gestion des enregistrements audio sensibles, répondant aux besoins des utilisateurs professionnels et personnels soucieux de la confidentialité de leurs conversations. 