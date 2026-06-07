import React from "react";

export default function MenuItemFormStyles() {
  return (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@700;900&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');

        .mif * { box-sizing: border-box; }

        .mif-back-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 50%;
          background: #fff; border: 1px solid #f0e6df;
          cursor: pointer; transition: all 0.15s ease;
          color: #251a07;
          flex-shrink: 0;
        }
        .mif-back-btn:hover { border-color: #bb0005; color: #bb0005; background: #fff8f3; }

        .mif-input {
          width: 100%; height: 42px;
          padding: 0 14px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px; font-weight: 500;
          color: #251a07;
          background: #fff;
          border: 1px solid #ede0d8;
          border-radius: 10px;
          outline: none;
          transition: border-color 0.15s ease;
        }
        .mif-input::placeholder { color: #c4b09a; font-weight: 400; }
        .mif-input:focus { border-color: #bb0005; }

        .mif-textarea {
          width: 100%;
          padding: 12px 14px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px; font-weight: 400; line-height: 1.6;
          color: #251a07;
          background: #fff;
          border: 1px solid #ede0d8;
          border-radius: 10px;
          outline: none;
          resize: none;
          transition: border-color 0.15s ease;
        }
        .mif-textarea::placeholder { color: #c4b09a; }
        .mif-textarea:focus { border-color: #bb0005; }

        .mif-label {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 12px; font-weight: 600;
          color: #5f5e5e;
          display: block; margin-bottom: 6px;
          letter-spacing: 0.01em;
        }

        .mif-field-error {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11.5px; color: #b00020;
          margin-top: 5px;
        }

        .mif-section-card {
          background: #fff;
          border: 1px solid #f0e6df;
          border-radius: 20px;
          padding: 28px 28px 32px;
        }

        .mif-toggle-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px;
          background: #fff8f3;
          border: 1px solid #f0e6df;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.15s ease;
          margin-top: 4px;
        }
        .mif-toggle-row:hover { background: #fff2e2; }

        .mif-toggle-label {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px; font-weight: 600; color: #251a07;
        }
        .mif-toggle-sub {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11.5px; color: #9c8c78; margin-top: 2px;
        }

        .mif-toggle-track {
          width: 40px; height: 22px; border-radius: 100px;
          transition: background 0.2s ease; flex-shrink: 0;
          position: relative;
        }
        .mif-toggle-thumb {
          position: absolute; top: 3px; width: 16px; height: 16px;
          border-radius: 50%; background: #fff;
          transition: left 0.2s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        .mif-save-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 24px;
          background: #bb0005; color: #fff;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px; font-weight: 600;
          border-radius: 100px; border: none; cursor: pointer;
          transition: background 0.15s ease, transform 0.1s ease;
          letter-spacing: 0.01em;
        }
        .mif-save-btn:hover:not(:disabled) { background: #e2231a; }
        .mif-save-btn:active:not(:disabled) { transform: scale(0.97); }
        .mif-save-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .mif-ghost-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 16px;
          background: transparent; color: #9c8c78;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px; font-weight: 600;
          border-radius: 100px; border: 1px solid #ede0d8;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .mif-ghost-btn:hover { border-color: #251a07; color: #251a07; }

        .mif-delete-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 16px;
          background: transparent; color: #b00020;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px; font-weight: 600;
          border-radius: 100px; border: 1px solid #f5c5c8;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .mif-delete-btn:hover { background: #fdeaec; border-color: #b00020; }

        .mif-confirm-row {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 14px 6px 6px;
          background: #fdeaec;
          border: 1px solid #f5c5c8;
          border-radius: 100px;
        }
        .mif-char-counter {
          display: flex; align-items: center; gap: 6px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11px; font-weight: 600;
          margin-top: 6px;
          transition: color 0.2s ease;
        }
      `}</style>
  );
}
