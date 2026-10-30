import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, KeyRound, Sparkles } from 'lucide-react';
import { DEFAULT_PASSWORD, isPasswordValid } from '../features/password-gate/PasswordGate';
import './PaperCardIntro.css';
import { PaperTreeSculpture } from './PaperTreeSculpture';

interface Props {
  ready: boolean;
  onReveal: () => void;
  onComplete: () => void;
}

export const PaperCardIntro: React.FC<Props> = ({ ready, onReveal, onComplete }) => {
  const [stage, setStage] = useState<'closed' | 'open' | 'leaving'>('closed');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const passwordRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const openCard = () => {
    setStage('open');
    timer.current = setTimeout(() => passwordRef.current?.focus(), 1400);
  };

  const enter = (event: React.FormEvent) => {
    event.preventDefault();
    if (stage === 'leaving' || !ready) return;
    const target = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_APP_PASSWORD || DEFAULT_PASSWORD;
    if (!isPasswordValid(password, target)) {
      setError(password.trim() ? '口令不正确，再试一次吧' : '请输入你的专属口令');
      passwordRef.current?.focus();
      return;
    }
    clearTimeout(timer.current);
    setStage('leaving');
    onReveal();
    timer.current = setTimeout(onComplete, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 250 : 2200);
  };

  return (
    <section className={`paper-intro paper-${stage}`} aria-label="2026 立体圣诞贺卡">
      <header className="paper-masthead"><span>CHRISTMAS LIGHT GARDEN</span><span>A KEEPSAKE FOR 2026</span></header>
      <div className="paper-ambient" aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties}>✧</i>)}</div>
      <div className="paper-perspective">
        <div className="paper-book">
          <div className="paper-leaf paper-left">
            <span className="paper-edition">THE WONDER OF LITTLE THINGS</span>
            <div className="paper-moon" />
            {stage !== 'closed' && <PaperTreeSculpture />}
            <span className="paper-left-caption">May your memories always glow.</span>
          </div>
          <div className="paper-leaf paper-right" aria-hidden={stage === 'closed'}>
            <span className="paper-letter-number">A LITTLE MAGIC, JUST FOR YOU</span>
            <span className="paper-letter-star">✦</span>
            <h1>把这一年的光，<br />送给你。</h1>
            <p className="paper-letter-en">Some memories deserve a little magic.</p>
            <p className="paper-letter-copy">翻开冬日的来信，让回忆在星光中相遇。<br />这里藏着一棵，只属于你的圣诞树。</p>
            <form className="paper-entry-form" onSubmit={enter}>
              <label className={`paper-password ${error ? 'has-error' : ''}`}>
                <KeyRound size={15} />
                <input ref={passwordRef} aria-label="专属口令" type="password" autoComplete="off" autoCapitalize="none" placeholder="输入专属口令" value={password} disabled={stage === 'leaving'} tabIndex={stage === 'closed' ? -1 : 0} onChange={e => { setPassword(e.target.value); setError(''); }} />
              </label>
              <div className="paper-form-status" role="status">{error || (ready ? '你的圣诞奇境，已经准备好了' : '正在准备你的圣诞奇境…')}</div>
              <button type="submit" className="paper-enter" onClick={enter} disabled={!ready || stage === 'leaving'} tabIndex={stage === 'closed' ? -1 : 0}><span>让心意发光</span><ArrowRight size={17} /></button>
            </form>
            <div className="paper-signature">With love, <span>Christmas 2026</span></div>
          </div>
          <button className="paper-cover" onClick={openCard} aria-label="展开立体圣诞贺卡" aria-hidden={stage !== 'closed'} tabIndex={stage === 'closed' ? 0 : -1} disabled={stage !== 'closed'}>
            <span className="paper-cover-border" />
            <span className="paper-cover-year">TWENTY TWENTY SIX</span>
            <span className="paper-cover-spark">✦</span>
            <span className="paper-cover-tree"><i /><i /><i /><b /></span>
            <span className="paper-cover-title">A little<br /><em>Christmas</em><br />magic.</span>
            <span className="paper-cover-action">轻触，展开你的圣诞来信 <ArrowRight size={15} /></span>
          </button>
        </div>
      </div>
      <footer className="paper-footer"><span>MADE OF PAPER. FILLED WITH LIGHT.</span><span><Sparkles size={13} /> {stage === 'closed' ? '一封等待你开启的冬日来信' : stage === 'leaving' ? '纸上的心意，正在化作星光' : '从一张贺卡，走进一整个圣诞世界'}</span></footer>
      <div className="paper-transition-light" aria-hidden="true" />
    </section>
  );
};
