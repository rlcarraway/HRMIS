# CSV Import Feature - Test Checklist

## Pre-Test Setup

Before testing the import feature, ensure:

- [ ] Dev server is running: `npm run dev`
- [ ] Browser is open at http://localhost:3000
- [ ] Sample CSV file exists: `sample-import.csv`
- [ ] Custom attributes exist (or will be created during testing)

## Test 1: Basic Import Flow

### Setup
1. [ ] Navigate to http://localhost:3000/employees
2. [ ] Clear any existing employees (optional, for clean test)

### Steps
1. [ ] Click "Import CSV" button
2. [ ] Verify modal opens with title "Import Employees from CSV"
3. [ ] Verify instructions section is displayed
4. [ ] Click file input and select `sample-import.csv`
5. [ ] Verify file is loaded and preview section appears
6. [ ] Verify green badge shows "5 valid rows"
7. [ ] Verify no red error badge appears
8. [ ] Verify success message appears: "Ready to import 5 employees"
9. [ ] Verify "Import 5 Employees" button is enabled
10. [ ] Click "Import 5 Employees" button
11. [ ] Verify modal closes
12. [ ] Verify employee list now shows 5 new employees
13. [ ] Verify all employee names are visible in the table

**Expected Result**: All 5 employees from CSV successfully imported

## Test 2: Custom Attributes Setup

### Setup
1. [ ] Navigate to http://localhost:3000/settings
2. [ ] Create custom attribute: "Clearance Level" (type: string, required: false)
3. [ ] Create custom attribute: "Years Experience" (type: number, required: false)

### Steps
1. [ ] Verify both custom attributes appear in the list
2. [ ] Navigate back to Employees page
3. [ ] Click on any imported employee
4. [ ] Verify "Clearance Level" field shows correct value
5. [ ] Verify "Years Experience" field shows correct numeric value

**Expected Result**: Custom attributes are present and display correct values

## Test 3: Validation - Missing Required Field

### Setup
Create a test CSV file: `test-missing-field.csv`
```csv
Type,First Name,Last Name,Department,Title,Manager,Status,Start Date
employee,John,Doe,Engineering,Engineer,Jane Smith,active,2024-01-15
```
(Note: Email column is missing)

### Steps
1. [ ] Navigate to Employees page
2. [ ] Click "Import CSV"
3. [ ] Upload `test-missing-field.csv`
4. [ ] Verify red error badge appears
5. [ ] Verify error message: "Missing required columns: Email"
6. [ ] Verify Import button is disabled
7. [ ] Click Cancel to close modal

**Expected Result**: Import blocked with clear error about missing column

## Test 4: Validation - Invalid Email

### Setup
Create a test CSV file: `test-invalid-email.csv`
```csv
Type,First Name,Last Name,Email,Department,Title,Manager,Status,Start Date
employee,John,Doe,not-an-email,Engineering,Engineer,Jane Smith,active,2024-01-15
```

### Steps
1. [ ] Navigate to Employees page
2. [ ] Click "Import CSV"
3. [ ] Upload `test-invalid-email.csv`
4. [ ] Verify red error badge shows "1 error"
5. [ ] Click "Show Details"
6. [ ] Verify error table shows:
   - Row: 2
   - Field: email
   - Error: "Invalid email address"
7. [ ] Verify Import button is disabled

**Expected Result**: Validation catches invalid email with specific error

## Test 5: Validation - Contractor Without End Date

### Setup
Create a test CSV file: `test-contractor-no-end.csv`
```csv
Type,First Name,Last Name,Email,Department,Title,Manager,Status,Start Date,End Date
contractor,Bob,Smith,bob@contractor.com,Sales,Consultant,John Doe,active,2024-01-15,
```

### Steps
1. [ ] Click "Import CSV"
2. [ ] Upload `test-contractor-no-end.csv`
3. [ ] Verify red error badge appears
4. [ ] Click "Show Details"
5. [ ] Verify error shows "End date is required for contractors"
6. [ ] Verify Import button is disabled

**Expected Result**: Contractor validation enforced

## Test 6: Validation - End Date Before Start Date

### Setup
Create a test CSV file: `test-invalid-dates.csv`
```csv
Type,First Name,Last Name,Email,Department,Title,Manager,Status,Start Date,End Date
contractor,Bob,Smith,bob@contractor.com,Sales,Consultant,John Doe,active,2024-06-01,2024-01-15
```

### Steps
1. [ ] Upload `test-invalid-dates.csv`
2. [ ] Verify error: "End date must be after start date"
3. [ ] Verify Import button is disabled

**Expected Result**: Date range validation works

## Test 7: Custom Attribute Type Coercion

### Setup
Create a test CSV file: `test-types.csv`
```csv
Type,First Name,Last Name,Email,Department,Title,Manager,Status,Start Date,End Date,Years Experience
employee,Test,User,test@example.com,IT,Developer,Manager,active,2024-01-15,,not-a-number
```

### Steps
1. [ ] Upload `test-types.csv`
2. [ ] Verify error for Years Experience field
3. [ ] Verify error message indicates invalid number value
4. [ ] Fix CSV by changing "not-a-number" to "5"
5. [ ] Re-upload fixed CSV
6. [ ] Verify no errors
7. [ ] Import successfully
8. [ ] View employee details
9. [ ] Verify Years Experience shows as number 5

**Expected Result**: Type validation and coercion works correctly

## Test 8: History Tracking

### Setup
1. [ ] Import sample-import.csv if not already imported

### Steps
1. [ ] Navigate to employee list
2. [ ] Click on Jane Smith
3. [ ] Click "View History" link
4. [ ] Verify history entry exists with:
   - Action: create
   - Changed By: "CSV Import"
   - Timestamp: Import time
