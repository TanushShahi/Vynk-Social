import React, { useState } from 'react';
import { X, Copy, Share2, Download, ShieldCheck, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { VynkLogo } from './VynkLogo.js';

interface UIDQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
  name: string;
}

export const UIDQRModal: React.FC<UIDQRModalProps> = ({
  isOpen,
  onClose,
  uid,
  name
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(`@${uid}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const shareData = {
      title: `${name} on Vynk`,
      text: `Connect with me on Vynk: @${uid}`,
      url: window.location.origin
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // Ignored
      }
    } else {
      handleCopy();
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById('vynk-qr-code');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${uid}-vynk-card.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-sm bg-[#0c0f22] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow backdrop */}
        <div className="absolute top-0 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="w-full flex items-center justify-between mb-6 z-10">
          <div className="w-8" />
          <h2 className="text-base font-bold text-white tracking-wide">Your Unique UID</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* QR Card with glowing frame */}
        <div className="relative p-5 rounded-3xl bg-white/[0.03] border border-purple-500/30 shadow-[0_0_35px_rgba(168,85,247,0.3)] mb-5 flex flex-col items-center justify-center z-10">
          <div className="p-3 bg-white rounded-2xl shadow-inner relative flex items-center justify-center">
            <QRCodeSVG
              id="vynk-qr-code"
              value={`https://vynk.social/u/${uid}`}
              size={180}
              level="H"
              includeMargin={false}
              fgColor="#0a0c1a"
            />
            {/* Center Logo in QR Code */}
            <div className="absolute w-10 h-10 rounded-full bg-[#080a14] p-1 flex items-center justify-center shadow-md">
              <VynkLogo size={24} />
            </div>
          </div>
        </div>

        {/* Handle and Title */}
        <div className="text-center mb-6 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 mb-1.5">
            <span className="font-bold text-sm text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
              @{uid}
            </span>
          </div>
          <p className="text-xs text-slate-400">Your unique identity on Vynk</p>
        </div>

        {/* Action Buttons: Copy UID, Share, Download */}
        <div className="w-full grid grid-cols-3 gap-2 mb-6 z-10">
          <button
            onClick={handleCopy}
            className="py-2.5 px-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 flex flex-col items-center justify-center gap-1 text-slate-300 hover:text-white transition-all"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            <span className="text-[11px] font-semibold">{copied ? 'Copied!' : 'Copy UID'}</span>
          </button>

          <button
            onClick={handleShare}
            className="py-2.5 px-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 flex flex-col items-center justify-center gap-1 text-slate-300 hover:text-white transition-all"
          >
            <Share2 size={16} />
            <span className="text-[11px] font-semibold">Share</span>
          </button>

          <button
            onClick={handleDownload}
            className="py-2.5 px-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 flex flex-col items-center justify-center gap-1 text-slate-300 hover:text-white transition-all"
          >
            <Download size={16} />
            <span className="text-[11px] font-semibold">Download</span>
          </button>
        </div>

        {/* Security Footer Note */}
        <div className="w-full p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-2.5 z-10">
          <div className="w-7 h-7 rounded-full bg-purple-500/15 flex items-center justify-center text-purple-400 flex-shrink-0">
            <ShieldCheck size={16} />
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            This is your permanent UID. It's unique, secure and can't be changed.
          </p>
        </div>
      </div>
    </div>
  );
};
