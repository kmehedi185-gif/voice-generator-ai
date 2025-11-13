
import React, { useState, useRef, useCallback } from 'react';
import { generateMotivationalSpeech } from './services/geminiService';
import { decode, decodeAudioData, createWavBlob } from './utils/audio';
import { LoadingIcon, PlayIcon, StopIcon, SparklesIcon, DownloadIcon } from './components/Icons';

const DEFAULT_TEXT = "The only way to do great work is to love what you do. If you haven't found it yet, keep looking. Don't settle. As with all matters of the heart, you'll know when you find it.";

const voices = [
  { id: 'real_man_voice', name: 'Real Man Voice (Deep, warm, confident)' },
  { id: 'motivational_male', name: 'Motivational Male (Deep, confident)' },
  { id: 'motivational_female', name: 'Motivational Female (Energetic, uplifting)' },
  { id: 'calm_female', name: 'Calm Female (Soft, peaceful)' },
  { id: 'narrator_male', name: 'Narrator Male (Clear, balanced)' },
  { id: 'cinematic_male', name: 'Cinematic Male (Dramatic, intense)' },
  { id: 'cinematic_female', name: 'Cinematic Female (Epic, emotional)' },
  { id: 'storyteller_male', name: 'Storyteller Male (Warm, expressive)' },
  { id: 'storyteller_female', name: 'Storyteller Female (Comforting, vivid)' },
  { id: 'corporate_male', name: 'Corporate Male (Neutral, confident)' },
  { id: 'corporate_female', name: 'Corporate Female (Professional, calm)' },
  { id: 'robotic_male', name: 'Robotic Male (Slightly synthetic)' },
  { id: 'robotic_female', name: 'Robotic Female (Digital, sleek)' },
  { id: 'standard_male', name: 'Man' },
  { id: 'standard_female', name: 'Woman' },
  { id: 'baby_boy', name: 'Baby Boy (Playful, high-pitched)' },
  { id: 'baby_girl', name: 'Baby Girl (Playful, high-pitched)' },
  { id: 'spooky_ethereal', name: '👻 Spooky / ethereal — soft, echo-like, cinematic female voice for horror or mystery videos' },
  { id: 'glitched_ghost', name: '💀 Glitched / robotic ghost — digital distortion, eerie whisper effect' },
  { id: 'spirit_narrator', name: '🧞‍♀️ Spirit narrator — calm, distant, floating voice for storytelling' },
];

const accents = [
  { id: 'Default', name: 'Default (American)' },
  { id: 'British', name: 'British' },
  { id: 'Australian', name: 'Australian' },
  { id: 'Scottish', name: 'Scottish' },
  { id: 'Bengali', name: 'Bengali' },
];

const voiceStyles = [
  { id: 'Motivational', name: 'Motivational' },
  { id: 'Documentary', name: 'Documentary' },
  { id: 'Emotional', name: 'Emotional' },
  { id: 'Horror', name: 'Horror' },
  { id: 'Calm', name: 'Calm' },
  { id: 'Corporate', name: 'Corporate' },
];

const speechSpeeds = [
  { id: '0.75', name: 'Slower (Calm/Emotional)' },
  { id: '1.0', name: 'Normal (Default)' },
  { id: '1.25', name: 'Faster (Motivational)' },
  { id: '1.5', name: 'Very Fast (Energetic)' },
];

