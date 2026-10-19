// Compatibilidade com o comando anterior.
process.argv[2] = 'web'
await import('./run-pocs.mjs')
