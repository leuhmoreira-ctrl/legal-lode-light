import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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

function checkBrowserSupport() {
  const hasMediaDevices = !!navigator.mediaDevices;
  const hasGetUserMedia = hasMediaDevices && !!navigator.mediaDevices.getUserMedia;
  const hasMediaRecorder = typeof MediaRecorder !== "undefined";
  const isSecureContext = window.isSecureContext;
  return { hasGetUserMedia, hasMediaRecorder, isSecureContext, supported: hasGetUserMedia && hasMediaRecorder && isSecureContext };
}

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
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [editableText, setEditableText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const finalTranscriptRef = useRef("");
  const { toast } = useToast();

  const browserSupport = checkBrowserSupport();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    console.log("🎤 Botão clicado");
    if (!browserSupport.supported) {
      toast({ title: "Navegador incompatível", description: "Use Chrome, Edge ou Safari para gravar áudio.", variant: "destructive" });
      return;
    }

    console.log("🔑 Solicitando permissão...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      console.log("✅ Permissão concedida");

      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        console.log("⏹️ Gravação parada");
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        console.log("💾 Blob criado:", blob.size, "bytes");
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
        setEditableText(finalTranscriptRef.current);
        setShowModal(true);
      };

      mediaRecorder.onerror = () => {
        toast({ title: "Erro na gravação", description: "Ocorreu um erro durante a gravação.", variant: "destructive" });
      };

      mediaRecorder.start(1000);
      console.log("🔴 Gravação iniciada");

      // SpeechRecognition (best-effort)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "pt-BR";
          recognition.maxAlternatives = 1;

          recognition.onresult = (event: any) => {
            let finalText = "";
            let interimText = "";
            for (let i = 0; i < event.results.length; i++) {
              const result = event.results[i];
              if (result.isFinal) {
                finalText += result[0].transcript;
              } else {
                interimText += result[0].transcript;
              }
            }
            if (finalText) {
              finalTranscriptRef.current = finalText;
              setFinalTranscript(finalText);
            }
            setInterimTranscript(interimText);
          };

          recognition.onerror = (e: any) => {
            console.warn("SpeechRecognition error (non-fatal):", e.error);
          };

          // Auto-restart on timeout (~60s)
          recognition.onend = () => {
            if (mediaRecorderRef.current?.state === "recording") {
              try { recognition.start(); } catch {}
            }
          };

          recognitionRef.current = recognition;
          recognition.start();
        } catch {
          console.warn("SpeechRecognition falhou ao iniciar.");
        }
      }

      setIsRecording(true);
      setFinalTranscript("");
      setInterimTranscript("");
      finalTranscriptRef.current = "";
      setTimer(0);
      timerRef.current = setInterval(() => setTimer((p) => p + 1), 1000);
    } catch (err: any) {
      console.error("❌ Erro ao iniciar gravação:", err.name, err.message);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        toast({ title: "Permissão necessária", description: "Clique no ícone 🔒 na barra de endereço, permita o microfone e recarregue.", variant: "destructive" });
      } else if (err.name === "NotFoundError") {
        toast({ title: "Microfone não encontrado", description: "Nenhum microfone detectado. Conecte um e tente novamente.", variant: "destructive" });
      } else if (err.name === "NotReadableError") {
        toast({ title: "Microfone em uso", description: "Seu microfone pode estar sendo usado por outro aplicativo.", variant: "destructive" });
      } else {
        toast({ title: "Erro ao acessar microfone", description: err.message || "Verifique as permissões.", variant: "destructive" });
      }
    }
  }, [browserSupport, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
    setIsRecording(false);
    setInterimTranscript("");
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const togglePreview = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.play(); setIsPlaying(true); }
  };

  const handleAction = (type: "transcribe" | "attach" | "both") => {
    if (!audioBlob) return;
    const text = editableText.trim();
    if (type === "transcribe") onTranscribe(text);
    else if (type === "attach") onAttachAudio(audioBlob);
    else onBoth(text, audioBlob);
    cleanup();
  };

  const cleanup = () => {
    setShowModal(false);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setFinalTranscript("");
    setInterimTranscript("");
    setEditableText("");
    setIsPlaying(false);
  };

  if (!browserSupport.supported) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" disabled className="h-8 w-8 rounded-full opacity-50">
            <MicOff className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Gravação de voz não suportada.<br />Use Chrome, Edge ou Safari.</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {isRecording ? (
          <div className="flex items-center gap-2">
            <Button variant="destructive" size="sm" onClick={stopRecording} className="animate-pulse gap-2">
              <Square className="w-4 h-4" />
              {formatTime(timer)}
            </Button>
            {(finalTranscript || interimTranscript) && (
              <div className="max-w-[200px] text-xs truncate text-muted-foreground">
                <span>{finalTranscript}</span>
                {interimTranscript && <span className="italic opacity-60">{interimTranscript}</span>}
              </div>
            )}
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={startRecording} className="h-8 w-8 rounded-full">
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
              {audioUrl && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePreview}>
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <span className="text-xs text-muted-foreground">{isPlaying ? "Reproduzindo..." : "Ouvir gravação"}</span>
                  <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
                </div>
              )}
            </div>

            {editableText ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase font-medium">Transcrição (editável):</p>
                <Textarea
                  value={editableText}
                  onChange={(e) => setEditableText(e.target.value)}
                  rows={4}
                  className="text-sm"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="w-3 h-3" />
                <span>Transcrição não disponível (navegador pode não suportar).</span>
              </div>
            )}

            <p className="text-sm text-center text-muted-foreground">O que deseja fazer?</p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={() => handleAction("transcribe")} disabled={!editableText.trim()}>
              <Type className="w-4 h-4" />
              Apenas Texto
            </Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={() => handleAction("attach")}>
              <FileAudio className="w-4 h-4" />
              Apenas Áudio
            </Button>
            <Button className="flex-1 gap-2" onClick={() => handleAction("both")}>
              Ambos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
