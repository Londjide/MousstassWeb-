const UserModel = require('./backend/src/models/user.model');

async function createUser() {
  try {
    const user = await UserModel.create({
      email: 'junior@missie.com',
      password: 'Missie25',  // Sans caractères spéciaux pour éviter les problèmes d'échappement
      username: 'junior',
      full_name: 'Junior Moustass'
    });
    
    console.log('Utilisateur créé avec succès:', JSON.stringify(user, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    process.exit(1);
  }
}

createUser(); 