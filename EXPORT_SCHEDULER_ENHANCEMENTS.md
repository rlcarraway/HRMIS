# Export Scheduler - Enhanced Features

## Overview

The export scheduler has been enhanced with advanced capabilities:

1. **Minute-level granularity** - Schedule exports for specific minutes (HH:mm format)
2. **Same-day scheduling** - Schedule exports for today if the time is in the future
3. **Full vs Delta exports** - Choose between exporting all records or only changes
4. **Webhook notifications** - Get notified when exports complete

## Feature Details

### 1. Minute-Level Granularity

The scheduler already supports minute-level precision with the HH:mm time format:

- **Format**: HH:mm (24-hour format)
- **Examples**:
  - "09:00" = 9:00 AM
  - "14:30" = 2:30 PM
  - "23:59" = 11:59 PM

**Frequency Options:**
- **Once**: Run at a specific date and time
- **Daily**: Run every day at the specified time
- **Weekly**: Run on a specific day of the week at the specified time
- **Monthly**: Run on a specific day of the month at the specified time

### 2. Same-Day Scheduling

You can now schedule exports for the same day, as long as the time is in the future:

**Example:**
- Current time: 10:30 AM
- Schedule for today at 11:00 AM ✅ Valid
- Schedule for today at 9:00 AM ❌ Invalid (time has passed)

**Validation:**
- For "once" frequency, the system checks the combined date + time
- The scheduled datetime must be at least 1 minute in the future
- Same-day scheduling works for all frequency types if the time hasn't passed yet

### 3. Export Types

#### Full Export
Exports all employee records that match the configured filters.

**Use Cases:**
- Regular full backups
- Complete data snapshots
- Initial data exports
- Compliance requirements

**Behavior:**
- Exports all records every time
- File size consistent (unless records are added/removed)
- Simple and predictable

#### Delta Export
Exports only records that have been created or updated since the last export.

**Use Cases:**
- Incremental backups
- Change tracking
- Reducing data transfer for large datasets
- Synchronization with external systems

**Behavior:**
- **First run**: Exports all records (no previous export exists)
- **Subsequent runs**: Only exports records where:
  - `createdAt` > last export timestamp, OR
  - `updatedAt` > last export timestamp

**How Delta Tracking Works:**
1. After each export, the system stores:
   - Timestamp of the export (`lastExecuted`)
   - List of record IDs that were exported (`lastExportedRecordIds`)
2. On next run, the system compares:
   - Record creation/update timestamps against last export time
   - Includes any record modified after the last export
