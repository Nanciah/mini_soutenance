import React, { useState } from 'react';
import { toast } from 'react-toastify';

const CreerEtablissement = () => {
  const [formData, setFormData] = useState({
    code: '', nom: '', secteur: 'Privé', niveau: 'Primaire',
    commune: 'CU MAHAJANGA', zap: '', fokontany: '', village: ''
  });
  const [loading, setLoading] = useState(false);

   const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || 'https://mini-soutenance.onrender.com/api';
      
      const res = await fetch(`${API_URL}/etablissements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          <div>
            <strong>Établissement créé !</strong><br/>
            Login: <code>{data.login}</code><br/>
            Mot de passe: <code>{data.password}</code>
          </div>,
          { autoClose: 8000 }
        );
        setFormData({ code: '', nom: '', secteur: 'Privé', niveau: 'Primaire', commune: 'CU MAHAJANGA', zap: '', fokontany: '', village: '' });
      } else {
        toast.error(data.error || 'Erreur création');
      }
    } catch (err) {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="creer-etab-container">
      <div className="creer-card">
        <div className="card-header">
          <div className="header-icon">Créer un établissement</div>
          <h1>Créer un nouvel établissement</h1>
          <p>Ajoutez un établissement à la plateforme CISCO</p>
        </div>

        <form onSubmit={handleSubmit} className="creer-form">
          <div className="form-grid">
            <div className="input-group">
              <span className="input-icon">Code</span>
              <input 
                type="text" 
                placeholder="Code établissement *" 
                value={formData.code} 
                onChange={e => setFormData({...formData, code: e.target.value})}
                required 
              />
            </div>

            <div className="input-group">
              <span className="input-icon">École</span>
              <input 
                type="text" 
                placeholder="Nom de l'école *" 
                value={formData.nom} 
                onChange={e => setFormData({...formData, nom: e.target.value})}
                required 
              />
            </div>

            <div className="input-group">
              <span className="input-icon">Type</span>
              <select value={formData.secteur} onChange={e => setFormData({...formData, secteur: e.target.value})}>
                <option>Privé</option>
                <option>Public</option>
              </select>
            </div>

            <div className="input-group">
              <span className="input-icon">Niveau</span>
              <select value={formData.niveau} onChange={e => setFormData({...formData, niveau: e.target.value})}>
                <option>Primaire</option>
                <option>Collège</option>
                <option>Lycée</option>
              </select>
            </div>

            <div className="input-group">
              <span className="input-icon">Localisation</span>
              <input 
                placeholder="ZAP" 
                value={formData.zap} 
                onChange={e => setFormData({...formData, zap: e.target.value})}
              />
            </div>

            <div className="input-group">
              <span className="input-icon">Fokontany</span>
              <input 
                placeholder="Fokontany" 
                value={formData.fokontany} 
                onChange={e => setFormData({...formData, fokontany: e.target.value})}
              />
            </div>

            <div className="input-group full-width">
              <span className="input-icon">Village</span>
              <input 
                placeholder="Village (optionnel)" 
                value={formData.village} 
                onChange={e => setFormData({...formData, village: e.target.value})}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? (
              <>
                <span className="spinner"></span>
                Création en cours...
              </>
            ) : (
              <>
                Créer l'établissement
              </>
            )}
          </button>
        </form>

        <div className="info-box">
          <div className="info-icon">Info</div>
          <div>
            <strong>Un compte sera créé automatiquement</strong><br/>
            <span>Mot de passe par défaut : </span>
            <code style={{ background: '#1e3c72', color: '#0f0', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
              sisco2024
            </code>
          </div>
        </div>
      </div>

      <style jsx>{`
        .creer-etab-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          font-family: 'Segoe UI', sans-serif;
        }

        .creer-card {
          background: white;
          border-radius: 24px;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
          width: 100%;
          max-width: 900px;
          overflow: hidden;
          animation: slideUp 0.8s ease-out;
        }

        @keyframes slideUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .card-header {
          background: linear-gradient(135deg, #1e3c72, #2a5298);
          color: white;
          text-align: center;
          padding: 3rem 2rem 2rem;
        }

        .header-icon {
          font-size: 5rem;
          margin-bottom: 1rem;
          animation: float 6s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }

        .card-header h1 {
          font-size: 2.5rem;
          margin: 0 0 0.5rem 0;
          font-weight: 800;
        }

        .card-header p {
          opacity: 0.9;
          font-size: 1.1rem;
          margin: 0;
        }

        .creer-form {
          padding: 2.5rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .full-width {
          grid-column: 1 / -1;
        }

        .input-group {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1.4rem;
          color: #1e3c72;
          z-index: 2;
        }

        .input-group input,
        .input-group select {
          width: 100%;
          padding: 1.3rem 1rem 1.3rem 3.5rem;
          border: 2px solid #e1e5e9;
          border-radius: 16px;
          font-size: 1.1rem;
          transition: all 0.3s ease;
          background: #f8f9fa;
        }

        .input-group input:focus,
        .input-group select:focus {
          outline: none;
          border-color: #1e3c72;
          background: white;
          box-shadow: 0 0 0 5px rgba(30, 60, 114, 0.1);
          transform: translateY(-2px);
        }

        .submit-btn {
          width: 100%;
          padding: 1.4rem;
          background: linear-gradient(135deg, #27ae60, #2ecc71);
          color: white;
          border: none;
          border-radius: 16px;
          font-size: 1.3rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.4s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          box-shadow: 0 10px 30px rgba(39, 174, 96, 0.4);
        }

        .submit-btn:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(39, 174, 96, 0.6);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .spinner {
          width: 24px;
          height: 24px;
          border: 3px solid transparent;
          border-top: 3px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .info-box {
          background: linear-gradient(135deg, #e8f4fd, #f0f8ff);
          padding: 2rem;
          text-align: center;
          border-top: 1px solid #e1e5e9;
        }

        .info-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .info-box code {
          background: #1e3c72;
          color: #0f0;
          padding: 0.5rem 1rem;
          border-radius: 12px;
          font-weight: bold;
          font-size: 1.1rem;
        }

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
          .card-header {
            padding: 2rem 1.5rem;
          }
          .header-icon {
            font-size: 3.5rem;
          }
          .card-header h1 {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
};

export default CreerEtablissement;
