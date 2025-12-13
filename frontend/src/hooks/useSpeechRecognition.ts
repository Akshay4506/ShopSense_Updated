import { useState, useEffect, useCallback, useRef } from 'react';

export interface SpeechRecognitionHook {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  hasRecognitionSupport: boolean;
  error: string | null;
}

export default function useSpeechRecognition(
  onResultCallback?: (transcript: string) => void,
  language: string = 'en-IN',
): SpeechRecognitionHook {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasRecognitionSupport, setHasRecognitionSupport] = useState(false);

  // Use a ref to access the latest callback without re-creating the recognition instance
  const callbackRef = useRef(onResultCallback);

  useEffect(() => {
    callbackRef.current = onResultCallback;
  }, [onResultCallback]);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for browser support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setHasRecognitionSupport(true);
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = language; // Dynamic language

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        const trimmed = finalTranscript.trim();
        if (trimmed) {
          setTranscript(trimmed);
          if (callbackRef.current) {
            callbackRef.current(trimmed);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone access denied.');
        } else {
          setError(event.error);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setHasRecognitionSupport(false);
      setError('Browser verification failed: Web Speech API not supported.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language]); // Re-initialize when language changes

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Failed to start recognition', e);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    hasRecognitionSupport,
    error,
  };
}
