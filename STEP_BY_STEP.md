# Step-by-Step Guide: Getting Data to Show Up

## The Problem

You're seeing 0 records because **your browser's localStorage is currently empty**. This is normal for a fresh installation.

## The Solution (Follow These Exact Steps)

### Step 1: Open the Test Data Page

1. Open your browser
2. Go to: `http://localhost:3000/test-data`
3. You should see a page titled "Test Data Management"

### Step 2: Check Current Status

Look at the "Current Data Status" section:
- If it shows "Total Employees: 0" → You have no data (expected)
- This confirms localStorage is empty

### Step 3: Add Sample Data

1. Scroll to the "Add Sample Data" section
2. Click the blue button that says **"Add Sample Employees"**
3. Wait for the success message
4. You'll be redirected to the employees page

### Step 4: Verify Data Was Added

You should now see 5 employees listed:
- John Doe - Software Engineer
- Jane Smith - Engineering Manager
- Alice Williams - Marketing Consultant (Contractor)
- Bob Johnson - VP of Sales
- Charlie Brown - Senior Software Engineer

### Step 5: Test the API

1. Go to: `http://localhost:3000/api-test`
2. The blue info box should now say: **"You have 5 employees in the system"**
3. Click the **"Check localStorage"** button (white button)
4. You should see an alert showing all 5 employees
5. Now click **"Send Request"** (the main blue button)
6. You should see a green "Data Payload" box with all 5 employees

### Step 6: Test the Manager Dropdown

1. Go to: `http://localhost:3000/employees/new`
2. Scroll down to the "Manager" field
3. Click the dropdown
4. You should see 5 employees listed
5. Select one and fill out the form to add a 6th employee

## Diagnostic Buttons Added

### On API Test Page (`/api-test`)

**"Check localStorage" button** (white button in blue info box)
- Click this to instantly see what's in localStorage
- If empty: Shows "❌ localStorage is EMPTY"
- If has data: Shows list of all employees

**"Add Test Data" button** (blue button)
- Quick link to the test data page

### On Test Data Page (`/test-data`)

**"Check localStorage" button** (gray button in Debug section)
- Shows raw JSON data from localStorage
- Displays count of employees found

## Common Issues

### Issue: Clicked button but still shows 0 employees

**Solution:**
1. Check the browser console (F12 → Console tab)
2. Look for error messages
3. Try clicking "Add Sample Employees" again
4. Refresh the page after adding

### Issue: Error when clicking Add Sample Employees

**Solution:**
1. Open browser console (F12)
2. Look for the error message
3. Check localStorage isn't full
4. Try "Clear All Data" first, then add again

### Issue: Can see employees on /employees page but API returns 0

**Solution:**
1. Click "Check localStorage" button on API test page
2. Verify data exists
3. Refresh the API test page
4. Try the API request again

### Issue: Manager dropdown still shows text field

**Solution:**
1. Verify employees exist (go to /employees)
2. Refresh the "Add Employee" page
3. Check that employees have status = "active"

## Visual Confirmation Checklist

After adding data, you should see:

✅ Test Data page shows "Total Employees: 5"
✅ Employees page shows 5 employees in the table
✅ API Test page shows "You have 5 employees in the system"
✅ "Check localStorage" button shows 5 employees
✅ API GET request returns 5 employees in green box
✅ Manager dropdown shows 5 options

If ANY of these are not working, go back to Step 3 and click "Add Sample Employees" again.

## Quick Diagnostic Command

Open browser console (F12 → Console) and paste:

```javascript
const data = localStorage.getItem('hrmis_employees');
if (!data) {
  console.log('❌ NO DATA - Go to /test-data and click Add Sample Employees');
} else {
  const employees = JSON.parse(data);
  console.log(`✅ Found ${employees.length} employees:`, employees);
}
```

## Still Not Working?

If you've followed all steps and still see 0 records:

1. **Clear everything and start over:**
   - Go to: `http://localhost:3000/test-data`
   - Click "Clear All Data"
   - Wait for reload
   - Click "Add Sample Employees"

2. **Check browser console for errors:**
   - Press F12
   - Go to Console tab
   - Look for red error messages
   - Share the error message if you see one

3. **Verify localStorage permissions:**
   - You might be in Incognito/Private mode (localStorage disabled)
   - Check browser settings allow localStorage
   - Try in regular browser window

4. **Check browser compatibility:**
   - Use Chrome, Firefox, Safari, or Edge
   - Make sure browser is up to date

## Expected Behavior Summary

| Action | Expected Result |
|--------|----------------|
| Fresh install | 0 employees, localStorage empty |
| Click "Add Sample Employees" | 5 employees added to localStorage |
| Visit /employees | See table with 5 employees |
| Visit /api-test | Blue box shows "5 employees" |
| Click "Check localStorage" | Alert shows 5 employee names |
| Send GET /api/employees | Green box shows array of 5 employees |
| Visit /employees/new | Manager dropdown shows 5 options |

## Video Walkthrough (If Needed)

1. Navigate to `http://localhost:3000/test-data`
2. Observe "Total Employees: 0"
3. Click "Add Sample Employees"
4. See success message
5. Get redirected to /employees
6. See 5 employees in table
7. Navigate to /api-test
8. See "You have 5 employees"
9. Click "Send Request"
10. See green Data Payload with 5 employees

**This should take less than 30 seconds to complete.**

---

If you're still seeing 0 records after following these exact steps, there may be a technical issue with your browser's localStorage implementation. Try a different browser or check browser console for specific error messages.
