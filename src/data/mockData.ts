import { format, addDays, subDays } from "date-fns";

export interface Processo {
  id: string;
  numero: string;
  comarca: string;
  vara: string;
  cliente: string;
  parteContraria: string;
  advogado: string;
  tipoAcao: string;
  valorCausa: number;
  fase: "Conhecimento" | "Recursal" | "Execução" | "Encerrado";
  tags: string[];
  dataDistribuicao: string;
  ultimaMovimentacao: string;
  descricaoMovimentacao: string;
}

export interface Prazo {
  id: string;
  processoId: string;
  processoNumero: string;
  tipo: "Processual" | "Administrativo" | "Audiência" | "Reunião";
  descricao: string;
  dataVencimento: string;
  status: "urgente" | "proximo" | "em_dia";
  responsavel: string;
  dataCriacao?: string;
}

export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string;
  status: "todo" | "doing" | "done";
  prioridade: "alta" | "media" | "baixa";
  responsavel: string;
  processoId?: string;
  processoNumero?: string;
  dataCriacao: string;
  dataVencimento?: string;
}

export interface Cliente {
  id: string;
  nome: string;
  cpfCnpj: string;
  email: string;
  telefone: string;
  endereco: string;
  processosAtivos: number;
  totalHonorarios: number;
  statusPagamento: "em_dia" | "pendente" | "atrasado";
}

const hoje = new Date();

export const processosMock: Processo[] = [
  {
    id: "1",
    numero: "0001234-56.2024.8.26.0100",
    comarca: "São Paulo",
    vara: "3ª Vara Cível",
    cliente: "Maria Silva Santos",
    parteContraria: "Banco Nacional S.A.",
    advogado: "Dr. Carlos Mendes",
    tipoAcao: "Ação de Indenização",
    valorCausa: 150000,
    fase: "Conhecimento",
    tags: ["Consumidor", "Bancário"],
    dataDistribuicao: "2024-03-15",
    ultimaMovimentacao: format(subDays(hoje, 2), "yyyy-MM-dd"),
    descricaoMovimentacao: "Juntada de contestação pela parte ré",
  },
  {
    id: "2",
    numero: "0005678-90.2023.8.26.0114",
    comarca: "Campinas",
    vara: "1ª Vara do Trabalho",
    cliente: "João Pedro Oliveira",
    parteContraria: "Tech Solutions Ltda",
    advogado: "Dra. Ana Beatriz",
    tipoAcao: "Reclamação Trabalhista",
    valorCausa: 85000,
    fase: "Recursal",
    tags: ["Trabalhista", "Rescisão"],
    dataDistribuicao: "2023-08-22",
    ultimaMovimentacao: format(subDays(hoje, 1), "yyyy-MM-dd"),
    descricaoMovimentacao: "Recurso ordinário distribuído ao relator",
  },
  {
    id: "3",
    numero: "0009012-34.2024.8.26.0001",
    comarca: "São Paulo",
    vara: "5ª Vara de Família",
    cliente: "Fernanda Costa Lima",
    parteContraria: "Roberto Lima",
    advogado: "Dr. Carlos Mendes",
    tipoAcao: "Divórcio Litigioso",
    valorCausa: 500000,
    fase: "Conhecimento",
    tags: ["Família", "Partilha"],
    dataDistribuicao: "2024-06-10",
    ultimaMovimentacao: format(subDays(hoje, 5), "yyyy-MM-dd"),
    descricaoMovimentacao: "Designada audiência de conciliação",
  },
  {
    id: "4",
    numero: "0003456-78.2022.8.26.0002",
    comarca: "Santos",
    vara: "2ª Vara Cível",
    cliente: "Empresa ABC Comércio",
    parteContraria: "Transportadora XYZ",
    advogado: "Dra. Ana Beatriz",
    tipoAcao: "Cobrança",
    valorCausa: 230000,
    fase: "Execução",
    tags: ["Empresarial", "Cobrança"],
    dataDistribuicao: "2022-11-03",
    ultimaMovimentacao: format(subDays(hoje, 8), "yyyy-MM-dd"),
    descricaoMovimentacao: "Penhora online realizada",
  },
  {
    id: "5",
    numero: "0007890-12.2024.8.26.0100",
    comarca: "São Paulo",
    vara: "10ª Vara Cível",
    cliente: "Ricardo Almeida",
    parteContraria: "Seguradora Vida S.A.",
    advogado: "Dr. Paulo Henrique",
    tipoAcao: "Ação de Cobrança de Seguro",
    valorCausa: 320000,
    fase: "Conhecimento",
    tags: ["Securitário", "Seguro de Vida"],
    dataDistribuicao: "2024-01-18",
    ultimaMovimentacao: format(subDays(hoje, 3), "yyyy-MM-dd"),
    descricaoMovimentacao: "Laudo pericial juntado aos autos",
  },
];

