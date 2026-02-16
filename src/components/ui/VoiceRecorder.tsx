import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Mic, Square, Loader2, FileAudio, Type } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceRecorderProps {
  onTranscribe: (text: string) => void;
  onAttachAudio: (blob: Blob) => void;
  onBoth: (text: string, blob: Blob) => void;
}

export function VoiceRecorder({ onTranscribe, onAttachAudio, onBoth }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcribedText, setTranscribedText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();

      // Setup SpeechRecognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "pt-BR";

        recognition.onresult = (event: any) => {
          let finalTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
             setTranscribedText((prev) => prev + " " + finalTranscript);
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } else {
        console.warn("Speech Recognition API not supported in this browser.");
      }

      setIsRecording(true);
      setTranscribedText("");
      setTimer(0);
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast({
        title: "Erro ao acessar microfone",
        description: "Verifique as permissões do navegador.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setShowModal(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAction = (type: "transcribe" | "attach" | "both") => {
    if (!audioBlob) return;

    if (type === "transcribe") {
      onTranscribe(transcribedText.trim());
    } else if (type === "attach") {
      onAttachAudio(audioBlob);
    } else {
      onBoth(transcribedText.trim(), audioBlob);
    }

    setShowModal(false);
    setAudioBlob(null);
    setTranscribedText("");
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {isRecording ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={stopRecording}
            className="animate-pulse gap-2"
          >
            <Square className="w-4 h-4" />
            {formatTime(timer)}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="icon"
            onClick={startRecording}
            title="Gravar áudio / Ditado"
            className="h-8 w-8 rounded-full"
          >
            <Mic className="w-4 h-4" />
          </Button>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gravação Finalizada</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-1">Duração: {formatTime(timer)}</p>
              {transcribedText && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Transcrição detectada:</p>
                  <p className="text-sm italic">"{transcribedText.trim()}"</p>
                </div>
              )}
            </div>

            <p className="text-sm text-center text-muted-foreground">O que deseja fazer com esta gravação?</p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
             <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => handleAction("transcribe")}
              disabled={!transcribedText}
            >
              <Type className="w-4 h-4" />
              Apenas Texto
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => handleAction("attach")}
            >
              <FileAudio className="w-4 h-4" />
              Apenas Áudio
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={() => handleAction("both")}
            >
              Ambos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
