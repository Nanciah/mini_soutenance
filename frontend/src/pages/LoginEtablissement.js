import React, { useState } from 'react';
import { etablissementService } from '../services/api';

const LoginEtablissement = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    login: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetData, setResetData] = useState({
    login: '',
    nom_etablissement: '',
    code_etablissement: '',
    directeur_nom: '',
    directeur_prenom: '',
    email_contact: '',
    telephone: '',
    dernier_acces: '',
    motif_demande: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleResetChange = (e) => {
    setResetData({
      ...resetData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.login || !formData.password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await etablissementService.login(formData);
      const { token, etablissement } = response.data;
      
      onLogin(
        { ...etablissement, type: 'etablissement' },
        token
      );
      
    } catch (error) {
      console.error('Erreur de connexion:', error);
      setError(error.response?.data?.error || 'Erreur de connexion. Vérifiez vos identifiants.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetData.login) {
      setError('Veuillez saisir votre identifiant');
      return;
    }

    setLoading(true);
    try {
      // Simulation de vérification - À remplacer par l'appel API réel
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Ici, normalement vous vérifieriez avec le backend
      // Pour l'exemple, on passe à l'étape 2
      setResetStep(2);
      setError('');
      
    } catch (error) {
      setError('Erreur lors de la vérification');
    } finally {
      setLoading(false);
    }
  };

  const submitResetRequest = async () => {
  const requiredFields = ['nom_etablissement', 'directeur_nom', 'directeur_prenom', 'email_contact', 'telephone', 'motif_demande'];
  const missingFields = requiredFields.filter(field => !resetData[field]);
  
  if (missingFields.length > 0) {
    setError('Veuillez remplir tous les champs obligatoires');
    return;
  }

  setLoading(true);
  try {
    const res = await fetch('http://localhost:5000/api/demande-reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resetData)
    });

    const data = await res.json();

    if (res.ok) {
      setResetStep(3);
      setError('');
    } else {
      setError(data.error || 'Erreur lors de l\'envoi');
    }
  } catch (error) {
    setError('Erreur réseau. Vérifiez votre connexion.');
  } finally {
    setLoading(false);
  }
};

  const resetForgotPassword = () => {
    setShowForgotPassword(false);
    setResetStep(1);
    setResetData({
      login: '',
      nom_etablissement: '',
      code_etablissement: '',
      directeur_nom: '',
      directeur_prenom: '',
      email_contact: '',
      telephone: '',
      dernier_acces: '',
      motif_demande: ''
    });
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Section gauche - Illustration */}
        <div className="login-illustration">
          <div className="illustration-content">
            <div className="illustration-icon">🏫</div>
            <h1>Espace Établissement</h1>
            <p>Connectez-vous pour gérer les inscriptions de vos élèves aux examens</p>
            <div className="features-list">
              <div className="feature-item">
                <span className="feature-icon">📝</span>
                Inscription des élèves
              </div>
              <div className="feature-item">
                <span className="feature-icon">👁️</span>
                Suivi des demandes
              </div>
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                Gestion simplifiée
              </div>
            </div>
          </div>
        </div>

        {/* Section droite - Formulaire */}
        <div className="login-form-section">
          <div className="login-card">
            {!showForgotPassword ? (
              <>
                <div className="login-header">
                  <div className="login-icon">🔐</div>
                  <h2>Connexion Établissement</h2>
                  <p>Accédez à votre espace personnel</p>
                </div>

                {error && (
                  <div className="error-banner">
                    <div className="error-icon">⚠️</div>
                    <div className="error-content">
                      <strong>Erreur de connexion</strong>
                      <p>{error}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                  <div className="form-group">
                    <label className="form-label">
                      <span className="label-icon">👤</span>
                      Identifiant de l'établissement
                    </label>
                    <input
                      type="text"
                      name="login"
                      value={formData.login}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Ex: etab_401011087"
                      disabled={loading}
                    />
                    <div className="input-hint">
                      Format: etab_CODE_ETABLISSEMENT
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="password-header">
                      <label className="form-label">
                        <span className="label-icon">🔒</span>
                        Mot de passe
                      </label>
                      <button 
                        type="button"
                        className="forgot-password-btn"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Votre mot de passe"
                      disabled={loading}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary btn-login"
                    disabled={loading}
                  >
                    <span className="btn-icon">
                      {loading ? '⏳' : '🚀'}
                    </span>
                    {loading ? 'Connexion en cours...' : 'Se connecter'}
                  </button>
                </form>

                {/* Informations d'aide */}
                <div className="login-info">
                  <div className="info-header">
                    <span className="info-icon">💡</span>
                    <h4>Informations de connexion</h4>
                  </div>
                  <div className="info-content">
                    <div className="info-item">
                      <span className="info-label">Identifiant:</span>
                      <code>etab_CODE_ETABLISSEMENT</code>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Mot de passe:</span>
                      <code>sisco2024</code>
                    </div>
                    <div className="info-example">
                      <strong>Exemple:</strong> etab_401011087 / sisco2024
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* FORMULAIRE MOT DE PASSE OUBLIÉ */
              <div className="forgot-password-section">
                <div className="login-header">
                  <div className="login-icon">🔑</div>
                  <h2>Réinitialisation du mot de passe</h2>
                  <p>Procédure sécurisée de récupération</p>
                </div>

                {error && (
                  <div className="error-banner">
                    <div className="error-icon">⚠️</div>
                    <div className="error-content">
                      <strong>Erreur</strong>
                      <p>{error}</p>
                    </div>
                  </div>
                )}

                {resetStep === 1 && (
                  <div className="reset-step">
                    <div className="step-info">
                      <div className="step-number">1</div>
                      <div className="step-content">
                        <h3>Vérification de l'identité</h3>
                        <p>Saisissez votre identifiant pour commencer la procédure</p>
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">
                        <span className="label-icon">👤</span>
                        Identifiant de l'établissement
                      </label>
                      <input
                        type="text"
                        name="login"
                        value={resetData.login}
                        onChange={handleResetChange}
                        className="form-input"
                        placeholder="Ex: etab_401011087"
                        disabled={loading}
                      />
                    </div>

                    <div className="security-notice">
                      <div className="security-icon">🛡️</div>
                      <div className="security-content">
                        <strong>Sécurité renforcée</strong>
                        <p>Vous devrez fournir des informations pour vérifier votre identité</p>
                      </div>
                    </div>

                    <div className="action-buttons">
                      <button 
                        type="button"
                        className="btn btn-secondary"
                        onClick={resetForgotPassword}
                        disabled={loading}
                      >
                        ← Retour
                      </button>
                      <button 
                        type="button"
                        className="btn btn-primary"
                        onClick={handleForgotPassword}
                        disabled={loading}
                      >
                        {loading ? 'Vérification...' : 'Vérifier →'}
                      </button>
                    </div>
                  </div>
                )}

                {resetStep === 2 && (
                  <div className="reset-step">
                    <div className="step-progress">
                      <div className="step completed">1</div>
                      <div className="step-connector"></div>
                      <div className="step active">2</div>
                    </div>

                    <div className="step-info">
                      <div className="step-number">2</div>
                      <div className="step-content">
                        <h3>Vérification d'identité</h3>
                        <p>Remplissez ces informations pour prouver votre identité</p>
                      </div>
                    </div>

                    <div className="verification-form">
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label required">
                            <span className="label-icon">🏫</span>
                            Nom de l'établissement
                          </label>
                          <input
                            type="text"
                            name="nom_etablissement"
                            value={resetData.nom_etablissement}
                            onChange={handleResetChange}
                            className="form-input"
                            placeholder="Nom officiel de l'établissement"
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">
                            <span className="label-icon">🔢</span>
                            Code établissement
                          </label>
                          <input
                            type="text"
                            name="code_etablissement"
                            value={resetData.code_etablissement}
                            onChange={handleResetChange}
                            className="form-input"
                            placeholder="Code UAI/RNE"
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label required">
                            <span className="label-icon">👨‍💼</span>
                            Nom du directeur
                          </label>
                          <input
                            type="text"
                            name="directeur_nom"
                            value={resetData.directeur_nom}
                            onChange={handleResetChange}
                            className="form-input"
                            placeholder="Nom de famille"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label required">
                            <span className="label-icon">👨‍💼</span>
                            Prénom du directeur
                          </label>
                          <input
                            type="text"
                            name="directeur_prenom"
                            value={resetData.directeur_prenom}
                            onChange={handleResetChange}
                            className="form-input"
                            placeholder="Prénom"
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label required">
                            <span className="label-icon">📧</span>
                            Email de contact
                          </label>
                          <input
                            type="email"
                            name="email_contact"
                            value={resetData.email_contact}
                            onChange={handleResetChange}
                            className="form-input"
                            placeholder="email@etablissement.fr"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label required">
                            <span className="label-icon">📞</span>
                            Téléphone
                          </label>
                          <input
                            type="tel"
                            name="telephone"
                            value={resetData.telephone}
                            onChange={handleResetChange}
                            className="form-input"
                            placeholder="01 23 45 67 89"
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          <span className="label-icon">📅</span>
                          Date du dernier accès réussi
                        </label>
                        <input
                          type="date"
                          name="dernier_acces"
                          value={resetData.dernier_acces}
                          onChange={handleResetChange}
                          className="form-input"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label required">
                          <span className="label-icon">📝</span>
                          Motif de la demande
                        </label>
                        <select
                          name="motif_demande"
                          value={resetData.motif_demande}
                          onChange={handleResetChange}
                          className="form-input"
                        >
                          <option value="">Sélectionnez un motif</option>
                          <option value="oubli">Oubli du mot de passe</option>
                          <option value="changement_personnel">Changement de personnel</option>
                          <option value="premiere_connexion">Première connexion</option>
                          <option value="compte_bloque">Compte bloqué</option>
                          <option value="autre">Autre raison</option>
                        </select>
                      </div>

                      {resetData.motif_demande === 'autre' && (
                        <div className="form-group">
                          <label className="form-label required">
                            <span className="label-icon">✏️</span>
                            Précisez la raison
                          </label>
                          <textarea
                            name="motif_details"
                            value={resetData.motif_details}
                            onChange={handleResetChange}
                            className="form-input"
                            placeholder="Décrivez la raison de votre demande..."
                            rows="3"
                          />
                        </div>
                      )}
                    </div>

                    <div className="security-warning">
                      <div className="warning-icon">🔒</div>
                      <div className="warning-content">
                        <strong>Informations sécurisées</strong>
                        <p>Ces informations seront vérifiées par l'administration CISCO. Toute fausse déclaration pourra entraîner des sanctions.</p>
                      </div>
                    </div>

                    <div className="action-buttons">
                      <button 
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setResetStep(1)}
                        disabled={loading}
                      >
                        ← Retour
                      </button>
                      <button 
                        type="button"
                        className="btn btn-primary"
                        onClick={submitResetRequest}
                        disabled={loading}
                      >
                        {loading ? 'Envoi en cours...' : 'Soumettre la demande →'}
                      </button>
                    </div>
                  </div>
                )}

                {resetStep === 3 && (
                  <div className="reset-step success-step">
                    <div className="success-icon">✅</div>
                    <h3>Demande envoyée avec succès</h3>
                    <p>Votre demande de réinitialisation a été transmise à l'administration CISCO.</p>
                    
                    <div className="success-details">
                      <div className="detail-item">
                        <strong>Numéro de suivi:</strong> 
                        <span>DEM-{Date.now().toString().slice(-6)}</span>
                      </div>
                      <div className="detail-item">
                        <strong>Délai de traitement:</strong> 
                        <span>24-48 heures ouvrables</span>
                      </div>
                      <div className="detail-item">
                        <strong>Contact:</strong> 
                        <span>cisco-support@education.fr</span>
                      </div>
                    </div>

                    <div className="next-steps">
                      <h4>Prochaines étapes:</h4>
                      <ul>
                        <li>Vérification de vos informations par l'administration</li>
                        <li>Appel de confirmation sur le numéro fourni</li>
                        <li>Envoi du nouveau mot de passe par email sécurisé</li>
                      </ul>
                    </div>

                    <button 
                      type="button"
                      className="btn btn-primary"
                      onClick={resetForgotPassword}
                    >
                      ← Retour à la connexion
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Support */}
            <div className="support-section">
              <p>Besoin d'aide ? <a href="mailto:cisco-support@education.fr" className="support-link">Contactez le support</a></p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .login-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          max-width: 1200px;
          width: 100%;
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          min-height: 700px;
        }

        /* Section illustration */
        .login-illustration {
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          color: white;
          padding: 3rem;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .login-illustration::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
          background-size: 20px 20px;
          opacity: 0.3;
        }

        .illustration-content {
          text-align: center;
          z-index: 1;
          position: relative;
        }

        .illustration-icon {
          font-size: 4rem;
          margin-bottom: 1.5rem;
          display: block;
        }

        .illustration-content h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          font-weight: 700;
        }

        .illustration-content p {
          font-size: 1.1rem;
          opacity: 0.9;
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .features-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          text-align: left;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          backdrop-filter: blur(10px);
        }

        .feature-icon {
          font-size: 1.5rem;
          width: 40px;
          text-align: center;
        }

        /* Section formulaire */
        .login-form-section {
          padding: 3rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
        }

        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .login-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          display: block;
        }

        .login-header h2 {
          color: #1e3c72;
          font-size: 2rem;
          margin-bottom: 0.5rem;
          font-weight: 700;
        }

        .login-header p {
          color: #666;
          margin: 0;
        }

        /* Bannière d'erreur */
        .error-banner {
          background: linear-gradient(135deg, #f8d7da, #f1b0b7);
          border: 1px solid #f5c6cb;
          border-radius: 10px;
          padding: 1rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .error-icon {
          font-size: 1.2rem;
          flex-shrink: 0;
          margin-top: 0.1rem;
        }

        .error-content {
          flex: 1;
        }

        .error-content strong {
          display: block;
          margin-bottom: 0.25rem;
          color: #721c24;
        }

        .error-content p {
          margin: 0;
          color: #721c24;
          font-size: 0.9rem;
        }

        /* Formulaire */
        .login-form {
          margin-bottom: 2rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #333;
          font-size: 0.95rem;
        }

        .form-label.required::after {
          content: '*';
          color: #e74c3c;
          margin-left: 0.25rem;
        }

        .label-icon {
          font-size: 1.1rem;
        }

        .form-input {
          width: 100%;
          padding: 1rem 1.25rem;
          border: 2px solid #e1e5e9;
          border-radius: 12px;
          font-size: 1rem;
          transition: all 0.3s ease;
          background: #f8f9fa;
        }

        .form-input:focus {
          outline: none;
          border-color: #1e3c72;
          background: white;
          box-shadow: 0 0 0 3px rgba(30, 60, 114, 0.1);
          transform: translateY(-1px);
        }

        .form-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .input-hint {
          font-size: 0.8rem;
          color: #666;
          margin-top: 0.25rem;
          margin-left: 1.75rem;
        }

        /* Header mot de passe */
        .password-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .forgot-password-btn {
          background: none;
          border: none;
          color: #1e3c72;
          font-size: 0.85rem;
          cursor: pointer;
          text-decoration: underline;
        }

        .forgot-password-btn:hover {
          color: #2a5298;
        }

        /* Bouton de connexion */
        .btn-login {
          width: 100%;
          padding: 1.25rem 2rem;
          font-size: 1.1rem;
          font-weight: 600;
          border-radius: 12px;
          margin-top: 1rem;
          transition: all 0.3s ease;
        }

        .btn {
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          transition: all 0.3s ease;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        .btn-primary {
          background: linear-gradient(135deg, #1e3c72, #2a5298);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(30, 60, 114, 0.4);
        }

        .btn-secondary {
          background: #e2e8f0;
          color: #4a5568;
          padding: 1rem 1.5rem;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #cbd5e0;
        }

        .btn-icon {
          font-size: 1.2rem;
        }

        /* Informations de connexion */
        .login-info {
          background: linear-gradient(135deg, #e3f2fd, #bbdefb);
          border: 1px solid #90caf9;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .info-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .info-icon {
          font-size: 1.2rem;
        }

        .info-header h4 {
          margin: 0;
          color: #1565c0;
          font-size: 1rem;
        }

        .info-content {
          space-y: 0.75rem;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .info-label {
          color: #333;
          font-weight: 500;
        }

        .info-item code {
          background: rgba(255, 255, 255, 0.7);
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-family: 'Courier New', monospace;
          font-weight: 600;
          color: #1e3c72;
        }

        .info-example {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid #90caf9;
          font-size: 0.9rem;
          color: #333;
        }

        /* Section mot de passe oublié */
        .forgot-password-section {
          width: 100%;
        }

        .reset-step {
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .step-progress {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2rem;
        }

        .step {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          background: #e2e8f0;
          color: #718096;
        }

        .step.active {
          background: #1e3c72;
          color: white;
        }

        .step.completed {
          background: #4CAF50;
          color: white;
        }

        .step-connector {
          width: 60px;
          height: 2px;
          background: #e2e8f0;
          margin: 0 0.5rem;
        }

        .step-info {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .step-number {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #1e3c72;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          flex-shrink: 0;
        }

        .step-content h3 {
          margin: 0 0 0.5rem 0;
          color: #1e3c72;
        }

        .step-content p {
          margin: 0;
          color: #666;
        }

        .verification-form {
          margin-bottom: 2rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .security-notice, .security-warning {
          background: linear-gradient(135deg, #fff3cd, #ffeaa7);
          border: 1px solid #ffd351;
          border-radius: 10px;
          padding: 1rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .security-warning {
          background: linear-gradient(135deg, #f8d7da, #f1b0b7);
          border: 1px solid #f5c6cb;
        }

        .security-icon, .warning-icon {
          font-size: 1.2rem;
          flex-shrink: 0;
          margin-top: 0.1rem;
        }

        .security-content strong, .warning-content strong {
          display: block;
          margin-bottom: 0.25rem;
          color: #856404;
        }

        .warning-content strong {
          color: #721c24;
        }

        .security-content p, .warning-content p {
          margin: 0;
          color: #856404;
          font-size: 0.9rem;
        }

        .warning-content p {
          color: #721c24;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
          justify-content: space-between;
        }

        .action-buttons .btn {
          flex: 1;
        }

        /* Étape de succès */
        .success-step {
          text-align: center;
          padding: 1rem 0;
        }

        .success-icon {
          font-size: 4rem;
          margin-bottom: 1.5rem;
        }

        .success-step h3 {
          color: #4CAF50;
          margin-bottom: 1rem;
        }

        .success-step p {
          color: #666;
          margin-bottom: 2rem;
        }

        .success-details {
          background: #f8f9fa;
          border-radius: 10px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          text-align: left;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .detail-item:last-child {
          margin-bottom: 0;
          border-bottom: none;
        }

        .next-steps {
          text-align: left;
          margin-bottom: 2rem;
        }

        .next-steps h4 {
          color: #1e3c72;
          margin-bottom: 1rem;
        }

        .next-steps ul {
          margin: 0;
          padding-left: 1.5rem;
          color: #666;
        }

        .next-steps li {
          margin-bottom: 0.5rem;
        }

        /* Support */
        .support-section {
          text-align: center;
          padding-top: 1rem;
          border-top: 1px solid #e1e5e9;
        }

        .support-section p {
          margin: 0;
          color: #666;
          font-size: 0.9rem;
        }

        .support-link {
          color: #1e3c72;
          text-decoration: none;
          font-weight: 600;
        }

        .support-link:hover {
          text-decoration: underline;
        }

        /* Responsive */
        @media (max-width: 968px) {
          .login-container {
            grid-template-columns: 1fr;
            max-width: 500px;
          }

          .login-illustration {
            padding: 2rem;
            display: none;
          }

          .login-form-section {
            padding: 2rem;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .action-buttons {
            flex-direction: column;
          }
        }

        @media (max-width: 480px) {
          .login-page {
            padding: 1rem;
          }

          .login-form-section {
            padding: 1.5rem;
          }

          .login-header h2 {
            font-size: 1.75rem;
          }

          .form-input {
            padding: 0.875rem 1rem;
          }

          .btn-login {
            padding: 1rem 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default LoginEtablissement;