import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function listAllEventsAndOrders() {
  console.log('='.repeat(80))
  console.log('🎭 DATABASE CONTENTS - EVENTS AND ORDERS')
  console.log('='.repeat(80))

  try {
    // Get all events with their related data
    console.log('\n📅 EVENTS:')
    console.log('-'.repeat(60))

    const events = await prisma.event.findMany({
      include: {
        venue: true,
        dates: {
          include: {
            orders: {
              include: {
                user: {
                  select: { firstName: true, lastName: true, email: true }
                },
                orderItems: {
                  include: {
                    eventTicketType: true
                  }
                }
              }
            }
          }
        },
        ticketTypes: true
      },
      orderBy: { id: 'asc' }
    })

    if (events.length === 0) {
      console.log('No events found in database.')
    } else {
      events.forEach((event, index) => {
        console.log(`\n${index + 1}. Event ID: ${event.id}`)
        console.log(`   Title: ${event.title}`)
        console.log(`   Slug: ${event.slug || 'N/A'}`)
        console.log(`   Active: ${event.isActive ? '✅' : '❌'}`)
        console.log(`   Venue: ${event.venue?.name || 'N/A'} (${event.venue?.city || ''})`)
        console.log(`   Description: ${event.description || 'N/A'}`)

        console.log(`   Ticket Types: ${event.ticketTypes.length}`)
        event.ticketTypes.forEach(tt => {
          console.log(`     - ${tt.name}: £${(tt.price / 100).toFixed(2)} (${tt.capacity || 'unlimited'} capacity, ${tt.sold} sold)`)
        })

        console.log(`   Event Dates: ${event.dates.length}`)
        event.dates.forEach(date => {
          console.log(`     - ${date.date ? new Date(date.date).toLocaleDateString('en-GB') : 'No date'}: ${date.orders.length} orders`)
        })
      })
    }

    // Get all orders with detailed information
    console.log('\n\n🛒 ORDERS:')
    console.log('-'.repeat(60))

    const orders = await prisma.order.findMany({
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true }
        },
        eventDate: {
          include: {
            event: {
              select: { title: true, slug: true }
            }
          }
        },
        orderItems: {
          include: {
            eventTicketType: {
              select: { name: true, price: true, currency: true }
            }
          }
        },
        tickets: {
          include: {
            eventTicketType: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { date: 'desc' }
    })

    if (orders.length === 0) {
      console.log('No orders found in database.')
    } else {
      orders.forEach((order, index) => {
        console.log(`\n${index + 1}. Order ID: ${order.id}`)
        console.log(`   Customer: ${order.user.firstName} ${order.user.lastName} (${order.user.email})`)
        console.log(`   Event: ${order.eventDate.event.title}`)
        console.log(`   Event Date: ${order.eventDate.date ? new Date(order.eventDate.date).toLocaleDateString('en-GB') : 'N/A'}`)
        console.log(`   Status: ${order.status}`)
        console.log(`   Payment Type: ${order.paymentType}`)
        console.log(`   Created: ${new Date(order.date).toLocaleString('en-GB')}`)

        if (order.finalTotal !== null) {
          console.log(`   Final Total: £${(order.finalTotal / 100).toFixed(2)}`)
        }

        console.log(`   Items: ${order.orderItems.length}`)
        order.orderItems.forEach(item => {
          const itemTotal = (item.unitPrice * item.quantity) / 100
          console.log(`     - ${item.quantity}x ${item.eventTicketType.name}: £${itemTotal.toFixed(2)}`)
        })

        console.log(`   Tickets Generated: ${order.tickets.length}`)
        if (order.tickets.length > 0) {
          const ticketTypes = order.tickets.reduce((acc, ticket) => {
            const typeName = ticket.eventTicketType?.name || 'Unknown'
            acc[typeName] = (acc[typeName] || 0) + 1
            return acc
          }, {} as Record<string, number>)

          Object.entries(ticketTypes).forEach(([typeName, count]) => {
            console.log(`     - ${count}x ${typeName}`)
          })
        }

        if (order.cancellationReason) {
          console.log(`   ❌ Cancelled: ${order.cancellationReason} (${order.cancelledAt ? new Date(order.cancelledAt).toLocaleString('en-GB') : 'N/A'})`)
        }

        if (order.refundAmount) {
          console.log(`   💰 Refunded: £${order.refundAmount.toFixed(2)} (${order.refundedAt ? new Date(order.refundedAt).toLocaleString('en-GB') : 'N/A'})`)
        }
      })
    }

    // Summary statistics
    console.log('\n\n📊 SUMMARY STATISTICS:')
    console.log('-'.repeat(40))

    const totalEvents = events.length
    const activeEvents = events.filter(e => e.isActive).length
    const totalOrders = orders.length
    const completedOrders = orders.filter(o => o.status === 'COMPLETED').length
    const pendingOrders = orders.filter(o => o.status === 'PENDING').length
    const cancelledOrders = orders.filter(o => o.status === 'CANCELLED').length

    console.log(`Total Events: ${totalEvents} (${activeEvents} active)`)
    console.log(`Total Orders: ${totalOrders}`)
    console.log(`  - Completed: ${completedOrders}`)
    console.log(`  - Pending: ${pendingOrders}`)
    console.log(`  - Cancelled: ${cancelledOrders}`)

    // Calculate total revenue
    const totalRevenue = orders
      .filter(o => o.status === 'COMPLETED' && o.finalTotal !== null)
      .reduce((sum, order) => sum + (order.finalTotal || 0), 0) / 100

    console.log(`Total Revenue: £${totalRevenue.toFixed(2)}`)

    // Total tickets sold
    const totalTicketsSold = orders
      .filter(o => o.status === 'COMPLETED')
      .reduce((sum, order) => sum + order.tickets.length, 0)

    console.log(`Total Tickets Sold: ${totalTicketsSold}`)

  } catch (error) {
    console.error('Error querying database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
listAllEventsAndOrders()
