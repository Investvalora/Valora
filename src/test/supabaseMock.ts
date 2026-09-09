/**
 * Dublê do client Supabase.
 *
 * O `positionService` monta cadeias no estilo
 * `from(t).select(c).eq(k, v).limit(n)` e `await`-a a própria cadeia, que no
 * supabase-js é um `PromiseLike`. Este dublê reproduz esse contrato: cada
 * método registra a chamada e devolve a mesma cadeia, e o `then` consulta o
 * handler da tabela no momento do await — depois, portanto, de `insert` e
 * `maybeSingle` já terem sido registrados, o que permite ao handler decidir a
 * resposta olhando a cadeia inteira.
 *
 * É um singleton de módulo de propósito: `vi.mock` é elevado acima dos imports
 * do arquivo de teste, então a factory do mock precisa alcançar uma instância
 * que já exista. `resetSupabaseMock()` no `beforeEach` isola os testes.
 */

/** Forma de `{ data, error }` devolvida pelo PostgREST. */
export interface MockResult {
  data: unknown
  error: unknown
}

export interface RecordedCall {
  method: string
  args: unknown[]
}

/** Uma cadeia de chamadas, do `from(...)` até o await. */
export interface RecordedChain {
  table: string
  calls: RecordedCall[]
}

export type TableHandler = (chain: RecordedChain) => MockResult

const CHAIN_METHODS = [
  'select',
  'insert',
  'update',
  'delete',
  'upsert',
  'eq',
  'neq',
  'or',
  'ilike',
  'order',
  'limit',
  'single',
  'maybeSingle',
] as const

type ChainMethod = (typeof CHAIN_METHODS)[number]

type QueryBuilder = PromiseLike<MockResult> & {
  [method in ChainMethod]: (...args: unknown[]) => QueryBuilder
}

const EMPTY_RESULT: MockResult = { data: null, error: null }

class SupabaseMock {
  /** Toda cadeia criada desde o último reset, na ordem de criação. */
  readonly chains: RecordedChain[] = []

  private readonly handlers = new Map<string, TableHandler>()

  /** O objeto entregue no lugar de `supabase`. */
  readonly client = {
    from: (table: string): QueryBuilder => this.createBuilder(table),
  }

  /** Define como a tabela responde. O handler recebe a cadeia completa. */
  on(table: string, handler: TableHandler): void {
    this.handlers.set(table, handler)
  }

  reset(): void {
    this.chains.length = 0
    this.handlers.clear()
  }

  /** Cadeias da tabela que chamaram o método indicado. */
  chainsWith(table: string, method: ChainMethod): RecordedChain[] {
    return this.chains.filter(
      (chain) => chain.table === table && chain.calls.some((call) => call.method === method),
    )
  }

  /** Primeiro argumento de cada `insert` feito na tabela. */
  insertPayloads(table: string): Record<string, unknown>[] {
    return this.chains
      .filter((chain) => chain.table === table)
      .flatMap((chain) => chain.calls.filter((call) => call.method === 'insert'))
      .map((call) => call.args[0] as Record<string, unknown>)
  }

  /** Argumentos de todas as chamadas do método na tabela. */
  callArgs(table: string, method: ChainMethod): unknown[][] {
    return this.chains
      .filter((chain) => chain.table === table)
      .flatMap((chain) => chain.calls.filter((call) => call.method === method))
      .map((call) => call.args)
  }

  private createBuilder(table: string): QueryBuilder {
    const chain: RecordedChain = { table, calls: [] }
    this.chains.push(chain)

    const resolve = (): MockResult => {
      const handler = this.handlers.get(table)
      return handler ? handler(chain) : EMPTY_RESULT
    }

    const builder: Record<string, unknown> = {
      then: <TResult1 = MockResult, TResult2 = never>(
        onFulfilled?: ((value: MockResult) => TResult1 | PromiseLike<TResult1>) | null,
        onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) => Promise.resolve(resolve()).then(onFulfilled, onRejected),
    }

    for (const method of CHAIN_METHODS) {
      builder[method] = (...args: unknown[]) => {
        chain.calls.push({ method, args })
        return builder as unknown as QueryBuilder
      }
    }

    return builder as unknown as QueryBuilder
  }
}

export const supabaseMock = new SupabaseMock()

export function resetSupabaseMock(): void {
  supabaseMock.reset()
}
