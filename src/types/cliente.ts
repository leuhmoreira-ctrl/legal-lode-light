import { z } from "zod";
import { validateCPF, validateCNPJ } from "@/utils/validation";

export const clienteSchema = z.object({
  id: z.string().optional(),
  tipo: z.enum(["pf", "pj"]),
  nome: z.string().min(1, "Nome é obrigatório"),
  cpf_cnpj: z.string().min(1, "CPF/CNPJ é obrigatório").refine((val) => {
    const clean = val.replace(/[^\d]/g, "");
    if (clean.length <= 11) return validateCPF(clean);
    return validateCNPJ(clean);
  }, "CPF/CNPJ inválido"),
  email: z.string().email("Email inválido"),
  telefone: z.string().min(1, "Telefone é obrigatório"),
  endereco: z.string().optional(),
});

export type Cliente = z.infer<typeof clienteSchema>;

export interface ClienteRow {
  id: string;
  user_id: string;
  tipo: "pf" | "pj";
  nome: string;
  cpf_cnpj: string;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  created_at: string;
  updated_at: string;
}
