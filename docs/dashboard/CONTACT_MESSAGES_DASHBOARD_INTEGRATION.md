# Contact Messages Dashboard Integration

This document provides comprehensive guidance for integrating contact form messages into the Xequtive Admin Dashboard.

## Overview

The contact messages system allows customers to submit inquiries through the contact form, which are then stored in the database and made available to administrators through dedicated dashboard endpoints.

## System Architecture

```
Customer Contact Form → POST /api/contact/message → Database Storage
                                                      ↓
Admin Dashboard ← GET /api/dashboard/contact-messages ← Database Query
```

## API Endpoints

### 1. Get Contact Messages (Admin Only)

Retrieves contact form messages with filtering and pagination capabilities.

**Endpoint:** `GET /api/dashboard/contact-messages`

**Authentication:** Required (Admin dashboard authentication)

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `status` | string | No | - | Filter by message status (`new`, `in_progress`, `resolved`) |
| `limit` | number | No | 50 | Number of messages per page (max 100) |
| `offset` | number | No | 0 | Number of messages to skip for pagination |

**Example Request:**
```bash
curl -X GET "http://localhost:5555/api/dashboard/contact-messages?status=new&limit=20&offset=0" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "contact_abc123def456",
        "userId": "user123",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "phone": "+44123456789",
        "message": "I need help with my booking. The driver didn't arrive on time.",
        "agreeToTerms": true,
        "status": "new",
        "createdAt": "2025-09-21T15:30:00.000Z",
        "updatedAt": "2025-09-21T15:30:00.000Z"
      },
      {
        "id": "contact_def456ghi789",
        "userId": null,
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane@example.com",
        "phone": "+44987654321",
        "message": "What are your rates for airport transfers?",
        "agreeToTerms": true,
        "status": "in_progress",
        "createdAt": "2025-09-21T14:15:00.000Z",
        "updatedAt": "2025-09-21T16:45:00.000Z",
        "notes": "Responded with pricing information"
      }
    ],
    "pagination": {
      "total": 25,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### 2. Update Contact Message Status (Admin Only)

Updates the status and adds notes to a contact message.

**Endpoint:** `PUT /api/dashboard/contact-messages/:id`

**Authentication:** Required (Admin dashboard authentication)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Contact message ID (e.g., `contact_abc123def456`) |

**Request Body:**
```json
{
  "status": "in_progress",
  "notes": "Admin response added - investigating the issue"
}
```

**Status Values:**
- `new` - New message, not yet reviewed
- `in_progress` - Message is being handled
- `resolved` - Message has been resolved

**Example Request:**
```bash
curl -X PUT "http://localhost:5555/api/dashboard/contact-messages/contact_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "notes": "Contacted customer via phone, investigating driver issue"
  }' \
  -b cookies.txt
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "contact_abc123def456",
    "message": "Contact message updated successfully",
    "updatedFields": ["status", "notes"]
  }
}
```

## Data Structure

### Contact Message Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique message identifier (format: `contact_xxxxxxxxxxxx`) |
| `userId` | string\|null | User ID if submitted by logged-in user, null for anonymous |
| `firstName` | string | Customer's first name |
| `lastName` | string | Customer's last name |
| `email` | string | Customer's email address |
| `phone` | string | Customer's phone number |
| `message` | string | The contact message content |
| `agreeToTerms` | boolean | Whether customer agreed to terms and conditions |
| `status` | string | Message status (`new`, `in_progress`, `resolved`) |
| `createdAt` | string | ISO timestamp when message was created |
| `updatedAt` | string | ISO timestamp when message was last updated |
| `notes` | string | Admin notes (optional, added via status updates) |

## Frontend Integration Guide

### 1. Authentication Setup

Ensure your dashboard is authenticated with admin credentials:

```javascript
// Login to dashboard
const loginResponse = await fetch('/api/dashboard/auth/hardcoded-login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    email: 'xequtivecars@gmail.com',
    password: 'xequtive2025'
  })
});
```

### 2. Fetch Contact Messages

```javascript
// Fetch contact messages with filtering
const fetchContactMessages = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const response = await fetch(`/api/dashboard/contact-messages?${params}`, {
      credentials: 'include'
    });

    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error.message);
    }
  } catch (error) {
    console.error('Failed to fetch contact messages:', error);
    throw error;
  }
};

