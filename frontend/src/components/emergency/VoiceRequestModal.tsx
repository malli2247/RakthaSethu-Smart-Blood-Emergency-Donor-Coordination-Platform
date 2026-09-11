import React, { useState, useEffect } from 'react';
import { Mic, MicOff, CheckCircle2, AlertCircle, RefreshCw, X, ArrowRight, Volume2 } from 'lucide-react';
import { emergencyService } from '../../services/emergencyService';

interface VoiceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExtracted: (extracted: {
    bloodGroup: string;
    unitsRequired: number;
    hospitalName: string;
    urgency: string;
  }) => void;
}

export const VoiceRequestModal: React.FC<VoiceRequestModalProps> = ({
  isOpen,
  onClose,
  onConfirmExtracted,
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<{
    bloodGroup: string | null;
    bloodGroupFormatted: string | null;
    unitsRequired: number;
    hospitalName: string | null;
    urgency: string;
    confidence: number;
    missingFields: string[];
  } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setTranscript('');
      setParsedData(null);
      setError(null);
      setIsListening(false);
    }
  }, [isOpen]);

  const startListening = () => {
    setError(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition is not natively supported in this browser. Please type your phrase below.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const resultText = event.results[current][0].transcript;
        setTranscript(resultText);
      };

      recognition.onerror = (event: any) => {
        setError(`Microphone error: ${event.error || 'Permission denied'}`);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err: any) {
      setError(`Unable to start microphone: ${err.message}`);
      setIsListening(false);
    }
  };

  const handleParseTranscript = async () => {
    if (!transcript.trim()) {
      setError('Please speak or type a blood request description.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const parsed = await emergencyService.parseVoiceRequest(transcript);
      setParsedData(parsed);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to analyze voice input. Please enter details manually.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative overflow-hidden border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
            <Volume2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Voice Blood Requisition</h3>
            <p className="text-xs text-slate-500">Speak naturally in English or Hindi to register an urgent request</p>
          </div>
        </div>

        {/* Example Prompt */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 mb-4">
          <span className="font-semibold text-rose-600">Sample Voice Command:</span>
          <p className="italic mt-0.5">"I need two units of O positive blood for emergency surgery at Apollo Hospital"</p>
        </div>

        {/* Microphone Button & Waveform */}
        <div className="flex flex-col items-center justify-center py-5 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 mb-4">
          <button
            onClick={isListening ? () => setIsListening(false) : startListening}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse ring-8 ring-rose-200'
                : 'bg-rose-500 text-white hover:bg-rose-600 hover:scale-105'
            }`}
          >
            {isListening ? <Mic className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </button>
          <span className="text-xs font-semibold mt-3 text-slate-700">
            {isListening ? 'Listening... Speak your request now' : 'Tap to start speaking'}
          </span>
        </div>

        {/* Transcript Input / Display */}
        <div className="space-y-1.5 mb-4">
          <label className="text-xs font-semibold text-slate-700">Heard Transcript</label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Your spoken words will appear here, or you can type them directly..."
            rows={2}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
          />
        </div>

        {error && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Parsed Output Preview */}
        {parsedData && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 text-xs space-y-2">
            <div className="flex items-center justify-between font-bold text-emerald-900 border-b border-emerald-200 pb-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                I understood the following:
              </span>
              <span className="bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full text-[10px]">
                {Math.round(parsedData.confidence * 100)}% Confidence
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Blood Group</span>
                <span className="font-bold text-slate-900 text-sm">{parsedData.bloodGroupFormatted || 'Not detected'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Units Required</span>
                <span className="font-bold text-slate-900 text-sm">{parsedData.unitsRequired} Unit(s)</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Hospital</span>
                <span className="font-bold text-slate-900 text-sm">{parsedData.hospitalName || 'Not detected'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Urgency</span>
                <span className="font-bold text-slate-900 text-sm">{parsedData.urgency}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition"
          >
            Cancel
          </button>

          {!parsedData ? (
            <button
              onClick={handleParseTranscript}
              disabled={isProcessing || !transcript.trim()}
              className="px-5 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2 transition"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
              Analyze Speech
            </button>
          ) : (
            <button
              onClick={() => {
                onConfirmExtracted({
                  bloodGroup: parsedData.bloodGroup || 'O_POSITIVE',
                  unitsRequired: parsedData.unitsRequired || 1,
                  hospitalName: parsedData.hospitalName || 'City Hospital',
                  urgency: parsedData.urgency || 'NORMAL',
                });
                onClose();
              }}
              className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 flex items-center gap-2 transition shadow-sm"
            >
              <span>Confirm & Proceed</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
