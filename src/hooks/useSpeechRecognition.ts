import { useState, useEffect, useCallback, useRef } from "react";

interface UseSpeechRecognitionProps {
  onResult: (transcript: string) => void;
  onError?: (error: string) => void;
  language?: string;
}

export const INDIAN_LANGUAGES = [
  { code: "hi-IN", label: "Hindi" },
  { code: "ta-IN", label: "Tamil" },
  { code: "te-IN", label: "Telugu" },
  { code: "kn-IN", label: "Kannada" },
  { code: "ml-IN", label: "Malayalam" },
  { code: "mr-IN", label: "Marathi" },
  { code: "gu-IN", label: "Gujarati" },
  { code: "bn-IN", label: "Bengali" },
  { code: "pa-IN", label: "Punjabi" },
  { code: "en-IN", label: "English (India)" },
];

export function useSpeechRecognition({ onResult, onError, language = "hi-IN" }: UseSpeechRecognitionProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>("");

  useEffect(() => {
    // Check if Web Speech API is supported
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
    setIsModelLoading(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onError?.("Speech recognition is not supported in this browser");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      
      // Set language dynamically
      recognition.lang = language;
      recognition.continuous = true; // Keep listening continuously
      recognition.interimResults = false; // Disable interim results for cleaner handling
      recognition.maxAlternatives = 1;

      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsListening(true);
        setIsModelLoading(false);
        finalTranscriptRef.current = "";
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;

          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          }
        }

        // Only process final results
        if (finalTranscript.trim()) {
          finalTranscriptRef.current = finalTranscript.trim();
          onResult(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        
        const errorMessages: { [key: string]: string } = {
          "no-speech": "No speech detected. Please try speaking.",
          "audio-capture": "No microphone found. Please check your microphone settings.",
          "network": "Network error. Please check your internet connection.",
          "not-allowed": "Microphone access denied. Please allow microphone access in browser settings.",
          "service-not-allowed": "Speech recognition service is not available.",
        };

        onError?.(errorMessages[event.error] || `Speech recognition error: ${event.error}`);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      onError?.("Failed to start speech recognition. Please try again.");
      setIsListening(false);
    }
  }, [language, onResult, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  return {
    isListening,
    isSupported,
    isModelLoading,
    startListening,
    stopListening,
  };
}
