#!/usr/bin/env node
// Gera um KITCHEN_SESSION_SECRET aleatório (64 chars hex)
import crypto from 'crypto'
console.log(crypto.randomBytes(32).toString('hex'))
