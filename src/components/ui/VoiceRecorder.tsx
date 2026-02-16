import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Mic, Square, FileAudio, Type, Play, Pause, AlertTriangle, MicOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VoiceRecorderProps {
  onTranscribe: (text: string) => void;
  onAttachAudio: (blob: Blob) => void;
  onBoth: (text: string, blob: Blob) => void;
}

/** Check browser support for required APIs */
function checkBrowserSupport() {
  const hasMediaDevices = !!navigator.mediaDevices;
  const hasGetUserMedia = hasMediaDevices && !!navigator.mediaDevices.getUserMedia;
  const hasMediaRecorder = typeof MediaRecorder !== "undefined";
  const isSecureContext = window.isSecureContext;
  return { hasMediaDevices, hasGetUserMedia, hasMediaRecorder, isSecureContext, supported: hasGetUserMedia && hasMediaRecorder && isSecureContext };
}

/** Pick a supported mimeType */
function getSupportedMimeType(): string {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export function VoiceRecorder({ onTranscribe, onAttachAudio, onBoth }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcribedText, setTranscribedText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const browserSupport = checkBrowserSupport();

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      if (recognitionRef.current) recognitionRef.current.stop();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    console.log("🎤 Botão clicado");

    if (!browserSupport.supported) {
      console.error("❌ Navegador não suporta APIs necessárias", browserSupport);
      toast({
        title: "Navegador incompatível",
        description: "Use Chrome, Edge ou Safari para gravar áudio.",
        variant: "destructive",
      });
      return;
    }

    console.log("🔑 Solicitando permissão...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      console.log("✅ Permissão concedida");

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      console.log("📹 MediaRecorder criado", mimeType || "default mime");

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          console.log("📊 Chunk recebido:", e.data.size, "bytes");
        }
      };

      mediaRecorder.onstop = () => {
        console.log("⏹️ Gravação parada");
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        console.log("💾 Blob criado:", blob.size, "bytes");
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
        setShowModal(true);
      };

      mediaRecorder.onerror = (e: any) => {
        console.error("❌ MediaRecorder error:", e);
        toast({ title: "Erro na gravação", description: "Ocorreu um erro durante a gravação.", variant: "destructive" });
      };

      mediaRecorder.start(1000); // collect every 1s
      console.log("🔴 Gravação iniciada");

      // SpeechRecognition (optional, best-effort)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
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
            if (finalTranscript) setTranscribedText((prev) => (prev + " " + finalTranscript).trim());
          };
          recognition.onerror = (e: any) => console.warn("SpeechRecognition error (non-fatal):", e.error);
          recognitionRef.current = recognition;
          recognition.start();
        } catch {
          console.warn("SpeechRecognition falhou ao iniciar (não crítico).");
        }
      }

      setIsRecording(true);
      setTranscribedText("");
      setTimer(0);
      timerRef.current = setInterval(() => setTimer((p) => p + 1), 1000);
    } catch (err: any) {
      console.error("❌ Erro ao iniciar gravação:", err.name, err.message);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        toast({
          title: "Permissão necessária",
          description: "Clique no ícone 🔒 na barra de endereço, permita o microfone e recarregue a página.",
          variant: "destructive",
        });
      } else if (err.name === "NotFoundError") {
        toast({
          title: "Microfone não encontrado",
          description: "Nenhum microfone detectado. Conecte um e tente novamente.",
          variant: "destructive",
        });
      } else if (err.name === "NotReadableError") {
        toast({
          title: "Microfone em uso",
          description: "Seu microfone pode estar sendo usado por outro aplicativo.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao acessar microfone",
          description: err.message || "Verifique as permissões do navegador.",
          variant: "destructive",
        });
      }
    }
  }, [browserSupport, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const togglePreview = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleAction = (type: "transcribe" | "attach" | "both") => {
    if (!audioBlob) return;
    if (type === "transcribe") onTranscribe(transcribedText.trim());
    else if (type === "attach") onAttachAudio(audioBlob);
    else onBoth(transcribedText.trim(), audioBlob);

    cleanup();
  };

  const cleanup = () => {
    setShowModal(false);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscribedText("");
    setIsPlaying(false);
  };

  // Unsupported browser: show disabled button with tooltip
  if (!browserSupport.supported) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" disabled className="h-8 w-8 rounded-full opacity-50">
            <MicOff className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Gravação de voz não suportada neste navegador.<br />Use Chrome, Edge ou Safari.</p>
        </TooltipContent>
      </Tooltip>
    );
  }

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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={startRecording}
                className="h-8 w-8 rounded-full"
              >
                <Mic className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Gravar áudio / Ditado por voz</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={(open) => { if (!open) cleanup(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gravação Finalizada</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <p className="text-sm font-medium">Duração: {formatTime(timer)}</p>

              {/* Audio preview */}
              {audioUrl && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePreview}>
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <span className="text-xs text-muted-foreground">{isPlaying ? "Reproduzindo..." : "Ouvir gravação"}</span>
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />
                </div>
              )}

              {transcribedText && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Transcrição detectada:</p>
                  <p className="text-sm italic">"{transcribedText.trim()}"</p>
                </div>
              )}

              {!transcribedText && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Transcrição não disponível (navegador pode não suportar).</span>
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
