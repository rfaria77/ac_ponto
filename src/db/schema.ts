import { pgTable, serial, text, timestamp, real, boolean } from 'drizzle-orm/pg-core';

export const colaboradores = pgTable('colaboradores', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  cargo: text('cargo').notNull(),
  departamento: text('departamento').notNull(),
  email: text('email'),
  fotoCadastro: text('foto_cadastro').notNull(),
  senha: text('senha'),
  mustChangePassword: boolean('must_change_password').default(true),
  horarioNotificacao: text('horario_notificacao'),
});

export const registros = pgTable('registros', {
  id: text('id').primaryKey(),
  colaboradorId: text('colaborador_id').notNull(),
  colaboradorNome: text('colaborador_nome').notNull(),
  timestamp: text('timestamp').notNull(),
  tipo: text('tipo').notNull(), // ENTRADA | SAIDA | INTERVALO
  status: text('status').notNull(),
  distanciaMetros: real('distancia_metros').notNull(),
  confiancaBiometrica: real('confianca_biometrica').notNull(),
  ehFotoAoVivo: boolean('eh_foto_ao_vivo').notNull(),
  enderecoGPS: text('endereco_gps'),
  justificativa: text('justificativa').notNull(),
  selfieUrl: text('selfie_url').notNull(),
});

export const atestados = pgTable('atestados', {
  id: text('id').primaryKey(),
  colaboradorId: text('colaborador_id').notNull(),
  colaboradorNome: text('colaborador_nome').notNull(),
  dataInicio: text('data_inicio').notNull(),
  dataFim: text('data_fim').notNull(),
  dias: serial('dias').notNull(),
  motivo: text('motivo').notNull(),
  cid: text('cid'),
  comprovanteUrl: text('comprovante_url').notNull(),
  status: text('status').notNull(),
  dataSolicitacao: text('data_solicitacao').notNull(),
});
