import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send, Check, Reply } from "lucide-react";

interface Comment {
  id: string;
  texto: string;
  autor_id: string;
  created_at: string;
  parent_id: string | null;
  resolvido: boolean;
}

export function CommentsSection({ workflowId }: { workflowId: string }) {
  const { user } = useAuth();
  const { teamMembers } = usePermissions();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const loadComments = async () => {
    const { data } = await supabase
      .from("workflow_comentarios")
      .select("*")
      .eq("workflow_id", workflowId)
      .order("created_at", { ascending: true });
    if (data) setComments(data);
  };

  useEffect(() => {
    loadComments();
    const channel = supabase
      .channel(`comments-${workflowId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "workflow_comentarios", filter: `workflow_id=eq.${workflowId}` }, () => loadComments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workflowId]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    await supabase.from("workflow_comentarios").insert({
      workflow_id: workflowId,
      autor_id: user!.id,
      texto: newComment,
      parent_id: replyTo,
      tipo: "geral",
      resolvido: false,
    });
    setNewComment("");
    setReplyTo(null);
  };

  const handleResolve = async (id: string, current: boolean) => {
    await supabase.from("workflow_comentarios").update({ resolvido: !current }).eq("id", id);
  };

  const getAuthor = (id: string) => teamMembers.find((m) => m.id === id);

  const rootComments = comments.filter((c) => !c.parent_id);

  const renderComment = (c: Comment, depth = 0) => {
    const author = getAuthor(c.autor_id);
    const replies = comments.filter((r) => r.parent_id === c.id);

    return (
      <div key={c.id} className={`flex gap-3 ${depth > 0 ? "ml-8 mt-2" : "mt-4"}`}>
        <Avatar className="w-8 h-8">
            <AvatarImage src={author?.avatar_url || undefined} />
          <AvatarFallback>{author?.full_name?.substring(0, 2).toUpperCase() || "??"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{author?.full_name || "Usuário desconhecido"}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
          <p className={`text-sm ${c.resolvido ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {c.texto}
          </p>
          <div className="flex items-center gap-2 pt-1">
            <Button variant="ghost" className="h-6 px-2 text-xs" onClick={() => setReplyTo(c.id)}>
              <Reply className="w-3 h-3 mr-1" /> Responder
            </Button>
            <Button
                variant="ghost"
                className={`h-6 px-2 text-xs ${c.resolvido ? "text-green-600 hover:text-green-700" : ""}`}
                onClick={() => handleResolve(c.id, c.resolvido)}
            >
              <Check className="w-3 h-3 mr-1" /> {c.resolvido ? "Resolvido" : "Resolver"}
            </Button>
          </div>
          {replies.map((r) => renderComment(r, depth + 1))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 pr-4 max-h-[500px]">
        {rootComments.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">Nenhum comentário ainda.</div>
        ) : (
            <div className="pb-4">
                {rootComments.map((c) => renderComment(c))}
            </div>
        )}
      </ScrollArea>
      <div className="pt-4 border-t mt-auto bg-background">
        {replyTo && (
            <div className="text-xs text-muted-foreground mb-2 flex justify-between">
                <span>Respondendo a comentário...</span>
                <button onClick={() => setReplyTo(null)} className="hover:underline">Cancelar</button>
            </div>
        )}
        <div className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Digite seu comentário..."
            className="min-h-[80px]"
          />
          <Button onClick={handleSubmit} size="icon" className="h-[80px] w-[60px]">
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
