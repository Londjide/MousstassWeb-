# Configuration SonarCloud pour MousstassWeb

Ce document explique comment configurer et utiliser SonarCloud pour l'analyse continue de la qualité du code du projet MousstassWeb.

## Prérequis

1. Un compte GitHub
2. Un compte SonarCloud (connecté avec GitHub)
3. Accès administrateur au dépôt GitHub du projet

## Configuration initiale

### 1. Connecter le dépôt à SonarCloud

1. Connectez-vous à [SonarCloud](https://sonarcloud.io/) avec votre compte GitHub
2. Cliquez sur "+" puis "Analyze new project"
3. Sélectionnez l'organisation GitHub et le dépôt MousstassWeb
4. Suivez les instructions pour compléter la configuration

### 2. Configurer les secrets GitHub

Dans votre dépôt GitHub, ajoutez les secrets suivants:

1. Allez dans "Settings" > "Secrets" > "Actions"
2. Ajoutez un nouveau secret:
   - Nom: `SONAR_TOKEN`
   - Valeur: Votre token SonarCloud (généré lors de la configuration sur SonarCloud)

## Exécution de l'analyse

L'analyse SonarCloud est automatiquement exécutée:
- À chaque push sur la branche `main`
- À chaque pull request vers `main`
- Manuellement via l'interface GitHub Actions

### Exécution locale de l'analyse

Pour exécuter une analyse SonarCloud localement avant de soumettre votre code:

1. Installez le SonarScanner: [Instructions d'installation](https://docs.sonarcloud.io/advanced-setup/ci-based-analysis/sonarscanner-cli/)
2. Exécutez les commandes suivantes:

```bash
# Générer les rapports de test et d'ESLint
cd backend
npm run lint -- -f json -o ../reports/eslint-report.json
npm test -- --coverage

# Exécuter l'analyse SonarCloud (nécessite le token)
sonar-scanner -Dsonar.token=YOUR_SONAR_TOKEN
```

## Interprétation des résultats

Après chaque analyse, consultez les résultats sur:
- Le tableau de bord SonarCloud du projet: https://sonarcloud.io/summary/new_code?id=Londjide_MousstassWeb-
- Les vérifications GitHub (dans les pull requests)

Les principales métriques à surveiller:
- Bugs: Problèmes qui peuvent causer des comportements incorrects
- Vulnérabilités: Failles de sécurité potentielles
- Code Smells: Problèmes qui compliquent la maintenance
- Couverture de code: Pourcentage du code couvert par les tests
- Duplication: Code dupliqué qui pourrait être refactorisé

## Badge de qualité

Vous pouvez ajouter un badge de qualité SonarCloud à votre README.md:

```markdown
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Londjide_MousstassWeb-&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Londjide_MousstassWeb-)
```

## Liens utiles

- [Documentation SonarCloud](https://docs.sonarcloud.io/)
- [Best Practices pour JavaScript/Node.js](https://docs.sonarcloud.io/analyzing-source-code/languages/javascript/) 