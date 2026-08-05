import type { Role } from "@/types/auth";
import type { TamanhoDecoracao } from "@/types/festa";

export interface UserAdmin {
  id: string;
  nome: string;
  email: string | null;
  role: Role;
  ativo: boolean;
  ehSocia?: boolean;
  ehDona?: boolean;
  /** ISO — sócia só nas festas quitadas (marcadas como pagas) a partir desta data. */
  sociaDesde?: string | null;
}

export interface ConfiguracaoNegocio {
  id: string;
  comissaoPercentual: number | string;
  comissaoSociaPercentual?: number | string;
  comissaoMetaSemanal: number | string;
  diariaMontador?: number | string;
  diariaDesmontador?: number | string;
  clausulasContrato: string | null;
  nomeEmpresa: string;
  sloganEmpresa: string;
  telefoneEmpresa?: string | null;
  whatsappEmpresa?: string | null;
  enderecoEmpresa?: string | null;
  logoMidiaId: string | null;
  logoMidia?: { id: string; mimeType: string; tamanho: number; tipo: string } | null;
  atualizadoEm?: string;
}

export interface CatalogoKitApi {
  id: string;
  nome: string;
  categoria: string;
  descricaoCurta: string;
  valorEquipe: number | string;
  valorPegueEMonte: number | string | null;
  tamanhoSugerido: TamanhoDecoracao;
  itens: string[];
  ativo: boolean;
  ordem: number;
  imagemMidiaId?: string | null;
  imagemMidia?: { id: string; mimeType: string; tamanho: number } | null;
}

export interface CatalogoAddonApi {
  id: string;
  nome: string;
  valor: number | string;
  tipo: "ADDON" | "EXTRA_METROS";
  ativo: boolean;
  ordem: number;
  imagemMidiaId?: string | null;
  imagemMidia?: { id: string; mimeType: string; tamanho: number } | null;
}

export interface CatalogoPublico {
  kits: CatalogoKitApi[];
  addons: CatalogoAddonApi[];
}
