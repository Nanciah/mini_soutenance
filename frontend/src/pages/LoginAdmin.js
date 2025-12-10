import React, { useState } from 'react';

const LoginAdmin = ({ onLogin }) => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Identifiants incorrects');

      onLogin({ ...data.admin, type: 'admin' }, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-admin-container">
      <div className="login-background">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
        </div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="admin-icon">
            <div className="crown-wrapper">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L8 7L12 11L16 7L12 2Z" fill="currentColor"/>
                <path d="M5 11L7 14L12 11L17 14L19 11L12 2L5 11Z" fill="currentColor"/>
                <path d="M3 15L5 17L12 15L19 17L21 15L12 2L3 15Z" fill="currentColor"/>
                <path d="M2 19L4 21L12 19L20 21L22 19L12 2L2 19Z" fill="currentColor"/>
              </svg>
            </div>
          </div>
          <h1>Espace Administrateur</h1>
          <p>Accès sécurisé au panneau de contrôle</p>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <div className="error-content">
              <strong>Erreur de connexion</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <span className="input-icon">👤</span>
            <input
              type="text"
              placeholder="Nom d'utilisateur"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <span className="input-icon">🔒</span>
            <input
              type="password"
              placeholder="Mot de passe"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? (
              <>
                <span className="spinner"></span>
                Connexion en cours...
              </>
            ) : (
              <>
                <span className="btn-icon">🚀</span>
                Accéder au dashboard
              </>
            )}
          </button>
        </form>

        <div className="test-credentials">
          <div className="credential-header">
            <span className="credential-icon">🔑</span>
            <h3>Identifiants de test</h3>
          </div>
          <div className="credential-grid">
            <div className="credential-item">
              <span className="credential-label">Utilisateur</span>
              <div className="credential-value">
                <code>admin</code>
                <button 
                  className="copy-btn"
                  onClick={() => navigator.clipboard.writeText('admin')}
                  title="Copier"
                >
                  📋
                </button>
              </div>
            </div>
            <div className="credential-item">
              <span className="credential-label">Mot de passe</span>
              <div className="credential-value">
                <code>admin123</code>
                <button 
                  className="copy-btn"
                  onClick={() => navigator.clipboard.writeText('admin123')}
                  title="Copier"
                >
                  📋
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="security-notice">
          <span className="security-icon">🛡️</span>
          <span>Connexion sécurisée par chiffrement SSL</span>
        </div>
      </div>

      <style jsx>{`
        .login-admin-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #1e3c72 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
          position: relative;
          overflow: hidden;
        }

        .login-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
        }

        .floating-shapes {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .shape {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          animation: float 6s ease-in-out infinite;
        }

        .shape-1 {
          width: 80px;
          height: 80px;
          top: 10%;
          left: 10%;
          animation-delay: 0s;
        }

        .shape-2 {
          width: 120px;
          height: 120px;
          top: 60%;
          right: 10%;
          animation-delay: 2s;
        }

        .shape-3 {
          width: 60px;
          height: 60px;
          bottom: 20%;
          left: 20%;
          animation-delay: 4s;
        }

        .shape-4 {
          width: 100px;
          height: 100px;
          top: 30%;
          right: 20%;
          animation-delay: 1s;
        }

        @keyframes float {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg); 
          }
          50% { 
            transform: translateY(-20px) rotate(180deg); 
          }
        }

        .login-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          box-shadow: 
            0 25px 50px rgba(0, 0, 0, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.5);
          width: 100%;
          max-width: 440px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.2);
          position: relative;
          z-index: 2;
        }

        .login-header {
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          color: white;
          padding: 3rem 2rem 2rem;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .login-header::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 200px;
          height: 200px;
          background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1));
          border-radius: 50%;
          transform: translate(30%, -30%);
        }

        .admin-icon {
          margin-bottom: 1.5rem;
        }

        .crown-wrapper {
          width: 80px;
          height: 80px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .crown-wrapper svg {
          width: 40px;
          height: 40px;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
        }

        .login-header h1 {
          font-size: 2.2rem;
          margin: 0 0 0.5rem 0;
          font-weight: 800;
          letter-spacing: -0.5px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .login-header p {
          opacity: 0.9;
          margin: 0;
          font-size: 1rem;
          font-weight: 500;
        }

        .error-message {
          background: linear-gradient(135deg, #ffebee, #ffcdd2);
          color: #c62828;
          padding: 1.25rem;
          margin: 2rem;
          border-radius: 16px;
          border: 1px solid #ff8a80;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          box-shadow: 0 4px 12px rgba(198, 40, 40, 0.1);
        }

        .error-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .error-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .error-content strong {
          font-weight: 700;
          font-size: 0.9rem;
        }

        .error-content span {
          font-size: 0.9rem;
          opacity: 0.9;
        }

        .login-form {
          padding: 0 2rem 2rem;
        }

        .input-group {
          position: relative;
          margin-bottom: 1.5rem;
        }

        .input-icon {
          position: absolute;
          left: 1.25rem;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1.3rem;
          color: #1e3c72;
          z-index: 2;
          transition: all 0.3s ease;
        }

        .input-group:focus-within .input-icon {
          transform: translateY(-50%) scale(1.1);
          color: #2a5298;
        }

        .input-group input {
          width: 100%;
          padding: 1.4rem 1.25rem 1.4rem 3.5rem;
          border: 2px solid #e1e5e9;
          border-radius: 16px;
          font-size: 1rem;
          transition: all 0.3s ease;
          background: #f8fafc;
          font-weight: 500;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .input-group input:focus {
          outline: none;
          border-color: #1e3c72;
          background: white;
          box-shadow: 
            0 0 0 4px rgba(30, 60, 114, 0.1),
            0 4px 12px rgba(30, 60, 114, 0.1);
          transform: translateY(-2px);
        }

        .input-group input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-btn {
          width: 100%;
          padding: 1.4rem;
          background: linear-gradient(135deg, #1e3c72, #2a5298);
          color: white;
          border: none;
          border-radius: 16px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          margin-top: 1rem;
          box-shadow: 0 8px 25px rgba(30, 60, 114, 0.3);
          position: relative;
          overflow: hidden;
        }

        .login-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .login-btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 12px 30px rgba(30, 60, 114, 0.4);
        }

        .login-btn:hover:not(:disabled)::before {
          left: 100%;
        }

        .login-btn:active {
          transform: translateY(-1px);
        }

        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
          box-shadow: 0 4px 12px rgba(30, 60, 114, 0.2);
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid transparent;
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .btn-icon {
          font-size: 1.3rem;
        }

        .test-credentials {
          background: linear-gradient(135deg, #f0f8ff, #e8f4fd);
          padding: 2rem;
          border-top: 1px solid rgba(30, 60, 114, 0.1);
        }

        .credential-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .credential-icon {
          font-size: 1.5rem;
        }

        .credential-header h3 {
          margin: 0;
          color: #1e3c72;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .credential-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .credential-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          border: 1px solid #e1e5e9;
        }

        .credential-label {
          color: #64748b;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .credential-value {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        code {
          background: #1e3c72;
          color: #ffffff;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 600;
          font-family: 'Courier New', monospace;
          font-size: 0.9rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .copy-btn {
          background: transparent;
          border: none;
          font-size: 1.1rem;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .copy-btn:hover {
          background: rgba(30, 60, 114, 0.1);
          transform: scale(1.1);
        }

        .security-notice {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem 2rem;
          background: rgba(30, 60, 114, 0.05);
          color: #64748b;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .security-icon {
          font-size: 1rem;
        }

        @media (max-width: 480px) {
          .login-admin-container {
            padding: 1rem;
          }

          .login-card {
            margin: 0.5rem;
          }

          .login-header {
            padding: 2.5rem 1.5rem 1.5rem;
          }

          .login-header h1 {
            font-size: 1.8rem;
          }

          .login-form {
            padding: 0 1.5rem 1.5rem;
          }

          .test-credentials {
            padding: 1.5rem;
          }

          .credential-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .credential-value {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
};

export default LoginAdmin;