#!/usr/bin/env node
// Uso: node scripts/gen-kitchen-hash.mjs 1234
import bcrypt from 'bcryptjs'

const code = process.argv[2]
if (!code || code.length < 4) {
  console.error('Uso: node scripts/gen-kitchen-hash.mjs <codigo>')
  console.error('  codigo deve ter pelo menos 4 caracteres')
  process.exit(1)
}

const hash = bcrypt.hashSync(code, 10)
console.log(hash)
