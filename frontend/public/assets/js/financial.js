/**
 * Service de gestion des données financières
 */
const financialService = {
    /**
     * Récupère la liste des données financières
     * @param {number} page - Numéro de page
     * @param {number} limit - Nombre d'éléments par page
     * @param {string} dataType - Type de données (optionnel)
     * @returns {Promise<Object>} Réponse de l'API
     */
    async getFinancialData(page = 1, limit = config.defaultPageSize, dataType = null) {
      try {
        const params = { page, limit };
        
        if (dataType) {
          params.type = dataType;
        }
        
        return await api.get('/financial/user', params);
      } catch (error) {
        console.error('Erreur lors de la récupération des données financières', error);
        throw error;
      }
    },
  
    /**
     * Récupère des données financières par ID
     * @param {number} id - ID des données
     * @returns {Promise<Object>} Réponse de l'API
     */
    async getFinancialDataById(id) {
      try {
        return await api.get(`/financial/${id}`);
      } catch (error) {
        console.error('Erreur lors de la récupération des données financières', error);
        throw error;
      }
    },
  
    /**
     * Récupère le contenu déchiffré des données financières
     * @param {number} id - ID des données
     * @returns {Promise<Object>} Réponse de l'API
     */
    async getFinancialContent(id) {
      try {
        return await api.get(`/financial/${id}/content`);
      } catch (error) {
        console.error('Erreur lors de la récupération du contenu des données financières', error);
        throw error;
      }
    },
  
    /**
     * Crée de nouvelles données financières
     * @param {Object} data - Données à créer
     * @returns {Promise<Object>} Réponse de l'API
     */
    async createFinancialData(data) {
      try {
        return await api.post('/financial', data);
      } catch (error) {
        console.error('Erreur lors de la création des données financières', error);
        throw error;
      }
    },
  
    /**
     * Met à jour des données financières
     * @param {number} id - ID des données
     * @param {Object} data - Données à mettre à jour
     * @returns {Promise<Object>} Réponse de l'API
     */
    async updateFinancialData(id, data) {
      try {
        return await api.put(`/financial/${id}`, data);
      } catch (error) {
        console.error('Erreur lors de la mise à jour des données financières', error);
        throw error;
      }
    },
  
    /**
     * Supprime des données financières
     * @param {number} id - ID des données
     * @returns {Promise<Object>} Réponse de l'API
     */
    async deleteFinancialData(id) {
      try {
        return await api.delete(`/financial/${id}`);
      } catch (error) {
        console.error('Erreur lors de la suppression des données financières', error);
        throw error;
      }
    },
  
    /**
     * Crée un élément de liste pour les données financières
     * @param {Object} data - Données financières
     * @returns {HTMLElement} Élément de liste
     */
    createFinancialListItem(data) {
      // Clonage du template
      const template = document.getElementById('financial-item-template');
      const item = document.importNode(template.content, true).firstElementChild;
      
      // Définition des données
      item.dataset.id = data.id;
      
      // Type
      const type = item.querySelector('.financial-type');
      type.textContent = this.getDataTypeLabel(data.data_type);
      
      // Notes
      const notes = item.querySelector('.financial-notes');
      notes.textContent = data.notes || 'Aucune note';
      
      // Date
      const date = item.querySelector('.financial-date');
      date.textContent = utils.formatDate(data.created_at);
      
      // Événements
      const viewBtn = item.querySelector('.financial-view');
      const editBtn = item.querySelector('.financial-edit');
      const deleteBtn = item.querySelector('.financial-delete');
      
      // Affichage
      viewBtn.addEventListener('click', async () => {
        try {
          // Affichage du chargement
          viewBtn.innerHTML = '<div class="loading-spinner-small"></div>';
          
          // Récupération du contenu
          const contentData = await this.getFinancialContent(data.id);
          
          // Ouverture de la modal
          const modal = document.getElementById('modal-container');
          const modalTitle = modal.querySelector('.modal-title');
          const modalContent = modal.querySelector('.modal-content');
          
          modalTitle.textContent = `Données Financières - ${this.getDataTypeLabel(data.data_type)}`;
          
          // Affichage du contenu
          modalContent.innerHTML = `
            <div class="financial-content">
              <div class="financial-content-header">
                <div><strong>Type:</strong> ${this.getDataTypeLabel(data.data_type)}</div>
                <div><strong>Créé le:</strong> ${utils.formatDate(data.created_at)}</div>
              </div>
              <div class="financial-content-body">
                <h4>Contenu</h4>
                <pre>${utils.escapeHTML(contentData.content)}</pre>
                
                <h4>Notes</h4>
                <p>${utils.escapeHTML(data.notes || 'Aucune note')}</p>
              </div>
            </div>
            <div class="form-buttons">
              <button class="btn btn-secondary modal-close">Fermer</button>
            </div>
          `;
          
          // Affichage de la modal
          modal.style.display = 'flex';
          
          // Restauration du bouton
          viewBtn.innerHTML = '<i class="icon icon-eye"></i>';
        } catch (error) {
          console.error('Erreur lors de l\'affichage des données', error);
          utils.showNotification('Erreur lors de l\'affichage des données', 'error');
          viewBtn.innerHTML = '<i class="icon icon-eye"></i>';
        }
      });
      
      // Édition
      editBtn.addEventListener('click', async () => {
        try {
          // Récupération du contenu
          const contentData = await this.getFinancialContent(data.id);
          
          // Ouverture de la modal d'édition
          const modal = document.getElementById('modal-container');
          const modalTitle = modal.querySelector('.modal-title');
          const modalContent = modal.querySelector('.modal-content');
          
          modalTitle.textContent = 'Modifier les données financières';
          
          // Formulaire d'édition
          modalContent.innerHTML = `
            <form id="edit-financial-form">
              <div class="form-group">
                <label for="edit-content">Contenu</label>
                <textarea id="edit-content" name="content" rows="8" required>${utils.escapeHTML(contentData.content)}</textarea>
              </div>
              <div class="form-group">
                <label for="edit-notes">Notes</label>
                <textarea id="edit-notes" name="notes">${utils.escapeHTML(data.notes || '')}</textarea>
              </div>
              <div class="form-buttons">
                <button type="submit" class="btn btn-primary">Enregistrer</button>
                <button type="button" class="btn btn-secondary modal-close">Annuler</button>
              </div>
            </form>
          `;
          
          // Soumission du formulaire
          const form = modalContent.querySelector('#edit-financial-form');
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
              const formData = new FormData(form);
              const updateData = {
                content: formData.get('content'),
                notes: formData.get('notes')
              };
              
              // Mise à jour des données
              await this.updateFinancialData(data.id, updateData);
              
              // Fermeture de la modal
              modal.style.display = 'none';
              
              // Notification
              utils.showNotification('Données mises à jour avec succès', 'success');
              
              // Mise à jour de la liste
              this.loadFinancialList();
            } catch (error) {
              console.error('Erreur lors de la mise à jour des données', error);
              utils.showNotification('Erreur lors de la mise à jour', 'error');
            }
          });
          
          // Affichage de la modal
          modal.style.display = 'flex';
        } catch (error) {
          console.error('Erreur lors de l\'édition des données', error);
          utils.showNotification('Erreur lors de l\'édition des données', 'error');
        }
      });
      
      // Suppression
      deleteBtn.addEventListener('click', async () => {
        const confirmed = await utils.confirmDialog('Êtes-vous sûr de vouloir supprimer ces données financières ?');
        
        if (confirmed) {
          try {
            await this.deleteFinancialData(data.id);
            
            // Notification
            utils.showNotification('Données supprimées avec succès', 'success');
            
            // Suppression de l'élément de la liste
            item.remove();
          } catch (error) {
            console.error('Erreur lors de la suppression des données', error);
            utils.showNotification('Erreur lors de la suppression', 'error');
          }
        }
      });
      
      return item;
    },
  
    /**
     * Retourne le libellé du type de données
     * @param {string} dataType - Type de données
     * @returns {string} Libellé
     */
    getDataTypeLabel(dataType) {
      const types = {
        'investment': 'Investissement',
        'revenue': 'Revenus',
        'expense': 'Dépenses',
        'projection': 'Projections'
      };
      
      return types[dataType] || dataType;
    },
  
    /**
     * Charge la liste des données financières
     * @param {number} page - Numéro de page
     * @param {string} dataType - Type de données (optionnel)
     */
    async loadFinancialList(page = 1, dataType = null) {
      try {
        const financialList = document.getElementById('financial-list');
        const paginationContainer = document.getElementById('financial-pagination');
        
        if (!financialList) return;
        
        // Affichage du chargement
        financialList.innerHTML = '<div class="loading-spinner"></div>';
        
        // Récupération des données
        const response = await this.getFinancialData(page, config.defaultPageSize, dataType);
        
        // Vérification si des données existent
        if (!response.data || response.data.length === 0) {
          financialList.innerHTML = '<div class="empty-list">Aucune donnée financière trouvée</div>';
          paginationContainer.innerHTML = '';
          return;
        }
        
        // Affichage des données
        financialList.innerHTML = '';
        response.data.forEach(item => {
          const element = this.createFinancialListItem(item);
          financialList.appendChild(element);
        });
        
        // Pagination
        if (paginationContainer) {
          const totalPages = Math.ceil(response.total / response.limit);
          
          if (totalPages > 1) {
            const pagination = utils.createPagination(
              response.page,
              totalPages,
              (newPage) => this.loadFinancialList(newPage, dataType)
            );
            
            paginationContainer.innerHTML = '';
            paginationContainer.appendChild(pagination);
          } else {
            paginationContainer.innerHTML = '';
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données financières', error);
        const financialList = document.getElementById('financial-list');
        
        if (financialList) {
          financialList.innerHTML = '<div class="error-message">Erreur lors du chargement des données</div>';
        }
      }
    }
  };