export const prazosMock: Prazo[] = [
  {
    id: "1",
    processoId: "1",
    processoNumero: "0001234-56.2024.8.26.0100",
    tipo: "Processual",
    descricao: "Réplica à contestação",
    dataVencimento: format(addDays(hoje, 2), "yyyy-MM-dd"),
    status: "urgente",
    responsavel: "Dr. Carlos Mendes",
    dataCriacao: format(subDays(hoje, 10), "yyyy-MM-dd"),
  },
  {
    id: "2",
    processoId: "2",
    processoNumero: "0005678-90.2023.8.26.0114",
    tipo: "Processual",
    descricao: "Contrarrazões ao recurso",
    dataVencimento: format(addDays(hoje, 5), "yyyy-MM-dd"),
    status: "proximo",
    responsavel: "Dra. Ana Beatriz",
    dataCriacao: format(subDays(hoje, 15), "yyyy-MM-dd"),
  },
  {
    id: "3",
    processoId: "3",
    processoNumero: "0009012-34.2024.8.26.0001",
    tipo: "Audiência",
    descricao: "Audiência de Conciliação",
    dataVencimento: format(addDays(hoje, 3), "yyyy-MM-dd"),
    status: "urgente",
    responsavel: "Dr. Carlos Mendes",
    dataCriacao: format(subDays(hoje, 20), "yyyy-MM-dd"),
  },
  {
    id: "4",
    processoId: "4",
    processoNumero: "0003456-78.2022.8.26.0002",
    tipo: "Administrativo",
    descricao: "Enviar relatório mensal ao cliente",
    dataVencimento: format(addDays(hoje, 10), "yyyy-MM-dd"),
    status: "em_dia",
    responsavel: "Dra. Ana Beatriz",
    dataCriacao: format(subDays(hoje, 2), "yyyy-MM-dd"),
  },
  {
    id: "5",
    processoId: "5",
    processoNumero: "0007890-12.2024.8.26.0100",
    tipo: "Processual",
    descricao: "Manifestação sobre o laudo pericial",
    dataVencimento: format(addDays(hoje, 6), "yyyy-MM-dd"),
    status: "proximo",
    responsavel: "Dr. Paulo Henrique",
    dataCriacao: format(subDays(hoje, 8), "yyyy-MM-dd"),
  },
  {
    id: "6",
    processoId: "1",
    processoNumero: "0001234-56.2024.8.26.0100",
    tipo: "Reunião",
    descricao: "Reunião com a cliente Maria Silva",
    dataVencimento: format(addDays(hoje, 1), "yyyy-MM-dd"),
    status: "urgente",
    responsavel: "Dr. Carlos Mendes",
    dataCriacao: format(subDays(hoje, 5), "yyyy-MM-dd"),
  },
];

