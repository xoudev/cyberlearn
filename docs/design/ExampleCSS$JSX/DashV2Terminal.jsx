// DashV2Terminal.jsx — Cinematic terminal-style "Continue" card
function V2Terminal() {
  return (
    <section className="terminal-section">
      <div className="section-label">
        <div>
          <div className="section-label__eyebrow">01 · en cours</div>
          <h2 className="section-label__title">Reprends l'exploit.</h2>
        </div>
        <a href="#" className="section-label__cta">Historique complet →</a>
      </div>

      <div className="terminal">
        <div className="terminal__code">
          <div className="terminal__chrome">
            <span className="terminal__dot terminal__dot--1" />
            <span className="terminal__dot terminal__dot--2" />
            <span className="terminal__dot terminal__dot--3" />
            <span className="terminal__path">~/cyberlearn/<b>sqli_intro.py</b></span>
            <span className="terminal__badge">live</span>
          </div>

          <div className="terminal__body">
            <div className="ln"><span className="ln__num">01</span><span><span className="c"># ⚠ vulnérable — concaténation directe</span></span></div>
            <div className="ln"><span className="ln__num">02</span><span><span className="k">def</span> <span className="fn">login</span><span className="p">(</span><span className="v">user</span><span className="p">,</span> <span className="v">pwd</span><span className="p">):</span></span></div>
            <div className="ln ln--highlight"><span className="ln__num">03</span><span>  q <span className="p">=</span> <span className="s">f"SELECT * FROM u WHERE n='</span><span className="p">&#123;</span><span className="inj">user</span><span className="p">&#125;</span><span className="s">'"</span></span></div>
            <div className="ln"><span className="ln__num">04</span><span>  <span className="k">return</span> db<span className="p">.</span><span className="fn">execute</span><span className="p">(</span>q<span className="p">).</span><span className="fn">fetchone</span><span className="p">()</span></span></div>
            <div className="ln"><span className="ln__num">05</span><span></span></div>
            <div className="ln"><span className="ln__num">06</span><span><span className="c"># payload : admin'-- </span></span></div>
            <div className="ln"><span className="ln__num">07</span><span><span className="c"># auth contournée → game over</span></span></div>
            <div className="ln"><span className="ln__num">08</span><span>&gt; <span className="terminal__caret" /></span></div>
          </div>
        </div>

        <div className="terminal__info">
          <div className="terminal__tags">
            <span className="t-tag t-tag--cybersec">Cybersec</span>
            <span className="t-tag t-tag--intermediate">Intermédiaire</span>
            <span className="t-tag t-tag--time">12 min</span>
            <span className="t-tag t-tag--xp">+100 XP</span>
          </div>

          <div className="terminal__index">Leçon · <b>03/05</b> — exemple concret</div>
          <h3 className="terminal__title">Introduction aux injections SQL</h3>
          <p className="terminal__subtitle">
            Prochaine section&nbsp;: les trois défenses qui fonctionnent vraiment.
            Requêtes préparées, validation, moindre privilège.
          </p>

          <div className="terminal__steps">
            <span className="terminal__step is-done" />
            <span className="terminal__step is-done" />
            <span className="terminal__step is-done" />
            <span className="terminal__step is-current" />
            <span className="terminal__step" />
          </div>

          <div className="terminal__cta">
            <a href="Lesson Detail Page.html" className="btn-brutal btn-brutal--primary">
              Reprendre
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M3 7 H11 M8 4 L11 7 L8 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <button className="btn-brutal btn-brutal--ghost" type="button">Skip</button>
          </div>
        </div>
      </div>
    </section>
  );
}

window.V2Terminal = V2Terminal;
