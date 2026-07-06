pnpm install                              # Regenerates node_modules
docker compose up -d                      # Postgres 17 + Redis 7
pnpm check-types                          # 16/16 pass ✅
pnpm lint                                 # 2/2 pass ✅
pnpm dev --filter=@stillwater/web         # Boots on localhost:3000 ✅