3. The export includes:
   - Newly created records
   - Updated existing records
   - Records deleted since last export are NOT included (they don't exist anymore)

**File Naming:**
- Full exports: `export-full-[schedule-name]-[timestamp].csv`
- Delta exports: `export-delta-[schedule-name]-[timestamp].csv`

### 4. Webhook Notifications

Configure a webhook URL to receive notifications when exports complete.

**Webhook Configuration:**
- URL must be a valid HTTP/HTTPS endpoint
- URL is optional (leave blank to disable)
- Called via POST request after each export execution

**Webhook Payload:**
```json
{
  "scheduleId": "uuid",
  "scheduleName": "Daily Full Export",
  "executedAt": "2026-06-02T10:30:00.000Z",
  "success": true,
  "employeeCount": 150,
  "filename": "export-full-Daily-Full-Export-2026-06-02T10-30-00-000Z.csv",
  "exportType": "full",
  "filepath": "/path/to/exports/export-full-Daily-Full-Export-2026-06-02T10-30-00-000Z.csv"
}
```

**Webhook Behavior:**
- Called regardless of export success/failure
- If webhook fails, export still succeeds (webhook failure doesn't block export)
- Webhook status logged in `ScheduledExportLog`
- 30-second timeout for webhook calls
- Retry not implemented (fire-and-forget)

**Headers Sent:**
```
Content-Type: application/json
User-Agent: HRMIS-Export-Scheduler/1.0
```

**Testing Webhooks:**
Use the built-in test endpoint: `http://localhost:3002/api/test-webhook`

This endpoint logs all webhook data to the console and returns a success response.

## Usage Examples

### Example 1: Same-Day Full Export

**Scenario:** It's 2:00 PM and you want to export all employees at 3:00 PM today.

**Configuration:**
- Name: "End of Day Export"
- Frequency: Once
- Date: Today's date
- Time: 15:00
- Export Type: Full
- Webhook: (optional)

**Result:**
- Export runs at 3:00 PM today
- Schedule automatically disables after execution
- All employee records exported

### Example 2: Daily Delta Export with Webhook

**Scenario:** Export only changed records every day at midnight, notify an external system.

**Configuration:**
- Name: "Nightly Delta Sync"
- Frequency: Daily
- Time: 00:00
- Export Type: Delta
- Webhook: https://your-system.com/api/employee-sync

**Result:**
- First run: Exports all records
- Daily runs: Exports only records created/updated since previous day
- Webhook called each time with export details
- External system can fetch the CSV file

### Example 3: Weekly Full Backup

**Scenario:** Full export every Monday at 9:00 AM for weekly backup.

**Configuration:**
- Name: "Weekly Backup"
- Frequency: Weekly
- Day: Monday
- Time: 09:00
- Export Type: Full
- Webhook: (none)

**Result:**
- Runs every Monday at 9:00 AM
- Full export of all employees
- Files saved to `/exports/` directory

### Example 4: Monthly Active Employees Export

**Scenario:** Export only active employees on the 1st of each month.

**Configuration:**
- Name: "Monthly Active Report"
- Frequency: Monthly
- Day: 1
- Time: 08:00
- Export Type: Full
- Filters: Status = Active
- Webhook: (optional)

**Result:**
- Runs on the 1st of every month at 8:00 AM
- Only active employees included
- Regular monthly reporting

## API Changes

### ExportSchedule Type Updates

```typescript
interface ExportSchedule {
  // ... existing fields
  exportType: 'full' | 'delta';          // NEW
  webhookUrl?: string;                    // NEW
  lastExportedRecordIds?: string[];       // NEW (for delta tracking)
}
```

### ScheduledExportLog Type Updates

```typescript
interface ScheduledExportLog {
  // ... existing fields
  exportType: 'full' | 'delta';           // NEW
  webhookCalled?: boolean;                // NEW
  webhookSuccess?: boolean;               // NEW
}
```

### Validation Updates

Same-day scheduling now validates combined date + time:

```typescript
// Previous: Only checked date
new Date(scheduledDate) > new Date()

// New: Checks date + time
const scheduledDateTime = new Date(scheduledDate);
scheduledDateTime.setHours(hours, minutes, 0, 0);
scheduledDateTime > new Date()
```

## UI Updates

### Schedule Creation Modal

**New Fields:**
1. **Export Type** (dropdown)
   - Full Export - All records
   - Delta Export - Only changes since last export

2. **Webhook URL** (text input)
   - Optional
   - Must be valid URL
   - Shows helper text when populated

**Enhanced Fields:**
- **Date** field now has helper text: "Same-day scheduling allowed if time is in the future"
- Delta export shows info box explaining behavior

### Schedule List

**New Information Displayed:**
- Export type badge (Full/Delta)
- Webhook URL (truncated if long)
- Webhook status in logs

## File Structure

### Generated Export Files

```
/exports/
├── export-full-Daily-Full-Export-2026-06-02T10-00-00-000Z.csv
├── export-delta-Nightly-Sync-2026-06-02T23-59-59-999Z.csv
├── export-full-Weekly-Backup-2026-06-01T09-00-00-000Z.csv
└── ...
```

**File Naming Convention:**
```
export-[TYPE]-[SCHEDULE-NAME]-[TIMESTAMP].csv
```

- **TYPE**: `full` or `delta`
- **SCHEDULE-NAME**: Slugified schedule name (spaces replaced with hyphens)
- **TIMESTAMP**: ISO timestamp with colons replaced by hyphens

## Performance Considerations

### Delta Exports

**Benefits:**
- Smaller file sizes (only changed records)
- Faster generation time
- Reduced bandwidth for downstream systems
- Efficient for large datasets with few changes

**Trade-offs:**
- Requires tracking last export state
- More complex logic
- First export is always full

**When to Use:**
- Large employee databases (1000+ records)
- Frequent exports (multiple times per day)
- Integration with systems that support incremental updates
- Network bandwidth constraints

### Full Exports

**Benefits:**
- Simple and predictable
- No state tracking needed
- Always complete snapshot
- Easy to verify completeness

**Trade-offs:**
- Larger file sizes
- Same processing time regardless of changes

**When to Use:**
- Small to medium datasets (< 1000 records)
- Infrequent exports (daily or less)
- Compliance/audit requirements for complete snapshots
- Integration with systems that don't support incremental updates

## Webhook Best Practices

### Security

1. **Use HTTPS** for webhook URLs in production
2. **Validate webhook signatures** if implementing authentication
3. **Use dedicated endpoints** for webhook handling
4. **Implement rate limiting** on webhook receiver

### Reliability

1. **Idempotent processing** - Handle duplicate webhook calls
2. **Async processing** - Process webhook data asynchronously
3. **Error handling** - Don't fail if webhook returns error
4. **Logging** - Log all webhook attempts for debugging

### Example Webhook Receiver (Node.js/Express)

```javascript
app.post('/api/employee-export-webhook', async (req, res) => {
  try {
    const {
      scheduleId,
      scheduleName,
      executedAt,
      success,
      employeeCount,
      filename,
      exportType,
      filepath
    } = req.body;

    // Respond quickly (before processing)
    res.json({ success: true, received: true });

    // Process asynchronously
    await processExport({
      scheduleId,
      filename,
      exportType,
      // Fetch the file from the server
      // Process the data
      // Update your systems
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## Troubleshooting

### Issue: Same-day schedule not executing

**Check:**
1. Is the current time before the scheduled time?
2. Is the schedule enabled?
3. Check server logs for cron registration

### Issue: Delta export includes too many records

**Possible Causes:**
1. First run always exports all records
2. Record `updatedAt` fields being modified unintentionally
3. System clock issues

**Solution:**
- Check `lastExecuted` timestamp in schedule
- Verify record timestamps in database
- Ensure server time is correct

### Issue: Webhook not being called

**Check:**
1. Is webhook URL valid and accessible?
2. Check webhook URL starts with http:// or https://
3. Check server logs for webhook call attempts
4. Verify webhook endpoint is accepting POST requests

### Issue: Webhook failing but export succeeding

**This is normal behavior:**
- Exports execute independently of webhooks
- Webhook failures don't block exports
- Check `webhookSuccess` in export logs
- Verify webhook endpoint is working correctly

## Migration from Previous Version

If you have existing schedules:

1. **Export Type**: Defaults to `'full'` if not specified
2. **Webhook URL**: Optional, defaults to `undefined`
3. **lastExportedRecordIds**: Empty array for new schedules

**No data migration needed** - existing schedules work as before.

## Testing Checklist

### Same-Day Scheduling
- [ ] Schedule for today, 5 minutes from now
- [ ] Verify validation rejects past times
- [ ] Check export executes at correct time

### Delta Exports
- [ ] Create delta schedule
- [ ] First run exports all records
- [ ] Add new employee
- [ ] Next run only exports new employee
- [ ] Update existing employee
- [ ] Next run exports updated employee

### Webhooks
- [ ] Configure test webhook URL
- [ ] Run manual export
- [ ] Verify webhook receives POST request
- [ ] Check payload structure
- [ ] Verify export succeeds even if webhook fails

### Full Exports
- [ ] Create full export schedule
- [ ] Verify all records exported every time
- [ ] Check file naming includes "full"

## Support

For issues or questions:
- Check server logs in console
- Review export logs in storage
- Test webhook endpoint independently
- Verify schedule configuration

---

**Version**: 1.1.0
**Last Updated**: 2026-06-02
