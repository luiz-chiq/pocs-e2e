// Carregado apenas pela build POC identificada no package.json e com opt-in do runner.
// Substitui somente a escolha do caminho no diálogo; IPC e operações de disco continuam reais.
const fs = require('node:fs/promises')
module.exports = (dialog, planPath) => {
  const choose = async (kind) => {
    const plan = JSON.parse(await fs.readFile(planPath, 'utf8'))
    const next = plan.shift()
    if (!next || next.kind !== kind) throw new Error(`Plano de diálogo ausente: ${kind}`)
    await fs.writeFile(planPath, JSON.stringify(plan))
    await fs.appendFile(`${planPath}.audit.jsonl`, JSON.stringify({ kind, pid: process.pid, processType: process.type }) + '\n')
    return next.path
  }
  return {
    ...dialog,
    showOpenDialog: async () => {
      const selected = await choose('open')
      return { canceled: !selected, filePaths: selected ? [selected] : [] }
    },
    showSaveDialog: async () => {
      const selected = await choose('save')
      return { canceled: !selected, filePath: selected }
    }
  }
}
