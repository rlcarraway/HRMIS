# Quick Start: CSV Import Feature

## 🚀 Ready to Test in 3 Steps

### Step 1: Start the Application
```bash
npm run dev
```
Open http://localhost:3000 in your browser

### Step 2: (Optional) Add Custom Attributes
1. Navigate to **Settings** page
2. Click "Add Custom Attribute"
3. Create two attributes:
   - **Name**: "Clearance Level", **Type**: String, **Required**: No
   - **Name**: "Years Experience", **Type**: Number, **Required**: No

### Step 3: Import Sample Data
1. Navigate to **Employees** page
2. Click **"Import CSV"** button
3. Select the file: `sample-import.csv`
4. Review validation (should show "5 valid rows")
5. Click **"Import 5 Employees"**
6. ✅ Done! You should see 5 new employees in the list

## 📋 What You Should See

After import:
- **Jane Smith** - Senior Software Engineer (Employee)
- **Bob Johnson** - Marketing Consultant (Contractor)
- **Carol Davis** - HR Manager (Employee)
- **David Martinez** - DevOps Engineer (Employee)
- **Emma Wilson** - Sales Representative (Contractor)

## 🔍 Verify the Import

1. Click on any employee to view details
2. Check that custom attributes are populated:
   - Clearance Level should show (Top Secret, Secret, etc.)
   - Years Experience should show as a number
3. Click "View History" to see "CSV Import" entry

## 📄 Sample CSV Format

The `sample-import.csv` file looks like this:

```csv
Type,First Name,Last Name,Email,Department,Title,Manager,Status,Start Date,End Date,Clearance Level,Years Experience
employee,Jane,Smith,jane.smith@example.com,Engineering,Senior Software Engineer,John Doe,active,2023-01-15,,Top Secret,8
contractor,Bob,Johnson,bob.j@contractor.com,Marketing,Marketing Consultant,Alice Williams,active,2024-03-01,2024-12-31,Public,3
```

## 🧪 Test Error Handling

Create a test CSV with an error:

```csv
Type,First Name,Last Name,Email,Department,Title,Manager,Status,Start Date
contractor,Test,User,test@example.com,IT,Developer,Manager,active,2024-01-15
```

**Expected**: Error message "End date is required for contractors"

## 📚 Full Documentation

- **User Guide**: See `CSV-IMPORT-GUIDE.md`
- **Test Checklist**: See `IMPORT-TEST-CHECKLIST.md`
- **Implementation Summary**: See `IMPORT-FEATURE-SUMMARY.md`

## 🐛 Something Not Working?

1. Check the browser console (F12) for errors
2. Verify dev server is running: `npm run dev`
3. Make sure `sample-import.csv` exists in project root
4. Try refreshing the page (Cmd+R or Ctrl+R)

## ✨ Key Features to Try

- ✅ Import employees and contractors
- ✅ Custom attributes (after creating them in Settings)
- ✅ Validation error messages
- ✅ Export → Import round trip
- ✅ History tracking with "CSV Import" attribution
- ✅ CSV with commas in fields (use quotes)

## 🎯 Next Steps

Once basic import works:
1. Follow the complete test checklist in `IMPORT-TEST-CHECKLIST.md`
2. Try importing your own CSV files
3. Test edge cases (commas, quotes, empty fields)
4. Export employees and re-import them

---

**That's it!** You now have a working CSV bulk import feature. 🎉
