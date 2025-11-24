import { secret } from './secret'

export const database = new sst.Linkable('Database', {
  properties: {
    host: $app.stage === 'production' ? 'aws-us-east-1.pg.psdb.cloud' : 'aws-0-us-east-1.pooler.supabase.com',
    database: 'postgres',
    username: secret.DATABASE_USERNAME.value,
    password: secret.DATABASE_PASSWORD.value,
    port: 5432,
  },
})
