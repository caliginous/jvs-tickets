import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface EventData {
  ID: string
  Name: string
  Description: string
  'Regular price': string
  Categories: string
  Images: string
  Type: string
}

// Function to parse CSV data
function parseCSV(csvContent: string): EventData[] {
  const lines = csvContent.split('\n')
  const headers = lines[0].split(',').map(h => h.replace(/"/g, ''))

  const events: EventData[] = []

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue

    const values = lines[i].split(',').map(v => v.replace(/"/g, ''))
    if (values.length < headers.length) continue

    const event: any = {}
    headers.forEach((header, index) => {
      event[header] = values[index] || ''
    })

    // Only process event_ticket_manager type events
    if (event.Type === 'event_ticket_manager') {
      events.push(event as EventData)
    }
  }

  return events
}

// Function to create events in database
async function restoreEvents(events: EventData[]) {
  console.log(`🔄 Starting restoration of ${events.length} events...\n`)

  let successCount = 0
  let errorCount = 0

  for (const eventData of events) {
    try {
      // Check if event already exists
      const existingEvent = await prisma.event.findFirst({
        where: { title: eventData.Name }
      })

      if (existingEvent) {
        console.log(`⚠️  Event "${eventData.Name}" already exists, skipping...`)
        continue
      }

      // Create the event
      const newEvent = await prisma.event.create({
        data: {
          title: eventData.Name,
          description: eventData.Description || null,
          seatType: 'free', // Default to free seating
          isActive: true,
          personalTicket: false,
          // Generate a slug from the title
          slug: eventData.Name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim()
        }
      })

      console.log(`✅ Created event: "${newEvent.title}" (ID: ${newEvent.id})`)

      // Create a default event date (today + 30 days)
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)

      await prisma.eventDate.create({
        data: {
          eventId: newEvent.id,
          date: futureDate,
          title: eventData.Name
        }
      })

      console.log(`📅 Created event date for: ${futureDate.toLocaleDateString('en-GB')}`)

      // Try to create ticket types if price is available
      if (eventData['Regular price'] && parseFloat(eventData['Regular price']) > 0) {
        const price = Math.round(parseFloat(eventData['Regular price']) * 100) // Convert to pence

        await prisma.eventTicketType.create({
          data: {
            eventId: newEvent.id,
            name: 'Standard',
            description: `Standard ticket for ${eventData.Name}`,
            price: price,
            currency: 'GBP',
            capacity: null, // Unlimited
            isActive: true,
            sortOrder: 0,
            isPublic: true,
            publicSortOrder: 0
          }
        })

        console.log(`🎫 Created ticket type: Standard - £${(price / 100).toFixed(2)}`)
      }

      successCount++
      console.log('') // Empty line for readability

    } catch (error) {
      console.error(`❌ Error creating event "${eventData.Name}":`, error)
      errorCount++
    }
  }

  console.log('='.repeat(60))
  console.log('📊 RESTORATION COMPLETE')
  console.log('='.repeat(60))
  console.log(`✅ Successfully restored: ${successCount} events`)
  console.log(`❌ Errors: ${errorCount} events`)
  console.log(`📋 Total processed: ${events.length} events`)
}

// Main function
async function main() {
  try {
    console.log('🔍 Reading events from CSV file...\n')

    // Read the CSV file
    const csvPath = path.join(__dirname, 'imports', 'wc-product-export-23-8-2025-1755954351459.csv')
    const csvContent = fs.readFileSync(csvPath, 'utf-8')

    // Parse the events
    const events = parseCSV(csvContent)

    console.log(`📋 Found ${events.length} event_ticket_manager events in CSV\n`)

    // Show a preview of the events
    if (events.length > 0) {
      console.log('🎭 EVENT PREVIEW:')
      console.log('-'.repeat(50))
      events.slice(0, 5).forEach((event, index) => {
        console.log(`${index + 1}. ${event.Name}`)
        console.log(`   Price: £${event['Regular price'] || 'N/A'}`)
        console.log(`   Type: ${event.Type}`)
        console.log('')
      })

      if (events.length > 5) {
        console.log(`... and ${events.length - 5} more events\n`)
      }
    }

    // Ask for confirmation before proceeding
    console.log('⚠️  IMPORTANT:')
    console.log('This will restore events to your database.')
    console.log('Make sure this is the correct CSV file with your events.')
    console.log('')

    // For now, we'll proceed automatically since this is a script
    await restoreEvents(events)

  } catch (error) {
    console.error('❌ Error during restoration:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
main()
