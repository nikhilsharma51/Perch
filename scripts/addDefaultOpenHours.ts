import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function addDefaultOpenHours() {
  try {
    // Get all spaces
    const spaces = await prisma.space.findMany()
    
    console.log(`Found ${spaces.length} spaces`)
    
    for (const space of spaces) {
      // Check if space has any open hours
      const existingHours = await prisma.spaceOpenHours.findMany({
        where: { spaceId: space.id }
      })
      
      if (existingHours.length === 0) {
        console.log(`Adding default open hours for space: ${space.name} (${space.id})`)
        
        // Create default hours for all 7 days
        await prisma.spaceOpenHours.createMany({
          data: [
            { spaceId: space.id, dayOfWeek: 0, startTime: '09:00', endTime: '18:00', isClosed: false },
            { spaceId: space.id, dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isClosed: false },
            { spaceId: space.id, dayOfWeek: 2, startTime: '09:00', endTime: '18:00', isClosed: false },
            { spaceId: space.id, dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isClosed: false },
            { spaceId: space.id, dayOfWeek: 4, startTime: '09:00', endTime: '18:00', isClosed: false },
            { spaceId: space.id, dayOfWeek: 5, startTime: '09:00', endTime: '18:00', isClosed: false },
            { spaceId: space.id, dayOfWeek: 6, startTime: '09:00', endTime: '18:00', isClosed: false },
          ],
          skipDuplicates: true,
        })
        
        console.log(`✓ Added default hours for ${space.name}`)
      } else {
        console.log(`✓ Space ${space.name} already has ${existingHours.length} hour records`)
      }
    }
    
    console.log('\nDone!')
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

addDefaultOpenHours()
