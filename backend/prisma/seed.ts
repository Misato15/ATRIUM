import 'dotenv/config'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '../src/generated/prisma/client'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set')
}

const url = new URL(databaseUrl)

const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace('/', ''),
  allowPublicKeyRetrieval: true,
})

const prisma = new PrismaClient({ adapter })
const artistCategories = [
  { name: 'Musica', slug: 'musica' },
  { name: 'Danza', slug: 'danza' },
  { name: 'Artes visuales', slug: 'artes-visuales' },
  { name: 'Arte digital', slug: 'arte-digital' },
  { name: 'Fotografia', slug: 'fotografia' },
  { name: 'Cine y video', slug: 'cine-y-video' },
  { name: 'Teatro', slug: 'teatro' },
  { name: 'Escritura', slug: 'escritura' },
  { name: 'Diseno', slug: 'diseno' },
  { name: 'Artesania', slug: 'artesania' },
  { name: 'Otro', slug: 'otro' },
]

async function main() {
  for (const category of artistCategories) {
    await prisma.artistCategory.upsert({
      where: {
        slug: category.slug,
      },
      update: {},
      create: category,
    })
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })