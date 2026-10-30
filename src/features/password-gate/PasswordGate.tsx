import React, { useState } from 'react';
import { Lock, Sparkles, Key, AlertCircle } from 'lucide-react';
import './PasswordGate.css';

interface PasswordGateProps {
  onUnlock: () => void;
}

export const DEFAULT_PASSWORD = 'HKX2026';

export const isPasswordValid = (input: string, target: string = DEFAULT_PASSWORD): boolean => {
  const clean = input.trim();
  return clean.length > 0 && clean === target;
};

export const PasswordGate: React.FC<PasswordGateProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isExiting, setIsExiting] = useState(false);

  const targetPassword =
    (import.meta as unknown as { env: Record<string, string> }).env?.VITE_APP_PASSWORD ||
    DEFAULT_PASSWORD;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setIsError(true);
      setErrorMessage('请输入体验密码');
      return;
    }

    if (isPasswordValid(password, targetPassword)) {
      setIsError(false);
      setIsExiting(true);
      setTimeout(() => {
        onUnlock();
      }, 900);
    } else {
      setIsError(true);
      setErrorMessage('密码不正确，请重新输入');
      setTimeout(() => setIsError(false), 800);
    }
  };

  return (
    <div className={`password-gate-overlay ${isExiting ? 'fade-out' : ''}`}>
      <div className="ambient-stars">
        <span className="star s1">✦</span>
        <span className="star s2">✧</span>
        <span className="star s3">✵</span>
        <span className="star s4">✦</span>
      </div>

      <div className="gate-card">
        <div className="gate-header">
          <div className="badge-pill">
            <Sparkles size={14} className="gold-icon" />
            <span>CHRISTMAS LIGHT GARDEN · 2026</span>
          </div>
          <h1 className="gate-title">光粒子圣诞树</h1>
          <p className="gate-subtitle">
            深邃、浪漫、具有空间纵深的三维光影奇境
          </p>
        </div>

        <form onSubmit={handleSubmit} className="gate-form">
          <div className={`input-wrapper ${isError ? 'shake error' : ''}`}>
            <Key size={18} className="input-icon" />
            <input
              type="password"
              placeholder="输入专属密码，开启圣诞奇境"
              aria-label="体验密码"
              autoCapitalize="none"
              autoCorrect="off"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (isError) setIsError(false);
              }}
              autoFocus
            />
          </div>

          {isError && (
            <div className="error-tip">
              <AlertCircle size={14} />
              <span>{errorMessage}</span>
            </div>
          )}

          <button type="submit" className="unlock-button">
            <span>点亮圣诞世界</span>
            <Sparkles size={16} />
          </button>
        </form>

        <div className="gate-footer">
          <div className="hint-text">
            <span>2026 圣诞季 · 把回忆挂上树，把心意送给你</span>
          </div>
          <div className="security-notice">
            <Lock size={12} />
            <span>用专属口令，开启属于你的圣诞时刻</span>
          </div>
        </div>
      </div>
    </div>
  );
};
