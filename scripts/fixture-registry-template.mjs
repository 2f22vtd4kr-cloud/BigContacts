#!/usr/bin/env node
/** Fixture registry template (Vol 1005/1328). */
const d = new Date().toISOString().slice(0, 10);
console.log(`# Fixture registry ${d}

| entityId | name | class | public hook | last score | last L-code | last tip | last jobId |
|----------|------|-------|-------------|------------|-------------|----------|------------|
|  |  | issuer-trap |  |  |  |  |  |
|  |  | org-only |  |  |  |  |  |
|  |  | collision |  |  |  |  |  |
|  |  | thin |  |  |  |  |  |
|  |  | easy |  |  |  |  |  |
|  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |
`);
