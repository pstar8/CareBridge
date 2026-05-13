import { useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, Square, VolumeX } from 'lucide-react';
import { getSettings } from '../utils/storage';

function getBestVoice(voices, languageCode) {
  const langPrefix = languageCode?.split('-')[0];
  return voices.find(v => v.lang === languageCode)
    || voices.find(v => v.lang?.toLowerCase() === languageCode?.toLowerCase())
    || voices.find(v => v.lang?.startsWith(langPrefix))
    || null;
}

function splitWords(text) {
  return String(text || '').split(/(\s+)/).filter(Boolean);
}

export default function ReadableText({
  text,
  languageCode = 'en-GB',
  label = 'Read aloud',
  compact = false,
  showText = true,
  textClassName = 'text-sm text-slate-700 leading-relaxed',
}) {
  const [voices, setVoices] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [notSupported, setNotSupported] = useState(false);
  const [voiceMissing, setVoiceMissing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wordStarts = useRef([]);
  const words = useMemo(() => splitWords(text), [text]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  useEffect(() => {
    let position = 0;
    wordStarts.current = words.map(word => {
      const start = position;
      position += word.length;
      return start;
    });
  }, [words]);

  const stop = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setActiveIndex(-1);
  };

  const speak = () => {
    if (!('speechSynthesis' in window)) {
      setNotSupported(true);
      return;
    }
    if (!text?.trim()) return;
    if (isSpeaking) return stop();

    const utterance = new SpeechSynthesisUtterance(text);
    const settings = getSettings();
    utterance.lang = languageCode;
    utterance.rate = Number(settings.speechRate || 0.9);
    utterance.pitch = 1;
    utterance.volume = 1;

    const matchingVoice = getBestVoice(voices, languageCode);
    if (matchingVoice) {
      utterance.voice = matchingVoice;
      setVoiceMissing(false);
    } else {
      setVoiceMissing(languageCode !== 'en-GB');
    }

    window.speechSynthesis.cancel();
    utterance.onstart = () => { setIsSpeaking(true); setActiveIndex(0); };
    utterance.onend = () => { setIsSpeaking(false); setActiveIndex(-1); };
    utterance.onerror = () => { setIsSpeaking(false); setActiveIndex(-1); };
    utterance.onboundary = (event) => {
      if (event.name !== 'word' && event.charIndex === undefined) return;
      const idx = wordStarts.current.reduce((last, start, i) => start <= event.charIndex ? i : last, 0);
      setActiveIndex(idx);
    };
    window.speechSynthesis.speak(utterance);
  };

  if (notSupported) {
    return <span className="text-xs text-slate-500 inline-flex items-center gap-1"><VolumeX size={14} /> Text-to-speech is not supported in this browser.</span>;
  }

  return (
    <div className="space-y-2">
      {showText && (
        <p className={textClassName}>
          {words.map((word, i) => {
            const isSpace = /^\s+$/.test(word);
            if (isSpace) return word;
            return <span key={`${word}-${i}`} className={isSpeaking && i === activeIndex ? 'bg-yellow-200 rounded px-0.5 transition-colors' : ''}>{word}</span>;
          })}
        </p>
      )}
      <div className="inline-flex flex-col gap-1">
        <button
          onClick={speak}
          className={`flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all border ${compact ? 'px-3 py-1.5' : 'px-4 py-2'} ${
            isSpeaking
              ? 'bg-teal-50 border-teal-300 text-teal-700'
              : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-700'
          }`}
        >
          {isSpeaking ? <Square size={14} className="fill-current" /> : <Volume2 size={14} />}
          <span>{isSpeaking ? 'Stop reading' : label}</span>
        </button>
        {voiceMissing && <span className="text-[11px] text-amber-600 max-w-xs">Your browser may not have a voice for this language. Install a system/browser voice or use an AI TTS API later.</span>}
      </div>
    </div>
  );
}
