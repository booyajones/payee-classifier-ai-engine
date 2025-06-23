
# Smart File Upload System Documentation

## Overview

The Smart File Upload system is a comprehensive file processing solution that handles large payee classification files with intelligent batch processing, progress tracking, and error recovery.

## Architecture

### Core Components

1. **SmartFileUpload** - Main container component
2. **File Processing Hooks** - Custom hooks for file handling
3. **Progress Management** - Unified progress tracking system
4. **Error Handling** - Comprehensive error management
5. **Batch Processing** - OpenAI Batch API integration

### Key Features

- **Large File Support**: Handles files up to 100MB efficiently
- **Intelligent Processing**: Automatically chooses between local and API processing
- **Progress Tracking**: Real-time progress updates with detailed status
- **Error Recovery**: Automatic retry mechanisms with exponential backoff
- **Memory Optimization**: Virtualized tables for large datasets
- **Export Capabilities**: Multiple export formats (CSV, Excel, JSON)

## Usage

### Basic Implementation

```typescript
import SmartFileUpload from '@/components/SmartFileUpload';

const MyComponent = () => {
  const handleBatchJobCreated = (batchJob, payeeRowData) => {
    console.log('Batch job created:', batchJob.id);
  };

  const handleProcessingComplete = (results, summary, jobId) => {
    console.log('Processing complete:', results.length, 'results');
  };

  return (
    <SmartFileUpload
      onBatchJobCreated={handleBatchJobCreated}
      onProcessingComplete={handleProcessingComplete}
    />
  );
};
```

### Advanced Configuration

The system automatically handles:
- File validation and size checking
- Column detection and mapping
- Duplicate removal and optimization
- Progress tracking and error handling
- Result processing and export

## Performance Considerations

### Memory Management
- Files are processed in chunks to prevent memory overflow
- Virtual scrolling for large result sets
- Garbage collection optimization for large datasets

### Processing Optimization
- Local processing for files > 45,000 records
- Batch API processing for smaller files
- Parallel processing for chunked operations

### Network Optimization
- Retry mechanisms with exponential backoff
- Request deduplication
- Connection pooling for API calls

## Error Handling

### Error Types
- `FILE_TOO_LARGE`: File exceeds size limits
- `INVALID_FILE_FORMAT`: Unsupported file format
- `NO_VALID_PAYEES`: No payee data found
- `API_QUOTA_EXCEEDED`: API rate limits reached
- `NETWORK_ERROR`: Connection issues

### Recovery Strategies
- Automatic retry with exponential backoff
- Fallback to local processing
- User-friendly error messages with suggestions
- Progress preservation during errors

## API Reference

### SmartFileUpload Props

```typescript
interface SmartFileUploadProps {
  onBatchJobCreated: (batchJob: BatchJob, payeeRowData: PayeeRowData) => void;
  onProcessingComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
}
```

### File Processing States

- `idle`: Ready for file selection
- `uploaded`: File uploaded, awaiting column selection
- `processing`: File being processed
- `complete`: Processing finished successfully
- `error`: Error occurred during processing

## Best Practices

### File Preparation
1. Ensure payee names are in a single column
2. Remove empty rows and columns
3. Use consistent naming conventions
4. Keep file size under 100MB when possible

### Performance Tips
1. Use CSV format for better performance
2. Remove unnecessary columns before upload
3. Ensure stable internet connection for large files
4. Allow sufficient time for processing

### Error Prevention
1. Validate file format before upload
2. Check for required columns
3. Test with smaller files first
4. Monitor API quotas and limits

## Troubleshooting

### Common Issues

**File Upload Fails**
- Check file format (must be .csv, .xlsx, or .xls)
- Verify file size is under 100MB
- Ensure file is not corrupted

**Processing Hangs**
- Check internet connection
- Verify API key is valid
- Monitor console for error messages

**Memory Issues**
- Close other browser tabs
- Use smaller file chunks
- Clear browser cache

**API Errors**
- Check API quota limits
- Verify API key permissions
- Wait for rate limit reset

### Debug Mode

Enable debug mode by opening browser console and setting:
```javascript
localStorage.setItem('debug', 'true');
```

This will show detailed logging for all operations.

## Migration Guide

### From Legacy File Upload

1. Replace old FileUpload component with SmartFileUpload
2. Update event handlers to use new callback format
3. Remove manual progress tracking (now handled automatically)
4. Update error handling to use new error types

### Configuration Changes

Old:
```typescript
<FileUpload onComplete={handleComplete} />
```

New:
```typescript
<SmartFileUpload 
  onBatchJobCreated={handleBatchJob}
  onProcessingComplete={handleComplete}
/>
```

## Support

For issues or questions:
1. Check console logs for detailed error information
2. Verify file format and size requirements
3. Test with sample data first
4. Contact support with error logs and file details
