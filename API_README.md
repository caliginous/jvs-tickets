# Tessera Events API Documentation

## Overview

The Tessera Events API provides public access to event metadata from the JVS ticketing system. This is a REST API that requires no authentication and can be consumed by third-party applications, websites, or mobile apps.

**NEW**: The API now includes comprehensive ticket availability information, showing how many tickets are left for each event and category!

## API Endpoint

**Base URL**: `https://tickets.jvs.org.uk`  
**Events Endpoint**: `/api/public/events`  
**Full URL**: `https://tickets.jvs.org.uk/api/public/events`

## Quick Start

### Get All Upcoming Events with Availability

```bash
curl "https://tickets.jvs.org.uk/api/public/events"
```

### JavaScript/Node.js Example

```javascript
const response = await fetch('https://tickets.jvs.org.uk/api/public/events');
const events = await response.json();

events.forEach(event => {
  console.log(`${event.title} - ${event.seatType}`);
  console.log(`Tickets: ${event.ticketAvailability.available}/${event.ticketAvailability.total} remaining`);
  console.log(`Status: ${event.isSoldOut ? 'SOLD OUT' : 'Available'}`);
  
  event.categories.forEach(category => {
    console.log(`  ${category.name}: £${category.price} - ${category.available} available`);
  });
});
```

### Python Example

```python
import requests

response = requests.get('https://tickets.jvs.org.uk/api/public/events')
events = response.json()

for event in events:
    print(f"{event['title']} - {event['seatType']}")
    print(f"Tickets: {event['ticketAvailability']['available']}/{event['ticketAvailability']['total']} remaining")
    print(f"Status: {'SOLD OUT' if event['isSoldOut'] else 'Available'}")
    
    for category in event['categories']:
        print(f"  {category['name']}: £{category['price']} - {category['available']} available")
```

## Response Format

The API now returns enhanced JSON with detailed ticket availability:

```json
[
  {
    "id": 1,
    "title": "Annual Vegan Festival 2024",
    "nextDate": "2024-12-15T18:00:00.000Z",
    "minPrice": 25.00,
    "seatType": "General Admission",
    "coverImage": "https://example.com/images/festival-2024.jpg",
    "ticketAvailability": {
      "total": 200,
      "available": 150,
      "sold": 50,
      "percentageRemaining": 75
    },
    "categories": [
      {
        "id": 1,
        "name": "General Admission",
        "price": 25.00,
        "color": "#4CAF50",
        "maxAmount": 150,
        "sold": 50,
        "available": 100,
        "isAvailable": true
      },
      {
        "id": 2,
        "name": "VIP Package",
        "price": 75.00,
        "color": "#FF9800",
        "maxAmount": 50,
        "sold": 0,
        "available": 50,
        "isAvailable": true
      }
    ],
    "hasAvailableTickets": true,
    "isSoldOut": false
  }
]
```

## Field Descriptions

### Event Summary Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | Integer | Unique event identifier | `1` |
| `title` | String | Event name | `"Annual Vegan Festival 2024"` |
| `nextDate` | String (ISO 8601) | Next upcoming date | `"2024-12-15T18:00:00.000Z"` |
| `minPrice` | Float | Minimum ticket price across all categories | `25.00` |
| `seatType` | String | Seating arrangement type | `"General Admission"` |
| `coverImage` | String (URL) | Cover image URL (null if none) | `"https://..."` |

### NEW: Ticket Availability Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `ticketAvailability.total` | Integer | Total ticket capacity | `200` |
| `ticketAvailability.available` | Integer | Tickets currently available | `150` |
| `ticketAvailability.sold` | Integer | Tickets already sold | `50` |
| `ticketAvailability.percentageRemaining` | Integer | % of tickets remaining (0-100) | `75` |
| `hasAvailableTickets` | Boolean | Whether any tickets are available | `true` |
| `isSoldOut` | Boolean | Whether event is completely sold out | `false` |

### NEW: Category Breakdown Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `categories[].id` | Integer | Category identifier | `1` |
| `categories[].name` | String | Category name | `"General Admission"` |
| `categories[].price` | Float | Price per ticket | `25.00` |
| `categories[].color` | String | Hex color code | `"#4CAF50"` |
| `categories[].maxAmount` | Integer | Maximum capacity | `150` |
| `categories[].sold` | Integer | Tickets sold | `50` |
| `categories[].available` | Integer | Tickets remaining | `100` |
| `categories[].isAvailable` | Boolean | Whether category has tickets | `true` |

## Data Filtering

