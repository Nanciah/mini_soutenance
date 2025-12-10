import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '../services/api';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import io from 'socket.io-client';

const socket = io();

const EspaceAdmin = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [inscriptions, setInscriptions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ statut: '' });
  const [showModal, setShowModal] = useState(false);
  const [currentInscription, setCurrentInscription] = useState(null);
  const [modalData, setModalData] = useState({ salle_examen: '', centre_examen: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [inscriptionToDelete, setInscriptionToDelete] = useState(null);

  // RÉINITIALISATION MOT DE PASSE

    const [demandesReset, setDemandesReset] = useState([]);
  const [loadingReset, setLoadingReset] = useState(true);
  const [resetLogin, setResetLogin] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const chargerInscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminService.getInscriptions(filters);
      setInscriptions(response.data);
    } catch (error) {
      toast.error('Erreur chargement inscriptions');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const chargerStats = async () => {
    try {
      const response = await adminService.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  };

useEffect(() => {
  // Chargement initial
  chargerInscriptions();
  chargerStats();
  chargerDemandesReset();

  // Gestion des nouveaux messages chat
  const handleNewMessage = () => {
    if (window.location.pathname !== '/chat') {
      setUnreadCount(prev => prev + 1);
    }
  };

  // Gestion nouvelle demande de reset mot de passe
  const handleNouvelleDemandeReset = () => {
    toast.success('Nouvelle demande de réinitialisation reçue !');
    chargerDemandesReset(); // recharge la liste automatiquement
  };

  // Abonnements Socket.io
  socket.on('nouveau-message', handleNewMessage);
  socket.on('nouvelle-demande-reset', handleNouvelleDemandeReset);

  // Nettoyage propre à la désinscription
  return () => {
    socket.off('nouveau-message', handleNewMessage);
    socket.off('nouvelle-demande-reset', handleNouvelleDemandeReset);
  };
}, [chargerInscriptions]); // garder chargerInscriptions si tu veux recharger au changement de filtre

  // RÉINITIALISER MOT DE PASSE
  const handleResetPassword = async () => {
    if (!resetLogin.trim()) return toast.error('Entrez le login');

    setResetting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/reset-etablissement-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ login: resetLogin })
      });

      const data = await res.json();
      if (res.ok) {
        setResetMessage(`Mot de passe réinitialisé pour ${resetLogin} → sisco2024`);
        toast.success('Mot de passe réinitialisé !');
        setResetLogin('');
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch (err) {
      toast.error('Erreur réseau');
    } finally {
      setResetting(false);
    }
  };

  const ouvrirModal = (inscription, statut) => {
    setCurrentInscription({ ...inscription, nouveauStatut: statut });
    setModalData({
      salle_examen: inscription.salle_examen || '',
      centre_examen: inscription.centre_examen || ''
    });
    setShowModal(true);
  };

  const fermerModal = () => {
    setShowModal(false);
    setCurrentInscription(null);
    setModalData({ salle_examen: '', centre_examen: '' });
  };

  const validerModal = async () => {
    if (!modalData.salle_examen || !modalData.centre_examen) {
      toast.error('Salle et centre requis');
      return;
    }

    try {
      await adminService.updateInscription(currentInscription.id, {
        statut: currentInscription.nouveauStatut,
        salle_examen: modalData.salle_examen,
        centre_examen: modalData.centre_examen
      });
      toast.success('Inscription mise à jour !');
      fermerModal();
      chargerInscriptions();
      chargerStats();
    } catch (error) {
      toast.error('Erreur mise à jour');
    }
  };

  const ouvrirDeleteModal = (inscription) => {
    setInscriptionToDelete(inscription);
    setShowDeleteModal(true);
  };

  const fermerDeleteModal = () => {
    setShowDeleteModal(false);
    setInscriptionToDelete(null);
  };

  const supprimerInscription = async () => {
    if (!inscriptionToDelete) return;

    try {
      await adminService.updateInscription(inscriptionToDelete.id, {
        statut: 'refuse',
        salle_examen: '',
        centre_examen: ''
      });
      toast.success('Inscription refusée');
      fermerDeleteModal();
      chargerInscriptions();
      chargerStats();
    } catch (error) {
      toast.error('Erreur refus');
    }
  };

    const chargerDemandesReset = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/demandes-reset-password', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setDemandesReset(data);
    } catch (err) {
      console.error('Erreur chargement demandes');
    } finally {
      setLoadingReset(false);
    }
  };

  const showConfirmationToast = (demande) => {
  toast(
    <div style={{ textAlign: 'center' }}>
      <p><strong>Réinitialiser le mot de passe de</strong><br/>{demande.nom_etablissement} ?</p>
      <p style={{ fontSize: '0.9rem', color: '#666', margin: '0.5rem 0' }}>
        Nouveau mot de passe : <strong>sisco2024</strong>
      </p>
      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button 
          onClick={() => {
            handleValiderReset(demande);
            toast.dismiss();
          }} 
          style={{ background: '#4CAF50', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer' }}
        >
          Oui, réinitialiser
        </button>
        <button 
          onClick={() => toast.dismiss()} 
          style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer' }}
        >
          Annuler
        </button>
      </div>
    </div>,
    { 
      duration: 15000,
      position: "top-center"
    }
  );
};

  const handleValiderReset = async (demande) => {
    toast((t) => (
  <div style={{ textAlign: 'center' }}>
    <p><strong>Réinitialiser le mot de passe de</strong><br/>{demande.nom_etablissement} ?</p>
    <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
      <button 
        onClick={() => {
          handleValiderReset(demande);
          toast.dismiss(t.id);
        }} 
        style={{ background: '#4CAF50', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px' }}
      >
        Oui, réinitialiser
      </button>
      <button 
        onClick={() => toast.dismiss(t.id)} 
        style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px' }}
      >
        Annuler
      </button>
    </div>
  </div>
), { duration: 10000 });

    try {
      const res = await fetch('http://localhost:5000/api/admin/valider-reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ login: demande.login })
      });

      if (res.ok) {
        toast.success(`Mot de passe réinitialisé pour ${demande.nom_etablissement} → sisco2024`);
        chargerDemandesReset();
      }
    } catch (err) {
      toast.error('Erreur');
    }
  };

  const getStatutBadge = (statut) => {
    const badges = {
      en_attente: 'badge-en_attente',
      accepte: 'badge-accepte',
      refuse: 'badge-refuse'
    };
    return <span className={`badge ${badges[statut] || 'badge-en_attente'}`}>
      {statut?.replace('_', ' ') || 'En attente'}
    </span>;
  };

  return (
    <div className="espace-admin">
      <div className="admin-header">
        <div className="header-content">
          <div className="header-icon">🏛️</div>
          <div className="header-text">
            <h1>Espace Administration CISCO</h1>
            <p>Gestion complète des inscriptions et établissements</p>
          </div>
        </div>
      </div>

            {/* DEMANDES DE RÉINITIALISATION MOT DE PASSE */}
      <div className="card management-card" style={{ marginTop: '3rem' }}>
        <div className="card-header">
          <h2>Réinitialisation de mot de passe</h2>
          <span style={{ 
            background: demandesReset.length > 0 ? '#e91e63' : '#4caf50', 
            color: 'white', 
            padding: '0.5rem 1.2rem', 
            borderRadius: '30px', 
            fontSize: '1rem', 
            fontWeight: 'bold' 
          }}>
            {demandesReset.length} demande{demandesReset.length > 1 ? 's' : ''} en attente
          </span>
        </div>

        

        {loadingReset ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            Chargement des demandes...
          </div>
        ) : demandesReset.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
            <p>Aucune demande de réinitialisation pour le moment</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Établissement</th>
                  <th>Login</th>
                  <th>Directeur</th>
                  <th>Téléphone</th>
                  <th>Motif</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {demandesReset.map((d, i) => (
                  <tr key={i}>
                    <td>{new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
                    <td><strong>{d.nom_etablissement}</strong></td>
                    <td><code>{d.login}</code></td>
                    <td>{d.directeur_prenom} {d.directeur_nom}</td>
                    <td>{d.telephone}</td>
                    <td>{d.motif_demande === 'oubli' ? 'Oubli' : d.motif_demande}</td>
                   <td>
  <button 
    onClick={() => showConfirmationToast(d)}
    style={{ 
      background: '#4CAF50', 
      color: 'white', 
      border: 'none', 
      padding: '0.6rem 1.2rem', 
      borderRadius: '8px', 
      cursor: 'pointer',
      fontWeight: '600'
    }}
  >
    Réinitialiser
  </button>
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ACTIONS RAPIDES */}
      <div className="quick-actions">
        <Link 
          to="/chat" 
          onClick={() => setUnreadCount(0)}
          className="action-card chat-card"
        >
          <div className="card-icon">💬</div>
          <div className="card-content">
            <h3>Chat Général</h3>
            <p>Communication avec les établissements</p>
          </div>
          {unreadCount > 0 && (
            <span className="unread-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        <Link to="/creer-etablissement" className="action-card create-card">
          <div className="card-icon">🏫</div>
          <div className="card-content">
            <h3>Nouvel établissement</h3>
            <p>Ajouter une école à la plateforme</p>
          </div>
        </Link>

        <div className="action-card stats-card">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <h3>Statistiques</h3>
            <p>Vue d'ensemble des inscriptions</p>
          </div>
        </div>
      </div>

      {/* RÉINITIALISATION MOT DE PASSE */}
      <div className="reset-password-section">
        <div className="section-header">
          <h2>🔐 Réinitialisation de mot de passe</h2>
          <p>En cas d'oubli, le mot de passe sera réinitialisé à <strong>sisco2024</strong></p>
        </div>
        
        <div className="reset-form">
          <div className="input-group">
            <input 
              type="text"
              placeholder="Login de l'établissement (ex: etab_401030301)"
              value={resetLogin}
              onChange={e => setResetLogin(e.target.value)}
              className="reset-input"
            />
            <button 
              onClick={handleResetPassword}
              disabled={resetting || !resetLogin.trim()}
              className={`reset-btn ${resetting ? 'loading' : ''}`}
            >
              {resetting ? (
                <>
                  <div className="spinner"></div>
                  Réinitialisation...
                </>
              ) : (
                '🔑 Réinitialiser'
              )}
            </button>
          </div>
        </div>

        {resetMessage && (
          <div className="success-message">
            <span className="success-icon">✅</span>
            {resetMessage}
          </div>
        )}
      </div>

      {/* STATS */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card total">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <h3>{stats.inscriptions.total}</h3>
              <p>Total Inscriptions</p>
            </div>
          </div>
          <div className="stat-card pending">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <h3>{stats.inscriptions.en_attente}</h3>
              <p>En attente</p>
            </div>
          </div>
          <div className="stat-card accepted">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>{stats.inscriptions.accepte}</h3>
              <p>Acceptées</p>
            </div>
          </div>
          <div className="stat-card refused">
            <div className="stat-icon">❌</div>
            <div className="stat-content">
              <h3>{stats.inscriptions.refuse}</h3>
              <p>Refusées</p>
            </div>
          </div>
        </div>
      )}

      {/* GESTION DES INSCRIPTIONS */}
      <div className="management-section">
        <div className="section-header">
          <h2>📋 Gestion des Inscriptions</h2>
          <div className="header-actions">
            <select 
              value={filters.statut} 
              onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
              className="filter-select"
            >
              <option value="">Tous les statuts</option>
              <option value="en_attente">En attente</option>
              <option value="accepte">Accepté</option>
              <option value="refuse">Refusé</option>
            </select>
            <button onClick={chargerInscriptions} disabled={loading} className="refresh-btn">
              {loading ? '🔄 Actualisation...' : '🔄 Actualiser'}
            </button>
          </div>
        </div>

        {inscriptions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>Aucune inscription trouvée</h3>
            <p>Aucune inscription ne correspond aux critères sélectionnés</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Élève</th>
                  <th>Établissement</th>
                  <th>Examen</th>
                  <th>Date Naissance</th>
                  <th>Statut</th>
                  <th>Salle</th>
                  <th>Centre</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inscriptions.map(inscription => (
                  <tr key={inscription.id}>
                    <td>
                      <div className="student-info">
                        <strong>{inscription.eleve_nom} {inscription.eleve_prenom}</strong>
                      </div>
                    </td>
                    <td>{inscription.etablissement_nom}</td>
                    <td>{inscription.examen_nom}</td>
                    <td>{new Date(inscription.date_naissance).toLocaleDateString('fr-FR')}</td>
                    <td>{getStatutBadge(inscription.statut)}</td>
                    <td>
                      <span className={`salle-info ${!inscription.salle_examen ? 'empty' : ''}`}>
                        {inscription.salle_examen || 'Non affectée'}
                      </span>
                    </td>
                    <td>
                      <span className={`centre-info ${!inscription.centre_examen ? 'empty' : ''}`}>
                        {inscription.centre_examen || 'Non affecté'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          onClick={() => ouvrirModal(inscription, 'accepte')} 
                          disabled={inscription.statut === 'accepte'} 
                          className="btn btn-accept"
                        >
                          ✅ Accepter
                        </button>
                        <button 
                          onClick={() => ouvrirDeleteModal(inscription)} 
                          disabled={inscription.statut === 'refuse'} 
                          className="btn btn-delete"
                        >
                          ❌ Refuser
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALES */}
      {showModal && currentInscription && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>🎓 Affecter la salle et le centre d'examen</h3>
              <button onClick={fermerModal} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div className="student-details">
                <p><strong>Élève:</strong> {currentInscription.eleve_nom} {currentInscription.eleve_prenom}</p>
                <p><strong>Examen:</strong> {currentInscription.examen_nom}</p>
              </div>
              <div className="input-group">
                <label>Salle d'examen</label>
                <input 
                  value={modalData.salle_examen} 
                  onChange={e => setModalData({...modalData, salle_examen: e.target.value})} 
                  placeholder="Ex: Salle A1" 
                />
              </div>
              <div className="input-group">
                <label>Centre d'examen</label>
                <input 
                  value={modalData.centre_examen} 
                  onChange={e => setModalData({...modalData, centre_examen: e.target.value})} 
                  placeholder="Ex: Centre Ville" 
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={fermerModal} className="btn btn-secondary">Annuler</button>
              <button onClick={validerModal} className="btn btn-primary">✅ Confirmer l'affectation</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && inscriptionToDelete && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>⚠️ Confirmer le refus</h3>
              <button onClick={fermerDeleteModal} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <p>Êtes-vous sûr de vouloir refuser l'inscription de :</p>
              <div className="refusal-details">
                <strong>{inscriptionToDelete.eleve_nom} {inscriptionToDelete.eleve_prenom}</strong>
                <br />
                <span>{inscriptionToDelete.etablissement_nom} - {inscriptionToDelete.examen_nom}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={fermerDeleteModal} className="btn btn-secondary">Annuler</button>
              <button onClick={supprimerInscription} className="btn btn-danger">❌ Confirmer le refus</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .espace-admin {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          min-height: 100vh;
        }

        .admin-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 3rem 2rem;
          border-radius: 24px;
          margin-bottom: 3rem;
          box-shadow: 0 20px 40px rgba(102, 126, 234, 0.3);
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .header-icon {
          font-size: 4rem;
          background: rgba(255, 255, 255, 0.2);
          padding: 1.5rem;
          border-radius: 20px;
          backdrop-filter: blur(10px);
        }

        .header-text h1 {
          font-size: 2.5rem;
          font-weight: 800;
          margin: 0 0 0.5rem 0;
          color: white;
        }

        .header-text p {
          font-size: 1.2rem;
          opacity: 0.9;
          margin: 0;
        }

        .quick-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          margin-bottom: 3rem;
        }

        .action-card {
          position: relative;
          background: white;
          padding: 2rem;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          text-decoration: none;
          color: inherit;
          transition: all 0.3s ease;
          border: 2px solid transparent;
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .action-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }

        .chat-card { border-color: #667eea; }
        .create-card { border-color: #4CAF50; }
        .stats-card { border-color: #FF9800; }

        .card-icon {
          font-size: 2.5rem;
          padding: 1rem;
          border-radius: 15px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }

        .create-card .card-icon { background: linear-gradient(135deg, #4CAF50, #45a049); }
        .stats-card .card-icon { background: linear-gradient(135deg, #FF9800, #F57C00); }

        .card-content h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.3rem;
          color: #2d3748;
        }

        .card-content p {
          margin: 0;
          color: #718096;
          font-size: 0.9rem;
        }

        .unread-badge {
          position: absolute;
          top: -10px;
          right: -10px;
          background: #e74c3c;
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          font-size: 0.9rem;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse 2s infinite;
          box-shadow: 0 4px 15px rgba(231,76,60,0.4);
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .reset-password-section {
          background: white;
          padding: 2.5rem;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(255, 152, 0, 0.1);
          margin-bottom: 3rem;
          border-left: 6px solid #FF9800;
        }

        .section-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .section-header h2 {
          color: #2d3748;
          font-size: 1.8rem;
          margin-bottom: 0.5rem;
        }

        .section-header p {
          color: #718096;
          font-size: 1.1rem;
        }

        .input-group {
          display: flex;
          gap: 1rem;
          max-width: 800px;
          margin: 0 auto;
          flex-wrap: wrap;
        }

        .reset-input {
          flex: 1;
          min-width: 300px;
          padding: 1rem 1.5rem;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 1rem;
          transition: all 0.3s;
        }

        .reset-input:focus {
          outline: none;
          border-color: #FF9800;
          box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.1);
        }

        .reset-btn {
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #FF9800, #F57C00);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .reset-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .reset-btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(255, 152, 0, 0.4);
        }

        .reset-btn.loading {
          background: #a0aec0;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .success-message {
          margin-top: 1.5rem;
          padding: 1.5rem;
          background: #f0fff4;
          border: 2px solid #9ae6b4;
          border-radius: 12px;
          text-align: center;
          color: #2f855a;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .stat-card {
          background: white;
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 5px 20px rgba(0,0,0,0.08);
          text-align: center;
          transition: transform 0.3s;
          border-left: 4px solid;
        }

        .stat-card:hover {
          transform: translateY(-5px);
        }

        .total { border-color: #667eea; }
        .pending { border-color: #FF9800; }
        .accepted { border-color: #4CAF50; }
        .refused { border-color: #e74c3c; }

        .stat-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }

        .stat-content h3 {
          font-size: 2.5rem;
          margin: 0;
          color: #2d3748;
        }

        .stat-content p {
          margin: 0.5rem 0 0 0;
          color: #718096;
          font-weight: 600;
        }

        .management-section {
          background: white;
          padding: 2.5rem;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .management-section .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          text-align: left;
        }

        .header-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .filter-select, .refresh-btn {
          padding: 0.8rem 1.2rem;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.9rem;
          background: white;
          cursor: pointer;
          transition: all 0.3s;
        }

        .filter-select:focus, .refresh-btn:hover {
          border-color: #667eea;
          outline: none;
        }

        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #718096;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state h3 {
          margin: 0 0 0.5rem 0;
          color: #4a5568;
        }

        .table-container {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
        }

        .data-table th {
          background: #f7fafc;
          padding: 1.2rem;
          text-align: left;
          font-weight: 600;
          color: #4a5568;
          border-bottom: 2px solid #e2e8f0;
        }

        .data-table td {
          padding: 1.2rem;
          border-bottom: 1px solid #edf2f7;
          vertical-align: middle;
        }

        .data-table tr:hover {
          background: #f7fafc;
        }

        .student-info {
          font-weight: 600;
          color: #2d3748;
        }

        .badge {
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .badge-en_attente { background: #fffaf0; color: #dd6b20; border: 1px solid #fed7aa; }
        .badge-accepte { background: #f0fff4; color: #38a169; border: 1px solid #9ae6b4; }
        .badge-refuse { background: #fff5f5; color: #e53e3e; border: 1px solid #fed7d7; }

        .salle-info, .centre-info {
          padding: 0.3rem 0.6rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .salle-info.empty, .centre-info.empty {
          background: #fed7d7;
          color: #c53030;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .btn {
          padding: 0.6rem 1rem;
          border: none;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        .btn-accept {
          background: #f0fff4;
          color: #38a169;
          border: 1px solid #9ae6b4;
        }

        .btn-accept:not(:disabled):hover {
          background: #38a169;
          color: white;
          transform: translateY(-2px);
        }

        .btn-delete {
          background: #fff5f5;
          color: #e53e3e;
          border: 1px solid #fed7d7;
        }

        .btn-delete:not(:disabled):hover {
          background: #e53e3e;
          color: white;
          transform: translateY(-2px);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem;
        }

        .modal {
          background: white;
          border-radius: 20px;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 2rem 2rem 1rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-header h3 {
          margin: 0;
          color: #2d3748;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #718096;
          padding: 0.5rem;
        }

        .modal-close:hover {
          color: #2d3748;
        }

        .modal-body {
          padding: 2rem;
        }

        .student-details, .refusal-details {
          background: #f7fafc;
          padding: 1.5rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
        }

        .modal-body .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .modal-body label {
          font-weight: 600;
          color: #4a5568;
        }

        .modal-body input {
          padding: 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 1rem;
          transition: all 0.3s;
        }

        .modal-body input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .modal-footer {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          padding: 1rem 2rem 2rem;
        }

        .btn-secondary {
          background: #e2e8f0;
          color: #4a5568;
          padding: 0.8rem 1.5rem;
        }

        .btn-secondary:hover {
          background: #cbd5e0;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 0.8rem 1.5rem;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        .btn-danger {
          background: linear-gradient(135deg, #e53e3e, #c53030);
          color: white;
          padding: 0.8rem 1.5rem;
        }

        .btn-danger:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(229, 62, 62, 0.4);
        }

        @media (max-width: 768px) {
          .espace-admin {
            padding: 1rem;
          }

          .header-content {
            flex-direction: column;
            text-align: center;
            gap: 1rem;
          }

          .quick-actions {
            grid-template-columns: 1fr;
          }

          .management-section .section-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .header-actions {
            justify-content: space-between;
          }

          .input-group {
            flex-direction: column;
          }

          .reset-input {
            min-width: auto;
          }

          .action-buttons {
            flex-direction: column;
          }

          .modal-footer {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default EspaceAdmin;