const App: React.FC = () => {
  const [text, setText] = useState<string>(DEFAULT_TEXT);
  const [selectedVoice, setSelectedVoice] = useState<string>('real_man_voice');
  const [selectedAccent, setSelectedAccent] = useState<string>('Default');
  const [selectedVoiceStyle, setSelectedVoiceStyle] = useState<string>('Motivational');
  const [speechSpeed, setSpeechSpeed] = useState<string>('1.0');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const handleGenerateSpeech = async () => {
    if (!text.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setAudioData(null);
    if (isPlaying) {
        stopPlayback();
    }

    try {
      const audioB64 = await generateMotivationalSpeech(text, selectedVoice, selectedVoiceStyle, selectedAccent, parseFloat(speechSpeed));
      setAudioData(audioB64);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const stopPlayback = useCallback(() => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const handlePlayAudio = async () => {
    if (!audioData) return;

    if (isPlaying) {
      stopPlayback();
      return;
    }

    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const audioContext = audioContextRef.current;
      await audioContext.resume();

      const decodedBytes = decode(audioData);
      const audioBuffer = await decodeAudioData(decodedBytes, audioContext, 24000, 1);
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.onended = () => {
        setIsPlaying(false);
        audioSourceRef.current = null;
      };
      source.start();
      
      audioSourceRef.current = source;
      setIsPlaying(true);
    } catch (err) {
      setError('Failed to play audio. Please try generating it again.');
      console.error('Audio playback error:', err);
    }
  };

  const handleDownloadAudio = () => {
    if (!audioData) return;

    try {
      const pcmData = decode(audioData);
      // API provides 16-bit PCM audio at a 24000Hz sample rate, mono.
      const wavBlob = createWavBlob(pcmData, 24000, 1, 16);
      
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'CineVoice_Motivator.wav';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to prepare audio for download.');
      console.error('Download error:', err);
    }
  };


  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-900/30"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div>

      <div className="w-full max-w-2xl mx-auto z-10">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-200 to-gray-400">
            CineVoice Motivator
          </h1>
          <p className="text-lg text-gray-400 mt-2">
            Transform your words into a powerful, cinematic speech.
          </p>
        </header>

        <main className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl shadow-2xl border border-white/10">
          <div className="flex flex-col space-y-4">
            <div>
              <label htmlFor="script" className="text-sm font-medium text-gray-300 mb-2 block">Your Motivational Script</label>
              <textarea
                id="script"
                rows={8}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter your motivational text here..."
                className="w-full p-4 bg-gray-800/50 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 resize-none placeholder-gray-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="voice-select" className="text-sm font-medium text-gray-300 mb-2 block">Choose a Voice</label>
                <div className="relative">
                  <select
                    id="voice-select"
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 appearance-none pl-4 pr-10"
                  >
                    {voices.map((voice) => (
                      <option key={voice.id} value={voice.id} className="bg-gray-800 text-white">
                        {voice.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="accent-select" className="text-sm font-medium text-gray-300 mb-2 block">Choose an Accent</label>
                <div className="relative">
                  <select
                    id="accent-select"
                    value={selectedAccent}
                    onChange={(e) => setSelectedAccent(e.target.value)}
                    className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 appearance-none pl-4 pr-10"
                  >
                    {accents.map((accent) => (
                      <option key={accent.id} value={accent.id} className="bg-gray-800 text-white">
                        {accent.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="voice-style-select" className="text-sm font-medium text-gray-300 mb-2 block">Select a Voice Style</label>
                <div className="relative">
                  <select
                    id="voice-style-select"
                    value={selectedVoiceStyle}
                    onChange={(e) => setSelectedVoiceStyle(e.target.value)}
                    className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 appearance-none pl-4 pr-10"
                  >
                    {voiceStyles.map((style) => (
                      <option key={style.id} value={style.id} className="bg-gray-800 text-white">
                        {style.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="speed-select" className="text-sm font-medium text-gray-300 mb-2 block">Speech Speed</label>
                <div className="relative">
                  <select
                    id="speed-select"
                    value={speechSpeed}
                    onChange={(e) => setSpeechSpeed(e.target.value)}
                    className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 appearance-none pl-4 pr-10"
                  >
                    {speechSpeeds.map((speed) => (
                      <option key={speed.id} value={speed.id} className="bg-gray-800 text-white">
                        {speed.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 text-red-300 p-3 rounded-lg text-sm">
                <strong>Error:</strong> {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <button
                onClick={handleGenerateSpeech}
                disabled={isLoading || !text.trim()}
                className="w-full sm:w-auto flex-grow flex items-center justify-center px-6 py-3 bg-indigo-600 rounded-lg font-semibold text-white shadow-lg hover:bg-indigo-500 disabled:bg-indigo-800/50 disabled:cursor-not-allowed disabled:text-gray-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                {isLoading ? (
                  <>
                    <LoadingIcon />
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon />
                    Generate Speech
                  </>
                )}
              </button>

              {audioData && (
                 <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-4">
                  <button
                    onClick={handlePlayAudio}
                    className="w-full sm:w-auto flex items-center justify-center px-6 py-3 bg-emerald-600 rounded-lg font-semibold text-white shadow-lg hover:bg-emerald-500 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                  >
                    {isPlaying ? (
                      <>
                        <StopIcon />
                        Stop
                      </>
                    ) : (
                      <>
                        <PlayIcon />
                        Play Audio
                      </>
                    )}
                  </button>
                   <button
                    onClick={handleDownloadAudio}
                    className="w-full sm:w-auto flex items-center justify-center px-6 py-3 bg-sky-600 rounded-lg font-semibold text-white shadow-lg hover:bg-sky-500 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                  >
                    <DownloadIcon />
                    Download
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      <footer className="absolute bottom-4 text-center text-gray-600 text-sm z-10">
        <p>Powered by Gemini API</p>
      </footer>
    </div>
  );
};

export default App;
