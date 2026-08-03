import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@contractclaw.ai');
  const [password, setPassword] = useState('password123');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('contractclaw_token', 'jwt-session-active');
    navigate('/dashboard');
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{
        background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 36,
        maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.4)',
        display: 'flex', flexDirection: 'column', gap: 24
      }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(13,148,136,.4)' }}>
            <ShieldCheck size={24} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>ContractClaw</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Enterprise Legal AI Risk Analysis</div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Work Email', type: 'email', value: email, setter: setEmail, icon: <Mail size={14} />, placeholder: 'you@company.com' },
            { label: 'Password',   type: 'password', value: password, setter: setPassword, icon: <Lock size={14} />, placeholder: '•••••••••' },
          ].map(({ label, type, value, setter, icon, placeholder }) => (
            <div key={label}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 5 }}>{label}</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>{icon}</span>
                <input
                  type={type}
                  value={value}
                  onChange={e => setter(e.target.value)}
                  placeholder={placeholder}
                  required
                  style={{
                    width: '100%', background: '#0f172a', border: '1px solid #334155',
                    borderRadius: 9, padding: '10px 12px 10px 32px', fontSize: 13,
                    color: '#f8fafc', outline: 'none', boxSizing: 'border-box',
                    fontFamily: 'inherit', transition: 'border-color .15s'
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = '#334155')}
                />
              </div>
            </div>
          ))}

          <button type="submit" style={{
            marginTop: 6, width: '100%', background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 9, padding: '11px 0', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background .15s', boxShadow: '0 2px 8px rgba(13,148,136,.3)'
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
          >
            Sign In to Dashboard <ArrowRight size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};
