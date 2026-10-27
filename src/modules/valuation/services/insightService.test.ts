import { expect, it, vi } from 'vitest'
import { insightService } from './insightService'
import { supabase } from '../../../shared/services/supabaseClient'

vi.mock('../../../shared/services/supabaseClient', () => ({ supabase: { from: vi.fn() } }))

it('corrige a leitura de margens antigas sem alterar os preços do snapshot', async () => {
  const data = [
    { strategy: 'bazin', ceiling_price: 87.52, current_price: 40, margin: 118.8 },
    { strategy: 'graham', graham_price: 100, current_price: 150, margin: -33.333 },
  ]
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data, error: null }) }
  vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>)
  const insights = await insightService.listInsights('user')
  expect(insights[0].margin).toBeCloseTo(54.296, 2)
  expect(insights[0].current_price).toBe(40)
  expect(insights[1].margin).toBe(-50)
  expect(data[0].margin).toBe(118.8)
})