export const tarefasMock: Tarefa[] = [
  {
    id: "1",
    titulo: "Elaborar réplica - Proc. 0001234",
    descricao: "Redigir réplica à contestação do Banco Nacional",
    status: "doing",
    prioridade: "alta",
    responsavel: "Dr. Carlos Mendes",
    processoId: "1",
    processoNumero: "0001234-56.2024.8.26.0100",
    dataCriacao: format(subDays(hoje, 3), "yyyy-MM-dd"),
    dataVencimento: format(addDays(hoje, 2), "yyyy-MM-dd"),
  },
  {
    id: "2",
    titulo: "Preparar contrarrazões recurso",
    descricao: "Elaborar contrarrazões ao recurso ordinário",
    status: "todo",
    prioridade: "alta",
    responsavel: "Dra. Ana Beatriz",
    processoId: "2",
    processoNumero: "0005678-90.2023.8.26.0114",
    dataCriacao: format(subDays(hoje, 1), "yyyy-MM-dd"),
    dataVencimento: format(addDays(hoje, 5), "yyyy-MM-dd"),
  },
  {
    id: "3",
    titulo: "Juntar procuração nos autos",
    descricao: "Protocolar procuração atualizada no PJe",
    status: "todo",
    prioridade: "media",
    responsavel: "Dr. Paulo Henrique",
    processoId: "5",
    dataCriacao: format(subDays(hoje, 2), "yyyy-MM-dd"),
  },
  {
    id: "4",
    titulo: "Revisar cálculo de honorários",
    descricao: "Verificar tabela OAB e atualizar valores",
    status: "done",
    prioridade: "baixa",
    responsavel: "Dra. Ana Beatriz",
    dataCriacao: format(subDays(hoje, 7), "yyyy-MM-dd"),
  },
  {
    id: "5",
    titulo: "Protocolar petição inicial",
    descricao: "Distribuir nova ação no sistema PJe",
    status: "todo",
    prioridade: "media",
    responsavel: "Dr. Carlos Mendes",
    dataCriacao: format(subDays(hoje, 1), "yyyy-MM-dd"),
    dataVencimento: format(addDays(hoje, 4), "yyyy-MM-dd"),
  },
  {
    id: "6",
    titulo: "Audiência preparatória",
    descricao: "Preparar documentos para audiência de conciliação",
    status: "doing",
    prioridade: "alta",
    responsavel: "Dr. Carlos Mendes",
    processoId: "3",
    dataCriacao: format(subDays(hoje, 4), "yyyy-MM-dd"),
    dataVencimento: format(addDays(hoje, 3), "yyyy-MM-dd"),
  },
];

export const clientesMock: Cliente[] = [
  {
    id: "1",
    nome: "Maria Silva Santos",
    cpfCnpj: "123.456.789-00",
    email: "maria.silva@email.com",
    telefone: "(11) 98765-4321",
    endereco: "Rua Augusta, 1500 - São Paulo/SP",
    processosAtivos: 1,
    totalHonorarios: 15000,
    statusPagamento: "em_dia",
  },
  {
    id: "2",
    nome: "João Pedro Oliveira",
    cpfCnpj: "987.654.321-00",
    email: "joao.oliveira@email.com",
    telefone: "(19) 91234-5678",
    endereco: "Av. Brasil, 200 - Campinas/SP",
    processosAtivos: 1,
    totalHonorarios: 8500,
    statusPagamento: "pendente",
  },
  {
    id: "3",
    nome: "Fernanda Costa Lima",
    cpfCnpj: "456.789.123-00",
    email: "fernanda.lima@email.com",
    telefone: "(11) 99876-5432",
    endereco: "Rua Oscar Freire, 800 - São Paulo/SP",
    processosAtivos: 1,
    totalHonorarios: 25000,
    statusPagamento: "em_dia",
  },
  {
    id: "4",
    nome: "Empresa ABC Comércio",
    cpfCnpj: "12.345.678/0001-90",
    email: "contato@abccomercio.com.br",
    telefone: "(13) 3222-1100",
    endereco: "Rua do Comércio, 45 - Santos/SP",
    processosAtivos: 1,
    totalHonorarios: 35000,
    statusPagamento: "atrasado",
  },
  {
    id: "5",
    nome: "Ricardo Almeida",
    cpfCnpj: "321.654.987-00",
    email: "ricardo.almeida@email.com",
    telefone: "(11) 97654-3210",
    endereco: "Av. Paulista, 1000 - São Paulo/SP",
    processosAtivos: 1,
    totalHonorarios: 18000,
    statusPagamento: "em_dia",
  },
];

export const advogados = [
  "Dr. Carlos Mendes",
  "Dra. Ana Beatriz",
  "Dr. Paulo Henrique",
];
