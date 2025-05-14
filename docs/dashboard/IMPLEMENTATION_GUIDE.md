# Xequtive Dashboard Implementation Guide

This guide is intended for the dashboard development team to implement the admin dashboard interface for Xequtive's backend services.

## Overview

The admin dashboard should provide comprehensive management and monitoring capabilities for Xequtive's operations, including:

1. Bookings management
2. User management
3. Analytics and reporting
4. System configuration

## API Integration

All dashboard API endpoints are available under the `/api/dashboard` prefix and require admin authentication.

### Authentication

#### Initial Admin Setup

The first admin account must be created directly in the database by the development team. Once the first admin is created, additional admin accounts can be created through the API.

#### Creating Additional Admin Accounts

Only existing admins can create new admin accounts:

```javascript
// Example admin creation
async function createAdminAccount(email, password, fullName) {
  const response = await fetch(
    "http://your-api-base-url/api/dashboard/auth/signup",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
      body: JSON.stringify({ email, password, fullName }),
    }
  );

  const data = await response.json();

  if (data.success) {
    return data.data;
  } else {
    throw new Error(data.error.message || "Failed to create admin account");
  }
}
```

#### Admin Login

To authenticate with the dashboard:

```javascript
// Example authentication flow
async function loginAdmin(email, password) {
  const response = await fetch(
    "http://your-api-base-url/api/dashboard/auth/login",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    }
  );

  const data = await response.json();

  if (data.success) {
    // Store the token
    localStorage.setItem("adminToken", data.data.token);
    return true;
  } else {
    if (data.error.code === "INSUFFICIENT_PERMISSIONS") {
      // Handle case where user exists but doesn't have admin role
      showPermissionError(
        "This account does not have administrator privileges"
      );
    } else {
      // Handle regular login failure
      throw new Error(data.error.message);
    }
  }
}
```

Include the token in all subsequent API requests:

```javascript
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
};
```

### Calendar Integration

The dashboard includes a special endpoint that formats booking data for easy integration with calendar components (like FullCalendar, React Big Calendar, etc.):

```javascript
// Example calendar data fetching
async function fetchCalendarData(startDate, endDate) {
  const response = await fetch(
    `http://your-api-base-url/api/dashboard/bookings/calendar?startDate=${startDate}&endDate=${endDate}`,
    { headers }
  );

  const data = await response.json();

  if (data.success) {
    return data.data.events; // Array of calendar-formatted booking events
  } else {
    throw new Error(data.error.message);
  }
}
```

This endpoint returns booking data in a format that works directly with most calendar libraries:

```javascript
// Example implementation with FullCalendar
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

function BookingCalendar() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Fetch events when component mounts
    fetchCalendarData("2024-01-01", "2024-12-31")
      .then(setEvents)
      .catch(console.error);
  }, []);

  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      events={events}
      eventClick={(info) => {
        // Handle event click - show booking details
        showBookingDetails(info.event.id);
      }}
    />
  );
}
```

### Dashboard Analytics

The dashboard provides comprehensive analytics through several endpoints. The main overview endpoint is ideal for displaying summary statistics on the dashboard homepage:

```javascript
// Example analytics data fetching
async function fetchDashboardOverview(period = "week") {
  const response = await fetch(
    `http://your-api-base-url/api/dashboard/analytics/overview?period=${period}`,
    { headers }
  );

  const data = await response.json();

  if (data.success) {
    return data.data; // Overview statistics
  } else {
    throw new Error(data.error.message);
  }
}
```

This data can be used to create a dashboard with:

1. Booking statistics cards
2. Revenue information
3. User growth metrics
4. Vehicle distribution charts
5. Popular routes visualization

Example implementation:

```javascript
function DashboardOverview() {
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState("week");

  useEffect(() => {
    fetchDashboardOverview(period).then(setStats).catch(console.error);
  }, [period]);

  if (!stats) return <LoadingSpinner />;

  return (
    <div className="dashboard-overview">
      {/* Time period selector */}
      <div className="period-selector">
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Booking stats */}
      <div className="stats-cards">
        <StatsCard
          title="Total Bookings"
          value={stats.bookings.total}
          change={stats.bookings.comparisonPercentage}
        />
        <StatsCard
          title="Revenue"
          value={`£${stats.revenue.total}`}
          change={stats.revenue.comparisonPercentage}
        />
        <StatsCard
          title="Users"
          value={stats.users.total}
          change={stats.users.comparisonPercentage}
        />
      </div>

      {/* Vehicle distribution pie chart */}
      <VehicleDistributionChart data={stats.vehicles.distribution} />

      {/* Popular routes bar chart */}
      <PopularRoutesChart data={stats.popularRoutes} />
    </div>
  );
}
```

## Key Features to Implement

### 1. Booking Management

- Calendar view of all bookings (weekly/monthly)
- List view with filtering (by date range, status, vehicle type)
- Detail view with ability to update booking status
- Timeline history for each booking

### 2. User Management

- User list with filtering (by role, search by name/email)
- User details page showing booking history and statistics
- Ability to update user details or disable accounts

### 3. Analytics & Reporting

- Dashboard overview with key metrics
- Revenue analytics with custom date ranges
- Booking analytics including time/day patterns
- User growth and retention metrics
- Export capabilities for reports

### 4. System Settings

- Ability to update pricing configurations
- Service area management
- System notification settings

## Recommended Technologies

For an optimal implementation of the dashboard, we recommend:

- **Frontend Framework**: React or Vue.js
- **UI Component Library**: Material UI, Ant Design, or TailwindCSS
- **Charts**: Chart.js, D3.js, or Recharts
- **Calendar**: FullCalendar or React Big Calendar
- **Data Tables**: Material Table, AG Grid, or React Table
- **State Management**: Redux Toolkit or React Context API
- **Forms**: React Hook Form or Formik
- **API Requests**: Axios or React Query

## Error Handling

The API uses standardized error responses. Implement proper error handling:

```javascript
async function fetchData(url) {
  try {
    const response = await fetch(url, { headers });
    const data = await response.json();

    if (!data.success) {
      // Handle different error types
      switch (data.error.code) {
        case "AUTHENTICATION_REQUIRED":
          // Redirect to login
          redirectToLogin();
          break;
        case "INSUFFICIENT_PERMISSIONS":
          // Show permission error
          showPermissionError();
          break;
        case "RESOURCE_NOT_FOUND":
          // Show not found message
          showNotFoundMessage();
          break;
        default:
          // Show general error
          showErrorMessage(data.error.message);
      }
      return null;
    }

    return data.data;
  } catch (error) {
    // Handle network errors
    showNetworkError();
    return null;
  }
}
```

## Deployment Guidelines

The dashboard should be deployed as a separate application from the customer-facing frontend, with:

1. Separate hosting environment
2. IP restrictions or VPN access for additional security
3. Environment-specific API endpoint configuration
4. Proper CORS configuration against the API

## Support

For any questions about API integration, please contact the backend development team.

API Documentation is available at `docs/dashboard/API_DOCUMENTATION.md` for complete endpoint details.
