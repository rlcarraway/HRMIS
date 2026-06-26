# Troubleshooting Guide - HRMIS

## Issue: No Data Returned / Empty Payload

### Why This Happens

The HRMIS application uses **browser localStorage** for data persistence. This means:

1. **Data is browser-specific** - Each browser has its own separate localStorage
2. **Data is domain-specific** - Different domains have separate storage
3. **Server-side API routes cannot access localStorage** - When API routes run on the server, they have no access to browser storage
4. **External API calls (curl, Postman) will always return empty** - They don't share the browser's localStorage

### Solution: Add Test Data First

**Option 1: Use the Test Data Page (Fastest)**
1. Navigate to http://localhost:3000/test-data
2. Click "Add Sample Employees"
3. This will add 5 sample employees to your localStorage
4. You'll be redirected to the employees page
5. Now go to http://localhost:3000/api-test and test the API

**Option 2: Add Employees Manually**
1. Navigate to http://localhost:3000/employees/new
2. Fill out the employee form
3. Click "Save"
4. Repeat to add more employees

**Option 3: Use the API Test Console**
1. Navigate to http://localhost:3000/api-test
2. Select POST method
3. Set endpoint to `/api/employees`
4. Click "Load Employee Sample"
5. Click "Send Request"
6. Repeat to add more employees

### How to Verify Data Exists

**In the App:**
- Go to http://localhost:3000/employees - You should see a list of employees
- Go to http://localhost:3000/test-data - Check the "Current Data Status" section
- Go to http://localhost:3000/api-test - The blue info box will show employee count

**In Browser Console:**
1. Open Developer Tools (F12)
2. Go to Console tab
3. Run: `JSON.parse(localStorage.getItem('hrmis_employees'))`
4. You should see an array of employee objects

**In Application tab:**
1. Open Developer Tools (F12)
2. Go to Application tab (Chrome) or Storage tab (Firefox)
3. Expand "Local Storage"
4. Click on `http://localhost:3000`
5. Look for key `hrmis_employees`

## Issue: Manager Field Not Showing Dropdown

### Why This Happens

The manager field changes behavior based on available data:

1. **No employees exist** - Shows a text input field for email
2. **Employees exist** - Shows a dropdown of active employees

### Solution

**If you see a text input instead of dropdown:**
- This is expected behavior when no employees exist yet
- Add at least one employee first
- The second employee form will show the first employee in the manager dropdown

**If you added employees but still see text input:**
1. Refresh the page (Cmd/Ctrl + R)
2. Check http://localhost:3000/test-data to verify employees exist
3. The dropdown only shows **active employees** - check status

**How the dropdown works:**
- Filters for `status === 'active'`
- Excludes the current employee being edited (can't be your own manager)
- Displays as: "FirstName LastName (email@example.com)"
- Sorted alphabetically
- Shows count below: "Select from X active employees"

## Issue: API Returns Empty Array `[]`

### This is Normal If:

- You just started the application for the first time
- You cleared your browser data or localStorage
- You're testing in a different browser
- You're in incognito/private mode

### This is the Expected Response:

```json
{
  "success": true,
  "data": [],
  "count": 0
}
```

### To Fix:

Add employees using one of the methods above, then:
1. Go to http://localhost:3000/api-test
2. Send GET request to `/api/employees`
3. You should now see your employees in the `data` array

## Issue: API Test Console Not Displaying Response

### Check These:

1. **Did the request complete?** - Look for status code (200, 201, etc.)
2. **Check "Full Response Body"** - Click to expand and see raw response
3. **Look for error messages** - Red box shows errors
4. **Check browser console** - F12 → Console tab for JavaScript errors

### What You Should See:

**For Successful GET with data:**
- Green "Data Payload" box with JSON array
- Metadata showing: Success: true, Count: X
- "Full Response Body" expandable section

**For Successful GET with no data:**
- Green "Data Payload" box showing `[]`
- Message: "No records found. The data array is empty."
- Metadata showing: Success: true, Count: 0

**For Successful POST:**
- Green "Data Payload" box with created employee object
- Status: 201 Created
- Metadata showing: Success: true

**For Errors:**
- Red "Error" box with error message
- Status: 400, 404, 500, etc.

## Common localStorage Issues

### Clear All Data

If you need to start fresh:
1. Go to http://localhost:3000/test-data
2. Click "Clear All Data" in the Danger Zone
3. Confirm the action
4. Page will reload automatically

### Browser Storage Full

If you get storage quota errors:
1. Clear old data from other sites
2. Use Developer Tools → Application → Clear Storage
3. Clear specific localStorage keys

### Data Not Persisting

If data disappears after refresh:
1. Check you're not in Incognito/Private mode
2. Check browser settings allow localStorage
3. Check browser doesn't have "Clear on exit" enabled
4. Check for browser extensions blocking storage

## Testing the API Properly

### Step-by-Step Testing Process:

1. **Add Test Data**
   ```
   Go to: http://localhost:3000/test-data
   Click: "Add Sample Employees"
   ```

2. **Verify Data Exists**
   ```
   Go to: http://localhost:3000/employees
   You should see 5 employees listed
   ```

3. **Test GET All**
   ```
   Go to: http://localhost:3000/api-test
   Method: GET
   Endpoint: /api/employees
   Click: Send Request
   Expected: Array of 5 employees
   ```

4. **Test Filtering**
   ```
   Click: "+ Add Parameter"
   Select: type
   Value: employee
   Click: Send Request
   Expected: Only employees (no contractors)
   ```

5. **Test POST**
   ```
   Method: POST
   Endpoint: /api/employees
   Click: "Load Employee Sample"
   Click: Send Request
   Expected: 201 status, new employee object
   ```

6. **Test GET Single**
   ```
   Copy an employee ID from previous response
   Method: GET
   Endpoint: /api/employees/{paste-id-here}
   Click: Send Request
   Expected: Single employee object
   ```

## For Production Use

To avoid localStorage limitations:

1. **Implement a Real Database**
   - PostgreSQL, MongoDB, MySQL, etc.
   - Update `/lib/storage.ts` to use database calls instead of localStorage
   - Keep the same interface for minimal code changes

2. **Add API Authentication**
   - Implement JWT or OAuth
   - Add middleware to verify tokens
   - Secure endpoints

3. **Add Session Management**
   - Track user sessions server-side
   - Store data in database, not localStorage
   - Enable multi-user access

## Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| Empty API response | Add employees at /test-data |
| No manager dropdown | Add at least 1 employee first |
| Data disappeared | Check localStorage in DevTools |
| Can't save employees | Check localStorage quota/permissions |
| External API calls fail | Use in-browser API test console instead |
| Filter returns no results | Check filter values match data |

## Need Help?

1. Open browser Developer Tools (F12)
2. Check Console tab for errors
3. Check Network tab for API responses
4. Check Application → Local Storage for data
5. Visit /test-data page to check data status
6. Clear all data and start fresh if needed

## URLs Quick Reference

- Dashboard: http://localhost:3000/
- Employees List: http://localhost:3000/employees
- Add Employee: http://localhost:3000/employees/new
- API Test Console: http://localhost:3000/api-test
- Test Data Management: http://localhost:3000/test-data
- Settings: http://localhost:3000/settings
