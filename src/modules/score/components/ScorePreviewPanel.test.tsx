import { render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { ScorePreviewPanel, type ScorePreviewPanelProps } from './ScorePreviewPanel'
const data=vi.hoisted(()=>({source:'yahoo',type:'stock_br',value:76}))
vi.mock('../../portfolio/hooks/useWallets',()=>({useWallets:()=>({selectedWallet:{id:'wallet'}})}))
vi.mock('../../portfolio/hooks/usePositions',()=>({usePositions:()=>({data:[{ticker:'TEST',asset:{type:data.type}}],isLoading:false})}))
vi.mock('../hooks/useFundamentals',()=>({useFundamentals:()=>({data:[{ticker:'TEST',source:data.source,debt_equity:data.value}],isLoading:false})}))
const props:ScorePreviewPanelProps={scoreName:'Teste',metric:'debt_equity',operator:'gte',thresholdMin:1.5,thresholdMax:null,points:2,existingRulesInScore:[]}
beforeEach(()=>{data.source='yahoo';data.type='stock_br';data.value=76})
it('uses percentage units for both observed values and unchanged thresholds',()=>{
 render(<ScorePreviewPanel {...props}/> )
 expect(screen.getByText('Dívida/PL ≥ 1,5%')).toBeInTheDocument()
 expect(screen.getByText('76%')).toBeInTheDocument()
 expect(screen.getByText('Atende · +2')).toBeInTheDocument()
})
it.each(['brapi','seed','synthetic'])('does not preview unsupported or synthetic source %s as passing',source=>{
 data.source=source;render(<ScorePreviewPanel {...props}/> )
 expect(screen.getByText('Sem dados · 0')).toBeInTheDocument()
 expect(screen.queryByText('Atende · +2')).not.toBeInTheDocument()
})
it('respects asset class and does not label unavailable data as a failed criterion',()=>{
 data.type='fii';render(<ScorePreviewPanel {...props}/> )
 expect(screen.getByText('Sem dados · 0')).toBeInTheDocument()
 expect(screen.queryByText('Não atende · 0')).not.toBeInTheDocument()
})
it('shows negative points without a misleading plus sign',()=>{
 render(<ScorePreviewPanel {...props} points={-2}/> )
 expect(screen.getByText('Atende · -2')).toBeInTheDocument()
})
