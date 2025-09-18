
export default {
  meta: { 
    desc: "Generated job for: Create a simple logging job", 
    tags: ["ai-generated", "job"],
    author: "GitVan AI",
    version: "1.0.0"
  },
  async run({ ctx, payload, meta }) {
    try {
      console.log("Executing job: Create a simple logging job");
      
      // TODO: Implement job logic
      {
  "meta": {
    "desc": "A simple logging job that records a message to the console and optionally writes it to a log file.",
    "tags": ["logging", "simple", "automation"],
    "author": "GitVan AI",
    "version": "1.0.0"
  },
  "config": {
    "cron": null,
    "on": ["push"],
    "schedule": null
  },
  "implementation": {
    "type": "simple",
    "description": "Logs a message to the console and optionally writes it to a log file.",
    "parameters": [
      {
        "name": "message",
        "type": "string",
        "description": "The message to log",
        "required": true,
        "default": ""
      },
      {
        "name": "logToFile",
        "type": "boolean",
        "description": "Whether to also write the message to a file",
        "required": false,
        "default": false
      }
    ],
    "operations": [
      {
        "type": "log",
        "description": "Log the provided message to console",
        "parameters": {
          "message": "{{ payload.message }}"
        }
      },
      {
        "type": "file-write",
        "description": "Write the log message to a file if enabled",
        "parameters": {
          "path": "./logs/job.log",
          "content": "{{ payload.message }}\n"
        }
      }
    ],
    "errorHandling": "graceful",
    "returnValue": {
      "success": "Message logged successfully.",
      "artifacts": ["./logs/job.log"]
    }
  },
  "values": {
    "specificValue1": "example log entry",
    "specificValue2": true
  }
}
      
      return { 
        ok: true, 
        artifacts: [],
        summary: "Job completed successfully"
      }
    } catch (error) {
      console.error('Job failed:', error.message)
      return { 
        ok: false, 
        error: error.message,
        artifacts: []
      }
    }
  }
}