5. [ ] Verify entry shows as creation (not update)

**Expected Result**: Import history is tracked with "CSV Import" attribution

## Test 9: Mixed Employee/Contractor Import

### Verification
1. [ ] View employee list after importing sample-import.csv
2. [ ] Filter by Type = "employee"
3. [ ] Verify 3 employees show (Jane, Carol, David)
4. [ ] Filter by Type = "contractor"
5. [ ] Verify 2 contractors show (Bob, Emma)
6. [ ] Click on contractor Bob Johnson
7. [ ] Verify End Date is present: 2024-12-31
8. [ ] Click on employee Jane Smith
9. [ ] Verify End Date is empty or not displayed

**Expected Result**: Both types import correctly with proper validation

## Test 10: Export-Import Round Trip

### Steps
1. [ ] Navigate to Employees page
2. [ ] Ensure some employees exist
3. [ ] Click "Export CSV" button
4. [ ] Save exported CSV file
5. [ ] Open exported CSV in text editor
6. [ ] Verify all columns are present including custom attributes
7. [ ] Delete 1-2 employees from the system (to avoid seeing duplicates)
8. [ ] Click "Import CSV"
9. [ ] Upload the exported CSV file
10. [ ] Verify validation passes (ignore ID/Created At/Updated At warnings if any)
11. [ ] Import employees
12. [ ] Verify employees are recreated
13. [ ] Verify custom attributes match original values
14. [ ] Verify dates are preserved correctly

**Expected Result**: Export → Import round trip preserves all data

## Test 11: CSV Edge Cases

### Test 11a: Comma in Field
Create test CSV:
```csv
Type,First Name,Last Name,Email,Department,Title,Manager,Status,Start Date
employee,John,"Doe, Jr.",john@example.com,IT,Developer,Manager,active,2024-01-15
```

### Steps
1. [ ] Upload CSV with comma in Last Name
2. [ ] Verify no validation errors
3. [ ] Import successfully
4. [ ] Verify Last Name shows as "Doe, Jr." (comma preserved)

**Expected Result**: Quoted fields with commas parse correctly

### Test 11b: Quote in Field
Create test CSV:
```csv
Type,First Name,Last Name,Email,Department,Title,Manager,Status,Start Date
employee,John,Smith,john@example.com,IT,"Software ""Engineer""",Manager,active,2024-01-15
```

### Steps
1. [ ] Upload CSV with escaped quotes in Title
2. [ ] Verify no validation errors
3. [ ] Import successfully
4. [ ] Verify Title shows as: Software "Engineer" (quotes preserved)

**Expected Result**: Escaped quotes parse correctly

## Test 12: Error Recovery

### Steps
1. [ ] Upload a CSV with errors
2. [ ] Note the validation errors displayed
3. [ ] Click "Clear" button
4. [ ] Verify file input is reset
5. [ ] Verify error messages disappear
6. [ ] Verify badges disappear
7. [ ] Upload a valid CSV
8. [ ] Verify fresh validation with no old errors

**Expected Result**: Can clear and start over without issues

## Test 13: Cancel and Close

### Steps
1. [ ] Click "Import CSV" button
2. [ ] Upload any CSV file
3. [ ] Click "Cancel" button
4. [ ] Verify modal closes
5. [ ] Verify no employees were imported
6. [ ] Click "Import CSV" again
7. [ ] Verify modal opens fresh (no previous file)
8. [ ] Upload a valid CSV
9. [ ] Click X button in top-right corner
10. [ ] Verify modal closes
11. [ ] Verify no employees were imported

**Expected Result**: Cancel and close work without side effects

## Test 14: Large CSV Performance

### Setup
Create a CSV with 50-100 employees (duplicate the sample rows)

### Steps
1. [ ] Upload large CSV file
2. [ ] Observe validation time (should be < 2 seconds)
3. [ ] Verify all rows validated
4. [ ] Import employees
5. [ ] Observe import time (should be < 3 seconds)
6. [ ] Verify all employees appear in list
7. [ ] Check browser console for errors

**Expected Result**: Large imports complete without freezing UI

## Test 15: Responsive Design

### Steps
1. [ ] Open browser developer tools
2. [ ] Toggle device toolbar (mobile view)
3. [ ] Navigate to Employees page
4. [ ] Verify "Import CSV" button is visible
5. [ ] Click "Import CSV"
6. [ ] Verify modal is responsive and scrollable
7. [ ] Upload CSV with errors
8. [ ] Verify error table is scrollable on mobile
9. [ ] Verify buttons are accessible

**Expected Result**: Import feature works on mobile devices

## Post-Test Verification

After completing all tests:

- [ ] Check browser console for any errors
- [ ] Verify localStorage contains all data:
  - `hrmis_employees`
  - `hrmis_custom_attributes`
  - `hrmis_history`
- [ ] Verify no memory leaks (refresh page, check memory usage)
- [ ] Verify navigation works (can navigate away and back)
- [ ] Clear localStorage and verify app still loads

## Bug Report Template

If you find any issues during testing, use this template:

```
**Test**: [Test number and name]
**Step**: [Which step failed]
**Expected**: [What should happen]
**Actual**: [What actually happened]
**Browser**: [Browser name and version]
**Console Errors**: [Any errors from browser console]
**Screenshot**: [If applicable]
```

## Success Criteria

All tests should pass with:
- ✅ No console errors
- ✅ No visual glitches
- ✅ All validation working correctly
- ✅ Data persisting correctly
- ✅ History tracking working
- ✅ Responsive on all screen sizes
- ✅ Error messages clear and helpful

---

**Testing Completed**: ___________
**Tested By**: ___________
**Pass/Fail**: ___________
**Notes**: ___________