// Usage examples
const newMessages = await fetchContactMessages({ status: 'new', limit: 10 });
const allMessages = await fetchContactMessages({ limit: 50 });
```

### 3. Update Message Status

```javascript
// Update contact message status
const updateMessageStatus = async (messageId, status, notes = '') => {
  try {
    const response = await fetch(`/api/dashboard/contact-messages/${messageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status, notes })
    });

    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error.message);
    }
  } catch (error) {
    console.error('Failed to update message status:', error);
    throw error;
  }
};

// Usage examples
await updateMessageStatus('contact_abc123def456', 'in_progress', 'Investigating issue');
await updateMessageStatus('contact_abc123def456', 'resolved', 'Issue resolved, customer satisfied');
```

### 4. React Component Example

```jsx
import React, { useState, useEffect } from 'react';

const ContactMessagesDashboard = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchMessages();
  }, [statusFilter]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const filters = statusFilter !== 'all' ? { status: statusFilter } : {};
      const data = await fetchContactMessages(filters);
      setMessages(data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (messageId, newStatus) => {
    try {
      await updateMessageStatus(messageId, newStatus);
      fetchMessages(); // Refresh the list
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  return (
    <div className="contact-messages-dashboard">
      <h2>Contact Messages</h2>
      
      {/* Status Filter */}
      <div className="filters">
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Messages</option>
          <option value="new">New</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Messages List */}
      {loading ? (
        <div>Loading messages...</div>
      ) : (
        <div className="messages-list">
          {messages.map((message) => (
            <div key={message.id} className="message-card">
              <div className="message-header">
                <h3>{message.firstName} {message.lastName}</h3>
                <span className={`status status-${message.status}`}>
                  {message.status}
                </span>
              </div>
              
              <div className="message-details">
                <p><strong>Email:</strong> {message.email}</p>
                <p><strong>Phone:</strong> {message.phone}</p>
                <p><strong>Message:</strong> {message.message}</p>
                <p><strong>Submitted:</strong> {new Date(message.createdAt).toLocaleString()}</p>
              </div>

              <div className="message-actions">
                {message.status === 'new' && (
                  <button 
                    onClick={() => handleStatusUpdate(message.id, 'in_progress')}
                    className="btn btn-primary"
                  >
                    Mark as In Progress
                  </button>
                )}
                {message.status === 'in_progress' && (
                  <button 
                    onClick={() => handleStatusUpdate(message.id, 'resolved')}
                    className="btn btn-success"
                  >
                    Mark as Resolved
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContactMessagesDashboard;
```

## Error Handling

### Common Error Responses

**Authentication Required:**
```json
{
  "success": false,
  "error": {
    "message": "Admin access required",
    "code": "contact/admin-required"
  }
}
```

**Invalid Status:**
```json
{
  "success": false,
  "error": {
    "message": "Invalid status. Must be 'new', 'in_progress', or 'resolved'",
    "code": "contact/invalid-status"
  }
}
```

**Message Not Found:**
```json
{
  "success": false,
  "error": {
    "message": "Contact message not found",
    "code": "contact/not-found"
  }
}
```

## Best Practices

### 1. Status Management
- **New**: Automatically assigned when message is submitted
- **In Progress**: Set when admin starts working on the message
- **Resolved**: Set when issue is completely resolved

### 2. Notes Usage
- Add detailed notes when updating status
- Include customer communication details
- Document resolution steps

### 3. Pagination
- Use reasonable limits (20-50 messages per page)
- Implement "Load More" or pagination controls
- Consider caching for better performance

### 4. Real-time Updates
- Consider implementing WebSocket connections for real-time message updates
- Refresh message list after status updates
- Show notification badges for new messages

## Security Considerations

1. **Admin-Only Access**: All endpoints require admin authentication
2. **Input Validation**: Status values are validated against allowed options
3. **Rate Limiting**: Contact form submission is rate-limited (5 messages per hour per IP)
4. **Data Sanitization**: All message content is sanitized before storage

## Monitoring and Analytics

### Key Metrics to Track
- **Response Time**: Average time from submission to first admin response
- **Resolution Rate**: Percentage of messages resolved within 24 hours
- **Status Distribution**: Breakdown of messages by status
- **Peak Hours**: When most messages are submitted

### Dashboard KPIs
- Total messages received today/week/month
- Average response time
- Messages pending resolution
- Customer satisfaction (if feedback is collected)

## Troubleshooting

### Common Issues

**1. Messages Not Loading**
- Check authentication status
- Verify API endpoint URL
- Check browser console for errors

**2. Status Updates Failing**
- Ensure message ID is correct
- Verify status value is valid
- Check network connectivity

**3. Pagination Issues**
- Verify limit and offset parameters
- Check total count calculation
- Ensure proper error handling

## Support

For technical support or questions about the contact messages system:
- Check the main dashboard documentation
- Review API response error codes
- Contact the backend development team

---

**Last Updated:** September 21, 2025  
**Version:** 1.0  
**Compatibility:** Xequtive Dashboard v2.0+

