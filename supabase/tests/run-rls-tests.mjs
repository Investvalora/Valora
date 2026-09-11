#!/usr/bin/env node
/**
 * Harness de RLS e de recálculo do schema `public` — Stories 2.2 e 2.5
 *
 * Cobre as linhas das matrizes de I/O que são comportamento de BANCO e não têm
 * como ser testadas em unidade: o isolamento por usuário de `positions` e de
 * `transactions` (usuário B consultando o dado de A recebe zero linhas) e a
 * aritmética do trigger `recalculate_position_on_transaction`.
 *
 * O QUE FAZ
 *   Sobe um `postgres:15-alpine` efêmero, aplica o stub do ambiente Supabase
 *   (`000_stub_supabase.sql`), aplica as migrations e roda os arquivos de
 *   asserção na ordem. Derruba o container ao final, inclusive em caso de
 *   falha.
 *
 * MIGRATIONS APLICADAS
 *   001, 002, 003, 004, 006, 007, 008 e 009. A 005 é PULADA de propósito: agenda o sync
 *   de preços via `pg_cron`/`pg_net` e lê segredo do `vault`, três extensões
 *   que não existem na imagem oficial do Postgres. Ela não toca `positions`
 *   nem `transactions`, então pular não afeta o que está sob teste.
 *
 * ASSERÇÕES
 *   `010_positions_rls_test.sql`, `020_transactions_rls_test.sql`,
 *   `021_alerts_rls_test.sql` e `030_market_seed_rls_test.sql`, no
 *   MESMO banco. A 020 usa identidades e fixtures próprias justamente para não
 *   depender do estado que a 010 deixa nem colidir com ele.
 *
 * SAÍDA
 *   Status 0 quando toda asserção passa. Qualquer `FAIL` levanta exceção no
 *   psql, que aborta por `ON_ERROR_STOP=1`, e o status vira diferente de zero
 *   — o script serve, portanto, como gate de CI.
 *
 * USO
 *   pnpm test:rls
 *   KEEP_CONTAINER=1 pnpm test:rls   # mantém o container para inspeção
 *
 * REQUISITOS
 *   docker no PATH. Nada de rede além do pull da imagem no primeiro uso.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const TESTS_DIR = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(TESTS_DIR, '..', 'migrations')

const IMAGE = process.env.POSTGRES_IMAGE ?? 'postgres:15-alpine'
const CONTAINER = process.env.CONTAINER_NAME ?? 'valora-rls-test'
const DB_USER = 'postgres'
const DB_NAME = 'postgres'
const READY_TIMEOUT_MS = 60_000

/** Migrations aplicadas, em ordem. A 005 fica de fora (ver cabeçalho). */
const MIGRATIONS = [
  '001_create_users_table.sql',
  '002_create_user_trigger.sql',
  '003_create_assets_price_history.sql',
  '004_harden_default_privileges.sql',
  '006_create_positions.sql',
  '007_create_transactions.sql',
  '008_create_alerts.sql',
  '009_create_dividends_and_fundamentals.sql',
]

/** Stub primeiro, asserções depois; as migrations entram no meio. */
const STUB = '000_stub_supabase.sql'
const SEED = join(TESTS_DIR, '..', 'seed.sql')
const ASSERTIONS = ['010_positions_rls_test.sql', '020_transactions_rls_test.sql', '021_alerts_rls_test.sql', '030_market_seed_rls_test.sql']

function docker(args, options = {}) {
  return execFileSync('docker', args, { encoding: 'utf8', ...options })
}

function log(message) {
  process.stdout.write(`${message}\n`)
}

/** Pausa síncrona, sem depender de binário externo. */
function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function containerExists() {
  try {
    docker(['inspect', CONTAINER], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function removeContainer() {
  try {
    docker(['rm', '-f', CONTAINER], { stdio: 'ignore' })
  } catch {
    // Container inexistente é o caso normal na primeira execução.
  }

  // `docker rm -f` pode retornar antes de o nome ser liberado, e aí o `run`
  // seguinte falha com "container name is already in use".
  const deadline = Date.now() + 15_000
  while (containerExists() && Date.now() < deadline) {
    sleep(200)
  }
}

function startContainer() {
  log(`▸ subindo ${IMAGE} como ${CONTAINER}`)
  removeContainer()
  docker(
    [
      'run',
      '--rm',
      '-d',
      '--name',
      CONTAINER,
      '-e',
      'POSTGRES_PASSWORD=postgres',
      IMAGE,
    ],
    { stdio: 'ignore' },
  )
}

/**
 * Espera o servidor DEFINITIVO.
 *
 * O entrypoint da imagem oficial sobe um servidor temporário para rodar o
 * initdb e os scripts de inicialização, e depois o derruba para subir o
 * definitivo. Esse temporário escuta só no socket unix (`listen_addresses=''`),
 * então um `pg_isready` sem host conecta nele e declara pronto um servidor que
 * está a segundos de desligar — o psql seguinte quebra de forma intermitente.
 *
 * Testar por TCP elimina a ambiguidade: só o servidor definitivo aceita
 * conexão em 127.0.0.1. As duas confirmações consecutivas são seguro extra.
 */
function waitForReady() {
  const deadline = Date.now() + READY_TIMEOUT_MS
  let consecutive = 0

  while (Date.now() < deadline) {
    let ready = false
    try {
      docker(['exec', CONTAINER, 'pg_isready', '-h', '127.0.0.1', '-U', DB_USER, '-d', DB_NAME], {
        stdio: 'ignore',
      })
      ready = true
    } catch {
      // Ainda inicializando, ou ainda no servidor temporário do initdb.
    }

    consecutive = ready ? consecutive + 1 : 0
    if (consecutive >= 2) {
      log('▸ postgres pronto')
      return
    }

    sleep(500)
  }

  throw new Error(`Postgres não respondeu em ${READY_TIMEOUT_MS / 1000}s`)
}

/**
 * Envia o arquivo pelo stdin do psql, o que evita `docker cp` e mantém o
 * container sem estado além do banco.
 */
function applySql(label, path) {
  log(`▸ ${label}`)
  docker(
    [
      'exec',
      '-i',
      CONTAINER,
      'psql',
      '-X',
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      DB_USER,
      '-d',
      DB_NAME,
      '-f',
      '-',
    ],
    { input: readFileSync(path, 'utf8'), stdio: ['pipe', 'inherit', 'inherit'] },
  )
}

function main() {
  startContainer()
  waitForReady()

  applySql(`stub do ambiente Supabase (${STUB})`, join(TESTS_DIR, STUB))

  for (const migration of MIGRATIONS) {
    applySql(`migration ${migration}`, join(MIGRATIONS_DIR, migration))
  }

  for (const assertions of ASSERTIONS) {
    if (assertions === '030_market_seed_rls_test.sql') {
      applySql('seed do catálogo e dos dados de mercado', SEED)
      applySql('reexecução idempotente do seed', SEED)
    }
    applySql(`asserções (${assertions})`, join(TESTS_DIR, assertions))
  }

  log('\n✔ todas as asserções de RLS e de recálculo passaram')
}

try {
  main()
} catch (error) {
  process.stderr.write(`\n✖ harness de RLS falhou: ${error.message}\n`)
  process.exitCode = 1
} finally {
  if (process.env.KEEP_CONTAINER) {
    log(`▸ container ${CONTAINER} mantido (KEEP_CONTAINER)`)
  } else {
    removeContainer()
  }
}
