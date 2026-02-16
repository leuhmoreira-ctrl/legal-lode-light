export type FolderSubfolder = string | { nome: string; custom?: boolean };

export interface FolderCategory {
  nome: string;
  subpastas: FolderSubfolder[];
  custom?: boolean;
}

export interface FolderStructure {
  raiz: string;
  subpastas: FolderCategory[];
}

export interface FolderSuggestion {
  pastaCategoria: string;
  subpasta: string | null;
}

export interface FolderOption {
  value: string;
  label: string;
  pastaCategoria: string;
  subpasta: string | null;
}

export const DEFAULT_FOLDER_STRUCTURE: FolderStructure = {
  raiz: "Processo",
  subpastas: [
    { nome: "01 - Peticoes", subpastas: ["Inicial", "Contestacao", "Replica", "Recursos"] },
    { nome: "02 - Decisoes e Sentencas", subpastas: ["Despachos", "Decisoes Interlocutorias", "Sentenca"] },
    { nome: "03 - Documentos", subpastas: ["Procuracoes", "RG e CPF", "Comprovantes", "Contratos"] },
    { nome: "04 - Provas", subpastas: ["Documentais", "Testemunhais", "Periciais"] },
    { nome: "05 - Comunicacoes", subpastas: ["Emails", "Notificacoes", "Intimacoes"] },
    { nome: "06 - Jurisprudencia", subpastas: [] },
    { nome: "07 - Outros", subpastas: [] },
  ],
};

export function cloneDefaultFolderStructure(rootName = "Processo"): FolderStructure {
  return {
    raiz: rootName,
    subpastas: DEFAULT_FOLDER_STRUCTURE.subpastas.map((cat) => ({
      nome: cat.nome,
      custom: cat.custom,
      subpastas: cat.subpastas.map((sub) => (typeof sub === "string" ? sub : { ...sub })),
    })),
  };
}

export function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function suggestFolderForFileName(fileName: string): FolderSuggestion {
  const n = normalizeText(fileName);

  if (n.includes("petic") || n.includes("inicial")) {
    return { pastaCategoria: "01 - Peticoes", subpasta: "Inicial" };
  }
  if (n.includes("contest")) {
    return { pastaCategoria: "01 - Peticoes", subpasta: "Contestacao" };
  }
  if (n.includes("replica")) {
    return { pastaCategoria: "01 - Peticoes", subpasta: "Replica" };
  }
  if (n.includes("decisao") || n.includes("despacho")) {
    return { pastaCategoria: "02 - Decisoes e Sentencas", subpasta: "Despachos" };
  }
  if (n.includes("sentenca")) {
    return { pastaCategoria: "02 - Decisoes e Sentencas", subpasta: "Sentenca" };
  }
  if (n.includes("procurac")) {
    return { pastaCategoria: "03 - Documentos", subpasta: "Procuracoes" };
  }
  if (n.includes("rg") || n.includes("cpf")) {
    return { pastaCategoria: "03 - Documentos", subpasta: "RG e CPF" };
  }
  if (n.includes("contrato")) {
    return { pastaCategoria: "03 - Documentos", subpasta: "Contratos" };
  }

  return { pastaCategoria: "07 - Outros", subpasta: null };
}

export function getSubfolderName(sub: FolderSubfolder): string {
  return typeof sub === "string" ? sub : sub.nome;
}

export function isCustomSubfolder(sub: FolderSubfolder): boolean {
  return typeof sub === "object" && !!sub.custom;
}

export function parseFolderStructure(raw: unknown, rootFallback = "Processo"): FolderStructure {
  const fallback = cloneDefaultFolderStructure(rootFallback);
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const obj = raw as { raiz?: unknown; subpastas?: unknown };
  const raiz = typeof obj.raiz === "string" && obj.raiz.trim() ? obj.raiz : rootFallback;
  const subpastasRaw = Array.isArray(obj.subpastas) ? obj.subpastas : [];

  const subpastas: FolderCategory[] = subpastasRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as { nome?: unknown; subpastas?: unknown; custom?: unknown };
      if (typeof row.nome !== "string" || !row.nome.trim()) return null;
      const subfolders = Array.isArray(row.subpastas)
        ? row.subpastas
            .map((sub) => {
              if (typeof sub === "string" && sub.trim()) return sub;
              if (sub && typeof sub === "object" && typeof (sub as { nome?: unknown }).nome === "string" && (sub as { nome: string }).nome.trim()) {
                return {
                  nome: (sub as { nome: string }).nome,
                  custom: !!(sub as { custom?: unknown }).custom,
                };
              }
              return null;
            })
            .filter((sub): sub is FolderSubfolder => !!sub)
        : [];

      return {
        nome: row.nome,
        custom: !!row.custom,
        subpastas: subfolders,
      };
    })
    .filter((item): item is FolderCategory => !!item);

  return {
    raiz,
    subpastas: subpastas.length > 0 ? subpastas : fallback.subpastas,
  };
}

export function buildDocumentPath(
  root: string,
  pastaCategoria: string | null | undefined,
  subpasta: string | null | undefined,
  fileName: string
): string {
  const category = (pastaCategoria || "07 - Outros").trim();
  const sub = (subpasta || "").trim();
  if (sub) {
    return `${root}/${category}/${sub}/${fileName}`;
  }
  return `${root}/${category}/${fileName}`;
}

export function folderValue(pastaCategoria: string, subpasta: string | null): string {
  return `${pastaCategoria}||${subpasta || ""}`;
}

export function parseFolderValue(value: string): { pastaCategoria: string; subpasta: string | null } {
  const [pastaCategoria, subRaw = ""] = value.split("||");
  return {
    pastaCategoria,
    subpasta: subRaw || null,
  };
}

export function listFolderOptions(structure: FolderStructure): FolderOption[] {
  const options: FolderOption[] = [];
  structure.subpastas.forEach((cat) => {
    if (!cat.subpastas.length) {
      options.push({
        value: folderValue(cat.nome, null),
        label: cat.nome,
        pastaCategoria: cat.nome,
        subpasta: null,
      });
      return;
    }

    cat.subpastas.forEach((sub) => {
      const subName = getSubfolderName(sub);
      options.push({
        value: folderValue(cat.nome, subName),
        label: `${cat.nome} > ${subName}`,
        pastaCategoria: cat.nome,
        subpasta: subName,
      });
    });
  });
  return options;
}

export function folderKey(pastaCategoria: string | null | undefined, subpasta: string | null | undefined): string {
  return `${pastaCategoria || ""}::${subpasta || ""}`;
}

export function countByFolder(
  docs: Array<{ pasta_categoria?: string | null; subpasta?: string | null }>
): Record<string, number> {
  return docs.reduce<Record<string, number>>((acc, doc) => {
    const catKey = folderKey(doc.pasta_categoria, null);
    const subKey = folderKey(doc.pasta_categoria, doc.subpasta);
    acc[catKey] = (acc[catKey] || 0) + 1;
    acc[subKey] = (acc[subKey] || 0) + 1;
    return acc;
  }, {});
}
