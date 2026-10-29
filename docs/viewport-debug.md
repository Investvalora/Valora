# Diagnóstico do viewport no PWA do iPhone

O medidor fica desligado por padrão. Para ativá-lo temporariamente no servidor
local de desenvolvimento:

```powershell
$env:VITE_VIEWPORT_PROBE = '1'
npm run dev
Remove-Item Env:VITE_VIEWPORT_PROBE
```

No iPhone, abra o PWA, toque em **Medir**, abra **Adicionar Lançamento**, foque
um campo e dispense o teclado. Aguarde um segundo e toque em **Exportar** ou
**Copiar** e envie o JSON para análise. O JSON inclui dimensões e posições,
sem registrar valores digitados.
O log permanece em `sessionStorage` durante a sessão e tem limite de 200 amostras.

O medidor também fica ausente nos builds normais. Para incluí-lo em um build
temporário, use a mesma variável e remova-a depois:

```powershell
$env:VITE_VIEWPORT_PROBE = '1'
npm run build
Remove-Item Env:VITE_VIEWPORT_PROBE
```
