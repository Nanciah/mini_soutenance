import React, { useState, useEffect, useCallback } from 'react';
import { inscriptionService, examenService } from '../services/api';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import { Link } from 'react-router-dom';

const socket = io();

const EspaceEtablissement = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('inscription');
  const [examens, setExamens] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [etablissementInfo, setEtablissementInfo] = useState(null);
  const [formData, setFormData] = useState({
    examen_id: '',
    eleves: [{ nom: '', prenom: '', date_naissance: '', lieu_naissance: '', sexe: '', contact: '' }]
  });
  const [passwordData, setPasswordData] = useState({ ancien: '', nouveau: '', confirmation: '' });
  const [stats, setStats] = useState({ total: 0, accepte: 0, refuse: 0, en_attente: 0 });

  const chargerInscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await inscriptionService.getEtablissementInscriptions();
      setInscriptions(res.data);
      
      // Calcul des statistiques
      const statsData = {
        total: res.data.length,
        accepte: res.data.filter(i => i.statut === 'accepte').length,
        refuse: res.data.filter(i => i.statut === 'refuse').length,
        en_attente: res.data.filter(i => i.statut === 'en_attente').length
      };
      setStats(statsData);
    } catch (err) {
      toast.error('Erreur chargement inscriptions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.type === 'etablissement') setEtablissementInfo(user);

    const chargerExamens = async () => {
      try {
        const res = await examenService.getExamens();
        setExamens(res.data);
      } catch (err) {
        toast.error('Erreur chargement examens');
      }
    };
    chargerExamens();

    if (activeTab === 'consultation') chargerInscriptions();

    if (etablissementInfo?.id) {
      const handler = (data) => {
        toast.info(
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{data.message}</div>
            {data.salle && (
              <div style={{ fontSize: '0.9em', opacity: 0.8 }}>
                🏫 Salle: {data.salle} • Centre: {data.centre}
              </div>
            )}
          </div>,
          { icon: '🔔' }
        );
        chargerInscriptions();
      };
      socket.on(`inscription-update-${etablissementInfo.id}`, handler);
      return () => socket.off(`inscription-update-${etablissementInfo.id}`, handler);
    }
  }, [activeTab, etablissementInfo?.id, chargerInscriptions]);

  // Badge de notification chat
  useEffect(() => {
    const handleNewMessage = () => {
      if (window.location.pathname !== '/chat') {
        setUnreadCount(prev => prev + 1);
      }
    };
    socket.on('nouveau-message', handleNewMessage);
    return () => socket.off('nouveau-message', handleNewMessage);
  }, []);

  const ajouterEleve = () => {
    setFormData({
      ...formData,
      eleves: [...formData.eleves, { nom: '', prenom: '', date_naissance: '', lieu_naissance: '', sexe: '', contact: '' }]
    });
  };

  const supprimerEleve = (index) => {
    if (formData.eleves.length > 1) {
      setFormData({
        ...formData,
        eleves: formData.eleves.filter((_, i) => i !== index)
      });
    }
  };

  const handleEleveChange = (index, field, value) => {
    const updated = [...formData.eleves];
    updated[index][field] = value;
    setFormData({ ...formData, eleves: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.examen_id) return toast.error('Choisissez un examen');

    const elevesValides = formData.eleves.filter(e => e.nom && e.prenom && e.date_naissance && e.sexe && e.contact);
    if (elevesValides.length === 0) return toast.error('Remplissez tous les champs obligatoires');

    setLoading(true);
    try {
      await inscriptionService.create({ examen_id: formData.examen_id, eleves: elevesValides });
      toast.success(
        <div>
          <div style={{ fontWeight: 'bold' }}>✅ Inscription réussie !</div>
          <div style={{ fontSize: '0.9em', opacity: 0.8 }}>
            {elevesValides.length} élève(s) inscrit(s) avec succès
          </div>
        </div>
      );
      setFormData({ examen_id: '', eleves: [{ nom: '', prenom: '', date_naissance: '', lieu_naissance: '', sexe: '', contact: '' }] });
      chargerInscriptions();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Échec inscription');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.nouveau !== passwordData.confirmation) return toast.error('Mots de passe différents');
    if (passwordData.nouveau.length < 6) return toast.error('Minimum 6 caractères');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/etablissement/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ancien_password: passwordData.ancien, nouveau_password: passwordData.nouveau })
      });
      const data = await res.json();
      toast[res.ok ? 'success' : 'error'](
        res.ok ? 
        <div>
          <div style={{ fontWeight: 'bold' }}>🔒 Mot de passe changé !</div>
          <div style={{ fontSize: '0.9em', opacity: 0.8 }}>Votre mot de passe a été mis à jour avec succès</div>
        </div> 
        : data.error
      );
      if (res.ok) setPasswordData({ ancien: '', nouveau: '', confirmation: '' });
    } catch (err) {
      toast.error('Erreur réseau');
    }
  };

  const exportInscriptions = () => {
    const csvContent = [
      ['Élève', 'Examen', 'Statut', 'Salle', 'Centre', 'Date Inscription'],
      ...inscriptions.map(i => [
        `${i.eleve_nom} ${i.eleve_prenom}`,
        i.examen_nom,
        i.statut,
        i.salle_examen || 'Non affectée',
        i.centre_examen || 'Non affecté',
        new Date(i.date_inscription).toLocaleDateString('fr-FR')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inscriptions-${etablissementInfo?.code}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('📊 Export CSV généré avec succès !');
  };

  return (
    <div className="espace-etablissement">
      {/* EN-TÊTE ÉTABLISSEMENT */}
      {etablissementInfo && (
        <div className="etab-header">
          <div className="header-background"></div>
          <div className="etab-icon">
            <div className="icon-wrapper">
              <i className="icon-school">🏫</i>
            </div>
          </div>
          <div className="etab-info">
            <h1>{etablissementInfo.nom}</h1>
            <div className="etab-details">
              <div className="detail-item">
                <span className="detail-label">Code :</span>
                <span className="detail-value">{etablissementInfo.code}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Secteur :</span>
                <span className="detail-value">{etablissementInfo.secteur}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Niveau :</span>
                <span className="detail-value">{etablissementInfo.niveau}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Commune :</span>
                <span className="detail-value">{etablissementInfo.commune}</span>
              </div>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-item">
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Total</div>
            </div>
            <div className="stat-item">
              <div className="stat-number accepte">{stats.accepte}</div>
              <div className="stat-label">Acceptées</div>
            </div>
            <div className="stat-item">
              <div className="stat-number en_attente">{stats.en_attente}</div>
              <div className="stat-label">En attente</div>
            </div>
            <div className="stat-item">
              <div className="stat-number refuse">{stats.refuse}</div>
              <div className="stat-label">Refusées</div>
            </div>
          </div>
        </div>
      )}

      {/* BOUTON CHAT AVEC BADGE */}
      <div className="chat-button-container">
        <Link 
          to="/chat" 
          onClick={() => setUnreadCount(0)}
          className="chat-button"
        >
          <i className="icon-chat">💬</i>
          Chat Général
          {unreadCount > 0 && (
            <span className="notification-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
      </div>

      {/* ONGLETS */}
      <div className="tabs-container">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'inscription' ? 'active' : ''}`} 
            onClick={() => setActiveTab('inscription')}
          >
            <i className="tab-icon">📝</i>
            Inscription Élèves
            <span className="tab-badge">{formData.eleves.length}</span>
          </button>
          <button 
            className={`tab ${activeTab === 'consultation' ? 'active' : ''}`} 
            onClick={() => setActiveTab('consultation')}
          >
            <i className="tab-icon">📋</i>
            Mes Inscriptions
            <span className="tab-badge">{inscriptions.length}</span>
          </button>
          <button 
            className={`tab ${activeTab === 'password' ? 'active' : ''}`} 
            onClick={() => setActiveTab('password')}
          >
            <i className="tab-icon">🔒</i>
            Sécurité
          </button>
        </div>
      </div>

      {/* CONTENU DES ONGLETS */}
      <div className="tab-content">
        {/* INSCRIPTION */}
        {activeTab === 'inscription' && (
          <div className="card">
            <div className="card-header">
              <h2>Inscription aux examens officiels</h2>
              <p>Remplissez le formulaire pour inscrire vos élèves aux examens</p>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-section">
                <div className="form-group">
                  <label className="form-label">
                    <i className="label-icon">🎓</i>
                    Examen
                  </label>
                  <select 
                    value={formData.examen_id} 
                    onChange={e => setFormData({...formData, examen_id: e.target.value})}
                    className="form-select"
                  >
                    <option value="">-- Choisir un examen --</option>
                    {examens.map(ex => (
                      <option key={ex.id} value={ex.id}>{ex.nom} - {ex.description}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="eleves-section">
                <div className="section-header">
                  <h3>
                    <i className="section-icon">👥</i>
                    Liste des élèves
                    <span className="section-count">{formData.eleves.length} élève(s)</span>
                  </h3>
                  <button type="button" onClick={ajouterEleve} className="btn-add-eleve">
                    <i className="icon-plus">+</i>
                    Ajouter un élève
                  </button>
                </div>

                {formData.eleves.map((eleve, i) => (
                  <div key={i} className="eleve-card">
                    <div className="eleve-header">
                      <h4>
                        <i className="icon-student">👤</i>
                        Élève {i + 1}
                      </h4>
                      {formData.eleves.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => supprimerEleve(i)} 
                          className="btn-delete"
                        >
                          <i className="icon-delete">🗑️</i>
                          Supprimer
                        </button>
                      )}
                    </div>
                    <div className="grid-form">
                      <div className="input-group">
                        <label>
                          <i className="field-icon">📛</i>
                          Nom *
                        </label>
                        <input 
                          placeholder="Entrez le nom" 
                          value={eleve.nom} 
                          onChange={e => handleEleveChange(i, 'nom', e.target.value)} 
                          required 
                        />
                      </div>
                      <div className="input-group">
                        <label>
                          <i className="field-icon">👤</i>
                          Prénom *
                        </label>
                        <input 
                          placeholder="Entrez le prénom" 
                          value={eleve.prenom} 
                          onChange={e => handleEleveChange(i, 'prenom', e.target.value)} 
                          required 
                        />
                      </div>
                      <div className="input-group">
                        <label>
                          <i className="field-icon">📅</i>
                          Date de naissance *
                        </label>
                        <input 
                          type="date" 
                          value={eleve.date_naissance} 
                          onChange={e => handleEleveChange(i, 'date_naissance', e.target.value)} 
                          required 
                        />
                      </div>
                      <div className="input-group">
                        <label>
                          <i className="field-icon">📍</i>
                          Lieu de naissance
                        </label>
                        <input 
                          placeholder="Lieu de naissance" 
                          value={eleve.lieu_naissance} 
                          onChange={e => handleEleveChange(i, 'lieu_naissance', e.target.value)} 
                        />
                      </div>
                      <div className="input-group">
                        <label>
                          <i className="field-icon">⚧️</i>
                          Sexe *
                        </label>
                        <select 
                          value={eleve.sexe || ''} 
                          onChange={e => handleEleveChange(i, 'sexe', e.target.value)}
                          required
                        >
                          <option value="">Sélectionnez</option>
                          <option value="Garçon">Garçon</option>
                          <option value="Fille">Fille</option>
                        </select>
                      </div>
                      <div className="input-group full-width">
                        <label>
                          <i className="field-icon">📞</i>
                          Contact parent (téléphone) *
                        </label>
                        <input 
                          placeholder="Numéro de téléphone du parent" 
                          value={eleve.contact || ''} 
                          onChange={e => handleEleveChange(i, 'contact', e.target.value)}
                          required 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="submit-section">
                <div className="form-summary">
                  <div className="summary-item">
                    <span className="summary-label">Examen sélectionné :</span>
                    <span className="summary-value">
                      {examens.find(e => e.id == formData.examen_id)?.nom || 'Aucun'}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Nombre d'élèves :</span>
                    <span className="summary-value">{formData.eleves.length}</span>
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={loading || !formData.examen_id} 
                  className="btn-submit"
                >
                  {loading ? (
                    <>
                      <i className="icon-loading">⏳</i>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <i className="icon-send">🚀</i>
                      Inscrire {formData.eleves.length} élève(s)
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* CONSULTATION */}
        {activeTab === 'consultation' && (
          <div className="card">
            <div className="card-header">
              <h2>Mes inscriptions</h2>
              <p>Suivez l'état de vos inscriptions et les affectations</p>
              {inscriptions.length > 0 && (
                <button onClick={exportInscriptions} className="btn-export">
                  <i className="icon-export">📊</i>
                  Exporter CSV
                </button>
              )}
            </div>
            
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Chargement des inscriptions...</p>
              </div>
            ) : inscriptions.length === 0 ? (
              <div className="empty-state">
                <i className="icon-empty">📭</i>
                <h3>Aucune inscription pour le moment</h3>
                <p>Commencez par inscrire vos élèves dans l'onglet "Inscription Élèves"</p>
              </div>
            ) : (
              <div className="table-container">
                <div className="table-responsive">
                  <table className="inscriptions-table">
                    <thead>
                      <tr>
                        <th>Élève</th>
                        <th>Examen</th>
                        <th>Statut</th>
                        <th>Salle</th>
                        <th>Centre</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inscriptions.map(i => (
                        <tr key={i.id} className={`row-${i.statut}`}>
                          <td>
                            <div className="student-info">
                              <strong>{i.eleve_nom} {i.eleve_prenom}</strong>
                            </div>
                          </td>
                          <td>{i.examen_nom}</td>
                          <td>
                            <span className={`statut ${i.statut}`}>
                              {i.statut === 'accepte' ? '✅ Acceptée' : 
                               i.statut === 'refuse' ? '❌ Refusée' : 
                               '⏳ En attente'}
                            </span>
                          </td>
                          <td className={i.salle_examen ? 'valide' : 'attente'}>
                            {i.salle_examen ? (
                              <>
                                <i className="icon-check">✅</i>
                                {i.salle_examen}
                              </>
                            ) : (
                              <>
                                <i className="icon-wait">⏳</i>
                                Non affectée
                              </>
                            )}
                          </td>
                          <td className={i.centre_examen ? 'valide' : 'attente'}>
                            {i.centre_examen ? (
                              <>
                                <i className="icon-check">✅</i>
                                {i.centre_examen}
                              </>
                            ) : (
                              <>
                                <i className="icon-wait">⏳</i>
                                Non affecté
                              </>
                            )}
                          </td>
                          <td className="date-cell">
                            {new Date(i.date_inscription).toLocaleDateString('fr-FR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MOT DE PASSE */}
        {activeTab === 'password' && (
          <div className="card password-card">
            <div className="card-header">
              <h2>Changer mon mot de passe</h2>
              <p>Protégez votre compte avec un mot de passe sécurisé</p>
            </div>
            
            <form onSubmit={handleChangePassword}>
              <div className="form-section">
                <div className="input-group">
                  <label>
                    <i className="field-icon">🔐</i>
                    Ancien mot de passe
                  </label>
                  <input 
                    type="password" 
                    placeholder="Entrez votre ancien mot de passe" 
                    value={passwordData.ancien} 
                    onChange={e => setPasswordData({...passwordData, ancien: e.target.value})} 
                    required 
                  />
                </div>
                <div className="input-group">
                  <label>
                    <i className="field-icon">🔄</i>
                    Nouveau mot de passe
                  </label>
                  <input 
                    type="password" 
                    placeholder="Choisissez un nouveau mot de passe" 
                    value={passwordData.nouveau} 
                    onChange={e => setPasswordData({...passwordData, nouveau: e.target.value})} 
                    required 
                  />
                  <div className="password-strength">
                    {passwordData.nouveau.length > 0 && (
                      <div className={`strength-bar ${passwordData.nouveau.length < 6 ? 'weak' : passwordData.nouveau.length < 10 ? 'medium' : 'strong'}`}>
                        <div className="strength-fill"></div>
                        <span className="strength-text">
                          {passwordData.nouveau.length < 6 ? 'Faible' : passwordData.nouveau.length < 10 ? 'Moyen' : 'Fort'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="input-group">
                  <label>
                    <i className="field-icon">✓</i>
                    Confirmer le nouveau mot de passe
                  </label>
                  <input 
                    type="password" 
                    placeholder="Confirmez votre nouveau mot de passe" 
                    value={passwordData.confirmation} 
                    onChange={e => setPasswordData({...passwordData, confirmation: e.target.value})} 
                    required 
                  />
                  {passwordData.confirmation && passwordData.nouveau !== passwordData.confirmation && (
                    <div className="password-error">⚠️ Les mots de passe ne correspondent pas</div>
                  )}
                </div>
              </div>
              
              <button type="submit" className="btn-submit">
                <i className="icon-lock">🔒</i>
                Mettre à jour le mot de passe
              </button>
            </form>
          </div>
        )}
      </div>

      <style jsx>{`
        .espace-etablissement {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          padding: 2rem;
          font-family: 'Inter', 'Segoe UI', sans-serif;
        }

        /* EN-TÊTE */
        .etab-header {
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          color: white;
          padding: 2.5rem;
          border-radius: 24px;
          margin-bottom: 2rem;
          display: flex;
          align-items: center;
          gap: 2rem;
          box-shadow: 0 20px 40px rgba(30, 60, 114, 0.3);
          position: relative;
          overflow: hidden;
        }

        .header-background {
          position: absolute;
          top: 0;
          right: 0;
          width: 300px;
          height: 300px;
          background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1));
          border-radius: 50%;
          transform: translate(30%, -30%);
        }

        .icon-wrapper {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 1.5rem;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.2);
        }

        .icon-school {
          font-size: 3.5rem;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
        }

        .etab-info {
          flex: 1;
        }

        .etab-info h1 {
          margin: 0 0 1rem 0;
          font-size: 2.4rem;
          font-weight: 800;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          letter-spacing: -0.5px;
        }

        .etab-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .detail-label {
          font-size: 0.9rem;
          opacity: 0.8;
          font-weight: 500;
        }

        .detail-value {
          font-size: 1.1rem;
          font-weight: 600;
        }

        .header-stats {
          display: flex;
          gap: 2rem;
          background: rgba(255,255,255,0.1);
          padding: 1.5rem;
          border-radius: 16px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.2);
        }

        .stat-item {
          text-align: center;
          min-width: 80px;
        }

        .stat-number {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 0.25rem;
        }

        .stat-number.accepte { color: #10b981; }
        .stat-number.en_attente { color: #f59e0b; }
        .stat-number.refuse { color: #ef4444; }

        .stat-label {
          font-size: 0.8rem;
          opacity: 0.8;
          font-weight: 500;
        }

        /* BOUTON CHAT */
        .chat-button-container {
          text-align: center;
          margin: 3rem 0;
        }

        .chat-button {
          position: relative;
          padding: 1.4rem 3rem;
          background: linear-gradient(135deg, #1e3c72, #2a5298);
          color: white;
          border-radius: 16px;
          text-decoration: none;
          font-size: 1.3rem;
          font-weight: 700;
          box-shadow: 0 15px 40px rgba(30, 60, 114, 0.4);
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
        }

        .chat-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 50px rgba(30, 60, 114, 0.5);
        }

        .notification-badge {
          position: absolute;
          top: -12px;
          right: -12px;
          background: linear-gradient(135deg, #e74c3c, #c0392b);
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          font-size: 0.9rem;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse 2s infinite;
          box-shadow: 0 6px 20px rgba(231, 76, 60, 0.6);
          border: 2px solid white;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        /* ONGLETS */
        .tabs-container {
          margin-bottom: 2rem;
        }

        .tabs {
          display: flex;
          gap: 0.5rem;
          background: white;
          padding: 0.5rem;
          border-radius: 16px;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }

        .tab {
          flex: 1;
          padding: 1.25rem 1rem;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          background: transparent;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.95rem;
          position: relative;
        }

        .tab:hover {
          background: #f8fafc;
          color: #1e3c72;
          transform: translateY(-1px);
        }

        .tab.active {
          background: linear-gradient(135deg, #1e3c72, #2a5298);
          color: white;
          box-shadow: 0 4px 15px rgba(30, 60, 114, 0.3);
        }

        .tab-icon {
          font-size: 1.2rem;
        }

        .tab-badge {
          background: rgba(255,255,255,0.2);
          color: inherit;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 700;
          min-width: 24px;
          text-align: center;
        }

        .tab.active .tab-badge {
          background: rgba(255,255,255,0.3);
        }

        /* CARTES ET FORMULAIRES */
        .tab-content {
          max-width: 1200px;
          margin: 0 auto;
        }

        .card {
          background: white;
          border-radius: 20px;
          padding: 2.5rem;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.08);
          margin-bottom: 2rem;
          border: 1px solid #f1f5f9;
          position: relative;
        }

        .card-header {
          text-align: center;
          margin-bottom: 2.5rem;
          position: relative;
        }

        .card-header h2 {
          color: #1e3c72;
          margin-bottom: 0.5rem;
          font-size: 1.8rem;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .card-header p {
          color: #64748b;
          font-size: 1.1rem;
          max-width: 600px;
          margin: 0 auto;
        }

        .btn-export {
          position: absolute;
          right: 0;
          top: 0;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
        }

        .btn-export:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
        }

        .form-section {
          margin-bottom: 2rem;
        }

        .input-group {
          margin-bottom: 1.5rem;
          position: relative;
        }

        .input-group label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #374151;
          font-size: 0.95rem;
        }

        .label-icon, .field-icon, .section-icon {
          font-size: 1.1rem;
        }

        .form-select, .input-group input {
          width: 100%;
          padding: 1rem 1.25rem;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 1rem;
          transition: all 0.3s ease;
          background: white;
          font-weight: 500;
        }

        .form-select:focus, .input-group input:focus {
          outline: none;
          border-color: #1e3c72;
          box-shadow: 0 0 0 4px rgba(30, 60, 114, 0.1);
          background: white;
          transform: translateY(-1px);
        }

        /* SECTION ÉLÈVES */
        .eleves-section {
          margin: 2.5rem 0;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding: 1.5rem;
          background: linear-gradient(135deg, #f0f8ff, #e8f4fd);
          border-radius: 16px;
          border: 1px solid #e1e8f0;
        }

        .section-header h3 {
          color: #1e3c72;
          margin: 0;
          font-size: 1.4rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .section-count {
          background: #1e3c72;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .btn-add-eleve {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
        }

        .btn-add-eleve:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
        }

        .eleve-card {
          background: #f8fafc;
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 1.5rem;
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
          position: relative;
        }

        .eleve-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .eleve-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .eleve-header h4 {
          margin: 0;
          color: #1e3c72;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.1rem;
          font-weight: 700;
        }

        .btn-delete {
          background: #ef4444;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          transition: all 0.3s ease;
        }

        .btn-delete:hover {
          background: #dc2626;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .grid-form {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .full-width {
          grid-column: 1 / -1;
        }

        /* SOUMISSION */
        .submit-section {
          background: linear-gradient(135deg, #f0f8ff, #e8f4fd);
          padding: 2rem;
          border-radius: 16px;
          border: 1px solid #e1e8f0;
          margin-top: 2rem;
        }

        .form-summary {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .summary-label {
          font-weight: 600;
          color: #64748b;
        }

        .summary-value {
          font-weight: 700;
          color: #1e3c72;
        }

        /* BOUTON SOUMISSION */
        .btn-submit {
          width: 100%;
          padding: 1.4rem;
          background: linear-gradient(135deg, #1e3c72, #2a5298);
          color: white;
          border: none;
          border-radius: 14px;
          font-size: 1.2rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          position: relative;
          overflow: hidden;
        }

        .btn-submit::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s;
        }

        .btn-submit:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 15px 30px rgba(30, 60, 114, 0.4);
        }

        .btn-submit:hover:not(:disabled)::before {
          left: 100%;
        }

        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* TABLEAU */
        .table-container {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .table-responsive {
          overflow-x: auto;
        }

        .inscriptions-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
        }

        .inscriptions-table th {
          background: #f8fafc;
          color: #374151;
          padding: 1.25rem 1rem;
          text-align: left;
          font-weight: 600;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid #e2e8f0;
        }

        .inscriptions-table td {
          padding: 1.25rem 1rem;
          border-bottom: 1px solid #f1f5f9;
          color: #374151;
        }

        .inscriptions-table tr {
          transition: all 0.3s ease;
        }

        .inscriptions-table tr:hover {
          background: #f8fafc;
          transform: translateX(4px);
        }

        .row-accepte {
          border-left: 4px solid #10b981;
        }

        .row-refuse {
          border-left: 4px solid #ef4444;
        }

        .row-en_attente {
          border-left: 4px solid #f59e0b;
        }

        .student-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .statut {
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.85rem;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }

        .statut.accepte { 
          background: #d1fae5; 
          color: #065f46; 
          border: 1px solid #a7f3d0;
        }
        .statut.refuse { 
          background: #fee2e2; 
          color: #991b1b; 
          border: 1px solid #fecaca;
        }
        .statut.en_attente { 
          background: #fef3c7; 
          color: #92400e; 
          border: 1px solid #fde68a;
        }

        .valide { 
          color: #065f46; 
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .attente { 
          color: #dc2626;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .date-cell {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 500;
        }

        /* MOT DE PASSE */
        .password-strength {
          margin-top: 0.5rem;
        }

        .strength-bar {
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
          overflow: hidden;
          position: relative;
        }

        .strength-fill {
          height: 100%;
          transition: all 0.3s ease;
        }

        .strength-bar.weak .strength-fill {
          background: #ef4444;
          width: 33%;
        }

        .strength-bar.medium .strength-fill {
          background: #f59e0b;
          width: 66%;
        }

        .strength-bar.strong .strength-fill {
          background: #10b981;
          width: 100%;
        }

        .strength-text {
          position: absolute;
          right: 0;
          top: -20px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .strength-bar.weak .strength-text { color: #ef4444; }
        .strength-bar.medium .strength-text { color: #f59e0b; }
        .strength-bar.strong .strength-text { color: #10b981; }

        .password-error {
          color: #ef4444;
          font-size: 0.8rem;
          margin-top: 0.25rem;
          font-weight: 500;
        }

        /* ÉTATS */
        .empty-state, .loading-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #64748b;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top: 3px solid #1e3c72;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state i, .loading-state i {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state h3 {
          margin: 0 0 0.5rem 0;
          color: #374151;
          font-size: 1.5rem;
        }

        .password-card {
          max-width: 500px;
          margin: 0 auto;
        }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .espace-etablissement {
            padding: 1rem;
          }

          .etab-header {
            flex-direction: column;
            text-align: center;
            gap: 1.5rem;
            padding: 2rem 1.5rem;
          }

          .etab-details {
            grid-template-columns: 1fr;
          }

          .header-stats {
            flex-wrap: wrap;
            justify-content: center;
            gap: 1rem;
          }

          .stat-item {
            min-width: 60px;
          }

          .stat-number {
            font-size: 1.5rem;
          }

          .tabs {
            flex-direction: column;
          }

          .grid-form {
            grid-template-columns: 1fr;
          }

          .section-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .eleve-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .form-summary {
            grid-template-columns: 1fr;
          }

          .card-header {
            text-align: left;
          }

          .btn-export {
            position: relative;
            margin-top: 1rem;
            width: 100%;
          }

          .inscriptions-table {
            font-size: 0.9rem;
          }

          .inscriptions-table th,
          .inscriptions-table td {
            padding: 0.75rem 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default EspaceEtablissement;