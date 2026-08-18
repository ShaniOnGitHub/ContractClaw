import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, ArrowRight, UserPlus, AlertCircle, CheckCircle, Clock, Info } from 'lucide-react';
import { loginUser, signupUser } from '../services/api';
import { mapSupabaseAuthError } from '../utils/authErrorMapper';
import { mapHttpAuthError } from '../utils/authHttpErrorMapper';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cooldownTimer, setCooldownTimer] = useState<number>(0);
  const [isConfirmationPending, setIsConfirmationPending] = useState<boolean>(false);

  // Live countdown timer for rate-limit cooldown
  useEffect(() => {
    let timer: any = null;
    if (cooldownTimer > 0) {
      timer = setInterval(() => {
        setCooldownTimer(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldownTimer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownTimer > 0) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isSignup) {
        const res = await signupUser(email, password);
        localStorage.setItem('contractclaw_token', res.token || 'user_active_session');
        localStorage.setItem('contractclaw_user', JSON.stringify(res.user));
        setSuccess('Account created successfully! Redirecting to dashboard...');
        setTimeout(() => navigate('/dashboard'), 400);
      } else {
        const res = await loginUser(email, password);
        localStorage.setItem('contractclaw_token', res.token);
        localStorage.setItem('contractclaw_user', JSON.stringify(res.user));
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => navigate('/dashboard'), 400);
      }
    } catch (err: any) {
      // Backend (SQLite/JWT) errors → friendly HTTP mapper; Supabase errors → Supabase mapper.
      const mapped = err?.response?.status || err?.response
        ? mapHttpAuthError(err)
        : mapSupabaseAuthError(err);
      setError(mapped.message);
      if (mapped.isRateLimit && mapped.cooldownSeconds) {
        setCooldownTimer(mapped.cooldownSeconds);
      }
      // If the account already exists, flip to the Sign In tab with the email prefilled.
      if (mapped.suggestSignIn && isSignup) {
        setIsSignup(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Brand Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div className="login-brand-mark">
            <ShieldCheck size={24} color="#fff" />
          </div>
          <div style={{ marginTop: 4 }}>
            <div className="login-brand-name">ContractClaw</div>
            <div className="login-brand-sub">Enterprise Legal AI Risk Analysis</div>
          </div>
        </div>

        {/* Mode Selector (Login vs Signup) */}
        <div className="login-mode-toggle">
          <button
            type="button"
            onClick={() => { setIsSignup(false); setError(null); }}
            style={{
              flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 7, cursor: 'pointer',
              background: !isSignup ? 'var(--accent)' : 'transparent',
              color: !isSignup ? '#fff' : 'var(--text-secondary)',
              boxShadow: !isSignup ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignup(true); setError(null); setIsConfirmationPending(false); }}
            style={{
              flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 7, cursor: 'pointer',
              background: isSignup ? 'var(--accent)' : 'transparent',
              color: isSignup ? '#fff' : 'var(--text-secondary)',
              boxShadow: isSignup ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            Create Account
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', padding: '12px 14px', borderRadius: 10, fontSize: 12, lineHeight: '1.4' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Authentication Notice</div>
              <div>{error}</div>
            </div>
          </div>
        )}

        {success && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.4)', color: '#86efac', padding: '12px 14px', borderRadius: 10, fontSize: 12, lineHeight: '1.4' }}>
            <CheckCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>{success}</div>
          </div>
        )}

        {isConfirmationPending && !success && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#93c5fd', padding: '10px 14px', borderRadius: 8, fontSize: 12 }}>
            <Info size={16} style={{ flexShrink: 0 }} />
            <span>Please confirm your email before signing in.</span>
          </div>
        )}

        {/* Form */}
        <form method="post" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label htmlFor="user-email" style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 5 }}>Work Email</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                <Mail size={14} />
              </span>
              <input
                id="user-email"
                name="username"
                type="email"
                autoComplete="username"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                style={{
                  width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                  borderRadius: 9, padding: '10px 12px 10px 32px', fontSize: 13,
                  color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'inherit', transition: 'border-color .15s'
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="user-password" style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 5 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                <Lock size={14} />
              </span>
              <input
                id="user-password"
                name="password"
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="•••••••••"
                required
                minLength={8}
                style={{
                  width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                  borderRadius: 9, padding: '10px 12px 10px 32px', fontSize: 13,
                  color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'inherit', transition: 'border-color .15s'
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || cooldownTimer > 0}
            style={{
              marginTop: 8, width: '100%', background: cooldownTimer > 0 ? 'var(--bg-subtle)' : 'linear-gradient(90deg, var(--accent) 0%, var(--accent-deep) 100%)', color: '#fff',
              border: 'none', borderRadius: 9, padding: '11px 0', fontSize: 13, fontWeight: 700,
              cursor: (loading || cooldownTimer > 0) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: (loading || cooldownTimer > 0) ? 0.7 : 1, transition: 'all .15s', boxShadow: '0 2px 8px rgba(249,115,22,.35)'
            }}
            onMouseEnter={e => { if (!loading && cooldownTimer === 0) e.currentTarget.style.filter = 'brightness(1.15)'; }}
            onMouseLeave={e => { if (!loading && cooldownTimer === 0) e.currentTarget.style.filter = 'brightness(1)'; }}
          >
            {loading ? (
              <span>Processing...</span>
            ) : cooldownTimer > 0 ? (
              <>Rate Limited — Cooldown ({cooldownTimer}s) <Clock size={15} /></>
            ) : isSignup ? (
              <>Create Free Account <UserPlus size={15} /></>
            ) : (
              <>Sign In to Dashboard <ArrowRight size={15} /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
