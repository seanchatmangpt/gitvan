# GitVan Non-Blocking Architecture Design

## Core Principles

### 1. **Lazy Loading**
- Packs loaded only when needed
- Jobs discovered on-demand
- Templates rendered when requested
- No upfront scanning

### 2. **Event-Driven**
- All operations triggered by events
- Non-blocking event handlers
- Async/await throughout
- Proper error boundaries

### 3. **Background Processing**
- Daemon runs in separate process
- Pack installation in background
- File operations async
- Progress callbacks

### 4. **Graceful Degradation**
- Continue on errors
- Fallback mechanisms
- Timeout protection
- Resource limits

## Architecture Components

### Fast Init (< 1 second)
```javascript
// 1. Create directories (sync, fast)
// 2. Write config (sync, fast)  
// 3. Create sample files (sync, fast)
// 4. Exit immediately
```

### Background Setup
```javascript
// 1. Start daemon (spawn process)
// 2. Install hooks (async)
// 3. Load packs (lazy, on-demand)
// 4. Register event handlers
```

### Lazy Pack System
```javascript
// 1. Pack registry: empty on startup
// 2. Packs loaded when:
//    - Marketplace command run
//    - Job references pack
//    - Explicit pack install
// 3. Cache loaded packs
// 4. Background updates
```

### Non-Blocking Daemon
```javascript
// 1. Start with minimal config
// 2. Discover jobs lazily
// 3. Register event listeners
// 4. Process events async
// 5. No blocking operations
```

## Implementation Strategy

### Phase 1: Fast Init
- Remove all async operations from init
- Make init purely synchronous
- Exit immediately after file creation

### Phase 2: Background Services
- Daemon as separate process
- Pack loading as background task
- Hook installation as async operation

### Phase 3: Lazy Loading
- Pack registry starts empty
- Load packs on first access
- Cache for subsequent access
- Background refresh

### Phase 4: Event-Driven Operations
- All operations triggered by events
- Non-blocking event handlers
- Proper error handling
- Timeout protection

## Benefits

1. **Fast Startup**: Init completes in < 1 second
2. **No Hanging**: No blocking operations
3. **Resource Efficient**: Load only what's needed
4. **Resilient**: Continue on errors
5. **Scalable**: Handle large pack collections
6. **User Friendly**: Immediate feedback

## Implementation Plan

1. **Refactor Init**: Make purely synchronous
2. **Background Daemon**: Spawn as separate process
3. **Lazy Pack Loading**: Load on-demand
4. **Event-Driven Jobs**: Async job discovery
5. **Error Boundaries**: Graceful error handling
6. **Progress Feedback**: User-friendly status updates