- **Upcoming Events Only**: Only events with future dates are returned
- **Real-time Data**: Information reflects current availability and pricing
- **Automatic Sorting**: Events are sorted by next upcoming date
- **Availability Filtering**: Only categories with capacity > 0 are included

## Rate Limiting

While no strict rate limits are enforced, we recommend:
- **Maximum**: 1 request per minute per client
- **Burst**: Up to 10 requests in a short period
- **Caching**: Cache responses for 5-10 minutes to reduce server load

## Error Handling

### HTTP Status Codes

- `200 OK`: Successful response with event data and availability
- `500 Internal Server Error`: Server-side error

### Error Response Format

```json
{
  "error": "Database connection failed"
}
```

## Use Cases

### 1. Event Listings with Availability
Display upcoming events with real-time ticket counts on external websites.

### 2. Availability Widgets
Show "X tickets remaining" or "Almost sold out" indicators.

### 3. Event Aggregators
Integrate with event discovery platforms showing availability status.

### 4. Mobile Apps
Display ticket availability and category breakdowns in mobile applications.

### 5. Booking Integration
Show availability before redirecting users to the booking system.

### 6. Inventory Management
Monitor ticket sales and availability across multiple events.

## Integration Examples

### WordPress Plugin with Availability

```php
function get_jvs_events_with_availability() {
    $response = wp_remote_get('https://tickets.jvs.org.uk/api/public/events');
    
    if (is_wp_error($response)) {
        return [];
    }
    
    $body = wp_remote_retrieve_body($response);
    $events = json_decode($body, true);
    
    foreach ($events as &$event) {
        $event['availability_text'] = sprintf(
            '%d of %d tickets remaining (%d%% available)',
            $event['ticketAvailability']['available'],
            $event['ticketAvailability']['total'],
            $event['ticketAvailability']['percentageRemaining']
        );
    }
    
    return $events;
}
```

### React Component with Availability

```jsx
import { useState, useEffect } from 'react';

function EventsListWithAvailability() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://tickets.jvs.org.uk/api/public/events')
      .then(res => res.json())
      .then(data => {
        setEvents(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading events...</div>;

  return (
    <div>
      {events.map(event => (
        <div key={event.id} className="event-card">
          <h3>{event.title}</h3>
          <p>From £{event.minPrice}</p>
          
          {/* Availability Status */}
          <div className="availability-status">
            {event.isSoldOut ? (
              <span className="sold-out">SOLD OUT</span>
            ) : (
              <span className="available">
                {event.ticketAvailability.available} tickets remaining
              </span>
            )}
          </div>
          
          {/* Category Breakdown */}
          <div className="categories">
            {event.categories.map(category => (
              <div key={category.id} className="category">
                <span className="name">{category.name}</span>
                <span className="price">£{category.price}</span>
                <span className="available">{category.available} available</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Availability Monitoring Script

```python
import requests
import time
from datetime import datetime

def monitor_event_availability():
    while True:
        try:
            response = requests.get('https://tickets.jvs.org.uk/api/public/events')
            events = response.json()
            
            print(f"\n=== {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===")
            
            for event in events:
                available = event['ticketAvailability']['available']
                total = event['ticketAvailability']['total']
                percentage = event['ticketAvailability']['percentageRemaining']
                
                status = "🟢 Available" if available > 0 else "🔴 Sold Out"
                if percentage <= 10:
                    status = "🟡 Low Stock"
                
                print(f"{event['title']}: {available}/{total} ({percentage}%) - {status}")
            
            time.sleep(300)  # Check every 5 minutes
            
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(60)

if __name__ == "__main__":
    monitor_event_availability()
```

## OpenAPI Specification

For complete API documentation, see `openapi-spec.yaml` in this repository. This file can be imported into:

- **Swagger UI**: For interactive API documentation
- **Postman**: For API testing and collection building
- **Insomnia**: For API development and testing
- **Code generators**: For generating client libraries

## Support

For API support or questions:
- **Website**: https://tickets.jvs.org.uk
- **Documentation**: This repository
- **Issues**: Contact the development team

## Changelog

### v1.1.0 (Current)
- ✅ **NEW**: Added comprehensive ticket availability information
- ✅ **NEW**: Per-category breakdown with pricing and availability
- ✅ **NEW**: Overall availability statistics (total, available, sold, percentage)
- ✅ **NEW**: Quick availability status indicators
- ✅ **ENHANCED**: Real-time availability calculations
- ✅ **ENHANCED**: Better error handling and logging

### v1.0.0
- Initial public API release
- Basic event metadata
- No authentication required
- Real-time data updates

## License

This API is proprietary to JVS Events. Please respect the terms of use and rate limiting guidelines.
